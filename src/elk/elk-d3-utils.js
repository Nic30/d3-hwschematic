import * as d3 from "d3";

export const RUNNING_IN_NODE = (typeof require !== "undefined");
export const NO_LAYOUT = "org.eclipse.elk.noLayout";
// kgraph properties that shall be copied
export const KGRAPH_KEYS = [
	'x', 'y',
	'width', 'height',
	"sections",
	'sourcePoint',
	'targetPoint',
	'junctionPoints',
	'properties'
].reduce(function(p, c) { p[c] = 1; return p; }, {});

/**
  * Webworker creates new graph object and layout props has to be copied back
  * to original graph
  * 
  * @param srcGraph:
  *            new graph from ELK worker
  * @param dstGraph:
  *            original graph provided by user
  * @param d3Objs:
  *            {str(dst obj id): dst obj}
  */
export function copyElkProps(srcGraph, dstGraph, d3Objs) {
	// init d3Objs
	d3Objs[dstGraph.id] = dstGraph;
	(dstGraph.edges || []).forEach(function(e) {
		if (e.id in d3Objs && d3Objs[e.id] !== e)
			throw new Error("Duplicit edge" + e.id);
		d3Objs[e.id] = e;
	});
	(dstGraph.children || []).forEach(function(n) {
		d3Objs[n.id] = n;
	});
	(dstGraph.ports || []).forEach(function(p) {
		d3Objs[p.id] = p;
	});

	// copy props from this node
	copyProps(srcGraph, dstGraph);
	(srcGraph.ports || []).forEach(function(p) {
		copyProps(p, d3Objs[p.id]);
	});
	(srcGraph.labels || []).forEach(function(l, i) {
		copyProps(l, dstGraph.labels[i]);
	});
	// copy props from edges in this node
	(srcGraph.edges || []).forEach(function(e) {
		var l = d3Objs[e.id];
		copyProps(e, l);
		copyProps(e.source, l.source);
		copyProps(e.target, l.target);
		// make sure the bendpoint array is valid
		l.bendPoints = e.bendPoints || [];
	});
	// copy props of children
	(srcGraph.children || []).forEach(function(n) {
		copyElkProps(n, d3Objs[n.id], d3Objs)
	});
}
function copyProps(src, dst) {
	var keys = KGRAPH_KEYS;
	for (var k in src) {
		if (keys[k]) {
			dst[k] = src[k];
		}
	}
}

/**
  * Convert section from ELK json to svg path string
  */
export function section2svgPath(section) {
	var pathBuff = ["M", section.startPoint.x, section.startPoint.y];
	if (section.bendPoints)
		section.bendPoints.forEach(function(bp, i) {
			pathBuff.push("L");
			pathBuff.push(bp.x);
			pathBuff.push(bp.y);
		});

	pathBuff.push("L");
	pathBuff.push(section.endPoint.x);
	pathBuff.push(section.endPoint.y);
	return pathBuff.join(" ")
}

/**
  * Set the scale to value so
  * the available space is used to it's maximum.
  */
export function zoomToFit(node, width, height, g) {
	var xOffset = -node.x;
	var yOffset = -node.y;
	var w = node.width || 1;
	var h = node.height || 1;
	// scale everything so that it fits the specified size
	var scale = Math.min(width / w, height / h);
	// centering
	xOffset += ((width / scale - node.width) / 2);
	yOffset += ((height / scale - node.height) / 2);

	// if a transformation group was specified we
	// perform a 'zoomToFit'
	var t = d3.zoomTransform(g.node())
	t.k = scale;
	t.x = xOffset * scale;
	t.y = yOffset * scale;
	if (!RUNNING_IN_NODE) {
		g = g.transition()
			.duration(200)
	}
	g.attr("transform", t);
}

function isDescendant(node, child) {
	var parent = child.parent;
	while (parent) {
		if (parent == node) {
			return true;
		}
		parent = parent.parent;
	}
	return false;
}
export function toAbsolutePositionsEdges(n, nodeMap) {
	// edges
	(n.edges || []).forEach(function(e) {
		// transform edge coordinates to absolute coordinates. Note that
		// node coordinates are already absolute and that
		// edge coordinates are relative to the source node's parent node
		// (unless the target node is a descendant of the source node)
		var srcNode = nodeMap[e.source];
		var tgtNode = nodeMap[e.target];
		var relative = isDescendant(srcNode, tgtNode) ?
			srcNode : srcNode.parent;

		var offset = { x: 0, y: 0 };
		if (relative) {
			offset.x = relative.x || 0;
			offset.y = relative.y || 0;
		}
		if (relative.padding) {
			offset.x += relative.padding.left || 0;
			offset.y += relative.padding.top || 0;
		}
		if (e.sections)
			e.sections.forEach(function(s) {
				// ... and apply it to the edge
				if (s.startPoint) {
					s.startPoint.x += offset.x;
					s.startPoint.y += offset.y;
				}
				if (s.endPoint) {
					s.endPoint.x += offset.x;
					s.endPoint.y += offset.y;
				}
				(s.bendPoints || []).forEach(function(bp) {
					bp.x += offset.x;
					bp.y += offset.y;
				});
			});
		if (e.junctionPoints)
			e.junctionPoints.forEach(function(jp) {
				jp.x += offset.x;
				jp.y += offset.y;
			});
	});
	// children
	(n.children || []).forEach(function(c) {
		toAbsolutePositionsEdges(c, nodeMap);
	});
};

export function toAbsolutePositions(n, offset, nodeMap) {
	n.x = (n.x || 0) + offset.x;
	n.y = (n.y || 0) + offset.y;
	nodeMap[n.id] = n;
	// the offset for the children has to include padding
	var childOffset = { x: n.x, y: n.y };
	if (n.padding) {
		childOffset.x += n.padding.left || 0;
		childOffset.y += n.padding.top || 0;
	}
	// children
	(n.children || []).forEach(function(c) {
		c.parent = n;
		toAbsolutePositions(c, childOffset, nodeMap);
	});
}


/**
  * Clean all layout possitions from nodes, nets and ports
  */
export function cleanLayout(n) {
	delete n.x;
	delete n.y;
	(n.ports || []).forEach(function(p) {
		delete p.x;
		delete p.y;
	});
	(n.edges || []).forEach(function(e) {
		delete e.sections;
		delete e.junctionPoints;
	});
	(n.children || []).forEach(function(c) {
		cleanLayout(c)
	});
}

