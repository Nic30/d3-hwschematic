
function findGraph(nodeArray, nodeName) {
    for (let node of nodeArray) {
        if (node.hwMeta.name === nodeName) {
            return node
        }
    }
    throw new Error("Node is not found: " + nodeName);
}

export function selectGraphRootByPath(graph, path) {
    let pathArray = path.split("/");
    let first = true;
    let newGraph = graph;
    for (let nodeName of pathArray) {
        if (first && nodeName === "") {
            first = false;
            continue;
        }
        newGraph = findGraph((newGraph.children || newGraph._children), nodeName);
    }
    if (graph !== newGraph) {
        //case if path has nonzero length
        //copy because we need to make graph immutable because we will need it later
        graph = Object.assign({}, graph);
        graph.children = [newGraph];
    }
    return graph;

}
