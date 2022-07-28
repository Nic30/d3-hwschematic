import * as d3 from "d3";
import {addMarkers} from "./markers";
import {NodeRendererContainer} from "./nodeRendererContainer";
import {OperatorNodeRenderer} from "./node_renderers/operatorNode";
import {MuxNodeRenderer} from "./node_renderers/muxNode";
import {SliceNodeRenderer} from "./node_renderers/sliceNode";
import {GenericNodeRenderer} from "./node_renderers/generic";
import {renderLinks} from "./linkRenderer";
import {Tooltip} from "./tooltip";
import {yosysToD3Hwschematic} from "./yosysToD3Hwschematic";
import {
    hyperEdgesToEdges,
    getNet, initNodeParents, expandPorts
} from "./dataPrepare";
import {default as d3elk} from "./elk/elk-d3";

function getNameOfEdge(e) {
    let name = "<tspan>unnamed</tspan>";
    if (e.hwMeta) {
        if (typeof e.hwMeta.name === "undefined") {
            let p = e.hwMeta.parent;
            let pIsHyperEdge = typeof p.sources !== "undefined"
            if (pIsHyperEdge && p.hwMeta) {
                name = p.hwMeta.name;
            }
        } else {
            name = e.hwMeta.name;
        }
    }
    return name;
}

