import * as d3 from "d3";
import HwSchematic from '../src/d3-hwschematic';
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const fs = require("fs");
const glob = require('glob');
const path = require('path');

const EXAMPLES = __dirname + "/../examples/schemes"

function initSvg() {
    global.document = new JSDOM().window.document;
    var svg = d3.select("body")
      .append("svg");

    svg.attr("width", 500)
      .attr("height", 500);  

    return svg;
}

describe('{unit}: Testing scheme rendering', () => {
  it("SVG has root g and markers", function() {
      var svg = initSvg();
      var sch = new HwSchematic(svg);
      var gs = svg.selectAll("g");
      expect(gs.size()).toBe(8 + 1); // markers + zoom
      sch.terminate();
  });
  
  var exampleFiles = glob.sync(EXAMPLES + "/*.json");
  it("can find examples in " + EXAMPLES, () => {
      expect(exampleFiles.length).toBeGreaterThan(0);
  });
  //exampleFiles = [exampleFiles[0],]
  var applyLayoutSpy = jest.spyOn(HwSchematic.prototype, "_applyLayout");

  exampleFiles.forEach(function (f) {
      it("can render " + path.basename(f), () => {
	  applyLayoutSpy.mockClear();
	  var svg = initSvg();
          var sch = new HwSchematic(svg);
          var graphData = JSON.parse(fs.readFileSync(f));
          expect(graphData).not.toBeNull();
          return sch.bindData(graphData).then(
        	  ()=> {
        	      expect(applyLayoutSpy).toBeCalled();
        	      sch.terminate();
        	  },
        	  (reason)=> {
        	      throw new Error(reason);
        	  }
          );
      });
  });

});
