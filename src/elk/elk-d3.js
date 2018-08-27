import * as d3 from "d3";
import {default as ELK} from "./elk-api";

const RUNNING_IN_NODE = (typeof require !== "undefined");
const ELK_WORKER_NAME = "elk-worker.js";
const NO_LAYOUT = "org.eclipse.elk.noLayout";
// kgraph properties that shall be copied
const KGRAPH_KEYS = [
  'x', 'y',
  'width', 'height',
  "sections",
  'sourcePoint',
  'targetPoint',
  'junctionPoints',
  'properties'
].reduce(function(p, c) {p[c] = 1; return p;}, {});


function findElkWorkerURL() {
   if (RUNNING_IN_NODE)
      return null;
      
    // find name of elk worker script URL
    var elkWorkerScript;
    var scripts = document.getElementsByTagName('script');
    for(var i = 0; i < scripts.length; i++) {
       if(scripts[i].src.endsWith(ELK_WORKER_NAME)) {
          elkWorkerScript = scripts[i];
          break;
       }
    }
    if (typeof elkWorkerScript === "undefined")
       throw new Error("Can not locate elk-worker.js");

    return elkWorkerScript.src;
}

export default class d3elk {
   constructor() {
       // containers
       this.nodes = [];
       this.edges = [];
       this.graph = {}; // internal (hierarchical graph)
       this._options = {};
       // {id(str): object from input graph}
       this._d3ObjMap = {};
       // dimensions
       this.width = 0;
       this.height = 0;
       this._transformGroup = undefined;

       // a function applied after each layout run
       if (RUNNING_IN_NODE) {
          var workerFactory = function (url) { 
              const { Worker } = require("./elk-worker");
              return new Worker()
          }
       } else {
          var workerFactory = undefined;
       }
       // the layouter instance
       this.layouter = new ELK({
          algorithms: ['layered'],
          workerUrl:findElkWorkerURL(),
          workerFactory: workerFactory,
       });
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
       this.graph.width = this.width;
       this.graph.height = this.height;
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
   * */
   transformGroup(g) {
     if (!arguments.length)
        return this._transformGroup;
     this._transformGroup = g;
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
     return this.layouter.layout(
         this.graph,
          {layoutOptions: this._options}
     ).then(
         this.applyLayout.bind(this)
     );
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
      this._d3ObjMap = {}
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
         g.properties = {'algorithm': 'layered'};
     if (!g.properties.algorithm)
         g.properties.algorithm = 'layered';
     if (!g.width)
         g.width = this.width;
     if (!g.height)
         g.height = this.height;
     
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
       var n = this.graph;

     var cleanLayout = this.cleanLayout.bind(this);
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
         cleanLayout(c)
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
     this.copyElkProps(kgraph, this.graph);
   }
   
   /**
    * Webworker creates new graph object and layout props has to be
    * copied back to original graph
    * 
    * @param srcGraph: new graph from ELK worker
    * @param dstGraph: original graph provided by user
    **/
   copyElkProps(srcGraph, dstGraph) {
      var d3Objs = this._d3ObjMap;
      // init d3Objs
      d3Objs[dstGraph.id] = d3Objs;
      (dstGraph.edges || []).forEach(function(e) {
         if (e.id in d3Objs)
            throw new Error();
         d3Objs[e.id] = e;
      });
      (dstGraph.children || []).forEach(function(n) {
         d3Objs[n.id] = n;
      });
      (dstGraph.ports || []).forEach(function(p) {
         d3Objs[p.id] = p;
      });
      
      var copyProps = d3elk.copyProps.bind(this);
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
       var copyElkProps = this.copyElkProps.bind(this);
       (srcGraph.children || []).forEach(function(n) {
         copyElkProps(n, d3Objs[n.id])
       });
   }
   static copyProps(src, dst) {
       var keys = KGRAPH_KEYS;
       for (var k in src) {
         if (keys[k]) {
            dst[k] = src[k];
         }
       }
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
   zoomToFit(node) {
     if (node === null) {
        node = this.graph;
     }
     var xOffset = -node.x;
     var yOffset = -node.y;
     var w = node.width || 1;
     var h = node.height || 1;
     // scale everything so that it fits the specified size
     var scale = Math.min(this.width / w, this.height / h);
     // centering
     xOffset += ((this.width / scale - node.width) / 2);
     yOffset += ((this.height / scale - node.height) / 2);

     // if a transformation group was specified we
     // perform a 'zoomToFit'
     if (this._transformGroup) {
         var g = this._transformGroup;
   	  var t = d3.zoomTransform(g.node())
   	  t.k = scale;
   	  t.x = xOffset * scale;
   	  t.y = yOffset * scale;
   	  
   	  g.transition()
           .duration(200).attr("transform", t);
      }
   }

   terminate() {
      if (this.layouter)
         this.layouter.terminateWorker();
   }
};