function toggleHideChildren(node) {
    let children;
    let nextFocusTarget;
    if (node.children) {
        // children are visible, will collapse
        children = node.children;
        nextFocusTarget = node.hwMeta.parent;
    } else {
        // children are hidden, will expand
        children = node._children;
        nextFocusTarget = node;
    }

    let tmpChildren = node.children;
    node.children = node._children;
    node._children = tmpChildren;
    let tmpEdges = node.edges;
    node.edges = node._edges;
    node._edges = tmpEdges;
    node.hwMeta.renderer.prepare(node);
    return [children, nextFocusTarget];
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
        // flag for performance debug
        this._PERF = false;
        // main svg element
        this.svg = svg;
        // default sizes of elements
        this.PORT_PIN_SIZE = [7, 13];
        this.PORT_HEIGHT = this.PORT_PIN_SIZE[1];
        this.CHAR_WIDTH = 7.55;
        this.CHAR_HEIGHT = 13;
        this.NODE_MIDDLE_PORT_SPACING = 20;
        this.MAX_NODE_BODY_TEXT_SIZE = [400, 400];
        // top, right, bottom, left
        this.BODY_TEXT_PADDING = [15, 10, 0, 10];
        svg.classed("d3-hwschematic", true);
        this.defs = svg.append("defs");
        this.root = svg.append("g");
        this.errorText = null;
        this._nodes = null;
        this._edges = null;

        // graph layouter to resolve positions of elements
        this.layouter = new d3elk();
        this.layouter
            .options({
                edgeRouting: "ORTHOGONAL",
            })
            .transformGroup(this.root);

        // shared tooltip object
        this.tooltip = new Tooltip(document.getElementsByTagName('body')[0]);

        // renderer instances responsible for rendering of component nodes
        this.nodeRenderers = new NodeRendererContainer();
        addMarkers(this.defs, this.PORT_PIN_SIZE);
        let rs = this.nodeRenderers;
        rs.registerRenderer(new OperatorNodeRenderer(this));
        rs.registerRenderer(new MuxNodeRenderer(this));
        rs.registerRenderer(new SliceNodeRenderer(this));
        rs.registerRenderer(new GenericNodeRenderer(this));
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

    updateGlobalSize() {
        let width = parseInt(this.svg.style("width") || this.svg.attr("width"), 10);
        let height = parseInt(this.svg.style("height") || this.svg.attr("height"), 10);

        this.layouter
            .size([width, height]);
    }

    /**
     * Set bind graph data to graph rendering engine
     *
     * @return promise for this job
     */
    bindData(graph) {
        this.removeGraph();
        let postCompaction = "layered.compaction.postCompaction.strategy";
        if (!graph.properties[postCompaction]) {
            graph.properties[postCompaction] = "EDGE_LENGTH";
        }
        hyperEdgesToEdges(graph, graph.hwMeta.maxId);
        initNodeParents(graph, null);
        expandPorts(graph);

        if (this._PERF) {

            let t0 = new Date().getTime();
            this.nodeRenderers.prepare(graph);
            let t1 = new Date().getTime();
            console.log("> nodeRenderers.prepare() : " + (t1 - t0) + " ms");
        } else {
            // nodes are ordered, children at the end
            this.nodeRenderers.prepare(graph);
        }
        this.layouter
            .kgraph(graph);
        return this._draw();
    }

    /*
     * Resolve layout and draw a component graph from layout data
     */
    _draw() {
        this.updateGlobalSize();

        let layouter = this.layouter;
        this._nodes = layouter.getNodes().slice(1); // skip root node
        this._edges = layouter.getEdges();
        let t0;
        if (this._PERF) {
            t0 = new Date().getTime();
        }
        let _this = this;
        return layouter.start()
            .then(
                function (g) {
                    if (_this._PERF) {
                        let t1 = new Date().getTime();
                        console.log("> layouter.start() : " + (t1 - t0) + " ms");
                        t0 = t1;
                    }
                    _this._applyLayout(g);
                    if (_this._PERF) {
                        let t1 = new Date().getTime();
                        console.log("> HwSchematic._applyLayout() : " + (t1 - t0) + " ms");
                    }
                },
                function (e) {
                    // Error while running d3-elkjs layouter
                    throw e;
                }
            );
    }

    /**
     * Draw a component graph from layout data
     */
    _applyLayout() {
        let root = this.root;

        let node = root.selectAll(".node")
            .data(this._nodes)
            .enter()
            .append("g");
        this.nodeRenderers.render(root, node);

        let _this = this;
        node.on("click", function (ev, d) {
            let [children, nextFocusTarget] = toggleHideChildren(d);
            if (!children || children.length === 0) {
                return; // does not have anything to expand
            }
            _this.layouter.markLayoutDirty();
            _this.removeGraph();
            _this._draw().then(
                function () {
                    _this.layouter.zoomToFit(nextFocusTarget);
                },
                function (e) {
                    // Error while applying of layout
                    throw e;
                }
            );
        });

        this._applyLayoutLinks();
    }

    _applyLayoutLinks() {
        let _this = this;
        let edges = this._edges;

        let [link, linkWrap, _] = renderLinks(this.root, edges);
        // build netToLink
        let netToLink = {};
        edges.forEach(function (e) {
            netToLink[getNet(e).id] = {
                "core": [],
                "wrap": []
            };
        });
        linkWrap._groups.forEach(function (lg) {
            lg.forEach(function (l) {
                let e = d3.select(l).data()[0];
                netToLink[getNet(e).id]["wrap"].push(l);
            });
        });
        link._groups.forEach(function (lg) {
            lg.forEach(function (l) {
                let e = d3.select(l).data()[0];
                netToLink[getNet(e).id]["core"].push(l);
            });
        });

        // set highlingt and tooltip on mouser over over the net
        linkWrap.on("mouseover", function (ev, d) {
            let netWrap = netToLink[getNet(d).id]["wrap"];
            d3.selectAll(netWrap)
                .classed("link-wrap-activated", true);

            _this.tooltip.show(ev, getNameOfEdge(d));
        });
        linkWrap.on("mouseout", function (ev, d) {
            let netWrap = netToLink[getNet(d).id]["wrap"];
            d3.selectAll(netWrap)
                .classed("link-wrap-activated", false);

            _this.tooltip.hide();
        });

        // set link highlight on net click
        function onLinkClick(ev, d) {
            let net = getNet(d);
            let doSelect = net.selected = !net.selected;
            // propagate click on all nets with same source

            let netCore = netToLink[net.id]["core"];
            d3.selectAll(netCore)
                .classed("link-selected", doSelect);
            ev.stopPropagation();
        }

        // Select net on click
        link.on("click", onLinkClick);
        linkWrap.on("click", onLinkClick);
    }

    static fromYosys(yosysJson) {
        return yosysToD3Hwschematic(yosysJson);
    }

    terminate() {
        if (this.layouter) {
            this.layouter.terminate();
        }
    }

    setErrorText(msg) {
        this.root.selectAll("*").remove();
        let errText = this.errorText;
        if (!errText) {
            errText = this.errorText = this.root.append("text")
                .attr("x", "50%")
                .attr("y", "50%")
                .attr("dominant-baseline", "middle")
                .attr("text-anchor", "middle")
                .style("font-size", "34px");
        }
        errText.text(msg);
        let t = d3.zoomTransform(this.root.node());
        t.k = 1;
        t.x = 0;
        t.y = 0;
        this.root.attr("transform", t);

    }
}
