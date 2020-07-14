import * as d3 from "d3";
import {addMarkers} from "./markers"; 
import {NodeRenderers} from "./node_renderers/selector"; 
import {OperatorNodeRenderer} from "./node_renderers/operatorNode"; 
import {MuxNodeRenderer} from "./node_renderers/muxNode";
import {SliceNodeRenderer} from "./node_renderers/sliceNode";
import {GenericNodeRenderer} from "./node_renderers/generic"; 
import {renderLinks} from "./linkRenderer";
import {Tooltip} from "./tooltip";
import {applyHideChildren, hyperEdgesToEdges,
        getNet, initParents} from "./dataPrepare";
import {default as d3elk} from "./elk/elk-d3";

function getNameOfEdge(e) {
    var name = "<tspan>unnamed</tspan>";
    if (e.hwMeta) {
       if (typeof e.hwMeta.name === "undefined") {
           var p = e.hwMeta.parent;
           var pIsHyperedge = typeof p.sources !== "undefined"
           if (pIsHyperedge && p.hwMeta) {
               name = p.hwMeta.name;
           }
       } else {
           name = e.hwMeta.name;
       }
    }
    return name;
}

/**
 * HwScheme builds scheme diagrams after bindData(data) is called
 * 
 * @param svg: root svg element where scheme will be rendered
 * @attention zoom is not applied it is only used for focusing on objects
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
        this.tooltip = document.getElem
        this.defs = svg.append("defs");
        this.root = svg.append("g");
        this._nodes = null;
        this._edges = null;
        this.layouter = new d3elk();
        this.layouter.options({
            edgeRouting: "ORTHOGONAL",
        });
        this.layouter.transformGroup(this.root);
        this.tooltip = new Tooltip(document.getElementsByTagName('body')[0]);
        this.nodeRenderers = new NodeRenderers();

        addMarkers(this.defs, this.PORT_PIN_SIZE);
        this.nodeRenderers.registerRenderer(new OperatorNodeRenderer(this));
        this.nodeRenderers.registerRenderer(new MuxNodeRenderer(this));
        this.nodeRenderers.registerRenderer(new SliceNodeRenderer(this));
        this.nodeRenderers.registerRenderer(new GenericNodeRenderer(this));
        
        //this.svg.on("resize", this.onresize.bind(this));
    }
    //onresize(ev) {
//    console.log(ev);
    //}

    getHtmlIdOfNode(node) {
        return "node-id-" + node.id;
    }
    
    widthOfText(text) {
        if (text) {
            return text.length * this.CHAR_WIDTH;
        } else {
            return 0;
        }
    }
    
    removeGraph() {
      this.root.selectAll("*").remove();
    }
    
    /**
     * Set bind graph data to graph rendering engine
     * 
     * @return promise for this job
     */
    bindData(graph) {
        this.removeGraph();
        hyperEdgesToEdges(graph, graph.hwMeta.maxId);
        initParents(graph, null);
        applyHideChildren(graph);

        var nodeRenderers = this.nodeRenderers
        var layouter = this.layouter;
        // config of layouter
        layouter
          .kgraph(graph)
          .size([
            parseInt(this.svg.style("width") || this.svg.attr("width"), 10),
            parseInt(this.svg.style("height") || this.svg.attr("height"), 10)
          ]);
        var nodes = layouter.getNodes().slice(1); // skip root node
        // nodes are ordered, childeren at the end
        nodes.forEach(nodeRenderers.prepare.bind(nodeRenderers));
        // by "g" we group nodes along with their ports
        var edges = layouter.getEdges();
        this._nodes = nodes;
        this._edges = edges;
        return layouter.start()
             .then(this.applyLayout.bind(this));
    }

    applyLayout() {
        var root = this.root;
        var schematic = this;
        var layouter = this.layouter;
        var nodeRenderers = this.nodeRenderers
        var bindData = this.bindData.bind(this);
        var getHtmlIdOfNode = this.getHtmlIdOfNode.bind(this);
        var nodes = this._nodes;
        var edges = this._edges;

        var node = root.selectAll(".node")
            .data(nodes)
            .enter()
            .append("g")
            .attr("id", getHtmlIdOfNode);
        nodeRenderers.render(root, node);              
        
        function toggleHideChildren(node) {
            node.hideChildren = !node.hideChildren;
        }
  
        node.on("click", function (d) {
            var children;
            var nextFocusTarget;
            if (d.hideChildren) {
                // children are hidden, will expand
                children = d.__children;
                nextFocusTarget = d;
            } else {
                // children are visible, will collapse
                children = d.children;
                nextFocusTarget = d.hwMeta.parent;
            }

            if (!children || children.length == 0)
                return; // does not have anything to expand

            var graph = layouter.kgraph()
            layouter.cleanLayout();
            root.selectAll("*").remove();
            toggleHideChildren(d); 

            bindData(graph).then(function() {
               layouter.zoomToFit(nextFocusTarget);
            });
        });

        var [link, linkWrap, junctionPoint] = renderLinks(root, edges);
        var netToLink = {};
        edges.forEach(function (e) {
            netToLink[getNet(e).id] = {
                    "core": [],
                    "wrap": []
            };
        });
        linkWrap._groups.forEach(function (lg) {
            lg.forEach(function (l) {
               var e = d3.select(l).data()[0];
               netToLink[getNet(e).id]["wrap"].push(l);
            });
        });
        link._groups.forEach(function (lg) {
            lg.forEach(function (l) {
                var e = d3.select(l).data()[0];
                netToLink[getNet(e).id]["core"].push(l);
             });
        });
        
        linkWrap.on("mouseover", function (d) {
            var netWrap = netToLink[getNet(d).id]["wrap"];
              d3.selectAll(netWrap)
              .attr("class", "link-wrap-activated");

            schematic.tooltip.show(d3.event, getNameOfEdge(d));
        });
        linkWrap.on("mouseout", function (d) {
            var netWrap = netToLink[getNet(d).id]["wrap"];
              d3.selectAll(netWrap)
              .attr("class", "link-wrap");

            schematic.tooltip.hide();
        });
        
        function onLinkClick(d) {
            var net = getNet(d);
            var doSelect = net.selected = !net.selected;
            // propagate click on all nets with same source
            
            var netCore = netToLink[net.id]["core"];
            d3.selectAll(netCore)
              .classed("link-selected", doSelect);
            d3.event.stopPropagation();
        }
        
        // Select net on click
        link.on("click", onLinkClick);
        linkWrap.on("click", onLinkClick);
    }
    terminate() {
      if (this.layouter)
        this.layouter.terminate();
    }
}
