import { autoinject } from "aurelia-framework";
import { EventAggregator } from "aurelia-event-aggregator";
import { EventConfig, EventConfigException } from "services/GeneralEvents";
import { Router, RouterConfiguration } from "aurelia-router";
import { PLATFORM } from "aurelia-pal";
import "./styles/styles.scss";
import "./app.scss";
import { Utils } from "services/utils";
import tippy from "tippy.js";
import { Pool } from "entities/pool";
import { PoolService } from "services/PoolService";
import { ConsoleLogService } from "services/ConsoleLogService";

@autoinject
export class App {
  constructor (
    private eventAggregator: EventAggregator,
    private poolService: PoolService,
    private consoleLogService: ConsoleLogService) { }

  router: Router;
  onOff = false;
  onOffStack = 0;
  modalMessage: string;
  initializing = true;
  pools = new Array<Pool>();
  showingMobileMenu = false;
  currentPool: Pool = null;

  errorHandler = (ex: unknown): boolean => {
    this.eventAggregator.publish("handleException", new EventConfigException("Sorry, an unexpected error occurred", ex));
    return false;
  }

  public attached(): void {
    // so all elements with data-tippy-content will automatically have a tooltip
    tippy("[data-tippy-content]");

    window.addEventListener("error", this.errorHandler);

    this.eventAggregator.subscribe("pools.loading", async (onOff: boolean) => {
      this.modalMessage = "Thank you for your patience while we initialize for a few moments...";
      this.handleOnOff(onOff);
    });

    this.eventAggregator.subscribe("transaction.sent", async () => {
      this.modalMessage = "Awaiting confirmation...";
      this.handleOnOff(true);
    });

    this.eventAggregator.subscribe("transaction.confirmed", async () => {
      this.handleOnOff(false);
    });

    this.eventAggregator.subscribe("transaction.failed", async () => {
      this.handleOnOff(false);
    });

    if (!this.pools?.length) {
      setTimeout(async () => {
        try {
          if (this.poolService.initializing) {
            await this.poolService.ensureInitialized();
          }
          this.pools = this.poolService.poolsArray;
          this.initializing = false;
        } catch (ex) {
          this.eventAggregator.publish("handleException", new EventConfigException("Sorry, an error occurred awaiting pools", ex));
        }
      }, 0);
    }
  }

  private handleOnOff(onOff: boolean): void {
    this.onOffStack += onOff ? 1 : -1;
    if (this.onOffStack < 0) {
      this.onOffStack = 0;
      this.consoleLogService.handleWarning(new EventConfig("underflow in onOffStack"));
    }
    if (this.onOffStack && !this.onOff) {
      this.onOff = true;
    } else if ((this.onOffStack === 0) && this.onOff) {
      this.onOff = false;
    }
  }

  private configureRouter(config: RouterConfiguration, router: Router) {

    config.title = "primepool.eth";
    config.options.pushState = true;
    // const isIpfs = (window as any).IS_IPFS;
    // if (isIpfs) {
    //   this.consoleLogService.handleMessage(`Routing for IPFS: ${window.location.pathname}`);
    // }
    config.options.root = "/"; // window.location.pathname; // to account for IPFS
    /**
     * first set the landing page.
     * it is possible to be connected but have the wrong chain.
     */
    config.map([
      {
        moduleId: PLATFORM.moduleName("./home/home"),
        nav: true,
        name: "home",
        route: ["", "/", "home"],
        title: "Home",
        settings: {icon: "/HomeIcon.svg"},
      }
      , {
        moduleId: PLATFORM.moduleName("./pools/pools"),
        nav: true,
        name: "pools",
        route: ["pools"],
        title: "All Pools",
        settings: {icon: "/AllPoolsIcon.svg"},
      }
      , {
        moduleId: PLATFORM.moduleName("./txHistory/tx-history"),
        nav: true,
        name: "txHistory",
        route: ["txHistory"],
        title: "Transaction History",
        settings: {icon: "/txHistoryIcon.svg"},
      }
      , {
        moduleId: PLATFORM.moduleName("./documentation/documentation"),
        nav: true,
        name: "documentation",
        route: ["documentation"],
        title: "Documentation",
        settings: { icon: "/DocumentationIcon.svg"},
      }
      , {
        moduleId: PLATFORM.moduleName("./primeToken/prime-token"),
        nav: true,
        name: "primeToken",
        route: ["primeToken"],
        title: "The PRIME Token",
        settings: {icon: "/PrimePoolIcon.svg"},
      }
      , {
        moduleId: PLATFORM.moduleName("./pool/pool"),
        name: "pool",
        route: ["pool/:poolAddress"],
        title: "Pool",
        settings: { icon: "/PoolMenuBullet.svg" },
      },
    ]);

    config.fallbackRoute("home");

    this.router = router;
  }

  goto(where: string): void {
    Utils.goto(where);
  }

  gotoPool(pool: Pool): void {
    this.showingMobileMenu = false;
    this.router.navigate(`pool/${pool.address}`);
    this.currentPool = pool;
  }

  toggleMobileMenu(): void {
    this.showingMobileMenu = !this.showingMobileMenu;
  }

  navigate(href: string): void {
    this.showingMobileMenu = false;
    this.router.navigate(href);
    this.currentPool = null;
  }
}
