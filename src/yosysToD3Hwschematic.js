function getPortSide(portName, direction, nodeName) {
    if (direction === "input" && nodeName === "MUX" && portName === "S") {
        return "SOUTH";
    }
    if (direction === "output") {
        return "EAST";
    }
    if (direction === "input") {
        return "WEST";
    }
    throw new Error("Unknown direction " + direction);
}

function orderClkAndRstPorts(node) {
    let index = 0;
    for (let port of node.ports) {
        let dstIndex = index;
        if (port.hwMeta.name === "CLK") {
            dstIndex = node.ports.length - 1;
        } else if (port.hwMeta.name === "ARST") {
            dstIndex = node.ports.length - 2;
        }
        if (index !== dstIndex) {
            let otherPort = node.ports[dstIndex];
            node.ports[dstIndex] = port;
            node.ports[index] = otherPort;
            otherPort.properties.index = port.properties.index;
            port.properties.index = dstIndex;
        }
        ++index;
    }
}

function iterNetnameBits(netnames, fn) {
    for (const [netname, netObj] of Object.entries(netnames)) {
        for (const bit of netObj.bits) {
            fn(netname, bit, Number.isInteger(bit), isConst(bit));
        }
    }
}

function getNetNamesDict(yosysModule) {
    let netnamesDict = {}; // yosys bits (netId): netname

    iterNetnameBits(yosysModule.netnames, (netname, bit, isInt, isStr) => {
        if (isInt) {
            netnamesDict[bit] = netname;
        } else if (!isStr) {
            throw new Error("Invalid type in bits: " + typeof bit);
        }
    });
    return netnamesDict;
}

function isConst(val) {
    return (typeof val === "string");
}

function getConstNodeName(nameArray) {
    let nodeName = nameArray.reverse().join("");
    nodeName = ["0b", nodeName].join("");
    if (nodeName.match(/^0b[01]+$/g)) {
        let res = BigInt(nodeName).toString(16);
        return ["0x", res].join("");
    }
    return nodeName;
}

function addEdge(edge, portId, edgeDict, startIndex, width) {
    let edgeArr = edgeDict[portId];
    if (edgeArr === undefined) {
        edgeArr = edgeDict[portId] = [];
    }
    edgeArr[startIndex] = [edge, width];
}

function getSourceAndTarget2(edge) {
    return [edge.sources, edge.targets, false, true];
}

function getSourceAndTargetForCell(edge) {
    return [edge.targets, edge.sources, true, false];
}

function getPortNameSplice(startIndex, width) {
    if (width === 1) {
        return `[${startIndex}]`;
    } else if (width > 1) {
        let endIndex = startIndex + width;
        return `[${endIndex}:${startIndex}]`;
    }

    throw new Error("Incorrect width" + width);

}


function hideChildrenAndNodes(node, yosysModule) {
    if (yosysModule !== null) {
        if (node.children.length === 0 && node.edges.length === 0) {
            delete node.children
            delete node.edges;

        } else {
            node._children = node.children;
            delete node.children
            node._edges = node.edges;
            delete node.edges;
        }
    }
}


function updatePortIndices(ports) {
    let index = 0;
    for (let port of ports) {
        port.properties.index = index;
        ++index;
    }
}

function dividePorts(ports) {
    let north = [];
    let east = [];
    let south = [];
    let west = [];

    for (let port of ports) {
        let side = port.properties.side;
        if (side === "NORTH") {
            north.push(port);
        } else if (side === "EAST") {
            east.push(port);
        } else if (side === "SOUTH") {
            south.push(port);
        } else if (side === "WEST") {
            west.push(port);
        } else {
            throw new Error("Invalid port side: " + side);
        }
    }

    return [north, east, south, west];
}

function convertPortOrderingFromYosysToElk(node) {
    let [north, east, south, west] = dividePorts(node.ports);
    node.ports = north.concat(east, south.reverse(), west.reverse());
    updatePortIndices(node.ports);

}

function getTopModuleName(yosysJson) {
    let topModuleName = undefined;
    for (const [moduleName, moduleObj] of Object.entries(yosysJson.modules)) {
        if (moduleObj.attributes.top) {
            topModuleName = moduleName;
            break;
        }
    }

    if (topModuleName === undefined) {
        throw new Error("Cannot find top");
    }

    return topModuleName;
}

