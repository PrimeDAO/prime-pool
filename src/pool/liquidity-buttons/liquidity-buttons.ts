import { Router } from "aurelia-router";
import { autoinject, bindable } from "aurelia-framework";
import { Pool } from "entities/pool";
import { EthereumService } from "services/EthereumService";
import { Farm } from "entities/farm";

@autoinject
export class LiquidityButtons {

  @bindable pool?: Pool;
  @bindable farm?: Farm;

  constructor(
    private router: Router,
    private ethereumService: EthereumService) {
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
      this.router.navigate(`/pool/${this.pool.address}/farm/${this.farm.address}`);
    }
  }

  stakingHarvest(): void {
    if (this.farm.connected) {
    }
  }

  stakingExit(): void {
    if (this.farm.connected) {
    }
  }

  connect(): void {
    this.ethereumService.ensureConnected();
  }
}
