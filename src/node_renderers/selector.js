/**
 * Node renderer selector,
 * by specified GenericNodeRenderer.selector functions select renderer object for node  
 */
export class NodeRenderers {
    constructor() {
        this.renderers = []
        // renderer : list of nodes
        this.nodesForRenderers = {};
        // data.id : renderer
        this.rendererForNode = {}; 
    }

    registerRenderer(renderer) {
        this.renderers.push(renderer);
    }
    
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

        var nodeList = this.nodesForRenderers[r];
        if (typeof nodeList === "undefined") {
            nodeList = [];
            this.nodesForRenderers[r] = nodeList;
        }
        
        nodeList.push(node);
        this.rendererForNode[node.id] = r;
        
        r.prepare(node);
    }
    
    render(root, nodeG) {
    	// [TODO] find out how to construct d3.selection from list of html objects
        //var nodes = this.nodesForRenderers;
        //for (var r in dictionary) {
        //    if (dictionary.hasOwnProperty(r)) {           
        //        r.render(root, nodes);
        //    }
        //}
        var rfn = this.rendererForNode;
        var nfr = this.nodesForRenderers;
        this.renderers.forEach(function (r) {
            var _nfr = nfr[r];
            if (typeof _nfr !== "undefined" && _nfr.length > 0) {
                var nodes = nodeG.filter(function (n) {
                    return rfn[n.id] === r; 
                });
                r.render(root, nodes);
            }
        });
    }
}