/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable no-var */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Pool } from "./../../../entities/pool";
import { bindable } from "aurelia-typed-observable-plugin";
import "./donut-chart.scss";
import * as d3 from "d3";

export class DonutChart {

  @bindable pool: Pool;
  @bindable.booleanAttr interactive;
  donutChart: HTMLElement;

  attached() {
    // this.data = this.pool.assetTokensArray;

    var donutData = this.genData();

    var donuts = new Donuts(this.donutChart, this.pool, this.interactive);
    donuts.create(donutData);
  }

  /*
     * Returns a json-like object.
     */
  genData() {
    var unit = ["M", "GB", ""];
    var cat = ["Google Drive", "Dropbox", "iCloud", "OneDrive", "Box"];

    var dataset = [];

    var data = [];
    var total = 0;

    for (const category of cat) {
      var value = Math.random() * 10 * 3;
      total += value;
      data.push({
        "cat": category,
        "val": value,
      });
    }

    dataset.push({
      // "type": "A Pool", this.pool.name,
      "unit": unit[0],
      "data": data,
      "total": total,
    });
    return dataset;
  }
}

class Donuts {
  colors = ["#ff495b", "#8668fc", "#1ee0fc", "#95d86e", "#faa04a", "#39a1d8", "#57dea6", "#c08eff"];
  charts;
  chart_m;
  chart_r;
  donutRingWidthFactor = 0.45;
  donutSliceExpandFactor = 1.08;

  constructor(private donutChart: HTMLElement,
    private pool: Pool,
    private interactive: boolean) {
    this.charts = d3.select(donutChart);
  }

  getCatNames(dataset) {
    var catNames = [];

    for (const category of dataset[0].data) {
      catNames.push(category.cat);
    }

    return catNames;
  }

  // createLegend(catNames) {
  //   var legends = this.charts.select(".legend")
  //     .selectAll("g")
  //     .data(catNames)
  //     .enter().append("g")
  //     .attr("transform", (d, i) => {
  //       return "translate(" + (i * 150 + 50) + ", 10)";
  //     });

  //   legends.append("circle")
  //     .attr("class", "legend-icon")
  //     .attr("r", 6)
  //     .style("fill", (d, i) => {
  //       return this.color(i);
  //     });

  //   legends.append("text")
  //     .attr("dx", "1em")
  //     .attr("dy", ".3em")
  //     .text((d) => {
  //       return d;
  //     });
  // }

  createCenter() {

    const thisChart_r = this.chart_r;
    const thisCharts = this.charts;
    var donuts = d3.selectAll(".donut");
    const centerCircleTransitionRadiusFactor = 0.6;

    // center white circle
    const centerCircle = donuts.append("svg:circle")
      .attr("r", thisChart_r * centerCircleTransitionRadiusFactor)
      .style("fill", "#ffffff");

    if (this.interactive) {
      const thisPathAnim = this.pathAnim.bind(this);
      const centerCircleBulgeTransitionRadiusFactor = 0.65;

      var eventObj = {
        "mouseover": function (d, i) {
          d3.select(this)
            .transition()
            .attr("r", thisChart_r * centerCircleBulgeTransitionRadiusFactor);
        },

        "mouseout": function (d, i) {
          d3.select(this)
            .transition()
            .duration(500)
            .ease("bounce")
            .attr("r", thisChart_r * centerCircleTransitionRadiusFactor);
        },

        "click": function (d, i) {
          var paths = thisCharts.selectAll(".clicked");
          thisPathAnim(paths, 0);
          paths.classed("clicked", false);
          this.resetAllCenterText();
        },
      };

      centerCircle.on(eventObj);

      // donuts.append("text")
      //   .attr("class", "center-txt type")
      //   .attr("y", thisChart_r * -0.16)
      //   .attr("text-anchor", "middle")
      //   .style("font-weight", "bold")
      //   .text((d, i) => {
      //     return d.type;
      //   });
      donuts.append("text")
        .attr("class", "center-txt value")
        .attr("text-anchor", "middle");
      donuts.append("text")
        .attr("class", "center-txt percentage")
        .attr("y", thisChart_r * 0.16)
        .attr("text-anchor", "middle")
        .style("fill", "#A2A2A2");
    } else { // not interactive
      // centerCircle.append("g")
      //   .attr("width", thisChart_r * .5)
      //   .attr("height", thisChart_r * .5)
      //   //.html("<defs><style>.cls-1{fill:url(#linear-gradient);}.cls-2{fill:#fff;}.cls-3{fill:none;stroke:#1ee0fc;stroke-miterlimit:10;stroke-width:4.97px;}</style><linearGradient id='linear-gradient' y1='56.97' x2='113.95' y2='56.97' gradientUnits='userSpaceOnUse'><stop offset='0' stop-color='#8668fc'/><stop offset='1' stop-color='#b14fd8'/></linearGradient></defs><g id='Layer_2' data-name='Layer 2'><g id='Layer_1-2' data-name='Layer 1'><circle class='cls-1' cx='56.97' cy='56.97' r='56.97'/><polygon class='cls-2' points='77.37 56.8 83.41 50.76 83.41 22.45 67.17 22.45 50.93 38.69 67.17 38.69 67.17 56.8 49.8 56.8 49.8 38.69 33.56 38.69 33.56 89.72 49.8 89.72 49.8 73.04 61.13 73.04 77.37 56.8'/><path class='cls-3' d='M9.79,57A47.18,47.18,0,0,1,57,9.79'/><path class='cls-3' d='M104.16,57A47.19,47.19,0,0,1,57,104.16'/></g></g>")
      //   .html(this.pool.icon)

    }
  }

