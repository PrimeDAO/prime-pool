import { autoinject } from "aurelia-framework";
import "./spark-chart.scss";
import { ChartOptions, createChart, CrosshairMode, DeepPartial, IChartApi } from "lightweight-charts";
import { bindable } from "aurelia-typed-observable-plugin";
import { NumberService } from "services/numberService";

@autoinject
export class SparkChart {
  @bindable data;
  @bindable.booleanAttr interactive;
  @bindable.number height = 300;

  chart: IChartApi;

  sparkChart: HTMLElement;

  constructor(private numberService: NumberService) {
  }

  attached(): void {
    if (!this.chart) {
      const options: any = { // DeepPartial<ChartOptions> = {
        width: 0,
        height: this.height,
        timeScale: {
          rightBarStaysOnScroll: true,
          visible: this.interactive,
        },
        crosshair: {
          vertLine: { visible: this.interactive },
          horzLine: { visible: this.interactive },
          mode: CrosshairMode.Magnet,
        },
        priceScale: {
          position: this.interactive ? "right" : "none",
        },
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
          pressedMouseMove: this.interactive,
          horzTouchDrag: this.interactive,
          vertTouchDrag: this.interactive,
        },
        handleScale: {
          mouseWheel: this.interactive,
          pinch: this.interactive,
          axisDoubleClickReset: this.interactive,
          axisPressedMouseMove: {
            time: false,
            price: false,
          },
        },
      };

      options.width = this.sparkChart.offsetWidth;
      options.height = this.height || this.sparkChart.offsetHeight;
      options.timeScale.barSpacing = Math.max(options.width / this.data.length, 6);

      this.chart = createChart(this.sparkChart, options );

      const color = "#8668FC";
      const series = this.chart.addAreaSeries({
        lineColor: color,
        topColor: `${color}ff`,
        bottomColor: `${color}00`,
        priceLineVisible: false,
        crosshairMarkerVisible: this.interactive,
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

  detached(): void {
    window.onresize = undefined;
  }
}
