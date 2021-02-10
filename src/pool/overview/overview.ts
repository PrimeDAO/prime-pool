import { PLATFORM } from "aurelia-pal";
import { Router, RouterConfiguration } from "aurelia-router";
import { autoinject, singleton } from "aurelia-framework";
import { Pool } from "entities/pool";
import { Address } from "services/EthereumService";
import { PoolService } from "services/PoolService";
// import { Router } from "aurelia-router";
// import { EventAggregator } from "aurelia-event-aggregator";
// import { EthereumService } from "services/EthereumService";
// import { PoolService } from "services/PoolService";

@singleton(false)
@autoinject
export class Overview {
  pool: Pool;
  router: Router;

  constructor(
    private poolService: PoolService) {
  }

  protected async activate(model: { poolAddress: Address }): Promise<void> {
    this.pool = this.poolService.poolConfigs.get(model.poolAddress);
  }

  private configureRouter(config: RouterConfiguration, router: Router) {

    // config.title = "primepool.eth";
    // config.options.pushState = true;
    // // const isIpfs = (window as any).IS_IPFS;
    // // if (isIpfs) {
    // //   this.consoleLogService.handleMessage(`Routing for IPFS: ${window.location.pathname}`);
    // // }
    // config.options.root = "/"; // window.location.pathname; // to account for IPFS
    /**
     * first set the landing page.
     * it is possible to be connected but have the wrong chain.
     */
    config.map([
      {
        route: "",
        redirect: "story",
      }
      , {
        moduleId: PLATFORM.moduleName("./story/story"),
        name: "story",
        route: "story",
        // title: "Pool ${where}",
      }
      , {
        moduleId: PLATFORM.moduleName("./add/add"),
        name: "add",
        route: "add",
        //title: "Buy ${title}",
      }
      , {
        moduleId: PLATFORM.moduleName("./remove/remove"),
        name: "remove",
        route: "remove",
        //title: "Redeem ${title}",
      }
      // , {
      //   moduleId: PLATFORM.moduleName("./staking/staking"),
      //   name: "staking",
      //   route: ["staking"],
      //   title: "Staking",
      // }
    ]);

    this.router = router;
  }

  // async getStakingAmounts(): Promise<void> {
  //   this.currentAPY =
  //   ((this.numberService.fromString(fromWei((await this.stakingRewards.initreward()))) / 30)
  //   * this.primePrice * 365) / this.liquidityBalance;
  // }

  // async getLiquidityAmounts(): Promise<void> {
  //   try {
  //     const prices = await this.tokenService.getTokenPrices([]);

  //     // for APY
  //     this.primePrice = prices.primedao;

  //     const priceWethLiquidity =
  //       this.numberService.fromString(fromWei(await this.bPool.getBalance(this.contractsService.getContractAddress(ContractNames.WETH)))) *
  //       prices.weth;

  //     const pricePrimeTokenLiquidity =
  //         this.numberService.fromString(fromWei(await this.bPool.getBalance(this.contractsService.getContractAddress(ContractNames.PRIMETOKEN)))) *
  //       prices.primedao;

  //     this.liquidityBalance = priceWethLiquidity + pricePrimeTokenLiquidity;

  //     const poolBalances = new Map();
  //     poolBalances.set(this.primeTokenAddress, await this.primeToken.balanceOf(this.contractsService.getContractAddress(ContractNames.BPOOL)));
  //     poolBalances.set(this.wethTokenAddress, await this.weth.balanceOf(this.contractsService.getContractAddress(ContractNames.BPOOL)));
  //     this.poolBalances = poolBalances;

  //     this.poolTotalBPrimeSupply = await this.bPrimeToken.totalSupply();

  //     this.poolTotalDenormWeight = await this.bPool.getTotalDenormalizedWeight();

  //   } catch (ex) {

  //     this.eventAggregator.publish("handleException",
  //       new EventConfigException("Unable to fetch a token price", ex));
  //     this.poolBalances =
  //     this.liquidityBalance = undefined;
  //   }
  // }

  // async getTokenAllowances(): Promise<void> {
  //   const allowances = new Map();
  //   await allowances.set(this.primeTokenAddress, await this.primeToken.allowance(
  //     this.ethereumService.defaultAccountAddress,
  //     this.contractsService.getContractAddress(ContractNames.ConfigurableRightsPool)));
  //   await allowances.set(this.wethTokenAddress, await this.weth.allowance(
  //     this.ethereumService.defaultAccountAddress,
  //     this.contractsService.getContractAddress(ContractNames.ConfigurableRightsPool)));
  //   await allowances.set(this.bPrimeTokenAddress, await this.bPrimeToken.allowance(
  //     this.ethereumService.defaultAccountAddress,
  //     this.contractsService.getContractAddress(ContractNames.STAKINGREWARDS)));
  //   this.poolTokenAllowances = allowances;
  // }