function yosysTranslateIcons(node, cell) {
    let meta = node.hwMeta;
    const t = cell.type;

    if (t === "$mux" || t === "$pmux") {
        meta.cls = "Operator";
        meta.name = "MUX";
    } else if (t === "$gt") {
        meta.cls = "Operator";
        meta.name = "GT";
    } else if (t === "$lt") {
        meta.cls = "Operator";
        meta.name = "LT";
    } else if (t === "$ge") {
        meta.cls = "Operator";
        meta.name = "GE";
    } else if (t === "$le") {
        meta.cls = "Operator";
        meta.name = "LE";
    } else if (t === "$not" || t === "$logic_not") {
        meta.cls = "Operator";
        meta.name = "NOT";
    } else if (t === "$logic_and" || t === "$and") {
        meta.cls = "Operator";
        meta.name = "AND";
    } else if (t === "$logic_or" || t === "$or") {
        meta.cls = "Operator";
        meta.name = "OR";
    } else if (t === "$xor") {
        meta.cls = "Operator";
        meta.name = "XOR";
    } else if (t === "$eq") {
        meta.cls = "Operator";
        meta.name = "EQ";
    } else if (t === "$ne") {
        meta.cls = "Operator";
        meta.name = "NE";
    } else if (t === "$add") {
        meta.cls = "Operator";
        meta.name = "ADD";
    } else if (t === "$sub") {
        meta.cls = "Operator";
        meta.name = "SUB";
    } else if (t === "$mul") {
        meta.cls = "Operator";
        meta.name = "MUL";
    } else if (t === "$div") {
        meta.cls = "Operator";
        meta.name = "DIV";
    } else if (t === "$slice") {
        meta.cls = "Operator";
        meta.name = "SLICE";
    } else if (t === "$concat") {
        meta.cls = "Operator";
        meta.name = "CONCAT";
    } else if (t === "$adff") {
        meta.cls = "Operator";
        let arstPolarity = cell.parameters["ARST_POLARITY"];
        let clkPolarity = cell.parameters["CLK_POLARITY"];
        if (clkPolarity && arstPolarity) {
            meta.name = "FF_ARST_clk1_rst1";
        } else if (clkPolarity) {
            meta.name = "FF_ARST_clk1_rst0";
        } else if (arstPolarity) {
            meta.name = "FF_ARST_clk0_rst1";
        } else {
            meta.name = "FF_ARST_clk0_rst0";
        }
    } else if (t === "$dff") {
        meta.cls = "Operator";
        meta.name = "FF";
    } else if (t === "$shift" || t === "$shiftx") {
        meta.cls = "Operator";
        meta.name = "SHIFT";
    } else if (t === "$dlatch") {
        meta.cls = "Operator";
        let enPolarity = cell.parameters["EN_POLARITY"];
        if (enPolarity) {
            meta.name = "DLATCH_en1";
        } else {
            meta.name = "DLATCH_en0";

        }
    }
}

class LNodeMaker {
    constructor(name, yosysModule, idCounter, yosysModules, hierarchyLevel, nodePortNames) {
        this.name = name;
        this.yosysModule = yosysModule;
        this.idCounter = idCounter;
        this.yosysModules = yosysModules;
        this.hierarchyLevel = hierarchyLevel;
        this.nodePortNames = nodePortNames;
        this.childrenWithoutPortArray = [];
        this.nodeIdToCell = {};
    }

    make() {
        if (this.name === undefined) {
            throw new Error("Name is undefined");
        }

        let node = this.makeNode(this.name);

        if (this.yosysModule) {
            // cell with module definition, load ports, edges and children from module def. recursively
            this.fillPorts(node, this.yosysModule.ports, (p) => {
                return p.direction
            }, undefined);
            this.fillChildren(node);
            this.fillEdges(node);

        }

        if (node.children !== undefined) {
            for (let child of node.children) {
                convertPortOrderingFromYosysToElk(child);
                if (child.hwMeta.cls === "Operator" && child.hwMeta.name.startsWith("FF")) {
                    orderClkAndRstPorts(child);
                }
            }
        }

        if (this.hierarchyLevel > 1) {
            hideChildrenAndNodes(node, this.yosysModule);
        }

        node.hwMeta.maxId = this.idCounter - 1;
        return node;
    }

