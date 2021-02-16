import { BindingSignaler } from 'aurelia-templating-resources';
import { EventAggregator } from "aurelia-event-aggregator";
import { autoinject, ICollectionObserverSplice, singleton } from "aurelia-framework";
import { BigNumber } from "ethers";
import { toBigNumberJs } from "services/BigNumberService";
import { calcPoolOutGivenSingleIn } from "services/BalancerPoolLiquidity/helpers/math";
import { calcPoolTokensByRatio } from "services/BalancerPoolLiquidity/helpers/utils";
import { Address, EthereumService } from "services/EthereumService";
import "../liquidity.scss";
import BigNumberJs from "services/BigNumberService";
import { PoolService } from "services/PoolService";
import { Router, Redirect } from "aurelia-router";
import { IPoolTokenInfo } from "entities/pool";
import { AureliaHelperService } from "services/AureliaHelperService";
import { PoolBase } from "pool/poolBase";
import TransactionsService from "services/TransactionsService";

const BALANCE_BUFFER = 0.01;

interface IPoolTokenInfoEx extends IPoolTokenInfo {
  inputAmount_add: BigNumber;
  selected_add: boolean;
}

@singleton(false)
@autoinject
export class LiquidityAdd extends PoolBase {

  constructor(
    eventAggregator: EventAggregator,
    ethereumService: EthereumService,
    poolService: PoolService,
    private router: Router,
    private transactionsService: TransactionsService,
    private aureliaHelperService: AureliaHelperService,
    signaler: BindingSignaler) {

      super(eventAggregator, ethereumService, poolService, signaler);

  }

  private amounts = new Map<Address, string>();
  private showSlippage: boolean;
  private poolTokens: any;
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

  private getShowTokenUnlock(token: IPoolTokenInfoEx): boolean {
    return !this.getInvalidTokenAdd(token) && !this.getTokenHasSufficientAllowance(token);
  }

  private getTokenHasSufficientAllowance(token: IPoolTokenInfoEx): boolean {
    return token.userAllowance.gte(token?.inputAmount_add ?? BigNumber.from(0));
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
        token.selected_add = true;
      } else {
        if (splice.removed.length >= 2) {
          throw new Error(`splice.removed.length should be 0 or 1`);
        }

        if (splice.removed.length > 0) {
          // console.log(`The following values were removed from ${splice.index}: ${JSON.stringify(splice.removed)}`);
          token = splice.removed[0];
          token.selected_add = false;
        }
      }

      if (this.selectedTokens.length === 1) {
        this.selectedToken = token;
        this.isMultiAsset = false;
        this.isSingleAsset = true;
      } else if (this.selectedTokens.length > 1 ) {
        this.selectedToken = undefined;
        this.isMultiAsset = true;
        this.isSingleAsset = false;
      } else {
        this.selectedToken = undefined;
        this.isMultiAsset = false;
        this.isSingleAsset = false;
      }

