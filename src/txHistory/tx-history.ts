import { FarmService } from "services/FarmService";
import { autoinject, singleton, computedFrom } from "aurelia-framework";
import { IStandardEvent } from "services/ContractsService";
import { ContractsService } from "services/ContractsService";
import "./tx-history.scss";
import { EventAggregator } from "aurelia-event-aggregator";
import TransactionsService from "services/TransactionsService";
import { Address, EthereumService, Hash } from "services/EthereumService";
import { BigNumber } from "ethers";
import { SortOrder, SortService } from "services/SortService";
import { TokenService } from "services/TokenService";
import { EventConfigException } from "services/GeneralEvents";
import { PoolService } from "services/PoolService";
import { IExitEventArgs, IJoinEventArgs, IPoolTokenTransferEventArgs } from "entities/pool";

interface IAssetTokenTxInfo {
  amount: BigNumber;
  name: string;
}

export interface IStakingRewardTransferEventArgs {
  caller: Address;
  reward: BigNumber;
}

export interface IStakingEventArgs {
  caller: Address;
  amount: BigNumber;
}

interface ITransaction {
  date: Date;
  actionDescription: string;
  assetsIn: Array<IAssetTokenTxInfo>;
  assetsOut: Array<IAssetTokenTxInfo>;
  hash: Hash;
  etherscanUrl: string;
  poolName: string;
}

@singleton(false)
@autoinject
export class TxHistory {

  transactions: Array<ITransaction>;
  loading = false;
  get currentAccount(): Address { return this.ethereumService.defaultAccountAddress; }

  @computedFrom("currentAccount")
  get connected(): boolean {
    return !!this.currentAccount;
  }

  constructor(
    private eventAggregator: EventAggregator,
    private contractsService: ContractsService,
    private ethereumService: EthereumService,
    private transactionsService: TransactionsService,
    private tokenService: TokenService,
    private poolService: PoolService,
    private farmService: FarmService) {

    this.eventAggregator.subscribe("Contracts.Changed", async () => {
      this.reload();
    });

  }

  async attached(): Promise<void> {

    if (!this.transactions) {
      // don't await
      this.reload();
    }
  }

  reload(): Promise<void> {
    return this.getData(true);
  }

  async getData(reload = false): Promise<void> {

    if (!this.connected) {
      this.transactions = undefined;
      return;
    }

    if (reload || !this.transactions) {
      this.loading = true;

      try {
        await this.poolService.ensureInitialized();

        const pools = this.poolService.poolsArray;
        const poolEvents = [];
        for (const pool of pools) {
          if (!pool.preview) {
            poolEvents.push(await this.fetchForPool(pool.address));
          }
        }

        this.transactions = [].concat(...poolEvents).sort((a: ITransaction, b: ITransaction) =>
          SortService.evaluateDateTime(a.date.toISOString(), b.date.toISOString(), SortOrder.DESC));

      } catch (ex) {
        this.eventAggregator.publish("handleException", new EventConfigException("Sorry, an error occurred getting pool histories", ex));
      }
      finally {
        this.loading = false;
      }
    }
  }

