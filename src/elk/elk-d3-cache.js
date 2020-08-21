/*
  * Collect list of expanded nodes
  */
export function computeLayoutCacheKey(n, res) {
	res.push(n.id);
	if (n.children) {
		n.children.forEach((d) => { computeLayoutCacheKey(d, res); });
	}
}

/*
* Store current state of layout
*/
export function serializeLayout(n) {
	var res = {
		"id": n.id,
		"x": n.x,
		"y": n.y,
		"width": n.width,
		"height": n.height,
	};
	if (n.ports) {
		res["ports"] = n.ports.map(function(p) {
			return {
				"id": p.id,
				"x": p.x,
				"y": p.y,
				"width": p.width,
				"height": p.height,
			};
		});
	}
	if (n.edges) {
		res["edges"] = n.edges.map(function(e) {
			return {
				"id": e.id,
				"sections": e.sections,
				"junctionPoints": e.junctionPoints
			};
		});
	}
	if (n.children) {
		res["children"] = n.children.map(function(c) {
			return serializeLayout(c)
		});
	}
	return res;
}

// apply cached element positions and size
export function applyCachedState(n, state) {
	if (n.id != state.id) {
		throw new Error("Cached state not matching current data");
	}
	n.x = state.x;
	n.y = state.y;
	n.width = state.width;
	n.height = state.height;
	if (n.ports) {
		state.ports.forEach(function(s, i) {
			var p = n.ports[i];
			if (p.id != s.id) {
				throw new Error("Cached state not matching current data");
			}
			p.x = s.x;
			p.y = s.y;
			p.width = s.width;
			p.height = s.height;
		});
	}
	if (n.edges) {
		state.edges.forEach(function(s, i) {
			var p = n.edges[i];
			if (p.id != s.id) {
				throw new Error("Cached state not matching current data");
			}
			p.sections = s.sections;
			p.junctionPoints = s.junctionPoints;
		});
	}
	if (n.children) {
		state.children.forEach(function(s, i) {
			var c = n.children[i];
			return applyCachedState(c, s);
		});
	}
}