  // async handleDeposit() {
  //   if (this.ensureConnected()) {
  //     if (this.ethWethAmount.gt(this.userEthBalance)) {
  //       this.eventAggregator.publish("handleValidationError", new EventConfigFailure("You don't have enough ETH to wrap the amount you requested"));
  //     } else {
  //       await this.transactionsService.send(() => this.weth.deposit({ value: this.ethWethAmount }));
  //       // TODO:  should happen after mining
  //       this.getUserBalances();
  //     }
  //   }
  // }

  // async handleWithdraw() {
  //   if (this.ensureConnected()) {
  //     if (this.wethEthAmount.gt(this.userWethBalance)) {
  //       this.eventAggregator.publish("handleValidationError", new EventConfigFailure("You don't have enough WETH to unwrap the amount you requested"));
  //     } else {
  //       await this.transactionsService.send(() => this.weth.withdraw(this.wethEthAmount));
  //       this.getUserBalances();
  //     }
  //   }
  // }

  // stakeAmount: BigNumber;

  // async handleHarvestWithdraw() {
  //   if (this.ensureConnected()) {
  //     await this.transactionsService.send(() => this.stakingRewards.exit());
  //     this.getUserBalances();
  //   }
  // }

  // gotoStaking(harvest = false) {
  //   if (this.ensureConnected()) {
  //     Object.assign(this,
  //       {
  //         harvest,
  //       });

  //     const theRoute = this.router.routes.find(x => x.name === "staking");
  //     theRoute.settings.state = this;
  //     this.router.navigateToRoute("staking");
  //   }
  // }

  // async liquidityJoinswapExternAmountIn(tokenIn, tokenAmountIn, minPoolAmountOut): Promise<void> {
  //   if (this.ensureConnected()) {
  //     await this.transactionsService.send(() => this.crPool.joinswapExternAmountIn(
  //       tokenIn,
  //       tokenAmountIn,
  //       minPoolAmountOut));
  //     await this.getLiquidityAmounts();
  //     this.getUserBalances();
  //   }
  // }

  // async liquidityJoinPool(poolAmountOut, maxAmountsIn): Promise<void> {
  //   if (this.ensureConnected()) {
  //     await this.transactionsService.send(() => this.crPool.joinPool(poolAmountOut, maxAmountsIn));
  //     await this.getLiquidityAmounts();
  //     this.getUserBalances();
  //   }
  // }

  // async liquidityExit(poolAmountIn, minAmountsOut): Promise<void> {
  //   if (this.ensureConnected()) {
  //     await this.transactionsService.send(() => this.crPool.exitPool(poolAmountIn, minAmountsOut));
  //     await this.getLiquidityAmounts();
  //     this.getUserBalances();
  //   }
  // }

  // async liquidityExitswapPoolAmountIn(tokenOutAddress, poolAmountIn, minTokenAmountOut): Promise<void> {
  //   if (this.ensureConnected()) {
  //     await this.transactionsService.send(() => this.crPool.exitswapPoolAmountIn(tokenOutAddress, poolAmountIn, minTokenAmountOut));
  //     await this.getLiquidityAmounts();
  //     this.getUserBalances();
  //   }
  // }

  // async liquiditySetTokenAllowance(tokenAddress: Address, amount: BigNumber): Promise<void> {
  //   if (this.ensureConnected()) {
  //     const tokenContract = tokenAddress === this.primeTokenAddress ? this.primeToken : this.weth;
  //     await this.transactionsService.send(() => tokenContract.approve(
  //       this.contractsService.getContractAddress(ContractNames.ConfigurableRightsPool),
  //       amount));
  //     // TODO:  should happen after mining
  //     this.getTokenAllowances();
  //   }
  // }

  // async stakingSetTokenAllowance(amount: BigNumber): Promise<void> {
  //   if (this.ensureConnected()) {
  //     const tokenContract = this.bPrimeToken;
  //     await this.transactionsService.send(() => tokenContract.approve(
  //       this.contractsService.getContractAddress(ContractNames.STAKINGREWARDS),
  //       amount));
  //     // TODO:  should happen after mining
  //     this.getTokenAllowances();
  //   }
  // }

  // async stakingStake(amount: BigNumber): Promise<void> {
  //   if (this.ensureConnected()) {
  //     await this.transactionsService.send(() => this.stakingRewards.stake(amount));
  //     // TODO:  should happen after mining
  //     this.getUserBalances();
  //   }
  // }

  // async stakingHarvest(): Promise<void> {
  //   if (this.ensureConnected()) {
  //     await this.transactionsService.send(() => this.stakingRewards.getReward());
  //     // TODO:  should happen after mining
  //     this.getUserBalances();
  //   }
  // }


  // async stakingExit(): Promise<void> {
  //   if (this.ensureConnected()) {
  //     if (this.bPrimeStaked.isZero()) {
  //       this.eventAggregator.publish("handleValidationError", new EventConfigFailure("You have not staked any BPRIME, so there is nothing to exit"));
  //     } else {
  //       await this.transactionsService.send(() => this.stakingRewards.exit());
  //     }
  //     this.getUserBalances();
  //   }
  // }

  // handleGetMax() {
  //   this.wethEthAmount = this.userWethBalance;
  // }
}