    makeNode(name) {
        let node = {
            "id": this.idCounter.toString(), //generate, each component has unique id
            "hwMeta": { // [d3-hwschematic specific]
                "name": name, // optional str
                "cls": "", // optional str
                "maxId": 2, // max id of any object in this node used to avoid re-counting object if new object is generated
            },
            "properties": { // recommended renderer settings
                "org.eclipse.elk.portConstraints": "FIXED_ORDER", // can be also "FREE" or other value accepted by ELK
                "org.eclipse.elk.layered.mergeEdges": 1
            },
            "ports": [],    // list of LPort
            "edges": [],    // list of LEdge
            "children": [], // list of LNode
        };
        ++this.idCounter;
        return node;
    }

    fillPorts(node, ports, getPortDirectionFn, cellObj) {
        const isSplit = cellObj !== undefined && cellObj.type === "$slice";
        const isConcat = cellObj !== undefined && cellObj.type === "$concat";
        let portByName = this.nodePortNames[node.id];
        if (portByName === undefined) {
            portByName = {};
            this.nodePortNames[node.id] = portByName;
        }
        for (let [portName, portObj] of Object.entries(ports)) {
            let originalPortName = portName;
            if (isSplit || isConcat) {
                if (portName === "Y") {
                    portName = "";
                }
                if (isSplit) {
                    if (portName === "A") {
                        portName = getPortNameSplice(cellObj.parameters.OFFSET, cellObj.parameters.Y_WIDTH);
                    }
                } else if (isConcat) {
                    let par = cellObj.parameters;
                    if (portName === "A") {
                        portName = getPortNameSplice(0, par.A_WIDTH);
                    } else if (portName === "B") {
                        portName = getPortNameSplice(par.A_WIDTH, par.B_WIDTH);
                    }
                }
            }
            let direction = getPortDirectionFn(portObj);
            this.makeLPort(node.ports, portByName, originalPortName, portName, direction, node.hwMeta.name);
        }
    }

    makeLPort(portList, portByName, originalName, name, direction, nodeName) {
        if (name === undefined) {
            throw new Error("Name is undefined");
        }

        let portSide = getPortSide(name, direction, nodeName);
        let port = {
            "id": this.idCounter.toString(),
            "hwMeta": { // [d3-hwschematic specific]
                "name": name,
            },
            "direction": direction.toUpperCase(), // [d3-hwschematic specific] controls direction marker
            "properties": {
                "side": portSide,
                "index": 0 // The order is assumed as clockwise, starting with the leftmost port on the top side.
                // Required only for components with "org.eclipse.elk.portConstraints": "FIXED_ORDER"
            },
            "children": [], // list of LPort, if the port should be collapsed rename this property to "_children"
        };
        port.properties.index = portList.length;
        portList.push(port);
        portByName[originalName] = port;
        ++this.idCounter;
        return port;
    }

    fillChildren(node) {
        // iterate all cells and lookup for modules and construct them recursively
        for (const [cellName, cellObj] of Object.entries(this.yosysModule.cells)) {
            let moduleName = cellObj.type; //module name
            let cellModuleObj = this.yosysModules[moduleName];
            let nodeBuilder = new LNodeMaker(cellName, cellModuleObj, this.idCounter, this.yosysModules,
                this.hierarchyLevel + 1, this.nodePortNames);
            let subNode = nodeBuilder.make();
            this.idCounter = nodeBuilder.idCounter;
            node.children.push(subNode);
            yosysTranslateIcons(subNode, cellObj);
            this.nodeIdToCell[subNode.id] = cellObj;
            if (cellModuleObj === undefined) {
                if (cellObj.port_directions === undefined) {
                    // throw new Error("[Todo] if modules does not have definition in modules and its name does not \
                    // start with $, then it does not have port_directions. Must add port to sources and targets of an edge")

                    this.childrenWithoutPortArray.push([cellObj, subNode]);
                    continue;
                }
                this.fillPorts(subNode, cellObj.port_directions, (p) => {
                    return p;
                }, cellObj);
            }
        }
    }

