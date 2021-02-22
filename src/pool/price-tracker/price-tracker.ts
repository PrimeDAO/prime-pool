import { Pool } from "entities/pool";
import { Address } from "services/EthereumService";
import { PoolService } from "services/PoolService";
import { autoinject, singleton } from "aurelia-framework";

@singleton(false)
@autoinject
export class PriceTracker {
  pool: Pool;
  data = [
    { time: "2019-04-11", value: 80.01 },
    { time: "2019-04-12", value: 96.63 },
    { time: "2019-04-13", value: 76.64 },
    { time: "2019-04-14", value: 81.89 },
    { time: "2019-04-15", value: 74.43 },
    { time: "2019-04-16", value: 80.01 },
    { time: "2019-04-17", value: 96.63 },
    { time: "2019-04-18", value: 76.64 },
    { time: "2019-04-19", value: 81.89 },
    { time: "2019-04-20", value: 74.43 },
  ];

  constructor(
    private poolService: PoolService) {
  }

  protected async activate(model: { poolAddress: Address }): Promise<void> {
    this.pool = this.poolService.pools.get(model.poolAddress);
  }
}
