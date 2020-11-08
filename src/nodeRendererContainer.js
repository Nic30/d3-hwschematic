import * as d3 from "d3";
import { GenericNodeRenderer } from "./node_renderers/generic";

/**
 * Container for node renderer instances.
 * This object initiates the node to renderer binding process in prepare()
 * and executes node rendering in render()
 */
export class NodeRendererContainer {
	constructor() {
		this.renderers = []
	}

	// add new renderer
	registerRenderer(renderer) {
		this.renderers.push(renderer);
	}
	
	registerCustomRenderer(renderer) {
		var rs = this.renderers;
		for (var i = 0; i < rs.length; i++) {
			var r = rs[i];
			if (r instanceof GenericNodeRenderer) {
				// insert custom renderer before GenericNodeRenderer
				// to prevent GenericNodeRenderer.selector from prematurely halting renderers.some
				rs.splice(i, 0, renderer);
				return;
			}
		}
		rs.push(renderer);
	}

	// Bind node to renderer recursively
	prepare(node) {
		var r = null;
		this.renderers.some(function(ren) {
			if (ren.selector(node))
				r = ren;
			return r != null;
		});
		if (r == null) {
			throw new Error("Can not resolve renderer for node " + node);
		}
		node.hwMeta.renderer = r;
		r.prepare(node);
		var prep = this.prepare.bind(this);
		if (node.children) {
			node.children.forEach(prep);
		}
		if (node._children) {
			node._children.forEach(prep);
		}
	}

	// Render all nodes using selected renderer
	render(root, nodeG) {
		var renderers = this.renderers;
		var nodesForRenderer = renderers.map(() => []);
		nodeG.each(function(d) {
			var n = this;
			renderers.forEach(function(r, i) {
				if (d.hwMeta.renderer === r) {
					nodesForRenderer[i].push(n);
				}
			})
		});
		nodesForRenderer.forEach(function(nodes, i) {
			if (nodes.length) {
				nodes = d3.selectAll(nodes);
				renderers[i].render(root, nodes);
			}
		});
	}
}
