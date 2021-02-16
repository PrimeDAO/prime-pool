import { BindingSignaler } from 'aurelia-templating-resources';
import { EventAggregator } from "aurelia-event-aggregator";
import { autoinject, computedFrom, singleton, ICollectionObserverSplice } from "aurelia-framework";
import { BigNumber } from "ethers";
import { toBigNumberJs } from "services/BigNumberService";
import { calcSingleOutGivenPoolIn } from "services/BalancerPoolLiquidity/helpers/math";
import { Address, EthereumService } from "services/EthereumService";
import "../liquidity.scss";
import BigNumberJs from "services/BigNumberService";
import { Router, Redirect } from "aurelia-router";
import { PoolService } from "services/PoolService";
import TransactionsService from "services/TransactionsService";
import { AureliaHelperService } from "services/AureliaHelperService";
import { PoolBase } from "pool/poolBase";
import { IPoolTokenInfo } from "entities/pool";

interface IPoolTokenInfoEx extends IPoolTokenInfo {
  inputAmount: BigNumber;
  selected: boolean;
}

const BALANCE_BUFFER = 0.01;

@singleton(false)
@autoinject
export class LiquidityRemove extends PoolBase {

  constructor(
    eventAggregator: EventAggregator,
    ethereumService: EthereumService,
    poolService: PoolService,
    private router: Router,
    private transactionsService: TransactionsService,
    private aureliaHelperService: AureliaHelperService,
    signaler: BindingSignaler
    ) {
      
      super(eventAggregator, ethereumService, poolService, signaler);
     
    }

  private showSlippage: boolean;
  private selectedTokens = new Array<IPoolTokenInfoEx>();

  protected activate(model: { poolAddress: Address }): void {

    super.activate(model);

    this.subscriptions.push(this.aureliaHelperService.createCollectionWatch(this.selectedTokens, this.handleTokenSelected.bind(this)));
  }

  public canActivate(model: { poolAddress: Address }): Redirect | boolean | undefined {
    const pool = this.poolService?.pools?.get(model.poolAddress);
    if (!pool?.connected) {
      // this.eventAggregator.publish("handleInfo", "Please connect to a wallet");
      return false;
    } else {
      return true;
    }
  }

  private _selectedToken: IPoolTokenInfoEx;

  private get selectedToken(): IPoolTokenInfoEx {
    return this._selectedToken;
  }

  private set selectedToken(newToken: IPoolTokenInfoEx) {
    this._selectedToken = newToken;
  }

  private _isMultiAsset: boolean;

  /**
   * true if more than one non-zero assets are entered
   */
  private get isMultiAsset(): boolean {
    return this._isMultiAsset;
  }

  private set isMultiAsset(is: boolean) {
    this._isMultiAsset = is;
  }

  private _isSingleAsset: boolean;

  /**
   * true if exactly one non-zero asset is entered
   */
  private get isSingleAsset(): boolean {
    return this._isSingleAsset;
  }

  private set isSingleAsset(is: boolean) {
    this._isSingleAsset = is;
  }

  private handleTokenSelected(splices: Array<ICollectionObserverSplice<IPoolTokenInfoEx>>) {
    if (splices.length > 1) {
      throw new Error(`splices should be equal to 1`);
    }

    splices.forEach(splice => {
      let token: IPoolTokenInfoEx;
      if (splice.addedCount >= 2) {
        throw new Error(`splice.addedCount should be 0 or 1`);
      }

      const valuesAdded = this.selectedTokens.slice(splice.index, splice.index + splice.addedCount);

      if (valuesAdded.length > 0) {
        if (splice.removed.length > 0) {
          throw new Error(`splice.removed.length should be 0`);
        }
        // console.log(`The following values were inserted at ${splice.index}: ${JSON.stringify(valuesAdded)}`);
        token = valuesAdded[0];
        token.selected = true;
      } else {
        if (splice.removed.length >= 2) {
          throw new Error(`splice.removed.length should be 0 or 1`);
        }

        if (splice.removed.length > 0) {
          // console.log(`The following values were removed from ${splice.index}: ${JSON.stringify(splice.removed)}`);
          token = splice.removed[0];
          token.selected = false;
        }
      }

      if (this.selectedTokens.length === 1) {
        this.selectedToken = token;
        this.isMultiAsset = false;
        this.isSingleAsset = true;
      } else if (this.selectedTokens.length > 1) {
        this.selectedToken = undefined;
        this.isMultiAsset = true;
        this.isSingleAsset = false;
      } else {
        this.selectedToken = undefined;
        this.isMultiAsset = false;
        this.isSingleAsset = false;
      }

      // this.poolTokens = null;
      // this.amounts.delete(token.address);
      // this.setTokenInput(token, null);
      setTimeout(() => this.syncWithNewPoolTokenAmount(), 100);
      this.signaler.signal("selectedTokenChanged");
    });
  }

