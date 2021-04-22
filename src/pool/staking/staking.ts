import { FarmService } from "./../../services/FarmService";
// import { EventAggregator } from "aurelia-event-aggregator";
import { autoinject, computedFrom, singleton } from "aurelia-framework";
import { Farm } from "entities/farm";
import { Address } from "services/EthereumService";
import { Router } from "aurelia-router";
// import { BigNumber } from "ethers";
// import { Address } from "services/EthereumService";
import "./staking.scss";
// import { Redirect } from "aurelia-router";

@singleton(false)
@autoinject
export class Staking {

  private farm: Farm;
  // private model: IStakingModel;
  // private bPrimeAmount: BigNumber;

  constructor(
    //private eventAggregator: EventAggregator
    private router: Router,
    private farmService: FarmService,
  ) {}

  public async activate(model: { farmAddress: Address }): Promise<void> {
    this.farm = this.farmService.farms.get(model.farmAddress);
  }

  // @computedFrom("model.poolTokenAllowances")
  // private get bPrimeAllowance(): BigNumber {
  //   return this.model.poolTokenAllowances.get(this.model.bPrimeTokenAddress);
  // }

  // @computedFrom("bPrimeAmount", "bPrimeAllowance")
  // private get bPrimeHasSufficientAllowance(): boolean {
  //   return !this.bPrimeAmount || this.bPrimeAllowance.gte(this.bPrimeAmount);
  // }

  // private assetsAreLocked(issueMessage = true): boolean {
  //   let message: string;
  //   if (!this.bPrimeHasSufficientAllowance) {
  //     message = "You need to unlock BPRIME for transfer";
  //   }

  //   if (message) {
  //     if (issueMessage) {
  //       this.eventAggregator.publish("handleValidationError", message);
  //     }
  //     return false;
  //   }

  //   return true;
  // }

  // /**
  //  * return is valid enough to submit, except for checking unlocked condition
  //  */
  // @computedFrom("bPrimeAmount", "userBPrimeBalance")
  // private get invalid(): string {
  //   let message: string;

  //   if (!this.bPrimeAmount || this.bPrimeAmount.eq(0)) {
  //     message = "You must enter an amount of BPRIME to stake";
  //   }

  //   else if (this.bPrimeAmount.gt(this.model.userBPrimeBalance)) {
  //     message = "You don't have enough BPRIME to stake the amount you requested";
  //   }

  //   return message;
  // }

  // private isValid(): boolean {
  //   const message = this.invalid;

  //   if (message) {
  //     this.eventAggregator.publish("handleValidationError", message);
  //   }

  //   return !message;
  // }

  // private unlock() {
  //   this.model.stakingSetTokenAllowance(this.bPrimeAmount);
  // }

  // private handleSubmit(): void {
  //   if (this.isValid() && this.assetsAreLocked()) {
  //     this.model.stakingStake(this.bPrimeAmount);
  //   }
  // }

  // private handleGetMaxPoolToken() {
  //   this.bPrimeAmount = this.model.userBPrimeBalance;
  // }
  goBack(): void {
    this.router.navigateBack();
  }
}

// interface IStakingModel {
//   connected: boolean;
//   userBPrimeBalance: BigNumber
//   bPrimeTokenAddress: Address;
//   poolTokenAllowances: Map<Address, BigNumber>;
//   stakingSetTokenAllowance(amount: BigNumber): void;
//   stakingStake(amount: BigNumber): Promise<void>;
// }