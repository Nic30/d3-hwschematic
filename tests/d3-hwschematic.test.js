"use strict";

import * as d3 from "d3";
import HwSchematic from '../src/d3-hwschematic';
import { simulateEvent } from './simulateEvent.js';

import * as fs from 'fs';
import * as glob from 'glob';
import * as path from 'path';

const EXAMPLES = __dirname + "/../examples/schemes"
const YOSYS_EXAMPLES = __dirname + "/../examples/schemes_yosys"

function initSvg() {
	var svg = d3.select("body")
		.append("svg");

	svg.attr("width", 500)
		.attr("height", 500);

	return svg;
}

jest.setTimeout(10000);


describe('Testing scheme rendering', () => {
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

	exampleFiles.forEach(function(f) {
		it("can render " + path.basename(f), () => {
			applyLayoutSpy.mockClear();
			var svg = initSvg();
			var sch = new HwSchematic(svg);
			var graphData = JSON.parse(fs.readFileSync(f));
			expect(graphData).not.toBeNull();
			return sch.bindData(graphData).then(
				() => {
					expect(applyLayoutSpy).toBeCalled();
					sch.terminate();
				},
				(reason) => {
					throw reason;
				}
			);
		});
	});

});



test('Testing component expansion', () => {
	var svg = initSvg();
	var sch = new HwSchematic(svg);
	var graphData = JSON.parse(fs.readFileSync(EXAMPLES + "/ClkDiv3.json"));

	return sch.bindData(graphData).then(
		() => {
			var nodesDef = svg.selectAll(".node");
			var procNode = nodesDef.filter((d) => {
				return d.id === "1";
			});
			expect(procNode.nodes().length).toBe(1);
			var d = procNode.data()[0];
			expect(d.hwMeta.cls).toBe("Process");
			expect(d._children).toBeDefined();
			expect(d.children).toBeUndefined();
			expect(d._edges).toBeDefined();
			expect(d.edges).toBeUndefined();

			simulateEvent(procNode.node(), 'click', {});
			expect(d.children).toBeDefined();
			expect(d._children).toBeUndefined();
			expect(d.edges).toBeDefined();
			expect(d._edges).toBeUndefined();

			simulateEvent(procNode.node(), 'click', {});
			expect(d._children).toBeDefined();
			expect(d.children).toBeUndefined();
			expect(d._edges).toBeDefined();
			expect(d.edges).toBeUndefined();

			sch.terminate();
		},
		(reason) => {
			throw new Error(reason);
		}
	);

});


describe("Testing yosys", () => {
	var testFiles = ["comparator", "mux2x1", "mux4x2", "constAdder", "subModuleBlackbox",
		"subModuleBlackbox2", "partialConstDriver0", "partialConstDriver1", "partialConstDriver2",
		"partialConstDriver3", "partialConstDriver4", "partialConstDriver5",
		"partialConstDriver6", "wireModule", "split0", "split1", "split2",
		"split3", "split4", "split5", "constPortDriver", "dff_sync_reset",
		"fifo", "latchinf", "concat0", "concat1", "concat2", "fulladder_4bit"];
	for (const testFile of testFiles) {
		it("Testing file: " + testFile, () => {
			var f = YOSYS_EXAMPLES + "/" + testFile + ".json";
			var graphData = JSON.parse(fs.readFileSync(f));
			var output = HwSchematic.fromYosys(graphData);
			var refF = __dirname + "/data/" + testFile + ".json";
			//fs.writeFileSync(refF, JSON.stringify(output, null, 2)); //create refFiles
			var refGraphData = JSON.parse(fs.readFileSync(refF));
			expect(output).toEqual(refGraphData);
		})
	}
});

