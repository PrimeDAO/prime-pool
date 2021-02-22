import { Pool } from "entities/pool";
import { Address } from "services/EthereumService";
import { PoolService } from "services/PoolService";
import { autoinject, singleton } from "aurelia-framework";

@singleton(false)
@autoinject
export class PriceTracker {
  pool: Pool;
  data: Array<any>

  constructor(
    private poolService: PoolService) {
  }

  protected async activate(model: { poolAddress: Address }): Promise<void> {
    this.pool = this.poolService.pools.get(model.poolAddress);
    this.data = await this.pool.getMarketCapHistory();
  }
}
