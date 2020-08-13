/**
 * Convert hyperedges to edges in whole graph
 * 
 * @param n root node
 * @param idOffset int, max id in graph, used for generating
 *                 of new edges from hyperedges 
 **/
export function hyperEdgesToEdges(n, idOffset) {
	if (typeof n.edges !== "undefined") {
		var newEdges = [];
		n.edges.forEach(function(e) {
			var isHyperEdge = typeof e.sources !== "undefined";
			if (isHyperEdge) {
				for (var s = 0; s < e.sources.length; s++) {
					var src = e.sources[s];
					for (var t = 0; t < e.targets.length; t++) {
						var dst = e.targets[t];
						idOffset += 1;
						newEdges.push({
							"hwMeta": { "parent": e },
							"id": "" + idOffset,
							"source": src[0],
							"sourcePort": src[1],
							"target": dst[0],
							"targetPort": dst[1],
						});
					}
				}
			} else {
				newEdges.push(e);
			}
		});
		n.edges = newEdges;
	}
	if (typeof n.children !== "undefined") {
		for (var i = 0; i < n.children.length; i++) {
			idOffset = hyperEdgesToEdges(n.children[i], idOffset);
		}
	}
	return idOffset
}

/**
 * Get parent of net for net
 **/
export function getNet(e) {
	if (typeof e.hwMeta.parent !== "undefined") {
		return e.hwMeta.parent;
	} else {
		return e;
	}
}

export function initParents(node, parent) {
	node.hwMeta.parent = parent;
	(node.children || []).forEach(function(n) {
		initParents(n, node);
	});
}
