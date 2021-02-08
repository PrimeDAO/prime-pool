import { autoinject, computedFrom } from "aurelia-framework";
import { EventAggregator } from "aurelia-event-aggregator";
import { Address, EthereumService} from "services/EthereumService";
import { EventConfigException } from "services/GeneralEvents";
import { PoolService } from "services/PoolService";
import { Pool } from "entities/pool";
import { Utils } from "services/utils";
import { DisposableCollection } from "services/DisposableCollection";

/**
 * base class for views that work with a pool, given `poolAddress` in the route model
 */
@autoinject
export abstract class PoolBase {
  protected poolAddress: Address;
  protected pool: Pool;
  protected initialized = false;
  protected _connected = false;
  protected subscriptions: DisposableCollection = new DisposableCollection();
  @computedFrom("_connected", "pool.connected")
  protected get connected() { return this._connected && this.pool?.connected; }

  constructor(
    protected eventAggregator: EventAggregator,
    protected ethereumService: EthereumService,
    protected poolService: PoolService) {
  }

  protected async activate(model: { poolAddress: Address }): Promise<void> {
    this.poolAddress = model.poolAddress;
  }

  protected async attached(): Promise<void> {
    this.subscriptions.push(this.eventAggregator.subscribe("Network.Changed.Account", async () => {
      await this.loadContracts();
      this.getUserBalances();
    }));
    this.subscriptions.push(this.eventAggregator.subscribe("Network.Changed.Disconnect", async () => {
      // TODO: undefine the bound variables
      this.initialized = false;
    }));

    await this.loadContracts();
    await this.initialize();
    return this.getUserBalances(true);
  }

  protected async detached(): Promise<void> {
    this.subscriptions.dispose();
  }

  protected loadContracts(): Promise<void> { return; }

  protected async initialize(): Promise<void> {
    if (!this.initialized) {
      try {

        if (this.poolService.initializing) {
          await Utils.sleep(200);
          this.eventAggregator.publish("dashboard.loading", true);
          await this.poolService.ensureInitialized();
        }
        this.pool = this.poolService.poolConfigs.get(this.poolAddress);

        // // do this after liquidity
        // await this.getStakingAmounts();
      } catch (ex) {
        this.eventAggregator.publish("handleException", new EventConfigException("Sorry, an error occurred", ex));
      }
      finally {
        this.eventAggregator.publish("dashboard.loading", false);
        this.initialized = true;
      }
    }
  }

  protected async getUserBalances(initializing = false): Promise<void> {

    if (this.initialized && this.ethereumService.defaultAccountAddress) {
      try {
        if (!initializing) {
          // timeout to allow styles to load on startup to modalscreen sizes correctly
          setTimeout(() => this.eventAggregator.publish("dashboard.loading", true), 100);
        }

        await this.pool.hydrateUserValues(this.ethereumService.defaultAccountAddress);

        // await this.getTokenAllowances();

        this._connected = true;
      } catch (ex) {
        this._connected = false;
        this.eventAggregator.publish("handleException", new EventConfigException("Sorry, an error occurred", ex));
      }
      finally {
        if (!initializing) {
          this.eventAggregator.publish("dashboard.loading", false);
        }
      }
    } else {
      this._connected = false;
    }
  }

  protected ensureConnected(): boolean {
    if (!this._connected) {
      // TODO: make this await until we're either connected or not?
      this.ethereumService.connect();
      return false;
    }
    else {
      return true;
    }
  }
}
