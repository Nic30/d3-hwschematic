import * as d3 from "d3";
import HwSchematic from '../src/d3-hwschematic';


describe('{unit}: Testing scheme rendering', () => {
  var svg = d3.select("body")
    .append("svg");

  svg.attr("width", 500)
    .attr("height", 500);  

  var sch = new HwSchematic(svg);
  it("SVG has root g and markers", function() {
	  var gs = svg.selectAll("g");
	  expect(gs.size()).toBe(8 + 1); // markers + zoom
  });
  sch.terminate();
});