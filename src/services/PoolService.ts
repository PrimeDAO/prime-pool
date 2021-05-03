import { autoinject } from "aurelia-framework";
import axios from "axios";
import { EventAggregator } from "aurelia-event-aggregator";
import { EventConfigException } from "services/GeneralEvents";
import { Container } from "aurelia-dependency-injection";
import { Address, EthereumService } from "services/EthereumService";
import { Pool } from "../entities/pool";

interface IPoolConfigInternal {
  /**
   * one address for each chain
   */
  addresses: Array<{ [network: string]: string }>;
  description: string;
  icon: string;
  isPrimePool: boolean;
  name: string;
  preview: boolean;
  story: string;
}

export interface IPoolConfig {
  /**
   * crPool address
   */
  address: Address;
  description: string;
  /**
   * SVG icon for the pool
   */
  icon: string;
  isPrimePool: boolean;
  name: string;
  /**
   * the pool doesn't actually exist yet, but we want to present a preview in the UI
   */
  preview: boolean;
  story: string;
}

@autoinject
export class PoolService {

  public pools: Map<Address, Pool>;
  public get poolsArray(): Array<Pool> {
    return Array.from(this.pools.values());
  }
  public initializing = true;
  private initializedPromise: Promise<void>;

  constructor(
    private ethereumService: EthereumService,
    private eventAggregator: EventAggregator,
    private container: Container,
  ) {
    /**
     * otherwise singleton is the default
     */
    this.container.registerTransient(Pool);
  }

  public async initialize(): Promise<void> {
    return this.createPools();
  }

  private async createPools(): Promise<void> {
    return this.initializedPromise = new Promise(
      // eslint-disable-next-line no-async-promise-executor
      async (resolve: (value: void | PromiseLike<void>) => void,
        reject: (reason?: any) => void): Promise<void> => {
        if (!this.pools?.size) {
          try {
            const poolsMap = new Map<Address, Pool>();
            const poolsConfig = (process.env.NODE_ENV === "development") ?
              require("poolConfigurations/pools.json") :
              await axios.get("https://raw.githubusercontent.com/PrimeDAO/prime-pool-dapp/master/src/poolConfigurations/pools.json")
                .then((response) => response.data);

            for (const config of poolsConfig as Array<IPoolConfigInternal>) {
              const pool = await this.createPoolFromConfig(config);
              // assign random key to preview pools
              poolsMap.set(pool.preview ? Math.random().toString() : pool.address, pool);
            }
            this.pools = poolsMap;
            this.initializing = false;
            resolve();
          } catch (error) {
            this.pools = new Map();
            this.eventAggregator.publish("handleException", new EventConfigException("Sorry, an error occurred loading pools", error));
            this.initializing = false;
            reject();
          }
        }
      });
  }

  private createPoolFromConfig(config: IPoolConfigInternal): Promise<Pool> {
    const poolConfig = {
      address: config.addresses[this.ethereumService.targetedNetwork],
      description: config.description,
      icon: config.icon,
      isPrimePool: config.isPrimePool,
      name: config.name,
      preview: !config.addresses[this.ethereumService.targetedNetwork],
      story: config.story,
    };
    const pool = this.container.get(Pool);
    return pool.initialize(poolConfig);
  }

  public ensureInitialized(): Promise<void> {
    return this.initializedPromise;
  }
}
