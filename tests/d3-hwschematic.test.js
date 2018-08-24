import * as d3 from "d3";
import HwSchematic from '../src/d3-hwschematic';
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const fs = require("fs");
const glob = require('glob');
const path = require('path');

const EXAMPLES = __dirname + "/../examples/schemes"

describe('{unit}: Testing scheme rendering', () => {
  global.document = new JSDOM().window.document;
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
  
  var exampleFiles = glob.sync(EXAMPLES + "/*.json");
  it("can find examples in " + EXAMPLES, () => {
	  expect(exampleFiles .length).toBeGreaterThan(1);
  });
  exampleFiles.forEach(function (f) {
	  it("can render " + path.basename(f), function() {
	      var graphData = JSON.parse(fs.readFileSync(f));
	      expect(graphData).not.toBeNull();
	      var sch = new HwSchematic(svg);
	      var rendering = sch.bindData(graphData)
                             .then(sch.terminate()); 
	  });
  });

});
