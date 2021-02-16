import { autoinject, singleton, computedFrom } from "aurelia-framework";
import { ContractNames, IStandardEvent } from "services/ContractsService";
import { ContractsService } from "services/ContractsService";
import "./tx-history.scss";
import { EventAggregator } from "aurelia-event-aggregator";
import TransactionsService from "services/TransactionsService";
import { Address, EthereumService, fromWei, Hash, Networks } from "services/EthereumService";
import { BigNumber } from "ethers";
import { SortService } from "services/SortService";
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
  crPool: any;
  stakingRewards: any;
  poolTokenName: string;
  stakingTokenName: string;
  stakingRewardTokenName: string;
  loading = false;

  @computedFrom("ethereumService.defaultAccountAddress")
  get connected(): boolean {
    return !!this.ethereumService.defaultAccountAddress;
  }

  constructor(
    private eventAggregator: EventAggregator,
    private contractsService: ContractsService,
    private ethereumService: EthereumService,
    private transactionsService: TransactionsService,
    private tokenService: TokenService,
    private poolService: PoolService) {
  }

  async loadContracts(): Promise<void> {
    this.crPool = await this.contractsService.getContractFor(ContractNames.ConfigurableRightsPool);
    this.stakingRewards = await this.contractsService.getContractFor(ContractNames.STAKINGREWARDS);
  }

  async attached(): Promise<void> {

    this.eventAggregator.subscribe("Contracts.Changed", async () => {
      await this.loadContracts();
      this.getData(true);
    });

    await this.loadContracts();

    this.poolTokenName = (await this.tokenService.getTokenInfoFromAddress(this.contractsService.getContractAddress(ContractNames.ConfigurableRightsPool))).symbol;
    this.stakingTokenName = (await this.tokenService.getTokenInfoFromAddress(await this.stakingRewards.stakingToken())).symbol;
    this.stakingRewardTokenName = (await this.tokenService.getTokenInfoFromAddress(await this.stakingRewards.rewardToken())).symbol;

    return this.getData();
  }

  reload() {
    this.getData(true);
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
        /**
         * TODO: need to do this for all pools
         */
        const crPoolAddress = this.contractsService.getContractAddress(ContractNames.ConfigurableRightsPool);
        const crPool = this.poolService.pools.get(crPoolAddress);

        const txJoinEvents = await crPool.getJoinEvents(this.ethereumService.defaultAccountAddress);
        const txExitEvents = await crPool.getExitEvents(this.ethereumService.defaultAccountAddress);
        const txJoinBpoolTransferEvents = await crPool.getPoolTokenTransferEvents(crPoolAddress, this.ethereumService.defaultAccountAddress);
        const txExitBpoolTransferEvents = await crPool.getPoolTokenTransferEvents(this.ethereumService.defaultAccountAddress, crPoolAddress);

        const filterStaked = this.stakingRewards.filters.Staked(this.ethereumService.defaultAccountAddress);
        const txStakedEvents: Array<IStandardEvent<IStakingEventArgs>> = await this.stakingRewards.queryFilter(filterStaked, crPool.startingBlockNumber);

        const filterStakeWithdrawn = this.stakingRewards.filters.Withdrawn(this.ethereumService.defaultAccountAddress);
        const txStakeWithdrawnEvents: Array<IStandardEvent<IStakingEventArgs>> = await this.stakingRewards.queryFilter(filterStakeWithdrawn, crPool.startingBlockNumber);

        const filterStakeRewarded = this.stakingRewards.filters.RewardPaid(this.ethereumService.defaultAccountAddress);
        const txStakeRewardedEvents: Array<IStandardEvent<IStakingRewardTransferEventArgs>> = await this.stakingRewards.queryFilter(filterStakeRewarded, crPool.startingBlockNumber);

        const getStakingRewardTransfer = (withdrawEvent: IStandardEvent<IStakingEventArgs>): Array<IAssetTokenTxInfo> => {
          return txStakeRewardedEvents.filter((event) => event.transactionHash === withdrawEvent.transactionHash)
            .map((event) => { return { name: this.stakingRewardTokenName, amount: event.args.reward }; });
        };

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
            .map((event) => { return { name: this.poolTokenName, amount: event.args.value }; });
        ;

        const newPoolTx = async (isJoin: boolean, txHash,
          joinExitEvents: Array<IStandardEvent<IExitEventArgs> | IStandardEvent<IJoinEventArgs>>, poolName: string) => {

          let assetsIn: Array<IAssetTokenTxInfo>;
          let assetsOut: Array<IAssetTokenTxInfo>;
          let blockDate = new Date((await joinExitEvents[0].getBlock()).timestamp * 1000);
          
          if (isJoin) {
            assetsIn = await getAssetTransfers(true, joinExitEvents);
            assetsOut = getBpoolTransfers(txJoinBpoolTransferEvents, txHash);
          } else {
            assetsOut = await getAssetTransfers(false, joinExitEvents);
            assetsIn = getBpoolTransfers(txExitBpoolTransferEvents, txHash);
          }
          
          return {
            date: blockDate,
            actionDescription: isJoin ? "Buy Pool Shares" : "Sell Pool Shares",
            assetsIn: assetsIn,
            assetsOut: assetsOut,
            etherscanUrl: this.transactionsService.getEtherscanLink(txHash),
            hash: txHash,
            poolName,
          };
        };

        const newStakingTx = async (withdraw: boolean, event: IStandardEvent<IStakingEventArgs>, poolName: string) => {
          let blockDate = new Date((await event.getBlock()).timestamp * 1000);
          let txHash = event.transactionHash;
          let txInfo = { name: this.stakingTokenName, amount: event.args.amount };

          return {
            date: blockDate,
            actionDescription: withdraw ? "Liquidity Mining - Unstake Tokens" : "Liquidity Mining - Stake Tokens",
            assetsIn: withdraw ? [] : [txInfo],
            assetsOut: withdraw ? [txInfo].concat(getStakingRewardTransfer(event)) : [],
            etherscanUrl: this.transactionsService.getEtherscanLink(txHash),
            hash: txHash,
            poolName,
          };
        };

        const joins = this.groupBy(txJoinEvents, txJoinEvent => txJoinEvent.transactionHash);
        const exits = this.groupBy(txExitEvents, txExitEvent => txExitEvent.transactionHash);
        const transactions = new Array<ITransaction>();

        for (let [txHash, events] of Array.from(joins)) {
          transactions.push(await newPoolTx(true, txHash, events, crPool.name));
        }

        for (let [txHash, events] of Array.from(exits)) {
          transactions.push(await newPoolTx(false, txHash, events, crPool.name));
        }

        for (let event of txStakedEvents) {
          transactions.push(await newStakingTx(false, event, crPool.name));
        }

        for (let event of txStakeWithdrawnEvents) {
          transactions.push(await newStakingTx(true, event, crPool.name));
        }

        this.transactions = transactions.sort((a: ITransaction, b: ITransaction) =>
          SortService.evaluateDateTime(a.date.toISOString(), b.date.toISOString()));

      } catch(ex) {
        this.eventAggregator.publish("handleException", new EventConfigException("Sorry, an error occurred", ex));
      }
      finally {
        this.loading = false;
      }
    }
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