      this.poolTokens = null;
      this.amounts.delete(token.address);
      this.setTokenInput(token, null);
      this.signaler.signal("selectedTokenChanged");
      this.signaler.signal("updateSlippage");
    });
  }

  private handleInputAmountChange(token) {
    this.setTokenInput(token, token.inputAmount);
  }

  private setTokenInput(token: IPoolTokenInfoEx, newValue: BigNumber): void {
    // avoid infinite loops with input component
    if (token.inputAmount_add?.toString() !== newValue?.toString()) {
      token.inputAmount_add = newValue;
    }
    setTimeout(() => { 
        this.amountChanged(token);
        this.signaler.signal("tokenInputChanged");
        this.signaler.signal("updateSlippage");
        this.signaler.signal("updateShowTokenUnlock");
        this.signaler.signal("updatePoolTokenChange");
      }, 100);
  }

  private getUserLiquidity() {
    const userShares = toBigNumberJs(this.pool.userPoolTokenBalance);
    const totalShares = toBigNumberJs(this.pool.poolTokenTotalSupply);
    const current = userShares.div(totalShares).integerValue(BigNumberJs.ROUND_UP);
    if (this.getInvalid()) {
      return {
        absolute: {
          current: BigNumber.from(userShares.toString()),
        },
        relative: {
          current: BigNumber.from(current.toString()),
        },
      };
    }

    const poolTokens = toBigNumberJs(this.poolTokens ?? "0");

    const future = userShares.plus(poolTokens)
      .div(totalShares.plus(poolTokens))
      .integerValue(BigNumberJs.ROUND_UP);

    return {
      absolute: {
        current: BigNumber.from(userShares.toString()),
        future: BigNumber.from(userShares.plus(poolTokens).toString()),
      },
      relative: {
        current: BigNumber.from(current.toString()),
        future: BigNumber.from(future.toString()),
      },
    };
  }

  private refreshShowSlippage() {
    const amount = this.amounts.get(this.selectedToken?.address);
    this.showSlippage =
      this.selectedToken &&
      !this.getInvalid() &&
      (!!amount && BigNumber.from(amount).gt(0));
  }

  private getSlippage(): string {
    this.refreshShowSlippage();
    if (!this.showSlippage) {
      return undefined;
    }
    const token = this.selectedToken;
    const tokenAddress = this.selectedToken.address;
    const tokenBalance = toBigNumberJs(token.balanceInPool);
    const poolTokenShares = toBigNumberJs(this.pool.poolTokenTotalSupply);
    const tokenWeight = toBigNumberJs(token.denormWeight);
    const totalWeight = toBigNumberJs(this.pool.totalDenormWeight);
    const swapfee = toBigNumberJs(this.pool.swapfee);

    let amount = toBigNumberJs(this.amounts.get(tokenAddress));

    let amountOut: BigNumberJs;
    let expectedAmount: BigNumberJs;

      const roundedIntAmount = toBigNumberJs(amount.integerValue(BigNumberJs.ROUND_UP));

      amountOut = calcPoolOutGivenSingleIn(
        tokenBalance,
        tokenWeight,
        poolTokenShares,
        totalWeight,
        roundedIntAmount,
        swapfee);

      expectedAmount = roundedIntAmount
        .times(tokenWeight)
        .times(poolTokenShares)
        .div(tokenBalance)
        .div(totalWeight);

    return toBigNumberJs(1)
      .minus(amountOut.div(expectedAmount))
      .times(100)
      .toString();
  }

  private amountChanged(token: IPoolTokenInfoEx): void {

    const changedAmount = token.inputAmount_add ?? BigNumber.from(0);

    const changedTokenBalance = toBigNumberJs(token.balanceInPool);
    const ratio = toBigNumberJs(changedAmount).div(changedTokenBalance);
    const poolTokenShares = toBigNumberJs(this.pool.poolTokenTotalSupply);

    if (this.isMultiAsset) {
      this.poolTokens = calcPoolTokensByRatio(
        toBigNumberJs(ratio),
        toBigNumberJs(poolTokenShares));
    } else if (this.isSingleAsset) {
      const tokenIn = this.selectedToken;
      const amount = toBigNumberJs(tokenIn.inputAmount_add);
      const tokenInBalanceIn = toBigNumberJs(tokenIn.balanceInPool);
      const maxInRatio = 1 / 2;
      if (amount.div(tokenInBalanceIn).gt(maxInRatio)) {
        return;
      }

      const tokenWeightIn = tokenIn.denormWeight;
      const tokenAmountIn = amount.integerValue(BigNumberJs.ROUND_UP);
      const totalWeight = toBigNumberJs(this.pool.totalDenormWeight);

      this.poolTokens = calcPoolOutGivenSingleIn(
        tokenInBalanceIn,
        toBigNumberJs(tokenWeightIn),
        poolTokenShares,
        totalWeight,
        tokenAmountIn,
        toBigNumberJs(this.pool.swapfee))
        .toString();
    }

    this.amounts.set(token.address, changedAmount.toString());

    if (this.isMultiAsset) {

      this.pool.assetTokensArray.map((assetToken: IPoolTokenInfoEx) => {
        const tokenAddr = assetToken.address;
        if (tokenAddr !== token.address) {
          const balancedAmountString = ratio.isNaN() ? "" :
            ratio.times(toBigNumberJs(assetToken.balanceInPool))
              .integerValue(BigNumberJs.ROUND_UP)
              .toString();

          this.amounts.set(tokenAddr, balancedAmountString);
          const balancedAmount = BigNumber.from(balancedAmountString);
          assetToken.inputAmount_add = balancedAmount;
        }
      });
    }
    // TODO: figure out smarter way to handle this dependency
    this.refreshShowSlippage();
  }

  private assetsHaveSufficientAllowance(issueMessage = true): boolean {
    let message: string;
    if (this.isMultiAsset) {
      let anyInsufficient = false;
      
      for (const token of this.selectedTokens) {
        if (!this.getTokenHasSufficientAllowance(token)) {
          anyInsufficient = true;
          break;
        }
      }

      if (anyInsufficient) {
        message = "Before adding you need to make sure all of your selected tokens are unlocked for transfer";
      }
    } else if (this.isSingleAsset) {
      const selectedToken = this.selectedToken;
      if (this.getTokenHasSufficientAllowance(selectedToken)) {
        message = `Before adding you need to unlock the ${selectedToken.symbol} tokens for transfer`;
      }
    }

    if (message) {
      if (issueMessage) {
        this.eventAggregator.publish("handleValidationError", message);
      }
      return false;
    }

    return true;
  }

  /**
   * return error message if not valid enough to submit, except for checking unlocked condition
  */
  private getInvalid(): string {
    let message: string;

    if (this.isSingleAsset) {
      message = this.getInvalidTokenAdd(this.selectedToken);

      if (!message) {
        const maxInRatio = 1 / 2;
        const amount = toBigNumberJs(this.amounts.get(this.selectedToken.address));
        const tokenBalance = toBigNumberJs(this.selectedToken.balanceInPool);

        if (amount.div(tokenBalance).gt(maxInRatio)) {
          message = "Insufficient pool liquidity.  Reduce the amount you wish to add.";
        }
      }
    } else if (this.isMultiAsset) {
      for (const token of this.selectedTokens) {
        message = this.getInvalidTokenAdd(token);
        if (message) break;
      }
    } else {
      message = `To buy ${this.pool.poolToken.symbol} you must select at least one asset to stake`;
    }

    return message;
  }

  private getInvalidTokenAdd(token: IPoolTokenInfoEx): string {
    let message: string;

    if (!token.inputAmount_add || token.inputAmount_add.isZero()) {
      message = `Please specify an amount of ${token.symbol}`;
    } else {
      if (token.inputAmount_add.gt(token.userBalance)) {
        message = `Cannot add this amount of ${token.symbol} because it exceeds your balance`;
      }
    }

    /**
     * TODO confirm this is commented-out in RA I
     */

    // if (!this.primeHasSufficientAllowance) {
    //   message = "Can't add this amount, you will exceed your balance of PRIME";
    // }

    return message;
  }

  private isValid(): boolean {
    let message;

    if (!message) {
      message = this.getInvalid();
    }

    if (message) {
      this.eventAggregator.publish("handleValidationError", message);
    }

    return !message;
  }

  private async handleSubmit(): Promise<void> {

    if (!this.isValid() || !this.assetsHaveSufficientAllowance()) {
      return;
    }

    if (this.isMultiAsset) {
    // computed by amountChanged
      const poolAmountOut = this.poolTokens;
      const maxAmountsIn =
        this.pool.assetTokensArray.map(token => {
          const tokenAddress = token.address;
          // this.amounts computed by amountChanged
          const inputAmountIn = toBigNumberJs(this.amounts.get(tokenAddress))
            .div(1 - BALANCE_BUFFER)
            .integerValue(BigNumberJs.ROUND_UP);
          const balanceAmountIn = toBigNumberJs(token.userBalance);
          const tokenAmountIn = BigNumberJs.min(inputAmountIn, balanceAmountIn);
          return tokenAmountIn.toString();
        });

      this.joinPool(poolAmountOut, maxAmountsIn);

    } else if (this.isSingleAsset) {
      const tokenIn = this.selectedToken.address;
      if (!tokenIn) {
        return;
      }

      const tokenAmountIn = toBigNumberJs(this.amounts.get(tokenIn))
        .integerValue(BigNumberJs.ROUND_UP)
        .toString();

      const minPoolAmountOut = toBigNumberJs(this.poolTokens)
        .times(1 - BALANCE_BUFFER)
        .integerValue(BigNumberJs.ROUND_UP)
        .toString();

      this.joinswapExternAmountIn(tokenIn, tokenAmountIn, minPoolAmountOut);
    }
  }

  private handleGetMaxToken(token: IPoolTokenInfoEx) {
    this.setTokenInput(token, token.userBalance);
  }

  private unlock(token: IPoolTokenInfoEx) {
    this.setTokenAllowance(token);
  }


