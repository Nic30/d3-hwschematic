var elk;
(function (elk) {
  elk.d3kgraph = function() {
    return init();
  };
  /**
   * Convert section from ELK json to svg path string
   */
  elk.section2svgPath = function (section) {
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
  
  function init() {
    var d3elk = {},
    dispatch = d3.dispatch("finish"),
    // containers
    nodes = [],
    edges = [],
    graph = {}, // internal (hierarchical graph)
    ports = function(n) {
      // by default the 'ports' field
      return n.ports || [];
    },
    labels = function(n) {
      return n.labels || [];
    },
    options = {},
    // dimensions
    width = 0,
    height = 0,
    transformGroup,
    // kgraph properties that shall be copied
    kgraphKeys = [
      'x', 'y',
      'width', 'height',
      'sourcePoint', 'targetPoint',
      'properties'
    ].reduce(function(p, c) {p[c] = 1; return p;}, {}),
    // a function applied after each layout run
    applyLayout = function() {},
    // location of the elk.js script
    layouterScript = function() {
      var scripts = document.getElementsByTagName('script');
      for (var i = 0; i < scripts.length; ++i) {
      var url = scripts[i].src;  
        if (url.indexOf("elk.js") > -1 || url.indexOf("elk.bundled.js") > -1) {
          return scripts[i].src;
        }
      }
      throw "elk.js library wasn't loaded!";
    },
    // the layouter instance
    layouter;
    
    // try to use a worker?
    if ('<%= worker %>' === 'true' && typeof(Worker) !== 'undefined') {
      var worker = new Worker(layouterScript());
      layouter = {
        layout: function(data) {
          worker.postMessage({
            graph: data.graph,
            options: data.options
          });
        }
      };
      worker.addEventListener('message', function (e) {
        graph = e.data;
        applyLayout(graph);
      }, false);
    } 

    // either we don't want a worker or the worker is not available
    if (!layouter) {
      if (typeof ELK !== "undefined") {
          // elkjs already imported
        layouter = new ELK({workerUrl:"/static/hls/connections_elk/elk-worker.js"});
      } else if (typeof module === "object" && module.exports) {
          layouter = require("elkjs");
      } else if (typeof $elkjs !== "undefined") {
        // try to get from global scope, e.g. loaded by bower
          layouter = $elkjs;
      } else {
          throw "elkjs.js library wasn't loaded!"
      }
    }
    var NO_LAYOUT = "org.eclipse.elk.noLayout";
    /**
     * Setting the available area, the
     * positions of the layouted graph
     * are currently scaled down.
     */
    d3elk.size = function(size) {
      if (!arguments.length) return [width, height];
      width = size[0];
      height = size[1];
      if(graph != null) {
    	  graph.width = width;
    	  graph.height = height;
      }
      return d3elk;
    };

    /**
     * Sets the group used to perform 'zoomToFit'.
     */
    d3elk.transformGroup = function(g) {
      if (!arguments.length) return transformGroup;
      transformGroup = g;
      return d3elk;
    };

    d3elk.options = function(opts) {
      if (!arguments.length) return options;
      options = opts;
      return d3elk;
    };

    /**
     * Start the layout process.
     */
    d3elk.start = function() {
      // alias applyLayout method
      applyLayout = d3_kgraph_applyLayout;
     
      // start the layouter
      function onSuccess(kgraph)  {
          graph = kgraph;
          applyLayout(kgraph);
      }
      layouter.layout(graph, {layoutOptions: options}).then(onSuccess, d3elk.onError);
      return d3elk;
    };

    d3elk.getNodes = function() {
      if (d3elk.__nodeCache != null)
        return d3elk.__nodeCache;

      var queue = [graph],
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
      d3elk.__nodeCache = nodes;
      return nodes;
    };

    d3elk.getPorts = function() {
    	if (d3elk.__portsCache != null)
    		return d3elk.__portsCache;
    	
    	var ports = d3.merge(d3elk.getNodes().map(function(n) {
    		return n.ports || [];
    	}));
    	d3elk.__portsCache = ports; 
    };

    d3elk.getEdges = function() {
      if (d3elk.__edgesCache != null)
        return d3elk.__edgesCache;

      d3elk.__edgesCache = graph.edges || [];

      var edgesOfChildren = d3.merge(
    		  d3elk.getNodes()
    		  .filter(function (n) {
    			  return !n.hideChildren;
    		  })
    		  .map(function(n) {
        return n.edges || [];
      }));

      d3elk.__edgesCache = d3elk.__edgesCache.concat(edgesOfChildren);
      return d3elk.__edgesCache;
    };

    d3elk.invalidateCaches = function() {
        d3elk.__nodeCache = null;
        d3elk.__portsCache = null;
        d3elk.__edgesCache = null;
    };
      
    d3elk.kgraph = function(root) {
      if (!arguments.length) return graph;
    	
      graph = root;
      d3elk.invalidateCaches();
      // alias applyLayout method
        applyLayout = d3_kgraph_applyLayout;
      if (!graph.id)
          graph.id = "root";
      if (!graph.properties)
          graph.properties = { 'algorithm': 'layered' };
      if (!graph.properties.algorithm)
    	  graph.properties.algorithm = 'layered';
      if (!graph.width)
    	  graph.width = width;
      if (!graph.height)
    	  graph.height = height;
      
      
      return d3elk;
    };
    
    d3elk.onError = function (e) {
    	throw e;
    }
    
    /**
     * Clean all layout possitions from nodes, nets and ports
     */
    d3elk.cleanLayout = function (n) {
    	if (!arguments.length) n = graph;
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
    		d3elk.cleanLayout(c)
        });
    }
    
    /**
     * Apply layout for the kgraph style.
     * Converts relative positions to absolute positions.
     */
    var d3_kgraph_applyLayout = function(kgraph) {
      zoomToFit(kgraph);
      var nodeMap = {};
      // convert to absolute positions
      toAbsolutePositions(kgraph, {x: 0, y:0}, nodeMap);
      toAbsolutePositionsEdges(kgraph, nodeMap);
      // invoke the 'finish' event
      dispatch.call('finish', {graph: kgraph});
    };
    var toAbsolutePositions = function(n, offset, nodeMap) {
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
        toAbsolutePositions(c, childOffset, nodeMap);
      });
    };
    var isDescendant = function(node, child) {
      var parent = child.parent;
      while (parent) {
        if (parent == node) {
          return true;
        }
        parent = parent.parent;
      }
      return false;
    }
    var toAbsolutePositionsEdges = function(n, nodeMap) {
      // edges
      (n.edges || []).forEach(function (e) {
        // transform edge coordinates to absolute coordinates. Note that
        //  node coordinates are already absolute and that
        //  edge coordinates are relative to the source node's parent node
        //  (unless the target node is a descendant of the source node)
        var srcNode = nodeMap[e.source];
        var tgtNode = nodeMap[e.target];
        var relative = isDescendant(srcNode, tgtNode) ?
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
        toAbsolutePositionsEdges(c, nodeMap);
      });
    };
    /**
     * If a top level transform group is specified,
     * we set the scale such that the available
     * space is used to its maximum.
     */
    function zoomToFit(kgraph) {
      // scale everything so that it fits the specified size
      var scale = width / (kgraph.width || 1);
      var sh = height / (kgraph.height || 1);
      if (sh < scale) {
        scale = sh;
      }
      // if a transformation group was specified we
      // perform a 'zoomToFit'
      if (transformGroup) {
        transformGroup.attr("transform", "scale(" + scale + ")");
      }
    }
    
    d3elk.on = function() {
        var value = dispatch.on.apply(dispatch, arguments);
        return value === dispatch ? d3elk : value;
    };
    // return the layouter object
    return d3elk;
  }
  if (typeof module === "object" && module.exports) {
    module.exports = elk;
  }
  return elk;
})(elk || (elk = {}));