import "d3";
import {default as ELK} from "./elk-api";

const ELK_WORKER_NAME = "elk-worker.js";
const NO_LAYOUT = "org.eclipse.elk.noLayout";

function findElkWorkerURL() {
    // find name of elk worker script URL
    var elkWorkerScript;
    var scripts = document.getElementsByTagName('script');
    for(var i = 0; i < scripts.length; i++) {
    	console.log(scripts[i].src);
    	if(scripts[i].src.endsWith(ELK_WORKER_NAME)) {
    		elkWorkerScript = scripts[i];
    		break;
    	}
    }
    if (typeof elkWorkerScript === "undefined")
    	throw new Error("Can not locate elk-worker.js");
    return elkWorkerScript.src;
    // var blob = new Blob(Array.prototype.map.call(
    // document.querySelectorAll('script[type=\'text\/js-worker\']'),
    // function (oScript) { return oScript.textContent; }),{type:
	// 'text/javascript'});

    
}

export default class d3elk {
	constructor() {
		this.dispatch = d3.dispatch("finish");
	    // containers
	    this.nodes = [];
	    this.edges = [];
	    this.graph = {}; // internal (hierarchical graph)
	    this._options = {};
	    // dimensions
	    this.width = 0;
	    this.height = 0;
	    this.transformGroup;
	    // kgraph properties that shall be copied
	    this.kgraphKeys = [
	      'x', 'y',
	      'width', 'height',
	      'sourcePoint', 'targetPoint',
	      'properties'
	    ].reduce(function(p, c) {p[c] = 1; return p;}, {});
	    // a function applied after each layout run
	    var applyLayout;
	    
	    // the layouter instance
	    this.layouter = new ELK({
	    	algorithms: [ 'layered'],
	    	workerUrl:findElkWorkerURL()
	    });
	}

	ports(n) {
	  // by default the 'ports' field
	  return n.ports || [];
	}

	labels(n) {
	  return n.labels || [];
	}
    /**
	 * Setting the available area, the positions of the layouted graph are
	 * currently scaled down.
	 */
    size(size) {
      if (!arguments.length)
    	  return [this.width, this.height];
      this.width = size[0];
      this.height = size[1];
      
      if(this.graph != null) {
        this.graph.width = width;
        this.graph.height = height;
      }
      return this;
    };
	