    fillEdges(node) {

        let edgeTargetsDict = {};
        let edgeSourcesDict = {};
        let constNodeDict = {};
        let [edgeDict, edgeArray] = this.getEdgeDictFromPorts(
            node, constNodeDict, edgeTargetsDict, edgeSourcesDict);
        let netnamesDict = getNetNamesDict(this.yosysModule);

        function getPortName(bit) {
            return netnamesDict[bit];
        }

        for (let i = 0; i < node.children.length; i++) {
            const subNode = node.children[i];
            if (constNodeDict[subNode.id] === 1) {
                //skip constants to iterate original cells
                continue;
            }

            let cell = this.nodeIdToCell[subNode.id];
            if (cell.port_directions === undefined) {
                continue;
            }
            let connections = cell.connections;
            let portDirections = cell.port_directions;


            if (connections === undefined) {
                throw new Error("Cannot find cell for subNode" + subNode.hwMeta.name);
            }

            let portI = 0;
            let portByName = this.nodePortNames[subNode.id];
            for (const [portName, bits] of Object.entries(connections)) {
                let portObj;
                let direction;
                if (portName.startsWith("$")) {
                    portObj = subNode.ports[portI++]
                    direction = portObj.direction.toLowerCase(); //use direction from module port definition
                } else {
                    portObj = portByName[portName];
                    direction = portDirections[portName];
                }

                this.loadNets(node, subNode.id, portObj.id, bits, direction, edgeDict, constNodeDict,
                    edgeArray, getPortName, getSourceAndTargetForCell, edgeTargetsDict, edgeSourcesDict);

            }
        }
        // source null target null == direction is output

        for (const [cellObj, subNode] of this.childrenWithoutPortArray) {
            for (const [portName, bits] of Object.entries(cellObj.connections)) {
                let port = null;
                for (const bit of bits) {
                    let edge = edgeDict[bit];
                    if (edge === undefined) {
                        throw new Error("[Todo] create edge");
                    }
                    let edgePoints;
                    let direction;
                    if (edge.sources.length === 0 && edge.targets.length === 0) {
                        direction = "output";
                        edgePoints = edge.sources;
                    } else if (edge.sources.length === 0) {
                        // no sources -> add as source
                        direction = "output";
                        edgePoints = edge.sources;
                    } else {
                        direction = "input";
                        edgePoints = edge.targets;
                    }

                    if (port === null) {
                        let portByName = this.nodePortNames[subNode.id];
                        if (portByName === undefined) {
                            portByName = {};
                            this.nodePortNames[subNode.id] = portByName;
                        }
                        port = this.makeLPort(subNode.ports, portByName, portName, portName, direction, subNode.hwMeta.name);
                    }

                    edgePoints.push([subNode.id, port.id]);
                }
            }

        }

        let edgeSet = {}; // [sources, targets]: true
        for (const edge of edgeArray) {
            let key = [edge.sources, null, edge.targets]
            if (!edgeSet[key]) // filter duplicities
            {
                edgeSet[key] = true;
                node.edges.push(edge);
            }
        }

    }

    getEdgeDictFromPorts(node, constNodeDict, edgeTargetsDict, edgeSourcesDict) {
        let edgeDict = {}; // yosys bits (netId): LEdge
        let edgeArray = [];
        let portsIndex = 0;
        for (const [portName, portObj] of Object.entries(this.yosysModule.ports)) {
            let port = node.ports[portsIndex];
            portsIndex++;

            function getPortName2() {
                return portName;
            }

            this.loadNets(node, node.id, port.id, portObj.bits, portObj.direction,
                edgeDict, constNodeDict, edgeArray, getPortName2, getSourceAndTarget2,
                edgeTargetsDict, edgeSourcesDict)

        }
        return [edgeDict, edgeArray];
    }

