import axios from "axios";
import { BigNumber } from "ethers";
import { IPoolConfig } from "services/PoolService";
import { IErc20Token, ITokenInfo, TokenService } from "services/TokenService";
import { autoinject } from "aurelia-framework";
import { ContractNames, ContractsService, IStandardEvent } from "services/ContractsService";
import { Address, EthereumService, fromWei } from "services/EthereumService";
import { NumberService } from "services/numberService";
import { toBigNumberJs } from "services/BigNumberService";
import { DisposableCollection } from "services/DisposableCollection";
import { EventAggregator } from "aurelia-event-aggregator";

export interface IJoinEventArgs {
  caller: Address;
  tokenIn: Address;
  tokenAmountIn: BigNumber;
}

export interface IExitEventArgs {
  caller: Address;
  tokenOut: Address;
  tokenAmountOut: BigNumber;
}

export interface IPoolTokenTransferEventArgs {
  from: Address;
  to: Address;
  value: BigNumber;
}



export interface IPoolTokenInfo extends ITokenInfo {
  tokenContract: IErc20Token;
  balanceInPool: BigNumber;
  denormWeight: BigNumber;
  denormWeightPercentage: number;
  normWeight: BigNumber;
  normWeightPercentage: number;
  /**
   * amount tokens held by the user, in the pool or not
   */
  userBalance?: BigNumber;
  /**
   * amount of tokens held in the pool weighted by the propertion of
   * pool tokens held by the user
   */
  userShareInPool?: BigNumber;
  /**
   * allowance for crPool to spend these tokens on the user's behalf
   */
  userAllowance?: BigNumber;
}

@autoinject
export class Pool implements IPoolConfig {
  /**
   * IPoolConfig properties....
   */
  /**
   * crPool address
   */
  address: Address;
  description: string;
  /**
   * SVG icon for the pool
   */
  icon: string;
  name: string;
  story: string;
  /**
   * additional propoerties...
   */
  crPool: any;
  crpFactory: any;
  bPool: any;
  assetTokens = new Map<Address,IPoolTokenInfo>();
  get assetTokensArray(): Array<IPoolTokenInfo> { return Array.from(this.assetTokens.values()); };
  poolToken: IPoolTokenInfo;
  /**
   * marketCap / poolTokenTotalSupply
   */
  poolTokenPrice: number;
  poolTokenTotalSupply: BigNumber;
  poolTokenMarketCap: number;
  totalDenormWeight: BigNumber;
  swapfee: BigNumber;
  swapfeePercentage: number;
  //accruedFees: number;
  accruedVolume: number;
  members: Array<Address>;
  /**
   * market cap or liquidity.  Total asset token amounts * their prices.
   */
  marketCap: number;
  totalMarketCapChangePercentage_24h: number;
  totalMarketCapChangePercentage_7d: number;
  totalMarketCapChangePercentage_30d: number;
  /**
   * amount of pool tokens held by the user
   */
  userPoolTokenBalance?: BigNumber;
  /**
   * amount of pool tokens held by the user as a proportion of the total supply of pool tokens
   */
  userPoolTokenShare?: number;
  userPoolTokenSharePercentage?: number;
  /**
   * when this contract was created
   */
  startingBlockNumber: number;
  startingDateTime: Date;

  public connected = false;
  private subscriptions: DisposableCollection = new DisposableCollection();

  public constructor(
    private contractsService: ContractsService,
    private numberService: NumberService,
    private tokenService: TokenService,
    private ethereumService: EthereumService,
    private eventAggregator: EventAggregator,
    ) {
    
    this.subscriptions.push(this.eventAggregator.subscribe("Contracts.Changed", async () => {
      await this.loadContracts();
      this.hydrateUserValues();
    }));

    /**
     * TODO:  notify the rest of the application that this is happening, because can be lengthy
     */
  //  this.subscriptions.push(this.eventAggregator.subscribe("Network.Changed.Id", async () => {
  //    // this will loadContracts and hydrate everything including user balances
  //     this.refresh(true);
  //   }));
  }

