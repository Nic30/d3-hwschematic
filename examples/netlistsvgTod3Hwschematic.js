/*
This involves:
* creating of hwMeta property
* elkjs 0.7.1 -> 0.7.0 conversion
   * "properties" vs "layoutOptions"
   * edge source/target format ([node.id, port.id] vs port.id only)

*/


function netlistsvgToD3HwschematicCollectParentsOfPorts(netlistsvgJson, res) {
    (netlistsvgJson.ports || []).forEach(p => {
        res[p.id] = netlistsvgJson.id;
    });
    (netlistsvgJson.children || []).forEach(c => {
        netlistsvgToD3HwschematicCollectParentsOfPorts(c, res);
    });
}

function netlistsvgToD3HwschematicPort(netlistsvgPort) {
    netlistsvgPort.children = [];
    netlistsvgPort.direction = netlistsvgPort.x <= 0 ? "INPUT" : "OUTPUT";
    var name = netlistsvgPort.id;
    var labels = netlistsvgPort.labels;
    if (labels && labels.length) {
        name = labels[0].text
    }
    netlistsvgPort.hwMeta = {
        "connectedAsParent": false,
        "level": 0,
        "name": name,
    };
    netlistsvgPort.properties = netlistsvgPort.layoutOptions || {};
    netlistsvgPort.properties.side  = netlistsvgPort.x <= 0 ? "WEST" : "EAST";

    delete netlistsvgPort["labels"];

    return netlistsvgPort;
}

function netlistsvgToD3HwschematicEdge(netlistsvgEdge, parentsOfPorts) {
    netlistsvgEdge.sources = netlistsvgEdge.sources.map(s => [parentsOfPorts[s], s]);
    netlistsvgEdge.targets = netlistsvgEdge.targets.map(t => [parentsOfPorts[t], t]);
    return netlistsvgEdge;
}

function _netlistsvgToD3Hwschematic(netlistsvgJson, parentsOfPorts) {
    netlistsvgJson.properties = netlistsvgJson.layoutOptions || {};
    var children = netlistsvgJson.children;
    if (children) {
        netlistsvgJson.children = children.map(c => _netlistsvgToD3Hwschematic(c, parentsOfPorts));
    }

    var name = netlistsvgJson.id;
    var labels = netlistsvgJson.labels;
    if (labels && labels.length)
        labels = labels[0].text;

    netlistsvgJson.hwMeta = {
        "name": name,
        "maxId": 0,
    };

    var ports = netlistsvgJson.ports;
    if (ports && ports.length) {
        netlistsvgJson.ports = ports.map(netlistsvgToD3HwschematicPort);
    }
    var edges = netlistsvgJson.edges;
    if (edges && edges.length) {
        netlistsvgJson.edges = edges.map(e => netlistsvgToD3HwschematicEdge(e, parentsOfPorts));
    }


    delete netlistsvgJson["labels"];

    return netlistsvgJson;
}


function netlistsvgToD3Hwschematic(netlistsvgJson) {
    var parentsOfPorts = {};
    netlistsvgToD3HwschematicCollectParentsOfPorts(netlistsvgJson, parentsOfPorts);
    return _netlistsvgToD3Hwschematic(netlistsvgJson, parentsOfPorts);
}
