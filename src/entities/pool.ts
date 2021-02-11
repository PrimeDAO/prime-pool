import axios from "axios";
import { BigNumber } from "ethers";
import { IPoolConfig } from "services/PoolService";
import { IErc20Token, ITokenInfo, TokenService } from "services/TokenService";
import { autoinject } from "aurelia-framework";
import { ContractNames, ContractsService, IStandardEvent } from "services/ContractsService";
import { Address, EthereumService, fromWei } from "services/EthereumService";
import { NumberService } from "services/numberService";
import { toBigNumberJs } from "services/BigNumberService";

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

  public constructor(
    private contractsService: ContractsService,
    private numberService: NumberService,
    private tokenService: TokenService,
    private ethereumService: EthereumService,
    ) {
  }

  public async initialize(config: IPoolConfig): Promise<Pool> {
    Object.assign(this, config);

    const crPoolAddress = this.address;

    this.crPool = await this.contractsService.getContractAtAddress(
      ContractNames.ConfigurableRightsPool,
      crPoolAddress);

    this.bPool = await this.contractsService.getContractAtAddress(
      ContractNames.BPOOL,
      await this.crPool.bPool());

    this.crpFactory = await this.contractsService.getContractFor(ContractNames.CRPFactory);

    const poolTokenInfo = (await this.tokenService.getTokenInfoFromAddress(crPoolAddress)) as IPoolTokenInfo;
    poolTokenInfo.tokenContract = this.crPool;
    this.poolToken = poolTokenInfo;
    
    const assetTokenAddresses = await this.bPool.getCurrentTokens();
    const assetTokens = new Map<Address, IPoolTokenInfo>();
    
    for (const tokenAddress of assetTokenAddresses) {
      const tokenInfo = (await this.tokenService.getTokenInfoFromAddress(tokenAddress)) as IPoolTokenInfo;
      tokenInfo.tokenContract =
        await this.contractsService.getContractAtAddress(
        ContractNames.IERC20,
        tokenAddress);
      assetTokens.set(tokenAddress, tokenInfo);
    }

    const assetTokensArray = Array.from(assetTokens.values());

    await this.hydratePoolTokenBalances(assetTokensArray);

    await this.hydrateWeights(assetTokensArray);

    this.hydrateTotalLiquidity(assetTokensArray);
    
    this.assetTokens = assetTokens;

    await this.hydrateStartingBlock();
    await this.hydrateVolumes();

    this.poolTokenTotalSupply = await this.poolToken.tokenContract.totalSupply();
    this.poolTokenPrice = this.marketCap / this.numberService.fromString(fromWei(this.poolTokenTotalSupply));
    this.poolTokenMarketCap = this.numberService.fromString(fromWei(this.poolTokenTotalSupply)) * this.poolTokenPrice;
    this.totalDenormWeight = await this.bPool.getTotalDenormalizedWeight();
    this.swapfee = await this.bPool.getSwapFee();
    this.swapfeePercentage = this.numberService.fromString(toBigNumberJs(fromWei(this.swapfee)).times(100).toString());

    await this.hydrateUserValues();

    return this;
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

      // this.userPoolTokenAllowance = await this.poolToken.tokenContract.allowance(
      //   accountAddress,
      //   this.contractsService.getContractAddress(ContractNames.STAKINGREWARDS));

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
}
