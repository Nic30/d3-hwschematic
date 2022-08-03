import { GenericNodeRenderer } from "./generic";
import { SHAPES } from "./operatorNode_components";

/*
 * Render a operator node using predefined shape
 * */
export class OperatorNodeRenderer extends GenericNodeRenderer {
	constructor(schematic) {
		super(schematic);
		this.SHAPES = SHAPES;
		this._defsAdded = false;
	}

	prepare(node) {
		if (!this._defsAdded) {
			var defs = this.schematic.defs;
			var SHAPES = this.SHAPES;
			for (const [name, [constructorFn, _]] of Object.entries(SHAPES)) {
				this.addShapeToDefs(defs, name, constructorFn);
			}
			this._defsAdded = true;
		}
		[node.width, node.height] =  this.SHAPES[node.hwMeta.name][1];
	}

	selector(node) {
		return node.hwMeta.cls === "Operator" && typeof this.SHAPES[node.hwMeta.name] !== "undefined";
	}

	addShapeToDefs(defs, id, shape) {
		var cont = defs.append("g")
		    .attr("id", id)
            .attr("class", "d3-hwschematic node-operator");
        // [note] we need to add d3-hwschematic as well because object in refs are recognized as outside objects when useds
		shape(cont);
	}

	/**
	 * Render svg of node
	 * 
	 * @param root root svg element where nodes should be rendered
	 * @param nodeG svg g for each node with data binded
	 * */
	render(root, nodeG) {
		// apply node positions
		nodeG.attr("transform", function(d) {
			if (typeof d.x === "undefined" || typeof d.x === "undefined") {
				throw new Error("Node with undefined position", d);
			}
			return "translate(" + d.x + " " + d.y + ")"
         })
        .attr("class", (d) => d.hwMeta.cssClass)
        .attr("style", (d) => d.hwMeta.cssStyle)
		.append("use")
		.attr("href", function(d) {
			return "#" + d.hwMeta.name
		});
	}
}