  // @computedFrom("model.poolUsersTokenShare")
  // private get userPrimePoolShare(): BigNumber {
  //   return this.model.poolUsersTokenShare?.get(this.model.primeTokenAddress);
  // }

  // @computedFrom("model.poolUsersTokenShare")
  // private get userWethPoolShare(): BigNumber {
  //   return this.model.poolUsersTokenShare?.get(this.model.wethTokenAddress);
  // }

  private setTokenSelected(token: IPoolTokenInfoEx, newValue: boolean): void {
    /**
     * these will end up in handleTokenSelected
     */
    if (token.selected !== newValue) {
      if(newValue) {
        this.selectedTokens.push(token);
      } else {
        const index = this.selectedTokens.indexOf(token, 0);
        if (index > -1) {
          this.selectedTokens.splice(index, 1);
        }
      }
    }
  }

  private _poolTokenInputAmount: BigNumber;

  @computedFrom("_poolTokenInputAmount")
  private get poolTokenAmount(): BigNumber {
    return this._poolTokenInputAmount;
  }

  private set poolTokenAmount(newValue: BigNumber) {
    this._poolTokenInputAmount = newValue;
    this.syncWithNewPoolTokenAmount();
  }

  private syncWithNewPoolTokenAmount(): void {
    for (const token of this.selectedTokens) {
      token.inputAmount = this.computeTokenToRemoveAmount(token);
    }
    // TODO: figure out smarter way to handle this dependency
    this.refreshShowSlippage();
  }

  private refreshShowSlippage() {
    this.showSlippage =
      this.selectedToken &&
      !this.getInvalid() &&
      this.poolTokenAmount?.gt(0);
  }

  private getSlippage(): string {
    this.refreshShowSlippage();
    if (!this.showSlippage) {
      return undefined;
    }
    const token = this.selectedToken;
    const tokenBalance = toBigNumberJs(token.balanceInPool);
    const poolTokenShares = toBigNumberJs(this.pool.poolTokenTotalSupply);
    const tokenWeight = toBigNumberJs(token.denormWeight);
    const totalWeight = toBigNumberJs(this.pool.totalDenormWeight);
    const swapfee = toBigNumberJs(this.pool.swapfee);

    let amount = toBigNumberJs(this.poolTokenAmount);

    let amountOut: BigNumberJs;
    let expectedAmount: BigNumberJs;

      if (amount.div(poolTokenShares).gt(0.99)) {
        // Invalidate user's attempt to withdraw the entire pool supply in a single token
        // At amounts close to 100%, solidity math freaks out
        return "";
      }
      amountOut = calcSingleOutGivenPoolIn(
        tokenBalance,
        tokenWeight,
        poolTokenShares,
        totalWeight,
        amount,
        swapfee);

      expectedAmount = amount
        .times(totalWeight)
        .times(tokenBalance)
        .div(poolTokenShares)
        .div(tokenWeight);

    return toBigNumberJs(1)
      .minus(amountOut.div(expectedAmount))
      .times(100)
      .toString();
  }

  private computeTokenToRemoveAmount(token: IPoolTokenInfoEx): BigNumber {
    if (!this.poolTokenAmount || this.poolTokenAmount.eq(0)) return BigNumber.from(0);
    const poolTokenBalance = token.balanceInPool;
    const bPoolTokenSupply = this.pool.poolTokenTotalSupply;
    if (this.isMultiAsset) {
      return BigNumber.from(toBigNumberJs(poolTokenBalance)
        .div(toBigNumberJs(bPoolTokenSupply))
        .times(toBigNumberJs(this.poolTokenAmount))
        .integerValue(BigNumberJs.ROUND_UP)
        .toString());
    } else {

      const singleOut = calcSingleOutGivenPoolIn(
        toBigNumberJs(poolTokenBalance),
        toBigNumberJs(token.denormWeight),
        toBigNumberJs(bPoolTokenSupply),
        toBigNumberJs(this.pool.totalDenormWeight),
        toBigNumberJs(this.poolTokenAmount),
        toBigNumberJs(this.pool.swapfee));

      if (singleOut === null) {
        return null;
      } else {
        return BigNumber.from(singleOut
          .integerValue(BigNumberJs.ROUND_UP)
          .toString());
      }
    }
  }

  private getTokenAmountOut(): BigNumberJs {

    const selectedToken = this.selectedToken;

    if (!this.selectedToken.inputAmount || this.selectedToken.inputAmount.eq(0)) return new BigNumberJs(0);

    return calcSingleOutGivenPoolIn(
      toBigNumberJs(selectedToken.balanceInPool),
      toBigNumberJs(selectedToken.denormWeight),
      toBigNumberJs(this.pool.poolTokenTotalSupply),
      toBigNumberJs(this.pool.totalDenormWeight),
      toBigNumberJs(this.poolTokenAmount),
      toBigNumberJs(this.pool.swapfee),
    );
  }

