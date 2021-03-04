import { autoinject } from "aurelia-framework";
import { IPoolTokenInfo, Pool } from "./../../../entities/pool";
import { bindable } from "aurelia-typed-observable-plugin";
import "./donut-chart.scss";
import * as d3 from "d3";
import { PoolService } from "services/PoolService";
import { NumberService } from "services/numberService";

@autoinject
export class DonutChart {

  @bindable pool: Pool;
  @bindable.booleanAttr interactive;
  chartContainer: HTMLElement;
  donutContainer: HTMLElement;

  constructor(private poolService: PoolService,
    private numberService: NumberService) {

  }

  async attached(): Promise<void> {
    await this.poolService.ensureInitialized();
    const donuts = new Donut(this.chartContainer, this.donutContainer, this.interactive, this.numberService);
    donuts.create(this.pool);
  }
}

/*
     * Returns a json-like object.
     */
// genData() {
//   var unit = ["M", "GB", ""];
//   var cat = ["Google Drive", "Dropbox", "iCloud", "OneDrive", "Box"];

//   var dataset = [];

//   var data = [];
//   var total = 0;

//   for (const category of cat) {
//     var value = Math.random() * 10 * 3;
//     total += value;
//     data.push({
//       "cat": category,
//       "val": value,
//     });
//   }

//   dataset.push({
//     // "type": "A Pool", this.pool.name,
//     "unit": unit[0],
//     "data": data,
//     "total": total,
//   });
//   return dataset;
// }

class Donut {
  colors = ["#ff495b", "#8668fc", "#1ee0fc", "#95d86e", "#faa04a", "#39a1d8", "#57dea6", "#c08eff"];
  donutContainer;
  chartContainer;
  chartPadding;
  chartRadius;
  get innerCircleRadius() { return this.chartRadius * 0.5; }
  sliceBulgeFactor = 1.08;

  constructor(
    chartContainerElement: HTMLElement,
    private donutContainerElement: HTMLElement,
    private interactive: boolean,
    private numberService: NumberService) {

    this.donutContainer = d3.select(donutContainerElement);
    this.chartContainer = d3.select(chartContainerElement);
  }

  // getCatNames(dataset) {
  //   var catNames = [];

  //   for (const category of dataset[0].data) {
  //     catNames.push(category.cat);
  //   }

  //   return catNames;
  // }

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

  get donut() {
    return d3.select(this.donutContainerElement).select(".donut");
  }

