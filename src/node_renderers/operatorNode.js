import {AbstractNodeRenderer} from "./abstract"; 
import {SHAPES} from "./operatorNode_components";

export class OperatorNodeRenderer extends AbstractNodeRenderer {
	constructor(schematic) {
		super(schematic);

		this.SHAPES = SHAPES;
		this.DEFULT_NODE_SIZE = [25, 25]

	}
	prepare(node) {
		var defs = this.schematic.defs;
		var SHAPES = this.SHAPES;
		for (var key in SHAPES) {
            if (SHAPES.hasOwnProperty(key)) {
		       this.addShapeToDefs(defs, key, SHAPES[key]);
            }
        }
		node.width = this.DEFULT_NODE_SIZE[0];
		node.height = this.DEFULT_NODE_SIZE[1];
	}
	
	selector(node) {
		return typeof this.SHAPES[node.hwt.name] !== "undefined";
	}
	
	addShapeToDefs(defs, id, shape) {
        var cont = defs.append("g");
        
        cont.attr("id", id);
        cont.attr("class", "node-operator");
        shape(cont);
	}
		
	/**
	 * Render svg of node
	 * 
	 * @param root root svg element where nodes should be rendered
	 * @param nodeG svg g for each node with data binded
	 * */
	render(root, nodeG) {
        var schematic = this.schematic;
        
        // apply node positions
        nodeG
          //.transition()
          //.duration(0)
          .attr("transform", function(d) {
              if (typeof d.x === "undefined" || typeof d.x === "undefined") {
                  throw new Error("Node with undefined position", d);
              }
              return "translate(" + d.x + " " + d.y + ")"
          });
        
        nodeG.append("use")
        .attr("href", function (d) {
        	return "#" + d.hwt.name
        });
 	}
}