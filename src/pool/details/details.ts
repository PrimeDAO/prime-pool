import { Pool } from "entities/pool";
import { Address } from "services/EthereumService";
import { PoolService } from "services/PoolService";
import { autoinject, singleton } from "aurelia-framework";
import { ITokenHolder, TokenService } from "services/TokenService";

@singleton(false)
@autoinject
export class Details {
  pool: Pool;
  poolMembers: number;

  constructor(
    private poolService: PoolService,
    private tokenService: TokenService) {
  }

  protected async activate(model: { poolAddress: Address }): Promise<void> {
    this.pool = this.poolService.pools.get(model.poolAddress);
    const uniqueHolders = new Set<Address>();

    if (this.poolMembers === undefined) {
      (await this.tokenService.getHolders(this.pool.poolToken.address))
        .filter((holder: ITokenHolder) => 
        {
          return uniqueHolders.add(holder.address);
        });

      this.poolMembers = uniqueHolders.size;
    }
  }
}
