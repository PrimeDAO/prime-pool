import { bindable } from "aurelia-typed-observable-plugin";
import { Pool } from "entities/pool";

export class PoolOverview {
  @bindable pool: Pool;

  gotoBalancer(): void {
    window.open("https://balancer.exchange/#/swap", "_blank", "noopener noreferrer");
  }
}
