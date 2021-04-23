import { PLATFORM } from "aurelia-pal";
import { autoinject, singleton } from "aurelia-framework";
import { Router, RouterConfiguration } from "aurelia-router";

@singleton(false)
@autoinject
export class StakingLanding {

  private router: Router;

  private configureRouter(config: RouterConfiguration, router: Router) {
    config.map([
      {
        route: "",
        redirect: "landing",
      }
      , {
        moduleId: PLATFORM.moduleName("./landing/landing"),
        name: "landing",
        route: "landing",
      },
      {
        moduleId: PLATFORM.moduleName("./stakingForm/stakingForm"),
        name: "stakingForm",
        route: "stakingForm",
      },
    ]);
    this.router = router;
  }
}