  /**
   * return error message if not valid enough to submit, except for checking unlocked condition
   */
  private getInvalid(): string {
    let message: string;

    if (this.isSingleAsset) {
      if (this.selectedToken.inputAmount.gt(this.selectedToken.balanceInPool)) {
        message = "Can't remove this amount because it exceeds the amount in the pool";
      } else {
        const maxOutRatio = 1 / 3;
        const amount = toBigNumberJs(this.poolTokenAmount);
        const tokenBalance = toBigNumberJs(this.selectedToken.balanceInPool);
        const poolTokenShares = toBigNumberJs(this.pool.poolTokenTotalSupply);
        const tokenWeight = toBigNumberJs(this.pool.poolToken.denormWeight);
        const totalWeight = toBigNumberJs(this.pool.totalDenormWeight);
        const swapfee = toBigNumberJs(this.pool.swapfee);

        if (amount.div(poolTokenShares).gt(0.99)) {
          // Invalidate user's attempt to withdraw the entire pool supply in a single token
          // At amounts close to 100%, solidity math freaks out
          message = "Insufficient pool liquidity.  Reduce the amount you wish to remove.";
        } else {
          const tokenAmountOut = calcSingleOutGivenPoolIn(
            tokenBalance,
            tokenWeight,
            poolTokenShares,
            totalWeight,
            amount,
            swapfee);

          if (tokenAmountOut.div(tokenBalance).gt(maxOutRatio)) {
            message = "Insufficient pool liquidity.  Reduce the amount you wish to remove.";
          }
        }
      }
    }

    return message;
  }

  private isValid(): boolean {
    let message;

    if (this.isSingleAsset) {
      if (this.poolTokenAmount.gt(this.pool.userPoolTokenBalance)) {
        message = "Can't remove this amount because it exceeds your total share of BPRIME";
      }
    }

    if (!message) {
      message = this.getInvalid();
    }

    if (message) {
      this.eventAggregator.publish("handleValidationError", message);
    }

    return !message;
  }

  private async handleSubmit(): Promise<void> {

    if (!this.isValid()) {
      return;
    }

    if (this.isMultiAsset) {
      await this.exitPool(
        this.poolTokenAmount,
        this.pool.assetTokensArray.map(() => "0"),
      );
    } else if (this.isSingleAsset) {
      const amountOut = this.getTokenAmountOut();
      if (amountOut === null) {
        this.eventAggregator.publish("handleValidationError", "Cannot process an amount this large");
      }
      const minTokenAmountOut = amountOut
        .times(1 - BALANCE_BUFFER)
        .integerValue(BigNumberJs.ROUND_UP)
        .toString();

        this.exitswapPoolAmountIn(
        this.pool.poolToken.address,
        this.poolTokenAmount,
        minTokenAmountOut,
      );
    }
  }

  async exitPool(poolAmountIn, minAmountsOut): Promise<void> {
    if (this.ensureConnected()) {
      await this.transactionsService.send(() => this.pool.crPool.exitPool(poolAmountIn, minAmountsOut));
      await this.getLiquidityAmounts();
      this.getUserBalances();
    }
  }

  async exitswapPoolAmountIn(tokenOutAddress, poolAmountIn, minTokenAmountOut): Promise<void> {
    if (this.ensureConnected()) {
      await this.transactionsService.send(() => this.pool.crPool.exitswapPoolAmountIn(tokenOutAddress, poolAmountIn, minTokenAmountOut));
      await this.getLiquidityAmounts();
      this.getUserBalances();
    }
  }

  private handleGetMaxPoolToken() {
    this.poolTokenAmount = this.pool.userPoolTokenBalance;
  }
}

interface ILiquidityModel {
  poolBalances: Map<Address, BigNumber>;
  connected: boolean;
  liquidityExit(poolTokenAmount, minAmountsOut): Promise<void>;
  liquidityExitswapPoolAmountIn(tokenAddress, poolTokenAmount, minTokenAmountOut): Promise<void>;
  remove: boolean; // if falsy then add
  swapfee: BigNumber;
  userBPrimeBalance: BigNumber;
  poolTotalDenormWeights: Map<string, BigNumber>;
  poolTokenAddresses: Array<Address>;
  poolUsersTokenShare: Map<Address, BigNumber>;
  primeTokenAddress: Address;
  poolTotalBPrimeSupply: BigNumber;
  poolTotalDenormWeight: BigNumber;
  wethTokenAddress: Address;
}

/**
 * random TODO:  handle cases where tokens may not have 18 decimals?
 */