  private async fetchForPool(crPoolAddress: Address): Promise<Array<ITransaction>> {

    const crPool = this.poolService.pools.get(crPoolAddress);
    const farm = this.farmService.poolFarms.get(crPoolAddress);

    const poolTokenName = (await this.tokenService.getTokenInfoFromAddress(crPoolAddress)).symbol;

    const transactions = new Array<ITransaction>();

    if (farm) {
      const stakingRewards = farm.contract;
      const stakingTokenName = farm.stakingTokenInfo.symbol;
      const stakingRewardTokenName = farm.rewardTokenInfo.symbol;

      const filterStaked = stakingRewards.filters.Staked(this.currentAccount);
      const txStakedEvents: Array<IStandardEvent<IStakingEventArgs>> = await stakingRewards.queryFilter(filterStaked, crPool.startingBlockNumber);

      const filterStakeWithdrawn = stakingRewards.filters.Withdrawn(this.currentAccount);
      const txStakeWithdrawnEvents: Array<IStandardEvent<IStakingEventArgs>> = await stakingRewards.queryFilter(filterStakeWithdrawn, crPool.startingBlockNumber);

      const filterStakeRewarded = stakingRewards.filters.RewardPaid(this.currentAccount);
      const txStakeRewardedEvents: Array<IStandardEvent<IStakingRewardTransferEventArgs>> = await stakingRewards.queryFilter(filterStakeRewarded, crPool.startingBlockNumber);

      const getStakingRewardTransfer = (withdrawEvent: IStandardEvent<IStakingEventArgs>): Array<IAssetTokenTxInfo> => {
        return txStakeRewardedEvents.filter((event) => event.transactionHash === withdrawEvent.transactionHash)
          .map((event) => { return { name: stakingRewardTokenName, amount: event.args.reward }; });
      };

      const newStakingTx = async (withdraw: boolean, event: IStandardEvent<IStakingEventArgs>, poolName: string) => {
        const blockDate = new Date((await event.getBlock()).timestamp * 1000);
        const txHash = event.transactionHash;
        const txInfo = { name: stakingTokenName, amount: event.args.amount };

        return {
          date: blockDate,
          actionDescription: withdraw ? "Harvested farmed tokens" : "Initiated farming",
          assetsIn: withdraw ? [] : [txInfo],
          assetsOut: withdraw ? [txInfo].concat(getStakingRewardTransfer(event)) : [],
          etherscanUrl: this.transactionsService.getEtherscanLink(txHash),
          hash: txHash,
          poolName,
        };
      };

      for (const event of txStakedEvents) {
        transactions.push(await newStakingTx(false, event, crPool.name));
      }

      for (const event of txStakeWithdrawnEvents) {
        transactions.push(await newStakingTx(true, event, crPool.name));
      }
    }

    // fake data for mainnet: "0x9Ab1A23a1d2aC3603c73d8d3C1E96B7Fd4e7aA19"
    const txJoinEvents = await crPool.getJoinEvents(this.currentAccount);
    const txExitEvents = await crPool.getExitEvents(this.currentAccount);
    const txJoinBpoolTransferEvents = await crPool.getPoolTokenTransferEvents(crPoolAddress, this.currentAccount);
    const txExitBpoolTransferEvents = await crPool.getPoolTokenTransferEvents(this.currentAccount, crPoolAddress);

    const getAssetTransfers = async (isJoin: boolean,
      joinExitEvents: Array<IStandardEvent<IExitEventArgs> | IStandardEvent<IJoinEventArgs>>): Promise<Array<IAssetTokenTxInfo>> => {

      const transfers = new Array<IAssetTokenTxInfo>();
      joinExitEvents.forEach(async (event) => {
        const tokenName = (await this.tokenService.getTokenInfoFromAddress(event.args[isJoin ? "tokenIn" : "tokenOut"])).symbol;
        transfers.push({ name: tokenName, amount: event.args[isJoin ? "tokenAmountIn" : "tokenAmountOut"] });
      });
      return transfers;
    };

    const getBpoolTransfers = (transferEvents: Array<IStandardEvent<IPoolTokenTransferEventArgs>>, txHash: Hash): Array<IAssetTokenTxInfo> =>
      transferEvents
        .filter((event) => event.transactionHash === txHash)
        .map((event) => { return { name: poolTokenName, amount: event.args.value }; });

    const newPoolTx = async (isJoin: boolean, txHash,
      joinExitEvents: Array<IStandardEvent<IExitEventArgs> | IStandardEvent<IJoinEventArgs>>, poolName: string) => {

      let assetsIn = new Array<IAssetTokenTxInfo>();
      let assetsOut = new Array<IAssetTokenTxInfo>();
      const blockDate = new Date((await joinExitEvents[0].getBlock()).timestamp * 1000);

      if (isJoin) {
        assetsIn = await getAssetTransfers(true, joinExitEvents);
        assetsOut = getBpoolTransfers(txJoinBpoolTransferEvents, txHash);
      } else {
        assetsOut = await getAssetTransfers(false, joinExitEvents);
        assetsIn = getBpoolTransfers(txExitBpoolTransferEvents, txHash);
      }

      return {
        date: blockDate,
        actionDescription: isJoin ? "Bought pool shares" : "Sold pool shares",
        assetsIn: assetsIn,
        assetsOut: assetsOut,
        etherscanUrl: this.transactionsService.getEtherscanLink(txHash),
        hash: txHash,
        poolName,
      };
    };

    const joins = this.groupBy(txJoinEvents, txJoinEvent => txJoinEvent.transactionHash);
    const exits = this.groupBy(txExitEvents, txExitEvent => txExitEvent.transactionHash);

    for (const [txHash, events] of Array.from(joins)) {
      transactions.push(await newPoolTx(true, txHash, events, crPool.name));
    }

    for (const [txHash, events] of Array.from(exits)) {
      transactions.push(await newPoolTx(false, txHash, events, crPool.name));
    }
    return transactions;
  }

  connect(): void {
    this.ethereumService.ensureConnected();
  }

  /**
   * @description
   *
   * From here:  https://stackoverflow.com/a/38327540/4685575
   *
   * Takes an Array<V>, and a grouping function,
   * and returns a Map of the array grouped by the grouping function.
   *
   * @param list An array of type V.
   * @param keyGetter A Function that takes the the Array type V as an input, and returns a value of type K.
   *                  K is generally intended to be a property key of V.
   *
   * @returns Map of the array grouped by the grouping function.
   */
  groupBy<K, V>(list: Array<V>, keyGetter: (input: V) => K): Map<K, Array<V>> {
    const map = new Map<K, Array<V>>();
    list.forEach((item) => {
      const key = keyGetter(item);
      const collection = map.get(key);
      if (!collection) {
        map.set(key, [item]);
      } else {
        collection.push(item);
      }
    });
    return map;
  }
}
