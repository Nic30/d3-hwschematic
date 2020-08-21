import * as d3 from "d3";
import { default as ELK } from "elkjs";
import {
	NO_LAYOUT, toAbsolutePositionsEdges, toAbsolutePositions, cleanLayout, copyElkProps, zoomToFit
} from "./elk-d3-utils.js"

import { applyCachedState, serializeLayout, computeLayoutCacheKey } from "./elk-d3-cache.js";

export default class d3elk {
	constructor() {
		// containers
		this.graph = {}; // internal (hierarchical graph)
		this._options = {};
		// dimensions
		this.width = 0;
		this.height = 0;
		this._transformGroup = undefined;

		// the layouter instance
		this.layouter = new ELK({
			algorithms: ['layered'],
		});
		this._invalidateCaches();
	}

	/**
	  * Set or get the available area, the positions of the layouted graph are
	  * currently scaled down.
	  */
	size(size) {
		if (!arguments.length)
			return [this.width, this.height];
		var old_w = this.width;
		var old_h = this.height;
		this.width = size[0];
		this.height = size[1];

		if (this.graph != null) {
			if (old_w !== this.width || old_h !== this.height) {
				this._layoutCache = {};
			}
			this.graph.width = this.width;
			this.graph.height = this.height;
		}
		return this;
	};

	/**
	  * Sets the group used to perform 'zoomToFit'.
	  */
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
		var cacheKey = [];
		computeLayoutCacheKey(this.graph, cacheKey);
		var state = this._layoutCache[cacheKey];
		var _this = this;
		if (typeof state !== 'undefined') {
			// load layout from cache
			return new Promise((resolve, reject) => {
				resolve();
			}).then(
				function() {
					applyCachedState(_this.graph, state);
				}
			)
		} else {
			// run layouter
			this._cleanLayout();
			this._currentLayoutCacheKey = cacheKey;
			return this.layouter.layout(
				this.graph,
				{ layoutOptions: this._options }
			).then(
				this._applyLayout.bind(this),
				function(e) {
					// Error while running elkjs layouter
					_this._currentLayoutCacheKey = null;
					throw e;
				}
			);
		}
	}

	// get currently visible nodes
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


	// get currently visible ports
	getPorts() {
		if (this.__portsCache != null)
			return this.__portsCache;

		var ports = d3.merge(this.getNodes().map(function(n) {
			return n.ports || [];
		}));
		this.__portsCache = ports;
	}


	// get currently visible edges
	getEdges() {
		if (this.__edgesCache != null)
			return this.__edgesCache;

		this.__edgesCache = this.graph.edges || [];

		var edgesOfChildren = d3.merge(
			this.getNodes()
				.filter(function(n) {
					return n.children;
				})
				.map(function(n) {
					return n.edges || [];
				}));

		this.__edgesCache = this.__edgesCache.concat(edgesOfChildren);
		return this.__edgesCache;
	}

	// bind graph data
	kgraph(root) {
		if (!arguments.length)
			return this.graph;

		var g = this.graph = root;
		this._invalidateCaches();

		if (!g.id)
			g.id = "root";
		if (!g.properties)
			g.properties = { 'algorithm': 'layered' };
		if (!g.properties.algorithm)
			g.properties.algorithm = 'layered';
		if (!g.width)
			g.width = this.width;
		if (!g.height)
			g.height = this.height;

		return this;
	};
	/**
	  * If a top level transform group is specified, we set the scale to value so
  	  * the available space is used to it's maximum.
	  */
	zoomToFit(node) {
		if (!this._transformGroup) {
			return;
		}
		if (node === null) {
			node = this.graph;
		}
		zoomToFit(node, this.width, this.height, this._transformGroup);
	}

	terminate() {
		if (this.layouter)
			this.layouter.terminateWorker();
	}

	/**
     * Clean all layout possitions from nodes, nets and ports
     */
	_cleanLayout(n) {
		if (!arguments.length)
			var n = this.graph;
		cleanLayout(n);
		return this;
	}
	_invalidateCaches() {
		// cached used to avoid execuiton of elkjs to resolve the layout of
		// graph if executed previously with same input
		// {sorted list of expanded node ids: {nodeId: {"x": ..., "y": ...,
		// "ports": {portId: [x, y]}},
		// edgeId: [points] }}
		this._layoutCache = {};
		this._currentLayoutCacheKey = null;

		// {id(str): object from input graph} used to access graph objects by it's id
		this._d3ObjMap = {}
		this.markLayoutDirty();
	};
	markLayoutDirty() {
		this.__nodeCache = null;
		this.__portsCache = null;
		this.__edgesCache = null;
	}
	/**
	  * Apply layout for the kgraph style. Converts relative positions to
	  * absolute positions.
	  */
	_applyLayout(kgraph) {
		this.zoomToFit(kgraph);
		var nodeMap = {};
		// convert to absolute positions
		toAbsolutePositions(kgraph, { x: 0, y: 0 }, nodeMap);
		toAbsolutePositionsEdges(kgraph, nodeMap);
		copyElkProps(kgraph, this.graph, this._d3ObjMap);
		this._layoutCache[this._currentLayoutCacheKey] = serializeLayout(this.graph);

		return this.graph;
	}
};
