import { autoinject } from "aurelia-framework";
import "./spark-chart.scss";
import { createChart, IChartApi } from "lightweight-charts";
import {bindable} from "aurelia-framework";
import { NumberService } from "services/numberService";

@autoinject
export class SparkChart {
  @bindable data;
  chart: IChartApi;
  sparkChart: HTMLElement;

  constructor(private numberService: NumberService) {}

  attached(): void {
    this.chart = createChart(this.sparkChart, { height: 500 });

    const color = "#8668FC";
    const series = this.chart.addAreaSeries({
      lineColor: color,
      topColor: `${color}ff`,
      bottomColor: `${color}00`,
      priceLineVisible: false,
      priceFormat: {
        type: "custom",
        formatter: value => `${this.numberService.toString(value, {
          precision: 2,
          thousandSeparated: true,
        })}`,
      },
    });


    series.setData(this.data);

    // window.onresize = () => {
    //   const width = Math.min(
    //     document.body.offsetWidth,
    //     chartContainer.offsetWidth
    //   );
    //   this.chart.resize(width, chartContainer.offsetHeight);
    // };

  }

  dataChanged(newValue, oldValue): void {
    //
  }
}