  createCenter() {

    const thisChart_r = this.chartRadius;
    const donut = this.donut;
    const circleRadius = thisChart_r * 0.55;
    const circleBulgeRadius = thisChart_r * 0.6;
    const interiorBorderRadius = circleRadius * .66;
    const interiorBorderWidth = 3;
    const interiorBorderInteriorRadius = interiorBorderRadius - interiorBorderWidth;

    // center white circle
    const centerCircle = donut.append("svg:circle")
      .attr("r", circleRadius)
      .style("fill", "#ffffff");

    //const poolIconContainer =
    this.chartContainer.select(".poolIconContainer")
      // .attr("width", interiorBorderInteriorRadius * 2)
      // .attr("height", interiorBorderInteriorRadius * 2)
      .style("width", `${interiorBorderRadius * 2}px`)
      .style("height", `${interiorBorderRadius * 2}px`)
      .classed("interactive", this.interactive)
    ;

    this.showCenterLogo(true);

    if (this.interactive) {

      // const thisPathAnim = this.pathAnim.bind(this);

      /**
       * TODO: not really using this...can delete
       */
      const eventObj = {
        "mouseover": function (_d, _i) {
          d3.select(this)
            .transition()
            .attr("r", circleBulgeRadius);
        },

        "mouseout": function (_d, _i) {
          d3.select(this)
            .transition()
            .duration(500)
            .ease("bounce")
            .attr("r", circleRadius);
        },

        // "click": function (_d, _i) {
        //   const paths = thisChart.selectAll(".clicked");
        //   thisPathAnim(paths, 0);
        //   paths.classed("clicked", false);
        //   this.resetAllCenterText();
        // },
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

      const g = donut.append("svg:g")
        .attr("class", "centerInnerCircleContainer");

      /**
       * the empty circle currounding the text
       */
      g.append("svg:circle")
        .attr("r", interiorBorderRadius)
        .attr("class", "centerInnerCircle")
        .attr("stroke-width", interiorBorderWidth)
      ;
      /**
       * the text
       */
      //const centerTextContainer =
      g.append("svg:foreignObject")
        .attr("class", "centerTextContainer")
        .attr("x", -interiorBorderInteriorRadius)
        .attr("y", -interiorBorderInteriorRadius - 6) // - 6 cause it just looks better-centered
        .attr("width", interiorBorderInteriorRadius * 2)
        .attr("height", interiorBorderInteriorRadius * 2)
      ;
    } else { // not interactive


      /**
       * the pool icon
       */

      // //const node = centerTextContainer.node();

      // const pool = donut.data()[0] as Pool;
      // // const poolIconHtml = "<div class=\"poolIconContainer\"><inline-svg svg.to-view=\"pool.icon\"></inline-svg></div>";
      // const poolIconHtml = pool.icon;

      // // const poolIconContainer =
      // centerCircle.append("svg:g")
      //   .attr("class", "poolIconContainer show")
      //   // .style("x", centerTextContainer.style("x"))
      //   // .style("y", centerTextContainer.style("y"))
      //   .attr("width", interiorBorderInteriorRadius * 2)
      //   .attr("height", interiorBorderInteriorRadius * 2)
      //   .html(() => { return poolIconHtml; })
      // ;

      // poolIconContainer.node().innerHTML = poolIconHtml;

      // this.aureliaHelperService.enhanceElement(poolIconContainer.node(), this.bindingContext);

      // donut.append("svg:foreignObject")
      //   .attr("class", "poolLogoContainer")
      //   .attr("x", -interiorBorderInteriorRadius)
      //   .attr("y", -interiorBorderInteriorRadius - 6) // - 6 cause it just looks better-centered
      //   .attr("width", interiorBorderRadius * 2)
      //   .attr("height", interiorBorderRadius * 2)
      //   .html(pool.icon)
      // ;
    }
  }

  showCenterLogo(show = true): void {
    const container = this.chartContainer.select(".poolIconContainer");
    container.classed("show", show);
    return;
  }

  showCenterText(show = true) {
    const donut = this.donut;
    const container = donut.select(".centerInnerCircleContainer");
    container.classed("show", show);
    this.showCenterLogo(!show);
  }

  pathAnim(path, dir) {
    switch (dir) {
      case 0:
        path.transition()
          .duration(500)
          .ease("bounce")
          .attr("d", d3.svg.arc()
            .innerRadius(this.innerCircleRadius)
            .outerRadius(this.chartRadius),
          );
        break;

      case 1:
        path.transition()
          .attr("d", d3.svg.arc()
            .innerRadius(this.innerCircleRadius)
            .outerRadius(this.chartRadius * this.sliceBulgeFactor),
          );
        break;
    }
  }

  updateDonut() {

    const thisChart_r = this.chartRadius;
    const thisPathAnim = this.pathAnim.bind(this);
    // const thisSetCenterText = this.setCenterText.bind(this);
    const thisShowCenterText = this.showCenterText.bind(this);
    const donut = this.donut;

    const pie = d3.layout.pie()
      .sort(null)
      .value((d: IPoolTokenInfo) => {
        return d.normWeightPercentage;
      });

    const arc = d3.svg.arc()
      .innerRadius(this.innerCircleRadius)
      .outerRadius(function () {
        return (d3.select(this).classed("clicked")) ? thisChart_r * this.donutSliceExpandFactor : thisChart_r;
      });

    // Start joining data with paths
    const paths = this.donutContainer.selectAll(".donut")
      .selectAll("path")
      .data((d: Pool, _i) => {
        return pie(d.assetTokensArray);
      });

    paths
      .transition()
      .duration(1000)
      .attr("d", arc);

    const enter = paths.enter()
      .append("svg:path")
      .attr("d", arc)
      .style("fill", (_d, i) => {
        return this.colors[i];
      })
      .style("stroke", "#FFFFFF");

    if (this.interactive) {

      const thisNumberService = this.numberService;

      const eventObj = {

        "mouseover": function (_d, _i, _j) {
          const pieSlice = d3.select(this);
          const tokenInfo = pieSlice.data()[0].data as IPoolTokenInfo;
          thisPathAnim(pieSlice, 1);
          const textContainer = donut.select(".centerTextContainer");
          const toString = (num: number) => thisNumberService.toString(num,
            {
              average: false,
              mantissa: 2,
              thousandSeparated: true,
            });

          textContainer.html(() => {
            return `
              <div class="lines">
              <div class="line icon"><img src="${tokenInfo.icon}"/></div>
              <div class="line perc"><div class="label">${tokenInfo.symbol}</div><div class="value">${toString(tokenInfo.normWeightPercentage)}</div>%</div>
              <div class="line price"><div class="label">Price</div>$<div class="value">${toString(tokenInfo.price)}</div></div>
              <div class="line daychange">
                <div class="label">24h</div>
                <div class="signedValue ${tokenInfo.priceChangePercentage_24h < 0 ? "negative" : ""}">
                  <div class="direction"><i class="sign fas fa-caret-${tokenInfo.priceChangePercentage_24h < 0 ? "down" : "up"}"></i></div>
                  <div class="value">${toString(tokenInfo.priceChangePercentage_24h)}</div>
                </div>
                </div>
              </div>
              `;
          });
          // var thisDonut = thisCharts.selectAll(".donut");
          // thisDonut.select(".value").text((donut_d) => {
          //   return;
          //   d.normWeightPercentage.toFixed(1) + donut_d.unit;
          // });
          // thisDonut.select(".percentage").text((donut_d) => {
          //   return (d.data.val / donut_d.total * 100).toFixed(2) + "%";
          // });
          thisShowCenterText(true);
        },

        "mouseout": function (_d, _i, _j) {
          const thisPath = d3.select(this);
          if (!thisPath.classed("clicked")) {
            thisPathAnim(thisPath, 0);
          }
          //const thisDonut = thisChartContainer.selectAll(".donut");
          thisShowCenterText(false);
        },
        // ,"click": function (_d, _i, _j) {
        //   const thisDonut = thisChartContainer.selectAll(".donut");

        //   if (0 === thisDonut.selectAll(".clicked")[0].length) {
        //     thisDonut.select("circle").on("click")();
        //   }

        //   const thisPath = d3.select(this);
        //   const clicked = thisPath.classed("clicked");
        //   // eslint-disable-next-line no-bitwise
        //   thisPathAnim(thisPath, ~~(!clicked));
        //   thisPath.classed("clicked", !clicked);

        //   thisSetCenterLogo(thisDonut);
        // },
      };
      enter.on(eventObj);
      //this.showCenterText();
    }

    paths.exit().remove();
  }

  public create(pool: Pool) {
    const width = parseInt(window.getComputedStyle(this.donutContainerElement).width);
    this.chartPadding = width / 2 * 0.14;
    this.chartRadius = width / 2 * 0.85;

    // this.charts.append("svg")
    // .attr("class", "legend")
    // .attr("width", "100%")
    // .attr("height", 50)
    // .attr("transform", "translate(0, -100)")
    // ;

    this.donutContainer.selectAll(".donut")
      .data([pool])
      .enter().append("svg:svg")
      .attr("width", (this.chartRadius + this.chartPadding) * 2)
      .attr("height", (this.chartRadius + this.chartPadding) * 2)
      .append("svg:g")
      .attr("class", "donut")
      .attr("transform", "translate(" + (this.chartRadius + this.chartPadding) + "," + (this.chartRadius + this.chartPadding) + ")")
    ;

    // this.createLegend(this.getCatNames(dataset));
    this.createCenter();

    this.updateDonut();
  }

  public update(pool: Pool) {
    this.donutContainer.selectAll(".donut")
      .data([pool])
    ;

    this.updateDonut();
  }
}
