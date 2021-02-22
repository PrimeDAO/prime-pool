import { Router } from "aurelia-router";
import { autoinject, bindable } from "aurelia-framework";
import { Pool } from "entities/pool";
import { EthereumService } from "services/EthereumService";

@autoinject
export class LiquidityButtons {

  @bindable pool: Pool;

  constructor(
    private router: Router,
    private ethereumService: EthereumService) {
  }

  attached() {
    // this.aureliaHelpService.createPropertyWatch(this.pool, "connected", (newValue: boolean) => {
    //     this.tippies.map((instance: Instance) => {
    //       if (newValue) {
    //         instance.setProps({ trigger: "mouseenter focus" })
    //       } else {
    //         instance.hide();
    //         instance.setProps({ trigger: "manual" })
    //       }
    //   })
    // });
  }

  gotoAddLiquidity() {
    if (this.pool.connected) {
      this.router.navigate(`/pool/${this.pool.address}/overview/add`);
    }
  }

  gotoRemoveLiquidity() {
    if (this.pool.connected) {
      this.router.navigate(`/pool/${this.pool.address}/overview/remove`);
    }
  }

  connect() {
    this.ethereumService.ensureConnected();
  }
}