  /**
   * assumes the relevant properties have been previously loaded.
   * @param config 
   * @param full 
   */
  private async loadContracts(
    crPool?: any, 
    bPool?: any, 
    assetTokens?: Map<Address, IPoolTokenInfo>, 
    assetTokensArray?: Array<IPoolTokenInfo>): Promise<void> {

    this.crPool = crPool ?? await this.contractsService.getContractAtAddress(
      ContractNames.ConfigurableRightsPool,
      this.address);

    this.bPool = bPool ?? await this.contractsService.getContractAtAddress(
      ContractNames.BPOOL,
      await this.crPool.bPool());

    this.crpFactory = await this.contractsService.getContractFor(ContractNames.CRPFactory);

    this.poolToken.tokenContract = this.crPool;
    
    assetTokens = assetTokens ?? this.assetTokens;
    assetTokensArray = assetTokensArray ?? this.assetTokensArray;

    for (const token of assetTokensArray) {
      const tokenInfo = assetTokens.get(token.address);
      tokenInfo.tokenContract =
        await this.contractsService.getContractAtAddress(
          ContractNames.IERC20,
          token.address);
    }
 }

 /**
  * @param config pass `this` to refresh
  * @param full true to load contracts and hydrate everything.  false to keep contracts and the list of tokens.
  */
  public async initialize(config: IPoolConfig, full = true): Promise<Pool> {
    /**
     * do a partial initialization only if the pool has previously been initialized
     * !full means the list of tokens will be retained, but their values will be refreshed.
     */
    if (!full && !this.address) {
      full = true; // shoudn't ever happen
    }

    let assetTokens: Map<Address, IPoolTokenInfo>;
    let assetTokensArray: Array<IPoolTokenInfo>;

    if (full) {
      Object.assign(this, config);

      this.crPool = await this.contractsService.getContractAtAddress(
        ContractNames.ConfigurableRightsPool,
        this.address);

      this.bPool = await this.contractsService.getContractAtAddress(
        ContractNames.BPOOL,
        await this.crPool.bPool());

      this.poolToken = (await this.tokenService.getTokenInfoFromAddress(this.address)) as IPoolTokenInfo;
      
      const assetTokenAddresses = await this.bPool.getCurrentTokens();
      assetTokens = new Map<Address, IPoolTokenInfo>();
      
      for (const tokenAddress of assetTokenAddresses) {
        const tokenInfo = (await this.tokenService.getTokenInfoFromAddress(tokenAddress)) as IPoolTokenInfo;
        assetTokens.set(tokenAddress, tokenInfo);
      }

      assetTokensArray = Array.from(assetTokens.values());

      await this.loadContracts(this.crPool, this.bPool, assetTokens, assetTokensArray);

      await this.hydrateStartingBlock();

      this.swapfee = await this.bPool.getSwapFee();
      this.swapfeePercentage = this.numberService.fromString(toBigNumberJs(fromWei(this.swapfee)).times(100).toString());

    } else {
        assetTokens = this.assetTokens;
        assetTokensArray = this.assetTokensArray
    }

    await this.hydratePoolTokenBalances(assetTokensArray);

    await this.hydrateWeights(assetTokensArray);

    this.hydrateTotalLiquidity(assetTokensArray);
    
    this.assetTokens = assetTokens;

    await this.hydrateVolumes();

    this.poolTokenTotalSupply = await this.poolToken.tokenContract.totalSupply();
    this.poolTokenPrice = this.marketCap / this.numberService.fromString(fromWei(this.poolTokenTotalSupply));
    this.poolTokenMarketCap = this.numberService.fromString(fromWei(this.poolTokenTotalSupply)) * this.poolTokenPrice;
    this.totalDenormWeight = await this.bPool.getTotalDenormalizedWeight();

    await this.hydrateUserValues();

    return this;
  }

  public async refresh(full = false): Promise<Pool> {
    return this.initialize(this, full);
  }

  async hydratePoolTokenBalances(tokens: Array<IPoolTokenInfo>): Promise<void> {
    for (const token of tokens) {
      token.balanceInPool = await this.bPool.getBalance(token.address);
    }
  }

  hydrateTotalLiquidity(tokens: Array<IPoolTokenInfo>): void {

    this.marketCap = tokens.reduce((accumulator, currentValue) => 
      accumulator + this.numberService.fromString(fromWei(currentValue.balanceInPool)) * currentValue.price, 0);

    this.totalMarketCapChangePercentage_24h = tokens.reduce((accumulator, currentValue) =>
      accumulator + this.numberService.fromString(fromWei(currentValue.normWeight)) * currentValue.priceChangePercentage_24h, 0);

    this.totalMarketCapChangePercentage_7d = tokens.reduce((accumulator, currentValue) =>
      accumulator + this.numberService.fromString(fromWei(currentValue.normWeight)) * currentValue.priceChangePercentage_7d, 0);

    this.totalMarketCapChangePercentage_30d = tokens.reduce((accumulator, currentValue) =>
      accumulator + this.numberService.fromString(fromWei(currentValue.normWeight)) * currentValue.priceChangePercentage_30d, 0);
  }