    /**
	 * Convert section from ELK json to svg path string
	 */
    static section2svgPath(section) {
      var pathBuff = ["M", section.startPoint.x, section.startPoint.y];
      if (section.bendPoints)
        section.bendPoints.forEach(function (bp, i) {
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
	 * Sets the group used to perform 'zoomToFit'.
	 */
    transformGroup(g) {
      if (!arguments.length)
    	  return this.transformGroup;
      this.transformGroup = g;
      return this;
    }

    options(opts) {
      if (!arguments.length)
    	  return this._options;
      this._options = opts;
      return this;
    }

    /**
	 * Start the layout process.
	 */
    start() {
      // alias applyLayout method
      var graph  = this.graph;
      var self = this;
      // start the layouter
      function onSuccess(kgraph)  {
        graph = kgraph;
        self.applyLayout(kgraph);
      }
      this.layouter.layout(
    		  graph,
    		  {layoutOptions: this._options}
      ).then(onSuccess,
    		 this.onError
      );
      return self;
    }

    getNodes() {
      if (this.__nodeCache != null)
        return this.__nodeCache;

      var queue = [this.graph],
          nodes = [],
          parent;
      // note that svg z-index is document order, literally
      while ((parent = queue.pop()) != null) {
        if (!parent.properties[NO_LAYOUT]) {
            nodes.push(parent);
            (parent.children || []).forEach(function(c) {
              queue.push(c);
            });
        }
      }
      this.__nodeCache = nodes;
      return nodes;
    }

    getPorts() {
        if (this.__portsCache != null)
            return this.__portsCache;
        
        var ports = d3.merge(this.getNodes().map(function(n) {
            return n.ports || [];
        }));
        this.__portsCache = ports; 
    }

    getEdges() {
      if (this.__edgesCache != null)
        return this.__edgesCache;

      this.__edgesCache = this.graph.edges || [];

      var edgesOfChildren = d3.merge(
        this.getNodes()
        .filter(function (n) {
         return !n.hideChildren;
        })
        .map(function(n) {
            return n.edges || [];
        }));

      this.__edgesCache = this.__edgesCache.concat(edgesOfChildren);
      return this.__edgesCache;
    }

    invalidateCaches() {
       this.__nodeCache = null;
       this.__portsCache = null;
       this.__edgesCache = null;
    };

    kgraph(root) {
      if (!arguments.length)
    	  return this.graph;
        
      var g = this.graph = root;
      this.invalidateCaches();
      // alias applyLayout method
      if (!g.id)
          g.id = "root";
      if (!g.properties)
          g.properties = { 'algorithm': 'layered' };
      if (!g.properties.algorithm)
          g.properties.algorithm = 'layered';
      if (!g.width)
          g.width = width;
      if (!g.height)
          g.height = height;
      
      return this;
    };
    
    onError(e) {
      throw e;
    }
    
    /**
	 * Clean all layout possitions from nodes, nets and ports
	 */
    cleanLayout(n) {
        if (!arguments.length)
        	var n = graph;

        delete n.x;
        delete n.y;
        (n.ports || []).forEach(function (p) {
            delete p.x;
            delete p.y;
        });
        (n.edges || []).forEach(function (e) { 
            delete e.sections;
            delete e.junctionPoints;
        });
        (n.children || []).forEach(function(c) {
            this.cleanLayout(c)
        });
    }
    
    /**
	 * Apply layout for the kgraph style. Converts relative positions to
	 * absolute positions.
	 */
    applyLayout(kgraph) {
      this.zoomToFit(kgraph);
      var nodeMap = {};
      // convert to absolute positions
      d3elk.toAbsolutePositions(kgraph, {x: 0, y:0}, nodeMap);
      d3elk.toAbsolutePositionsEdges(kgraph, nodeMap);
      // invoke the 'finish' event
      this.dispatch.call('finish', {graph: kgraph});
    }

    static toAbsolutePositions(n, offset, nodeMap) {
      n.x = (n.x || 0) + offset.x;
      n.y = (n.y || 0) + offset.y;
      nodeMap[n.id] = n;
      // the offset for the children has to include padding
      var childOffset = {x: n.x, y: n.y};
      if (n.padding) {
        childOffset.x += n.padding.left || 0;
        childOffset.y += n.padding.top || 0;
      }
      // children
      (n.children || []).forEach(function(c) {
        c.parent = n;
        d3elk.toAbsolutePositions(c, childOffset, nodeMap);
      });
    }

    static isDescendant(node, child) {
      var parent = child.parent;
      while (parent) {
        if (parent == node) {
          return true;
        }
        parent = parent.parent;
      }
      return false;
    }

    static toAbsolutePositionsEdges(n, nodeMap) {
      // edges
      (n.edges || []).forEach(function (e) {
        // transform edge coordinates to absolute coordinates. Note that
        // node coordinates are already absolute and that
        // edge coordinates are relative to the source node's parent node
        // (unless the target node is a descendant of the source node)
        var srcNode = nodeMap[e.source];
        var tgtNode = nodeMap[e.target];
        var relative = d3elk.isDescendant(srcNode, tgtNode) ?
                        	srcNode : srcNode.parent;
        
        var offset = {x: 0, y: 0};
        if (relative) {
          offset.x = relative.x || 0;
          offset.y = relative.y || 0;
        }
        if (relative.padding) {
          offset.x += relative.padding.left || 0;
          offset.y += relative.padding.top || 0;
        }
        if (e.sections)
            e.sections.forEach(function (s) {
                // ... and apply it to the edge
                if (s.startPoint) {
                  s.startPoint.x += offset.x;
                  s.startPoint.y += offset.y;
                }
                if (s.endPoint) {
                  s.endPoint.x += offset.x;
                  s.endPoint.y += offset.y;
                }
                (s.bendPoints || []).forEach(function (bp) {
                  bp.x += offset.x;
                  bp.y += offset.y;
                });
            });
        if (e.junctionPoints)
            e.junctionPoints.forEach(function (jp) {
                  jp.x += offset.x;
                  jp.y += offset.y;
            });
      });
      // children
      (n.children || []).forEach(function(c) {
    	  d3elk.toAbsolutePositionsEdges(c, nodeMap);
      });
    };
    
    
    /**
	 * If a top level transform group is specified, we set the scale such that
	 * the available space is used to its maximum.
	 */
    zoomToFit(kgraph) {
      // scale everything so that it fits the specified size
      var scale = this.width / (kgraph.width || 1);
      var sh = this.height / (kgraph.height || 1);
      if (sh < scale) {
        scale = sh;
      }
      // if a transformation group was specified we
      // perform a 'zoomToFit'
      if (this.transformGroup) {
    	  this.transformGroup.attr("transform", "scale(" + scale + ")");
      }
    }
    
    // event listener register method
    on() {
        var value = this.dispatch.on.apply(this.dispatch, arguments);
        return value === this.dispatch ? this: value;
    };

    // return the layouter object
};
