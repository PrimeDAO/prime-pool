import axios from "axios";
import { EventAggregator } from "aurelia-event-aggregator";
import { autoinject, singleton } from "aurelia-framework";
import { Pool } from "entities/pool";
import { BigNumber } from "ethers";
import { toBigNumberJs } from "services/BigNumberService";
import { ContractNames, ContractsService } from "services/ContractsService";
import { EventConfigException } from "services/GeneralEvents";
import { NumberService } from "services/numberService";
import { PoolService } from "services/PoolService";
import { ITokenInfo, TokenService } from "services/TokenService";
import { Utils } from "services/utils";
import "./prime-token.scss";
import { toWei } from "services/EthereumService";

@singleton(false)
@autoinject
export class PrimeToken {

  tokenInfo: ITokenInfo;
  token: any;
  circulatingSupply: number;
  totalStaked: BigNumber;
  percentStaked: number;
  pool: Pool;
  loading = true;

  constructor(
    private tokenService: TokenService,
    private contractService: ContractsService,
    private numberService: NumberService,
    private poolService: PoolService,
    private eventAggregator: EventAggregator,
  ) {
  }

  async attached(): Promise<void> {
    try {
      if (this.poolService.initializing) {
        await Utils.sleep(100);
        this.eventAggregator.publish("pools.loading", true);
        await this.poolService.ensureInitialized();
      }


      const pools = this.poolService.poolsArray;

      const primeTokenAddress = this.contractService.getContractAddress(ContractNames.PRIMETOKEN);

      let staked = BigNumber.from(0);
      for (const pool of pools) {
        if (!pool.preview) {
          const primeTokenInfo = pool.assetTokens.get(primeTokenAddress);
          if (primeTokenInfo) {
            staked = staked.add(primeTokenInfo.balanceInPool);
          }
        }
      }

      this.totalStaked = staked;

      this.tokenInfo = await this.tokenService.getTokenInfoFromAddress(primeTokenAddress);
      this.token = this.tokenService.getTokenContract(primeTokenAddress);
      // this.totalSupply = await this.token.totalSupply();

      await axios.get("https://api.primedao.io/circulatingSupply")
        .then((response) => {
          this.circulatingSupply = response.data;
        });

      this.loading = true;
      this.percentStaked = this.numberService.fromString(toBigNumberJs(this.totalStaked).div(toBigNumberJs(toWei(this.circulatingSupply))).times(100).toString());
    } catch (ex) {
      this.eventAggregator.publish("handleException", new EventConfigException("Sorry, an error occurred getting circulating supply", ex));
    }
    finally {
      this.eventAggregator.publish("pools.loading", false);
      this.loading = false;
    }
  }
}