  setCenterText(thisDonut) {
    var sum = d3.sum(thisDonut.selectAll(".clicked").data(), (d) => {
      return d.data.val;
    });

    thisDonut.select(".value")
      .text((d) => {
        return (sum) ? sum.toFixed(1) + d.unit
          : d.total.toFixed(1) + d.unit;
      });
    thisDonut.select(".percentage")
      .text((d) => {
        return (sum) ? (sum / d.total * 100).toFixed(2) + "%"
          : "";
      });
  }

  resetAllCenterText() {
    this.charts.selectAll(".value")
      .text((d) => {
        return d.total.toFixed(1) + d.unit;
      });
    this.charts.selectAll(".percentage")
      .text("");
  }

  pathAnim(path, dir) {
    switch (dir) {
      case 0:
        path.transition()
          .duration(500)
          .ease("bounce")
          .attr("d", d3.svg.arc()
            .innerRadius(this.chart_r * this.donutRingWidthFactor)
            .outerRadius(this.chart_r),
          );
        break;

      case 1:
        path.transition()
          .attr("d", d3.svg.arc()
            .innerRadius(this.chart_r * this.donutRingWidthFactor)
            .outerRadius(this.chart_r * this.donutSliceExpandFactor),
          );
        break;
    }
  }

  updateDonut() {

    const thisCharts = this.charts;
    const thisChart_r = this.chart_r;
    const thisPathAnim = this.pathAnim.bind(this);
    const thisSetCenterText = this.setCenterText.bind(this);

    var pie = d3.layout.pie()
      .sort(null)
      .value((d) => {
        return d.val;
      });

    var arc = d3.svg.arc()
      .innerRadius(thisChart_r * this.donutRingWidthFactor)
      .outerRadius(function () {
        return (d3.select(this).classed("clicked")) ? thisChart_r * this.donutSliceExpandFactor : thisChart_r;
      });

    // Start joining data with paths
    var paths = this.charts.selectAll(".donut")
      .selectAll("path")
      .data((d, i) => {
        return pie(d.data);
      });

    paths
      .transition()
      .duration(1000)
      .attr("d", arc);

    const enter = paths.enter()
      .append("svg:path")
      .attr("d", arc)
      .style("fill", (d, i) => {
        return this.colors[i];
      })
      .style("stroke", "#FFFFFF");

    if (this.interactive) {

      var eventObj = {

        "mouseover": function (d, i, j) {
          thisPathAnim(d3.select(this), 1);

          var thisDonut = thisCharts.select(".donut");
          thisDonut.select(".value").text((donut_d) => {
            return d.data.val.toFixed(1) + donut_d.unit;
          });
          thisDonut.select(".percentage").text((donut_d) => {
            return (d.data.val / donut_d.total * 100).toFixed(2) + "%";
          });
        },

        "mouseout": function (d, i, j) {
          var thisPath = d3.select(this);
          if (!thisPath.classed("clicked")) {
            thisPathAnim(thisPath, 0);
          }
          var thisDonut = thisCharts.select(".donut");
          thisSetCenterText(thisDonut);
        },

        "click": function (d, i, j) {
          var thisDonut = thisCharts.select(".donut");

          if (0 === thisDonut.selectAll(".clicked")[0].length) {
            thisDonut.select("circle").on("click")();
          }

          var thisPath = d3.select(this);
          var clicked = thisPath.classed("clicked");
          // eslint-disable-next-line no-bitwise
          thisPathAnim(thisPath, ~~(!clicked));
          thisPath.classed("clicked", !clicked);

          thisSetCenterText(thisDonut);
        },
      };
      enter.on(eventObj);
      this.resetAllCenterText();
    }

    paths.exit().remove();
  }

  public create(dataset) {
    const width = parseInt(window.getComputedStyle(this.donutChart).width);
    this.chart_m = width / 2 * 0.14;
    this.chart_r = width / 2 * 0.85;

    // this.charts.append("svg")
    // .attr("class", "legend")
    // .attr("width", "100%")
    // .attr("height", 50)
    // .attr("transform", "translate(0, -100)")
    // ;

    var donut = this.charts.selectAll(".donut")
      .data(dataset)
      .enter().append("svg:svg")
      .attr("width", (this.chart_r + this.chart_m) * 2)
      .attr("height", (this.chart_r + this.chart_m) * 2)
      .append("svg:g")
      .attr("class", () => {
        return "donut";
      })
      .attr("transform", "translate(" + (this.chart_r + this.chart_m) + "," + (this.chart_r + this.chart_m) + ")")
      ;

    // this.createLegend(this.getCatNames(dataset));
    this.createCenter();

    this.updateDonut();
  }

  public update(dataset) {
    // Assume no new categ of data enter
    var donut = this.charts.selectAll(".donut")
      .data(dataset);

    this.updateDonut();
  }
}
