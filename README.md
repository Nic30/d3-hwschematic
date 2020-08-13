# d3-hwschematic
[![Travis-ci Build Status](https://travis-ci.org/Nic30/d3-hwschematic.png?branch=master)](https://travis-ci.org/Nic30/d3-hwschematic)[![npm version](https://badge.fury.io/js/d3-hwschematic.svg)](https://badge.fury.io/js/d3-hwschematic)[![Coverage Status](https://coveralls.io/repos/github/Nic30/d3-hwschematic/badge.svg?branch=master)](https://coveralls.io/github/Nic30/d3-hwschematic?branch=master)[![Documentation Status](https://readthedocs.org/projects/d3-hwschematic/badge/?version=latest)](http://d3-hwschematic.readthedocs.io/en/latest/?badge=latest)

D3.js and ELK based schematic visualizer.

Use `npm install d3-hwschematic --save` to install this library and save it to your package.json file.

## Features:

* automatic layout
* hierarchical components expandable on click
* net selection on click
* zoom, drag
* input is [ELK json](https://www.eclipse.org/elk/documentation/tooldevelopers/graphdatastructure/jsonformat.html) with hwMeta propoperty which contains name and body text for the component

![cdc_pulse_gen](https://github.com/Nic30/d3-hwschematic/raw/master/docs/cdc_pulse_gen.png "cdc_pulse_gen")


## How to use examples

### Online

Documentation of [hwtLib](https://hwtlib.readthedocs.io/en/latest/?badge=latest) compoents uses this library to render schemes.
(Look for scheme href under component name.)


### From this git

1. download dependencies and build this library

```bash
npm install
npm install --only=dev
npm run build
```

2. Then you can open examples, but current web browsers does not allow to load files from local disk (because of security).
It has multiple solution
  * You can run chrome with --allow-file-access-from-files option
  * (prefered) Or use webserver. One webserver implementation is part of standard python distribution.

```bash
# (in root directory of this git)
python3 -m http.server 8888
```

Now you should be able to view the example application on http://0.0.0.0:8888/examples/example.html?schematic=/examples/schemes/Crc.json.
Where part after schematic= is path to json file where schematic is stored.


## ELK json format for d3-hwschematic

This libarary uses [ELK json](https://www.eclipse.org/elk/documentation/tooldevelopers/graphdatastructure/jsonformat.html).
This format is basically a component tree stored in json.
The json specifies not just the structure of circuit but also how the circuit should be rendered.
It contains 3 object types `LNode`, `LPort` and `LEdge`.

ELK LNode (component instance)
```javascript
{
  "id": "0",
  "hwMeta": { // [d3-hwschematic specific]
    "name": "compoent instance name", // optional str
    "cls_name": "compoent (module) name", // optional str
    "bodyText": "", // optional str
    "maxId": 2, // max id of any object in this node used to avoid counting object in expand/collapse
    "isExternalPort": true // optional flag which set component style to external port
  },
  "hideChildren": true, // [d3-hwschematic specific] optional flag, if true the body of component is collapsed
  "properties": { // recommended renderer settings
    "org.eclipse.elk.portConstraints": "FIXED_ORDER", // can be also "FREE" or other value accepted by ELK
    "org.eclipse.elk.randomSeed": 0,
    "org.eclipse.elk.layered.mergeEdges": 1
  },
  "ports": [],    // list of LPort
  "children": [], // list of LNode
  "edges": [],    // list of LEdge
}
```

ELK LPort
```javascript
{
  "id": "1",
  "hwMeta": { // [d3-hwschematic specific]
    "level": 0, // used to mark nested ports, if level > prev. port.level port is member of prev. port
    "name": "port name"
  },
  "direction": "OUTPUT", // [d3-hwschematic specific] controlls direction marker
  "properties": {
    "portSide": "EAST",
    "portIndex": 0 // The order is assumed as clockwise, starting with the leftmost port on the top side.
                   // Required only for components with "org.eclipse.elk.portConstraints": "FIXED_ORDER"
  }
}
```

ELK LEdge
```javascript
{ // simple LEdge
  "id": "62",
  "source": "2", // id of component 
  "sourcePort": "23", // id of component port
  "target": "4", // id of component 
  "targetPort": "29", // id of component port
  "hwMeta": { // [d3-hwschematic specific]
    "name": null // optional string, displayed on mouse over
  }
}
{ // hyper LEdge
  "id": "1119",
  "sources": [
    ["17", "343"]  // id of component, id of port
  ],
  "targets": [
    [ "18", "346"],  // id of component, id of port
    [ "21", "354"],
  ],
  "hwMeta": { // [d3-hwschematic specific] 
    "name": "wr_ptr"
  }
}
```

LNode represents all types of components. Top component ports are also represented as `LNode` because it looks better.

## Component shapes

The style and shape is determined by node renderers. Node renderers are defined in `src/node_renderers`.
Renderer classes can be registered using  `HwSchematic.nodeRenderers.registerRenderer()` function on HwSchematic object.
The node renderer has function `select` which is used to determine if renderer should be used for for selected LNode.



## Similar opensource projects

* [netlistsvg](https://github.com/nturley/netlistsvg) - draws an SVG schematic from a JSON netlist
* [pyVhdl2Sch](https://github.com/LaurentCabaret/pyVhdl2Sch) -  Python based VHDL to (pdf) schematic converter
* [verilog-dot](https://github.com/ben-marshall/verilog-dot) - Python, A simple dot file / graph generator for Verilog syntax trees.
* [diagrammer](https://github.com/freechipsproject/diagrammer) - Scala, Very simple visualizer for chisel3.
* [Spyce](https://github.com/imec-myhdl/Spyce) - Python, Simple circuit editor, MyHDL output (only prototype)
* [circuitsandbox](http://bitbucket.org/kwellwood/circuitsandbox) - Java, Boolean network editor and simulator
* [BreadboardSim](https://github.com/daveshah1/BreadboardSim) - C#, Circuit Simulator with Breadboard UI 
* [adaptagrams](https://github.com/mjwybrow/adaptagrams) - C++, Libraries for constraint-based layout and connector routing for diagrams.
* [sphinxcontrib-verilog-diagrams](https://github.com/SymbiFlow/sphinxcontrib-verilog-diagrams) - Python, Sphinx Extension which generates various types of diagrams from Verilog code.
* [logidrom](https://github.com/wavedrom/logidrom) - JS, Digital circuit renderer for some specific circuits
* [dkilfoyle/logic](https://github.com/dkilfoyle/logic) - JS, IDE for digital circuit simulation
