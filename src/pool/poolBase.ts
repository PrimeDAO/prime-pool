import { BindingSignaler } from 'aurelia-templating-resources';
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
  protected _connected = false;
  protected subscriptions: DisposableCollection = new DisposableCollection();
  @computedFrom("_connected", "pool.connected")
  protected get connected() { return this._connected && this.pool?.connected; }

  constructor(
    protected eventAggregator: EventAggregator,
    protected ethereumService: EthereumService,
    protected poolService: PoolService,
    protected signaler: BindingSignaler) {
  }

  protected activate(model: { poolAddress: Address }): void {

    this.subscriptions.push(this.eventAggregator.subscribe("Network.Changed.Account", async () => {
      await this.loadContracts();
      this.getUserBalances();
    }));

    this.subscriptions.push(this.eventAggregator.subscribe("Network.Changed.Disconnect", async () => {
      this.pool = null;
    }));

    this.poolAddress = model.poolAddress;
    if (this.pool && (this.pool.address !== this.poolAddress)) {
      this.pool = null;
    }
  }

  deactivate() {
    this.subscriptions.dispose();
  }

  protected async attached(): Promise<void> {
    await this.loadContracts();
    await this.initialize();
    return this.getUserBalances(false);
  }

  protected loadContracts(): Promise<void> { return; }

  protected async initialize(): Promise<void> {
    if (!this.pool) {
      try {

        if (this.poolService.initializing) {
          await Utils.sleep(200);
          this.eventAggregator.publish("pools.loading", true);
          await this.poolService.ensureInitialized();
        }
        this.pool = this.poolService.poolConfigs.get(this.poolAddress);

        // // do this after liquidity
        // await this.getStakingAmounts();
      } catch (ex) {
        this.eventAggregator.publish("handleException", new EventConfigException("Sorry, an error occurred", ex));
      }
      finally {
        this.eventAggregator.publish("pools.loading", false);
      }
    }
  }

  protected async refresh(full = false): Promise<void> {
    if (this.pool) {
      try {
        this.eventAggregator.publish("pools.loading", true);
        await this.pool.refresh(full);
        this.signaler.signal("userBalancesChanged");
        this.signaler.signal("poolBalancesChanged");
        // // do this after liquidity
        // await this.getStakingAmounts();
      } catch (ex) {
        this.eventAggregator.publish("handleException", new EventConfigException("Sorry, an error occurred", ex));
      }
      finally {
        this.eventAggregator.publish("pools.loading", false);
      }
    }
  }

  protected async getUserBalances(suppressModalLockout = true): Promise<void> {

    if (this.pool && this.ethereumService.defaultAccountAddress) {
      try {
        if (!suppressModalLockout) {
          // timeout to allow styles to load on startup to modalscreen sizes correctly
          setTimeout(() => this.eventAggregator.publish("pools.loading", true), 100);
        }
        /**
         * TODO: add "force" argument to control whether to refresh values that already exist
         */
        await this.pool.hydrateUserValues();
        this.signaler.signal("userBalancesChanged");

        this._connected = true;
      } catch (ex) {
        this._connected = false;
        this.eventAggregator.publish("handleException", new EventConfigException("Sorry, an error occurred", ex));
      }
      finally {
        if (!suppressModalLockout) {
          this.eventAggregator.publish("pools.loading", false);
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
