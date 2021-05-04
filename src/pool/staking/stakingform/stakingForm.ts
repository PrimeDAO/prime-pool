import { BigNumber } from "ethers";
import { FarmService } from "services/FarmService";
import { autoinject, singleton, computedFrom } from "aurelia-framework";
import { Farm } from "entities/farm";
import { Address } from "services/EthereumService";
import { Router, Redirect } from "aurelia-router";
import "./stakingForm.scss";
import { EventAggregator } from "aurelia-event-aggregator";
import TransactionsService from "services/TransactionsService";

@singleton(false)
@autoinject
export class StakingForm {

  farmAddress: Address;
  farm: Farm;
  amountToStake: BigNumber;
  changingFarm: boolean;

  get userRewardTokenBalance(): BigNumber {
    return this.farm.pool.assetTokens.get(this.farm.rewardTokenAddress).userBalance;
  }

  @computedFrom("farm.pool.userPoolTokenBalance")
  get userStakingTokenBalance(): BigNumber {
    return this.farm.pool.userPoolTokenBalance;
  }

  constructor(
    private eventAggregator: EventAggregator,
    private router: Router,
    private transactionsService: TransactionsService,
    private farmService: FarmService,
  ) { }

  public async activate(model: { farmAddress: Address }): Promise<void> {
    if (this.farmAddress && (this.farmAddress !== model.farmAddress)) {
      this.changingFarm = true;
      this.farm = null;
      // throw new Error("internal error: cannot change farm address");
    } else {
      this.changingFarm = false;
    }
    if (this.farmAddress !== model.farmAddress) {
      this.farmAddress = model.farmAddress;
      this.farm = this.farmService.farms.get(model.farmAddress);
    }
  }

  public async attached(): Promise<void> {
    if (this.changingFarm) {
      this.amountToStake = null;
    }
  }

  public canActivate(model: { farmAddress: Address }): Redirect | boolean | undefined {
    const farm = this.farmService.farms.get(model.farmAddress);
    if (!farm?.connected) {
      // this.eventAggregator.publish("handleInfo", "Please connect to a wallet");
      return false;
    } else {
      return true;
    }
  }

  @computedFrom("amountToStake", "farm.stakingTokenAllowance")
  private get stakingTokenHasSufficientAllowance(): boolean {
    return !this.amountToStake || this.farm.stakingTokenAllowance.gte(this.amountToStake);
  }

  private assetsAreLocked(issueMessage = true): boolean {
    let message: string;
    if (!this.stakingTokenHasSufficientAllowance) {
      message = `You need to unlock ${this.farm.stakingTokenInfo.symbol} for the transfer`;
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
   * return is valid enough to submit, except for checking unlocked condition
   */
  @computedFrom("amountToStake", "userStakingTokenBalance")
  private get invalid(): string {
    let message: string;

    if (!this.amountToStake || this.amountToStake.eq(0)) {
      message = `You must enter an amount of ${this.farm.stakingTokenInfo.symbol} to farm`;
    }

    else if (this.amountToStake.gt(this.userStakingTokenBalance)) {
      message = `You don't have enough ${this.farm.stakingTokenInfo.symbol} to farm the amount you requested`;
    }

    return message;
  }

  private isValid(): boolean {
    const message = this.invalid;

    if (message) {
      this.eventAggregator.publish("handleValidationError", message);
    }

    return !message;
  }

  private async handleSubmit(): Promise<void> {
    if (this.farm.connected) {
      if (this.isValid() && this.assetsAreLocked()) {
        await this.farm.stake(this.amountToStake);
      }
    }
  }

  private async unlock() {
    if (this.farm.connected) {
      if (await this.transactionsService.send(() => this.farm.stakingTokenContract.approve(this.farm.address, this.amountToStake))) {
        this.farm.hydrateUserValues();
      }
    }
  }

  handleGetMaxPoolToken(): void {
    this.amountToStake = this.userStakingTokenBalance;
  }

  goBack(): void {
    this.router.navigateBack();
  }
}
