import { BindingSignaler } from "aurelia-templating-resources";
import { PLATFORM } from "aurelia-pal";
import { autoinject, singleton } from "aurelia-framework";
import "./pool.scss";
import { PoolBase } from "./poolBase";
import { EventAggregator } from "aurelia-event-aggregator";
import { Address, EthereumService } from "services/EthereumService";
import { PoolService } from "services/PoolService";
import { Router, RouterConfiguration, NavModel } from "aurelia-router";
import { FarmService } from "services/FarmService";
import { Farm } from "entities/farm";

@singleton(false)
@autoinject
export class PoolDashboard extends PoolBase {

  router: Router;
  farm: Farm;

  constructor(
    eventAggregator: EventAggregator,
    ethereumService: EthereumService,
    signaler: BindingSignaler,
    poolService: PoolService,
    private farmService: FarmService,
  ) {
    super(eventAggregator, ethereumService, poolService, signaler);
  }

  async activate(model: { poolAddress: Address }): Promise<void> {
    await super.activate(model);
    await this.farmService.ensureInitialized();
    this.farm = this.farmService.poolFarms.get(this.poolAddress);
  }

  private configureRouter(config: RouterConfiguration, router: Router) {
    const routes = [
      {
        route: "",
        redirect: "overview",
        settings: { isFarm: false },
      }
      , {
        moduleId: PLATFORM.moduleName("./overview/overview"),
        nav: true,
        name: "overview",
        route: "overview",
        title: "Overview",
        settings: { isFarm: false },
      }
      , {
        moduleId: PLATFORM.moduleName("./details/details"),
        nav: true,
        name: "details",
        route: "details",
        title: "Details",
        settings: { isFarm: false },
      }
      , {
        moduleId: PLATFORM.moduleName("./price-tracker/price-tracker"),
        nav: true,
        name: "priceTracker",
        route: "priceTracker",
        title: "Market Cap Tracker",
        settings: { isFarm: false },
      },
      {
        moduleId: PLATFORM.moduleName("./staking/staking"),
        nav: true,
        name: "staking",
        route: "farm/:farmAddress",
        title: "Farm",
        href: "#", // just to satisfy the router
        settings: { isFarm: true },
      },
    ];

    config.map(routes);
    config.fallbackRoute("overview");
    this.router = router;
  }

  getTabButtonRoute(navRow: NavModel): string {
    let href: string;

    if (navRow.settings.isFarm){
      href = `pool/${this.poolAddress}/farm/${this.farm?.address}`;
    } else {
      href = navRow.href;
    }
    return href;
  }
}
