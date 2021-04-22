import { Aurelia } from "aurelia-framework";
import * as environment from "../config/environment.json";
import { PLATFORM } from "aurelia-pal";
import { AllowedNetworks, EthereumService, Networks } from "services/EthereumService";
import { EventConfigException } from "services/GeneralEvents";
import { ConsoleLogService } from "services/ConsoleLogService";
import { ContractsService } from "services/ContractsService";
import { EventAggregator } from "aurelia-event-aggregator";
import { PoolService } from "services/PoolService";
import { FarmService } from "services/FarmService";

export function configure(aurelia: Aurelia): void {
  aurelia.use
    .standardConfiguration()
    .feature(PLATFORM.moduleName("resources/index"))
    .plugin(PLATFORM.moduleName("aurelia-animator-css"))
    .plugin(PLATFORM.moduleName("aurelia-dialog"), (configuration) => {
      // custom configuration
      configuration.settings.keyboard = false;
    })
    // .globalResources([
    //   // PLATFORM.moduleName("dashboard/dashboard"),
    // ])
  ;

  if (process.env.NODE_ENV === "development") {
    aurelia.use.developmentLogging();
  }

  if (environment.testing) {
    aurelia.use.plugin(PLATFORM.moduleName("aurelia-testing"));
  }

  const eventAggregator = aurelia.container.get(EventAggregator);

  aurelia.start().then(async () => {
    aurelia.container.get(ConsoleLogService);
    try {
      const ethereumService = aurelia.container.get(EthereumService);
      ethereumService.initialize(
        process.env.NETWORK as AllowedNetworks ??
          (process.env.NODE_ENV === "development" ? Networks.Kovan : Networks.Mainnet));

      aurelia.container.get(ContractsService);

      eventAggregator.publish("pools.loading", true);

      const promises = [];

      const poolService = aurelia.container.get(PoolService);
      promises.push(poolService.initialize());

      const farmService = aurelia.container.get(FarmService);
      promises.push(farmService.initialize());

      Promise.all(promises).then(() => {
        eventAggregator.publish("pools.loading", false);
      });

    } catch (ex) {
      eventAggregator.publish("handleException", new EventConfigException("Sorry, couldn't connect to ethereum", ex));
      alert(`Sorry, couldn't connect to ethereum: ${ex.message}`);
    }
    aurelia.setRoot(PLATFORM.moduleName("app"));
  });
}
