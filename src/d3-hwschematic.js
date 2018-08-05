import * as d3 from "d3";
import {addMarkers} from "./markers"; 
import {NodeRenderers} from "./node_renderers/selector"; 
import {OperatorNodeRenderer} from "./node_renderers/operatorNode"; 
import {MuxNodeRenderer} from "./node_renderers/muxNode";
import {SliceNodeRenderer} from "./node_renderers/sliceNode";
import {AbstractNodeRenderer} from "./node_renderers/abstract"; 
import {renderLinks} from "./linkRenderer"; 
import {default as d3elk} from "./elk/elk-d3";

/**
 * apply hideChildren flag no node
 **/
function applyHideChildren(n) {
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
 * HwScheme builds scheme diagrams after bindData(data) is called
 * 
 * @param svg:
 *            root svg element where scheme will be rendered
 * @note do specify size of svg to have optimal result
 */
export default class HwSchematic {
    constructor(svg) {
        this.svg = svg;
        this.PORT_PIN_SIZE = [7, 13];
        this.PORT_HEIGHT = this.PORT_PIN_SIZE[1];
        this.CHAR_WIDTH = 7.55;
        this.CHAR_HEIGHT = 13;
        this.NODE_MIDDLE_PORT_SPACING = 20;
        this.MAX_NODE_BODY_TEXT_SIZE = [400, 400];
        // top, right, bottom, left
        this.BODY_TEXT_PADDING = [15, 10, 0, 10];
        this.defs = svg.append("defs");
        addMarkers(this.defs, this.PORT_PIN_SIZE);
        this.root = svg.append("g");
        this.layouter = new d3elk();

        this.nodeRenderers = new NodeRenderers();
        this.nodeRenderers.registerRenderer(new OperatorNodeRenderer(this));
        this.nodeRenderers.registerRenderer(new MuxNodeRenderer(this));
        this.nodeRenderers.registerRenderer(new SliceNodeRenderer(this));
        this.nodeRenderers.registerRenderer(new AbstractNodeRenderer(this));
    }
        
    widthOfText(text) {
        if (text)
            return text.length * this.CHAR_WIDTH;
        else
            return 0;
    }

    removeGraph() {
      this.root.remove();
      this.root = svg.append("g");
    }
    
    /**
     * Set bind graph data to graph rendering engine
     */
    bindData(graph) {
      this.removeGraph();
        applyHideChildren(graph);
        var root = this.root;
        var layouter = this.layouter;
        var bindData = this.bindData.bind(this);
        var nodeRenderers = this.nodeRenderers
        var schematic = this;


        // config of layouter
        layouter
            .options({
                edgeRouting: "ORTHOGONAL",
            })
            .kgraph(graph)
            .size([width, height])
            .transformGroup(root)

        var nodes = layouter.getNodes().slice(1); // skip root node
        var edges = layouter.getEdges();
        // nodes are ordered, childeren at the end
        nodes.forEach(nodeRenderers.prepare.bind(nodeRenderers));
      
        // apply layout
        layouter.on("finish", function applyLayout() {
          // by "g" we group nodes along with their ports
          var node = root.selectAll(".node")
              .data(nodes)
              .enter()
              .append("g");
          nodeRenderers.render(root, node);              
          
          function toggleHideChildren(node) {
              var h = node.hideChildren = !node.hideChildren;
          }
    
          node.on("click", function (d) {
              var children;
              if (d.hideChildren)
                  children = d.__children;
              else
                  children = d.children;
    
              if (!children || children.length == 0)
                  return; // does not have anything to expand
              var graph = layouter.kgraph()
              layouter.cleanLayout();
              root.selectAll("*").remove();
              toggleHideChildren(d);    
              bindData(graph)
          });

          var link = renderLinks(root, edges);  
          // Select net on click
          link.on("click", function(d) {
            var doSelect = !d.selected;
            var l = d3.select(this);
            var data = l.data()[0];
            // propagate click on all nets with same source
            var src = data.source;
            var srcP = data.sourcePort;
            link.classed("link-selected", function (d) {
                if (d.source == src && d.sourcePort == srcP) {
                    d.selected = doSelect;
                }
                return d.selected;
            });
            d3.event.stopPropagation();
          });
        });
        
        layouter.start();
    }
    terminate() {
      if (this.layouter)
        this.layouter.terminate();
    }
}
