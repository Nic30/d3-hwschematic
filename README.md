# d3-hwschematic
[![Travis-ci Build Status](https://travis-ci.org/Nic30/d3-hwschematic.png?branch=master)](https://travis-ci.org/Nic30/d3-hwschematic)[![npm version](https://badge.fury.io/js/d3-hwschematic.svg)](https://badge.fury.io/js/d3-hwschematic)[![Coverage Status](https://coveralls.io/repos/github/Nic30/d3-hwschematic/badge.svg?branch=master)](https://coveralls.io/github/Nic30/d3-hwschematic?branch=master)[![Documentation Status](https://readthedocs.org/projects/d3-hwschematic/badge/?version=latest)](http://d3-hwschematic.readthedocs.io/en/latest/?badge=latest)

D3.js and ELK based schematic visualizer.

Use `npm install d3-hwschematic --save` to install this library and save it to your package.json file.

## Features:

* automatic layout
* hierarchical components expandable on click
* net selection on click
* zoom, drag
* input is [ELK json](https://www.eclipse.org/elk/documentation/tooldevelopers/graphdatastructure/jsonformat.html)

![cdc_pulse_gen](https://github.com/Nic30/d3-hwschematic/tree/master/docs/cdc_pulse_gen.png "cdc_pulse_gen")
![cdc_pulse_gen][cdc_pulse_gen]

[cdc_pulse_gen]: https://github.com/Nic30/d3-hwschematic/tree/master/docs/cdc_pulse_gen.png "cdc_pulse_gen"



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



## Similar opensource projects

* [netlistsvg](https://github.com/nturley/netlistsvg) - draws an SVG schematic from a JSON netlist
* [pyVhdl2Sch](https://github.com/LaurentCabaret/pyVhdl2Sch) -  Python based VHDL to (pdf) schematic converter
* [verilog-dot](https://github.com/ben-marshall/verilog-dot) - Python, A simple dot file / graph generator for Verilog syntax trees.
* [diagrammer](https://github.com/freechipsproject/diagrammer) - Scala, Very simple visualizer for chisel3.
* [Spyce](https://github.com/imec-myhdl/Spyce) - Python, Simple circuit editor, MyHDL output (only prototype)
* [circuitsandbox](http://bitbucket.org/kwellwood/circuitsandbox) - Java, Boolean network editor and simulator
* [BreadboardSim](https://github.com/daveshah1/BreadboardSim) - C#, Circuit Simulator with Breadboard UI 
* [adaptagrams](https://github.com/mjwybrow/adaptagrams) - C++, Libraries for constraint-based layout and connector routing for diagrams.
