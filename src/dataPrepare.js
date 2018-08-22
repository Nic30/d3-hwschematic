/**
 * apply hideChildren flag no node
 **/
export function applyHideChildren(n) {
    if (n.hideChildren) {
        if (n.children !== undefined) {
            n.__children = n.children;
            n.__edges = n.edges;
            delete n.children;
            delete n.edges;
        }
    } else {
        if (n.__children !== undefined) {
            n.children = n.__children;
            n.edges = n.__edges;
            delete n.__children;
            delete n.__edges;
        }
    }
    (n.children || []).forEach(applyHideChildren)
}

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
        n.edges.forEach(function (e) {
            var isHyperEdge = typeof e.sources !== "undefined";
            if (isHyperEdge) {
                for (var s = 0; s < e.sources.length; s++) {
                	var src = e.sources[s];
                    for (var t = 0; t < e.targets.length; t++) {
                    	var dst = e.targets[t];
                    	idOffset += 1;
                        newEdges.push({
                            "hwt": {"parent": e},
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