import "./spark-chart.scss";
import { createChart, IChartApi } from "lightweight-charts";
import {bindable} from "aurelia-framework";

export class SparkChart {
  @bindable data;
  chart: IChartApi;
  sparkChart: HTMLElement;

  attached() {
    this.chart = createChart(this.sparkChart, { height: 500 });
    const lineSeries = this.chart.addLineSeries();
    lineSeries.setData(this.data);

    // window.onresize = () => {
    //   const width = Math.min(
    //     document.body.offsetWidth,
    //     chartContainer.offsetWidth
    //   );
    //   this.chart.resize(width, chartContainer.offsetHeight);
    // };

  }

  dataChanged(newValue, oldValue) {
    //
  }
}
