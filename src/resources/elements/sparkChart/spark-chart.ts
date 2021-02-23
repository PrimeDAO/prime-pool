import { autoinject } from "aurelia-framework";
import "./spark-chart.scss";
import { ChartOptions, createChart, CrosshairMode, DeepPartial, IChartApi } from "lightweight-charts";
import {bindable} from "aurelia-framework";
import { NumberService } from "services/numberService";

@autoinject
export class SparkChart {
  @bindable data;

  chart: IChartApi;

  sparkChart: HTMLElement;

  options: DeepPartial<ChartOptions>= {
    width: 0,
    height: 0,
    timeScale: {
      rightBarStaysOnScroll: true,
    },
    crosshair: {
      mode: CrosshairMode.Magnet,
    },
    // priceScale: {
    //   scaleMargins: { bottom: 0, top: 0 },
    // },
    grid: {
      horzLines: {
        visible: false,
      },
      vertLines: {
        visible: false,
      },
    },
    layout: {
      backgroundColor: "transparent",
      textColor: "black",
      fontFamily: "Aeonik",
    },
    handleScroll: {
      mouseWheel: false,
    },
    handleScale: {
      mouseWheel: true,
      pinch: true,
      axisPressedMouseMove: {
        time: false,
        price: false,
      },
    },
  };

  constructor(private numberService: NumberService) {
  }

  attached(): void {
    if (!this.chart) {
      this.options.width = this.sparkChart.offsetWidth;
      this.options.height = this.sparkChart.offsetHeight;
      this.options.timeScale.barSpacing = Math.max(this.options.width / this.data.length, 6);

      this.chart = createChart(this.sparkChart, this.options );

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

      window.onresize = () => {
        if (this.chart) {
          const width = Math.min(
            document.body.offsetWidth,
            this.sparkChart.offsetWidth,
          );
          this.chart.resize(width, this.sparkChart.offsetHeight);
        }
      };
    }
  }
}
