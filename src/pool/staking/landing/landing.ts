import { FarmService } from "services/FarmService";
import { autoinject, singleton } from "aurelia-framework";
import { Farm } from "entities/farm";
import { Address, EthereumService, fromWei } from "services/EthereumService";
import "./landing.scss";
import { NumberService } from "services/numberService";
import { DisposableCollection } from "services/DisposableCollection";
import { EventAggregator } from "aurelia-event-aggregator";

@singleton(false)
@autoinject
export class StakingLanding {

  private farm: Farm;
  private currentAPY: number;
  private loaded = false;

  private subscriptions: DisposableCollection = new DisposableCollection();

  constructor(
    private farmService: FarmService,
    private numberService: NumberService,
    private eventAggregator: EventAggregator,
    private ethereumService: EthereumService,
  ) {
    this.subscriptions.push(this.eventAggregator.subscribe("Contracts.Changed", async () => {
      this.hydrateUserValues();
    }));
  }

  public async activate(model: { farmAddress: Address }): Promise<void> {
    this.farm = this.farmService.farms.get(model.farmAddress);
    this.hydrate();
  }

  async hydrate(): Promise<void> {

    let liquidity = 0;

    for (const token of this.farm.pool.assetTokensArray) {
      liquidity += (this.numberService.fromString(fromWei(token.balanceInPool)) * token.price);
    }

    const rewardTokenPrice = this.farm.rewardTokenInfo.price;

    this.currentAPY = liquidity ?
      (((this.numberService.fromString(fromWei((await this.farm.contract.initreward()))) / 30) * rewardTokenPrice * 365) / liquidity)
      : undefined;

    await this.hydrateUserValues();
    this.loaded = true;
  }

  async hydrateUserValues(): Promise<void> {
    if (this.ethereumService.defaultAccountAddress) {
    }
  }
}
