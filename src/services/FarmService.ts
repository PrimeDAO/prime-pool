import { autoinject } from "aurelia-framework";
import axios from "axios";
import { EventAggregator } from "aurelia-event-aggregator";
import { EventConfigException } from "services/GeneralEvents";
import { Container } from "aurelia-dependency-injection";
import { Address, EthereumService } from "services/EthereumService";
import { Farm } from "entities/farm";

interface IFarmAddresses {
  pool: Address;
  farm: Address;
}

interface IFarmConfigInternal {
  /**
   * one set of address for each chain
   */
  addresses: Array<{ [network: string]: IFarmAddresses }>;
  name: string;
}

export interface IFarmConfig {
  name: string;
  poolAddress: Address;
  address: Address;
}

@autoinject
export class FarmService {

  /**
   * farm by farm address
   */
  public farms: Map<Address, Farm>;
  /**
   * Farm by pool address
   */
  public poolFarms: Map<Address, Farm>;
  public get farmsArray(): Array<Farm> {
    return Array.from(this.farms.values());
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
    this.container.registerTransient(Farm);
  }

  public async initialize(): Promise<void> {
    return this.createFarms();
  }

  private createFarms(): Promise<void> {
    return this.initializedPromise = new Promise(
      // eslint-disable-next-line no-async-promise-executor
      async (resolve: (value: void | PromiseLike<void>) => void,
        reject: (reason?: any) => void): Promise<void> => {
        if (!this.farms?.size) {
          try {
            const farmsMap = new Map<Address, Farm>();
            const poolFarmsMap = new Map<Address, Farm>();
            const farmsConfig = (process.env.NODE_ENV === "development") ?
              require("poolConfigurations/farms.json") :
              await axios.get("https://raw.githubusercontent.com/PrimeDAO/prime-pool-dapp/master/src/poolConfigurations/farms.json")
                .then((response) => response.data);

            for (const config of farmsConfig as Array<IFarmConfigInternal>) {
              const farm = await this.createFarmFromConfig(config);
              if (farm) {
                // assign random key to preview pools
                farmsMap.set(farm.address, farm);
                poolFarmsMap.set(farm.poolAddress, farm);
              }
            }
            this.farms = farmsMap;
            this.poolFarms = poolFarmsMap;
            this.initializing = false;
            resolve();
          } catch (error) {
            this.farms = new Map();
            this.poolFarms = new Map();
            this.eventAggregator.publish("handleException", new EventConfigException("Sorry, an error occurred loading farms", error));
            this.initializing = false;
            reject();
          }
        }
      });
  }

  private async createFarmFromConfig(config: IFarmConfigInternal): Promise<Farm> {
    const farmConfig = {
      poolAddress: config.addresses[this.ethereumService.targetedNetwork].pool,
      address: config.addresses[this.ethereumService.targetedNetwork].farm,
      name: config.name,
    };

    let newFarm: Farm;

    if (farmConfig.address && farmConfig.poolAddress) {
      const farm = this.container.get(Farm);
      newFarm = await farm.initialize(farmConfig);
    } else {
      newFarm = null;
    }
    return newFarm;
  }

  public ensureInitialized(): Promise<void> {
    return this.initializedPromise;
  }
}