    /*
     * Iterate bits representing yosys net names, which are used to get edges from the edgeDict.
     * If edges are not present in the dictionary, they are created and inserted into it. Eventually,
     * nodes are completed by filling sources and targets properties of LEdge.
     */
    loadNets(node, nodeId, portId, bits, direction, edgeDict, constNodeDict, edgeArray,
             getPortName, getSourceAndTarget, edgeTargetsDict, edgeSourcesDict) {
        for (let i = 0; i < bits.length; ++i) {
            let startIndex = i;
            let width = 1;
            let bit = bits[i];
            let portName = getPortName(bit);
            let edge = edgeDict[bit];
            let netIsConst = isConst(bit);
            if (netIsConst || edge === undefined) {
                // create edge if it is not in edgeDict
                if (portName === undefined) {
                    if (!netIsConst) {
                        throw new Error("Netname is undefined");
                    }
                    portName = bit;
                }
                edge = this.makeLEdge(portName);
                edgeDict[bit] = edge;
                edgeArray.push(edge);
                if (netIsConst) {
                    i = this.addConstNodeToSources(node, bits, edge.sources, i, constNodeDict);
                    width = i - startIndex + 1;
                }
            }

            let [a, b, targetA, targetB] = getSourceAndTarget(edge);
            if (direction === "input") {
                a.push([nodeId, portId]);
                if (targetA) {
                    addEdge(edge, portId, edgeTargetsDict, startIndex, width);
                } else {
                    addEdge(edge, portId, edgeSourcesDict, startIndex, width)
                }
            } else if (direction === "output") {
                b.push([nodeId, portId]);
                if (targetB) {
                    addEdge(edge, portId, edgeTargetsDict, startIndex, width);
                } else {
                    addEdge(edge, portId, edgeSourcesDict, startIndex, width);
                }
            } else {
                throw new Error("Unknown direction " + direction);
            }
        }
    }

    makeLEdge(name) {
        if (name === undefined) {
            throw new Error("Name is undefined");
        }
        let edge = {
            "id": this.idCounter.toString(),
            "sources": [],
            "targets": [], // [id of LNode, id of LPort]
            "hwMeta": { // [d3-hwschematic specific]
                "name": name, // optional string, displayed on mouse over
            }
        };
        ++this.idCounter;
        return edge;
    }

    addConstNodeToSources(node, bits, sources, i, constNodeDict) {
        let nameArray = [];
        for (i; i < bits.length; ++i) {
            let bit = bits[i];
            if (isConst(bit)) {
                nameArray.push(bit);
            } else {
                break;
            }
        }
        --i;
        // If bit is a constant, create a node with constant
        let nodeName = getConstNodeName(nameArray);
        let constSubNode;
        let port;
        [constSubNode, port] = this.addConstNode(node, nodeName, constNodeDict);
        sources.push([constSubNode.id, port.id]);
        return i;
    }

    addConstNode(node, nodeName, constNodeDict) {
        let port;

        let nodeBuilder = new LNodeMaker(nodeName, undefined, this.idCounter, null,
            this.hierarchyLevel + 1, this.nodePortNames);
        let subNode = nodeBuilder.make();
        this.idCounter = nodeBuilder.idCounter;

        let portByName = this.nodePortNames[subNode.id] = {};
        port = this.makeLPort(subNode.ports, portByName, "O0", "O0", "output", subNode.hwMeta.name);
        node.children.push(subNode);
        constNodeDict[subNode.id] = 1;

        return [subNode, port];
    }


}

export function yosysToD3Hwschematic(yosysJson) {
    let nodePortNames = {};
    let rootNodeBuilder = new LNodeMaker("root", null, 0, null, 0, nodePortNames);
    let output = rootNodeBuilder.make();
    let topModuleName = getTopModuleName(yosysJson);

    let nodeBuilder = new LNodeMaker(topModuleName, yosysJson.modules[topModuleName], rootNodeBuilder.idCounter,
        yosysJson.modules, 1, nodePortNames);
    let node = nodeBuilder.make();
    output.children.push(node);
    output.hwMeta.maxId = nodeBuilder.idCounter - 1;
    //yosysTranslateIcons(output);
    //print output to console
    //console.log(JSON.stringify(output, null, 2));

    return output;
}
