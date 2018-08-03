import {AbstractNodeRenderer} from "./abstract"; 
import {SHAPES} from "./operatorNode_components";

export class OperatorNodeRenderer extends  AbstractNodeRenderer {
	constructor(schematic) {
		super(schematic);

		var ops = this.OPERATOR_NAMES = {}
		var _ops = ["XOR"];
		_ops.map(function (o) { ops[o] = o});
	}
	
	selector(node) {
		return typeof this.OPERATOR_NAMES[node.name] !== "undefined";
	}
	
	/**
	 * Render svg of node
	 * 
	 * @param root root svg element where nodes should be rendered
	 * @param nodeG svg g for each node with data binded
	 * */
	render(root, nodeG) {
        var schematic = this.schematic;
        nodeG.nodes().forEach(function (n) {
        	var d = n.__data__;
        	var s = SHAPES[d.name];
        	if (typeof s === "undefined")
        		throw new Error()
        	n.append(s);
        })
        console.log("ommit " + nodeG.size() + " nodes");
        //var nodeBody = node.append("rect");
        //// set dimensions and style of node
        //nodeBody
        //   .attr("width", function(d) { return d.width })
        //   .attr("height", function(d) { return d.height })
        //   .attr("class", function (d) { 
        //       if (d.isExternalPort) {
        //           return "node-external-port";
        //       } else {
        //           return "node";
        //       }
        //   })
        //   .attr("rx", 5) // rounded corners
        //   .attr("ry", 5);
        //
        //var portG = node.selectAll(".port")
        //  .data(function(d) { return d.ports || []; })
        //  .enter()
        //  .append("g");
        //
        //// apply node positions
        nodeG.transition()
          .duration(0)
          .attr("transform", function(d) {
              if (typeof d.x === "undefined" || typeof d.x === "undefined") {
                  throw new Error("Node with undefined position", d);
              }
              return "translate(" + d.x + " " + d.y + ")"
          });
        //
        //// spot node label
        //node.append("text")
        //    .text(function(d) { return d.name; });
        //
        //// spot node body text
        //node.append("text")
        //    .call(this.renderTextLines.bind(this));
        //
        //this.renderPorts(portG);
	}
}