  async hydrateWeights(tokens: Array<IPoolTokenInfo>): Promise<void> {
    for (const token of tokens) {
      token.denormWeight = await this.bPool.getDenormalizedWeight(token.address);
      token.denormWeightPercentage = Number(fromWei(token.denormWeight.mul(100)));
      token.normWeight = await this.bPool.getNormalizedWeight(token.address);
      token.normWeightPercentage = Number(fromWei(token.normWeight.mul(100)));
    }
  }

  async hydrateStartingBlock(): Promise<void> {
    const filter = this.crpFactory.filters.LogNewCrp(undefined, this.address);
    const txEvents: Array<IStandardEvent<unknown>> = await this.crpFactory.queryFilter(filter);
    this.startingBlockNumber = txEvents[0].blockNumber;
    const block = await this.ethereumService.getBlock(this.startingBlockNumber);
    this.startingDateTime = block.blockDate;
  }

  public async getJoinEvents(userAddress?: Address): Promise<Array<IStandardEvent<IJoinEventArgs>>> {
    const filter = this.crPool.filters.LogJoin(userAddress);
    const txEvents: Array<IStandardEvent<IJoinEventArgs>> = await this.crPool.queryFilter(filter, this.startingBlockNumber);
    return txEvents;
  }

  public async getExitEvents(userAddress?: Address): Promise<Array<IStandardEvent<IExitEventArgs>>> {
    const filter = this.crPool.filters.LogExit(userAddress);
    const txEvents: Array<IStandardEvent<IExitEventArgs>> = await this.crPool.queryFilter(filter, this.startingBlockNumber);
    return txEvents;
  }

  public async getPoolTokenTransferEvents(fromAddress?: Address, destAddress?: Address): Promise<Array<IStandardEvent<IPoolTokenTransferEventArgs>>> {
    const filter = this.crPool.filters.Transfer(fromAddress, destAddress);
    const txEvents: Array<IStandardEvent<IPoolTokenTransferEventArgs>> = await this.crPool.queryFilter(filter, this.startingBlockNumber);
    return txEvents;
  }

  async hydrateVolumes(): Promise<void> {
    const txJoinEvents = await this.getJoinEvents();
    const txExitEvents = await this.getExitEvents();

    let volume = txJoinEvents.reduce((accumulator, currentValue) =>
      accumulator + 
        this.numberService.fromString(fromWei(currentValue.args.tokenAmountIn))
          * this.assetTokens.get(currentValue.args.tokenIn).price
      , 0);

    volume += txExitEvents.reduce((accumulator, currentValue) =>
      accumulator +
      this.numberService.fromString(fromWei(currentValue.args.tokenAmountOut))
      * this.assetTokens.get(currentValue.args.tokenOut).price
      , 0);

    this.accruedVolume = volume;
  }

  public async hydrateUserValues(): Promise<void> {

    const accountAddress = this.ethereumService.defaultAccountAddress;

    if (accountAddress) {
      this.userPoolTokenBalance = await this.poolToken.tokenContract.balanceOf(accountAddress);
      this.userPoolTokenShare = toBigNumberJs(this.userPoolTokenBalance).div(this.poolTokenTotalSupply.toString()).toNumber();
      this.userPoolTokenSharePercentage = this.userPoolTokenShare / 100;

      for (const token of this.assetTokensArray) {

        token.userBalance = await token.tokenContract.balanceOf(accountAddress);

        token.userShareInPool = BigNumber.from(toBigNumberJs(token.balanceInPool).times(this.userPoolTokenShare).integerValue().toString());

        token.userAllowance = await token.tokenContract.allowance(accountAddress, this.address);
      }
      // this.primeFarmed = await this.stakingRewards.earned(accountAddress);
      // this.bPrimeStaked = await this.stakingRewards.balanceOf(accountAddress);
      this.connected = true;
  } else {
      this.connected = false;

      this.userPoolTokenBalance = 
      this.userPoolTokenShare = 
      this.userPoolTokenSharePercentage = undefined;

      for (const token of this.assetTokensArray) {
        token.userBalance = 
        token.userShareInPool = undefined;
      }
    }  
  }

  public ensureConnected(): boolean {
    return this.ethereumService.ensureConnected();
  }
}
