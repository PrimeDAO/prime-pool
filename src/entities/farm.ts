import { BigNumber } from "ethers";
import { IFarmConfig } from "services/FarmService";
import { autoinject } from "aurelia-framework";
import { ContractNames, ContractsService } from "services/ContractsService";
import { Address, EthereumService } from "services/EthereumService";
import { NumberService } from "services/numberService";
import { DisposableCollection } from "services/DisposableCollection";
import { EventAggregator } from "aurelia-event-aggregator";
import { ConsoleLogService } from "services/ConsoleLogService";
import { DateService } from "services/DateService";
import { Pool } from "entities/pool";
import { PoolService } from "services/PoolService";


@autoinject
export class Farm implements IFarmConfig {
  /**
   * IFarmConfig properties....
   */
  poolAddress: Address;
  address: Address;
  name: string;
  /**
   * additional propoerties...
   */
  contract: any;
  pool: Pool;
  public connected = false;
  private subscriptions: DisposableCollection = new DisposableCollection();

  public constructor(
    private contractsService: ContractsService,
    private ethereumService: EthereumService,
    private eventAggregator: EventAggregator,
    private poolService: PoolService,
  ) {

    this.subscriptions.push(this.eventAggregator.subscribe("Contracts.Changed", async () => {
      await this.loadContracts();
      this.hydrateUserValues();
    }));

    this.subscriptions.push(this.eventAggregator.subscribe("ethWethExchanged", async () => {
      this.hydrateUserValues();
    }));
  }

  /**
   * assumes the relevant properties have been previously loaded.
   * @param config
   * @param full
   */
  private async loadContracts(
    contract?: any,
  ): Promise<void> {

    this.contract = contract ?? await this.contractsService.getContractAtAddress(
      ContractNames.STAKINGREWARDS,
      this.address);
  }

  /**
  * @param config pass `this` to refresh
  * @param full true to load contracts and hydrate everything.  false to keep contracts and the list of tokens.
  */
  public async initialize(config: IFarmConfig, full = true): Promise<Farm> {
    /**
     * do a partial initialization only if the pool has previously been initialized
     * !full means the list of tokens will be retained, but their values will be refreshed.
     */
    if (!full && !this.address) {
      full = true; // shoudn't ever happen
    }

    if (full) {
      Object.assign(this, config);
    }

    if (full) {
      await this.loadContracts();

      await this.poolService.ensureInitialized();
      this.pool = this.poolService.pools.get(this.poolAddress);

      await this.loadContracts();

      // this.swapfee = await this.bPool.getSwapFee();
      // this.swapfeePercentage = this.numberService.fromString(toBigNumberJs(fromWei(this.swapfee)).times(100).toString());
    } else {
    }

    await this.hydrateUserValues();

    return this;
  }

  public async refresh(full = false): Promise<Farm> {
    return this.initialize(this, full);
  }

  public async hydrateUserValues(): Promise<void> {

    const accountAddress = this.ethereumService.defaultAccountAddress;

    if (accountAddress) {
      // this.primeFarmed = await this.stakingRewards.earned(accountAddress);
      // this.bPrimeStaked = await this.stakingRewards.balanceOf(accountAddress);
      this.connected = true;
    } else {
      this.connected = false;

      // this.primeFarmed =
      // this.bPrimeStaked = undefined;
    }
  }

  public ensureConnected(): boolean {
    return this.ethereumService.ensureConnected();
  }
}
