import {AbstractNodeRenderer} from "./abstract"; 


export class SliceNodeRenderer extends AbstractNodeRenderer {
	selector(node) {
		return node.hwt.name === "SLICE" || node.hwt.name === "CONCAT";
	}
	
	getNodeLabelWidth(node) {
		return 0;
	}
	
	render(root, nodeG) {
        var schematic = this.schematic;
        var node = nodeG;
        var nodeBody = node.append("rect");
        // set dimensions and style of node
        nodeBody
           .attr("width", function(d) { return d.width })
           .attr("height", function(d) { return d.height })
           .attr("class",  "node")
           .attr("rx", 5) // rounded corners
           .attr("ry", 5);

        // black thick line 
        node.append("rect")
          .attr("x", function (d) {
        	  if (node.hwt.name == "SLICE") {
        		  return 0;
        	  } else {
        		  return d.width - 3;
        	  }
          })
          .attr("width", "3")
          .attr("height", function(d) { return d.height })
          .attr("style", "fill:black;") 

        // apply node positions
        node.transition()
          .duration(0)
          .attr("transform", function(d) {
              if (typeof d.x === "undefined" || typeof d.x === "undefined") {
                  throw new Error("Node with undefined position", d);
              }
              return "translate(" + d.x + " " + d.y + ")"
          });
        
        this.renderPorts(node);
	}
}