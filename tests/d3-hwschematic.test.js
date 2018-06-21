import HwSchematic from '../src/d3-hwschematic';

var d3 = require("d3");

describe('{unit}: Testing scheme rendering', () => {
  var svg = d3.select("body")
    .append("svg");

  svg.attr("width", 500)
    .attr("height", 500);  

  var sch = new HwSchematic(svg);
  
});