private async joinPool(poolAmountOut, maxAmountsIn): Promise<void> {
  if (this.ensureConnected()) {
    await this.transactionsService.send(() => this.pool.crPool.joinPool(poolAmountOut, maxAmountsIn));

    await this.refresh();
    this.signaler.signal("updatePoolTokenChange");
    this.signaler.signal("updateSlippage");
    this.signaler.signal("updateShowTokenUnlock");
  }
}

  private async joinswapExternAmountIn(tokenIn, tokenAmountIn, minPoolAmountOut): Promise<void> {
  if (this.ensureConnected()) {
    await this.transactionsService.send(() => this.pool.crPool.joinswapExternAmountIn(
      tokenIn,
      tokenAmountIn,
      minPoolAmountOut));

    await this.refresh();
    this.signaler.signal("updatePoolTokenChange");
    this.signaler.signal("updateSlippage");
    this.signaler.signal("updateShowTokenUnlock");
  }
}

private async setTokenAllowance(token: IPoolTokenInfoEx): Promise<void> {
  if (this.ensureConnected()) {
    
    await this.transactionsService.send(() => token.tokenContract.approve(this.pool.address, token.inputAmount_add));

    this.getUserBalances();
    this.signaler.signal("updatePoolTokenChange");
    this.signaler.signal("updateShowTokenUnlock");
  }
}

  goBack() {
    this.router.navigateBack();
  }
}
