import { Router } from "aurelia-router";
import { autoinject, bindable } from "aurelia-framework";
import { Pool } from "entities/pool";

@autoinject
export class LiquidityButtons {

  @bindable pool: Pool;

  constructor(private router: Router) {
  }

  gotoAddLiquidity() {
    this.pool.ensureConnected();
    this.router.navigate(`/pool/${this.pool.address}/overview/add`);
  }

  gotoRemoveLiquidity() {
    this.pool.ensureConnected();
    this.router.navigate(`/pool/${this.pool.address}/overview/remove`);
  }
}
