/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable no-var */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Pool } from "./../../../entities/pool";
import { bindable } from "aurelia-framework";
import "./donut-chart.scss";
import * as d3 from "d3";

export class DonutChart {

  @bindable pool: Pool;
  donutChart: HTMLElement;

  attached() {
    // this.data = this.pool.assetTokensArray;

    var donutData = this.genData();

    var donuts = new Donuts(this.donutChart);
    donuts.create(donutData);
  }

  /*
     * Returns a json-like object.
     */
  genData() {
    var type = ["Users", "Avg Upload", "Avg Files Shared"];
    var unit = ["M", "GB", ""];
    var cat = ["Google Drive", "Dropbox", "iCloud", "OneDrive", "Box"];

    var dataset = [];

    for (var i = 0; i < type.length; i++) {
      var data = [];
      var total = 0;

      for (const category of cat) {
        var value = Math.random() * 10 * (3 - i);
        total += value;
        data.push({
          "cat": category,
          "val": value,
        });
      }

      dataset.push({
        "type": type[i],
        "unit": unit[i],
        "data": data,
        "total": total,
      });
    }
    return dataset;
  }
}

class Donuts {

  charts;
  chart_m;
  chart_r;
  color;

  constructor(private donutChart: HTMLElement) {
    this.charts = d3.select(donutChart);
    this.color = d3.scale.category20();
  }


  getCatNames(dataset) {
    var catNames = [];

    for (const category of dataset[0].data) {
      catNames.push(category.cat);
    }

    return catNames;
  }

  createLegend(catNames) {
    var legends = this.charts.select(".legend")
      .selectAll("g")
      .data(catNames)
      .enter().append("g")
      .attr("transform", (d, i) => {
        return "translate(" + (i * 150 + 50) + ", 10)";
      });

    legends.append("circle")
      .attr("class", "legend-icon")
      .attr("r", 6)
      .style("fill", (d, i) => {
        return this.color(i);
      });

    legends.append("text")
      .attr("dx", "1em")
      .attr("dy", ".3em")
      .text((d) => {
        return d;
      });
  }

  createCenter() {

    const thisChart_r = this.chart_r;
    const thisCharts = this.charts;
    const thisPathAnim = this.pathAnim.bind(this);

    var eventObj = {
      "mouseover": function (d, i) {
        d3.select(this)
          .transition()
          .attr("r", thisChart_r * 0.65);
      },

      "mouseout": function (d, i) {
        d3.select(this)
          .transition()
          .duration(500)
          .ease("bounce")
          .attr("r", thisChart_r * 0.6);
      },

      "click": function (d, i) {
        var paths = thisCharts.selectAll(".clicked");
        thisPathAnim(paths, 0);
        paths.classed("clicked", false);
        this.resetAllCenterText();
      },
    };

    var donuts = d3.selectAll(".donut");

    // The circle displaying total data.
    donuts.append("svg:circle")
      .attr("r", thisChart_r * 0.6)
      .style("fill", "#E7E7E7")
      .on(eventObj);

    donuts.append("text")
      .attr("class", "center-txt type")
      .attr("y", thisChart_r * -0.16)
      .attr("text-anchor", "middle")
      .style("font-weight", "bold")
      .text((d, i) => {
        return d.type;
      });
    donuts.append("text")
      .attr("class", "center-txt value")
      .attr("text-anchor", "middle");
    donuts.append("text")
      .attr("class", "center-txt percentage")
      .attr("y", thisChart_r * 0.16)
      .attr("text-anchor", "middle")
      .style("fill", "#A2A2A2");
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
            .innerRadius(this.chart_r * 0.7)
            .outerRadius(this.chart_r),
          );
        break;

      case 1:
        path.transition()
          .attr("d", d3.svg.arc()
            .innerRadius(this.chart_r * 0.7)
            .outerRadius(this.chart_r * 1.08),
          );
        break;
    }
  }

  updateDonut() {

    const thisCharts = this.charts;
    const thisChart_r = this.chart_r;
    const thisPathAnim = this.pathAnim.bind(this);
    const thisSetCenterText = this.setCenterText.bind(this);

    var eventObj = {

      "mouseover": function (d, i, j) {
        thisPathAnim(d3.select(this), 1);

        var thisDonut = thisCharts.select(".type" + j);
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
        var thisDonut = thisCharts.select(".type" + j);
        thisSetCenterText(thisDonut);
      },

      "click": function (d, i, j) {
        var thisDonut = thisCharts.select(".type" + j);

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

    var pie = d3.layout.pie()
      .sort(null)
      .value((d) => {
        return d.val;
      });

    var arc = d3.svg.arc()
      .innerRadius(thisChart_r * 0.7)
      .outerRadius(function () {
        return (d3.select(this).classed("clicked")) ? thisChart_r * 1.08 : thisChart_r;
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

    paths.enter()
      .append("svg:path")
      .attr("d", arc)
      .style("fill", (d, i) => {
        return this.color(i);
      })
      .style("stroke", "#FFFFFF")
      .on(eventObj);

    paths.exit().remove();

    this.resetAllCenterText();
  }

  public create(dataset) {
    const width = parseInt(window.getComputedStyle(this.donutChart).width);
    this.chart_m = width / dataset.length / 2 * 0.14;
    this.chart_r = width / dataset.length / 2 * 0.85;

    this.charts.append("svg")
      .attr("class", "legend")
      .attr("width", "100%")
      .attr("height", 50)
      .attr("transform", "translate(0, -100)");

    var donut = this.charts.selectAll(".donut")
      .data(dataset)
      .enter().append("svg:svg")
      .attr("width", (this.chart_r + this.chart_m) * 2)
      .attr("height", (this.chart_r + this.chart_m) * 2)
      .append("svg:g")
      .attr("class", (d, i) => {
        return "donut type" + i;
      })
      .attr("transform", "translate(" + (this.chart_r + this.chart_m) + "," + (this.chart_r + this.chart_m) + ")");

    this.createLegend(this.getCatNames(dataset));
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
