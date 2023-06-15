import {GenericNodeRenderer} from "./generic"; 


export class SliceNodeRenderer extends GenericNodeRenderer {
	selector(node) {
		return node.hwMeta.name === "SLICE" || node.hwMeta.name === "CONCAT";
	}
	
	getNodeLabelWidth(node) {
		return 0;
	}
	
	render(root, nodeG) {
        nodeG
            .attr("class", (d) => {
              if (d.hwMeta.cssClass)
                  return 'node ' + d.hwMeta.cssClass;
              else 
                return 'node';
              })
            .attr("style", (d) => d.hwMeta.cssStyle);
        
        // spot node main body and set dimensions and style of node
        nodeG.append("rect")
           .attr("width", function(d) { return d.width })
           .attr("height", function(d) { return d.height })
           .attr("class",  "node")
           .attr("rx", 5) // rounded corners
           .attr("ry", 5);

        // black thick line 
        nodeG.append("rect")
          .attr("x", function (d) {
        	  if (d.hwMeta.name == "SLICE") {
        		  return 0;
        	  } else {
        		  return d.width - 3;
        	  }
          })
          .attr("width", "3")
          .attr("height", function(d) { return d.height })
          .attr("style", "fill:black;") 

        // apply node positions
        nodeG.attr("transform", function(d) {
              if (typeof d.x === "undefined" || typeof d.x === "undefined") {
                  throw new Error("Node with undefined position", d);
              }
              return "translate(" + d.x + " " + d.y + ")"
          });
        
        this.renderPorts(nodeG);
	}
}