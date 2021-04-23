import { PLATFORM } from "aurelia-pal";
import { Router, RouterConfiguration } from "aurelia-router";
import { autoinject, singleton } from "aurelia-framework";

@singleton(false)
@autoinject
export class Overview {
  router: Router;

  private configureRouter(config: RouterConfiguration, router: Router) {
    config.map([
      {
        route: "",
        redirect: "story",
      }
      , {
        moduleId: PLATFORM.moduleName("./story/story"),
        name: "story",
        route: "story",
      }
      , {
        moduleId: PLATFORM.moduleName("./add/add"),
        name: "add",
        route: "add",
        title: "Buy",
      }
      , {
        moduleId: PLATFORM.moduleName("./remove/remove"),
        name: "remove",
        route: "remove",
        title: "Redeem",
      },
      // , {
      //   moduleId: PLATFORM.moduleName("./staking/staking"),
      //   name: "staking",
      //   route: ["staking"],
      //   title: "Staking",
      // }
    ]);

    this.router = router;
  }
}
