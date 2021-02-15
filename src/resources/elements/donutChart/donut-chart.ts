import * as d3 from 'd3';

var data = [
  {
      "Amount": "45%",
      "Value": 100,
      "Price": "$12.2",
      "Change": " 14%",
      "image": 'images/ada.png'
  },
  {
      "Amount": "22%",
      "Value": 44,
      "Price": "$10.1",
      "Change": "21%",
      "image": 'images/block.png'
  },
  {
      "Amount": "67%",
      "Value": 215,
      "Price": "$2.2",
      "Change": "16%",
      "image": "images/cc.png"
  },
  {
      "Amount": "53%",
      "Value": 285,
      "Price": "$31.5",
      "Change": "32%",
      "image": "images/cny.png"
  },
  { 
      "Amount": "12%",
      "Value": 164,
      "Price": "$22.4",
      "Change": "5%",
      "image": "images/elix.png"
  } 
];



var width = 300,
  height = 300,
  radius = Math.min(width, height) / 2;

var divNode = d3.select("body").node();

var outerRadius = height / 2 - 5;

var color = d3.scale.ordinal()
  .range(["FF495B","#8668FC","#1EE0FC", "#95D86E", "#FAA04A"]);

var arc = d3.svg.arc()
  .padRadius(outerRadius)
  .innerRadius(radius * 0.55);

var pie = d3.layout.pie()
  .sort(null)
  .padAngle(0.03)
  .value(function(d) { return d.Value; });

d3.select("#chart").append("div")
  .attr("id","mainPie")
  .attr("class","pieBox");

var svg = d3.select("#mainPie").append("svg")
  .attr("width", width)
  .attr("height", height);

var g = svg.append("g").attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

var defs = svg.append("defs");
var filter = defs.append("filter")
  .attr("id", "drop-shadow")
  .attr("height","130%");

filter.append("feGaussianBlur")
  .attr("in","SourceAlpha")
  .attr("stdDeviation", 0.1)
  .attr("result", "blur");

filter.append("feOffset")
  .attr("in", "blur")
  .attr("dx", 0)
  .attr("dy", 0)
  .attr("result", "offsetBlur");

var feMerge = filter.append("feMerge");

feMerge.append("feMergeNode")
  .attr("in", "offsetBlur")
feMerge.append("feMergeNode")
  .attr("in", "SourceGraphic");

var pattern = defs.append('pattern')
.attr('id', 'image')
.attr('width', 5)
.attr('height', 5);

var image = pattern.append('image').attr('x', 48).attr('y', 10).attr('width', 40).attr('height', 40);
var text= pattern.append('text').attr('x', 38).attr('y', 0).attr('width', 40).attr('height', 40);


var centerSvg = d3.select("#mainPie svg").append('circle')
.attr('class', 'image')
.attr('fill','#975EEE')
.attr('r','68')
.attr('cx', 62).attr('cy', 62)
.attr('transform', 'translate(88, 88)');

var g = g.selectAll(".arc")
    .data(pie(data))
  .enter().append("g")
    .attr("class", "arc")
    .each(function(d) { d.outerRadius = outerRadius - 10; });

g.append("path")
    .attr("d", arc)
    .style("fill", function(d) { return color(d.data.Value); })
    .each(function(d) { d.outerRadius = outerRadius - 10; })
    .on("mousemove", function(d) {
        d3.select(this)
            .style("filter", "url(#drop-shadow)");
        d3.select(this)
          .transition()
          .duration(500)
          .ease('bounce')
          .attr('transform',function(d){
            var dist = 1;
            d.midAngle = ((d.endAngle - d.startAngle)/2) + d.startAngle;
            var x = Math.sin(d.midAngle) * dist;
            var y = Math.cos(d.midAngle) * dist;
            return 'translate(' + x + ',' + y + ')';
          });
        var mousePos = d3.mouse(divNode);
        d3.select(this).transition().duration(200).delay(0).attrTween("d", function(d) {
          var i = d3.interpolate(d.outerRadius, outerRadius);
          return function(t) { d.outerRadius = i(t); return arc(d); };
        });
      })

      
      .on("mouseover", function(d) { 
        d3.select('pattern image')
          .attr("id", "myData")
          .style("visibility", "visible")
          .attr('href', d.data.image)
        svg.select('circle.image')
          .attr('fill','url(#image)')
          .style('stroke', '#975EEE')
          .style('stroke-width', '3px')
        g.append("text").transition()
          .attr("class", "value-text")
          .attr("id", "myData")
          .text("Eth: " + `${d.data.Amount}`)
          .attr('text-anchor', 'middle')
          .attr('dy', '.6em');  
        g.append("text")
          .attr("class", "name-text")
          .attr("id", "myData")
          .text("Price: " + `${d.data.Price}`)
          .attr('text-anchor', 'middle')
          .attr('dy', '2em');
        g.append("text")
          .attr("class", "price-text")
          .attr("id", "myData")
          .text("24h: " + `${d.data.Change}`)
          .attr('text-anchor', 'middle')
          .attr('dy', '3.2em');
    })
    
    .on("mouseout", function(d){
        d3.selectAll("#myData")
          .style("visibility", "hidden")
        g.selectAll("#myData").remove();
        d3.select(this)
          .attr("stroke","none")
          .style("filter","none");
        d3.select(this)
          .transition()
          .duration(500)
          .ease('bounce')
          .attr('transform','translate(0,0)');
        d3.select(this).transition().duration(200).delay(0).attrTween("d", function(d) {
          var i = d3.interpolate(d.outerRadius, outerRadius  - 10);
          return function(t) { d.outerRadius = i(t); return arc(d); };
        });
    })
    
    .on("click", function() { 
      d3.select(this).transition().duration(200).delay(0).attrTween("d", function(d) {
        var i = d3.interpolate(d.outerRadius, outerRadius);
        return function(t) { d.outerRadius = i(t); return arc(d); };
      });
    })

    .on("dblclick", function() { 
      d3.select(this).transition().duration(200).delay(0).attrTween("d", function(d) {
        var i = d3.interpolate(d.outerRadius, outerRadius  - 10);
        return function(t) { d.outerRadius = i(t); return arc(d); };
      });
    }) 

