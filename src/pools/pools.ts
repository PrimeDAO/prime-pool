import { autoinject, singleton } from "aurelia-framework";
import "./pools.scss";
import { PoolService } from "services/PoolService";
import { Pool } from "entities/pool";
import { EventAggregator } from "aurelia-event-aggregator";
import { EventConfigException } from "services/GeneralEvents";
import { Utils } from "services/utils";
import { Router } from "aurelia-router";
import { EthereumService } from "services/EthereumService";

@singleton(false)
@autoinject
export class Pools {

  poolButtonColors = [
    "#298cdd",
    "#8668fc",
    "#ae5cff",
    "#5bcaa9",
    "#b14fd8",
    "#64b0c8",
    "#bf62a8",
    "#39a1d8",
    "#9a14d5",
    "#95d86e",
  ];

  poolButtonColor(index: number): string {
    return this.poolButtonColors[index % this.poolButtonColors.length];
  }

  pools: Array<Pool>;

  constructor(
    private poolService: PoolService,
    private ethereumService: EthereumService,
    private eventAggregator: EventAggregator,
    private router: Router,
  ) {

  }

  async activate(): Promise<void> {
    /**
     * do this in `activate` instead of `attached` because I'm not sure whether the child components' `attached` methods are invoked
     * before this one or after (I would bet before), and they need to be able to rely on the pools
     * already being loaded.
     *
     * In any case, the UX is cleaner this way-- one doesn't see a messy incomplete UI whle loading.
     */
    if (!this.pools?.length) {
      try {
        if (this.poolService.initializing) {
          await Utils.sleep(200);
          this.eventAggregator.publish("pools.loading", true);
          await this.poolService.ensureInitialized();
        }
        this.pools = this.poolService.poolsArray;

      } catch (ex) {
        this.eventAggregator.publish("handleException", new EventConfigException("Sorry, an error occurred", ex));
      }
      finally {
        this.eventAggregator.publish("pools.loading", false);
      }
    }
  }

  gotoPool(pool: Pool): void {
    if (!pool.preview) {
      this.router.navigate(`pool/${pool.address}`);
    }
  }

  gotoBuy(pool: Pool): void {
    this.router.navigate(`pool/${pool.address}/overview/add`);
  }

  connect(): void {
    this.ethereumService.ensureConnected();
  }
}
