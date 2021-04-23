import { EventAggregator } from "aurelia-event-aggregator";
import { Router } from "aurelia-router";
import { autoinject, bindable } from "aurelia-framework";
import { Pool } from "entities/pool";
import { EthereumService } from "services/EthereumService";
import { Farm } from "entities/farm";
import { EventConfigFailure } from "services/GeneralEvents";

@autoinject
export class LiquidityButtons {

  @bindable pool?: Pool;
  @bindable farm?: Farm;

  constructor(
    private router: Router,
    private ethereumService: EthereumService,
    private eventAggregator: EventAggregator) {
  }

  gotoAddLiquidity(): void {
    if (this.pool.connected) {
      this.router.navigate(`/pool/${this.pool.address}/overview/add`);
    }
  }

  gotoRemoveLiquidity(): void {
    if (this.pool.connected) {
      this.router.navigate(`/pool/${this.pool.address}/overview/remove`);
    }
  }

  stake(): void {
    if (this.farm.connected) {
      this.router.navigate(`/pool/${this.farm.pool.address}/farm/${this.farm.address}/stakingForm`);
    }
  }

  stakingHarvest(): void {
    if (this.farm.connected) {
      if (this.farm.rewardTokenRewardable.isZero()) {
        this.eventAggregator.publish("handleValidationError", new EventConfigFailure(`You haven't earned any ${this.farm.rewardTokenInfo.symbol}, so there is nothing withdraw`));
      } else {
        this.farm.stakingHarvest();
      }
    }
  }

  stakingExit(): void {
    if (this.farm.connected) {
      if (this.farm.stakingTokenFarming.isZero()) {
        this.eventAggregator.publish("handleValidationError", new EventConfigFailure(`You have no ${this.farm.stakingTokenInfo.symbol} in the farm, so there is nothing to exit`));
      } else {
        this.farm.stakingExit();
      }
    }
  }

  connect(): void {
    this.ethereumService.ensureConnected();
  }
}
