/**
 * Library of functions which creates shapes of operator nodes (gate symbols)
 **/


/**
 * Draw a circle for arithmetic nodes
 */
function nodeCircle(root) {
  root.append("circle")
    .attr("r", "12.5")
    .attr("cx", "12.5")
    .attr("cy", "12.5");
}

/**
 * Draw a negation circle for nodes like NOT, NAND, NOR, etc...
 */
function negationCircle(root, x, y) {
  root.append("circle")
    .attr("cx", x)
    .attr("cy", y)
    .attr("r", "3");
}

function nodeCircleWithText(root, text) {
  // width="25" height="25"
  var tl = text.length;
  if (tl > 2) {
    throw new Error("Text too big for small node circle");
  }
  var x = 8;
  if (tl === 2)
    x = 4;

  nodeCircle(root);
  root.append("text")
    .attr("x", x)
    .attr("y", 16)
    .text(text)
}

function nodeBiggerCircleWithText(root, text) {
  // width="25" height="25"
  var tl = text.length;
  if (tl > 6) {
    throw new Error("Text too big for small node circle");
  }
  var x = 6;

  root.append("circle")
    .attr("r", "25")
    .attr("cx", "25")
    .attr("cy", "25");
  root.append("text")
    .attr("x", x)
    .attr("y", 28.5)
    .text(text)
}
function operatorBox(root) {
  root.append("rect")
    .attr("width", "25")
    .attr("height", "25")
    .attr("x", "0")
    .attr("y", "0");
}


/**
 * Draw a AND gate symbol
 */
function AND(root, addName = true) {
  // width="30" height="25"
  var g = root.append("g")
  g.append("path")
    .attr("d", "M0,0 L0,25 L15,25 A15 12.5 0 0 0 15,0 Z");
  g.attr("transform", "scale(0.8) translate(0, 3)")
  if (addName)
    root.append("text")
      .attr("x", 8)
      .attr("y", 16)
      .text("&");
  return g;
}

/**
 * Draw a NAND gate symbol
 */
function NAND(root) {
  // width="30" height="25"
  AND(root, false);
  negationCircle(root, 34, 12.5);
}


var OR_SHAPE_PATH = "M3,0 A30 25 0 0 1 3,25 A30 25 0 0 0 33,12.5 A30 25 0 0 0 3,0 z";
/**
 * Draw a OR gate symbol
 */
function OR(root, addName = true) {
  // width="30" height="25"
  var g = root.append("g")
  g.append("path")
    .attr("d", OR_SHAPE_PATH);
  g.attr("transform", "scale(0.8) translate(0, 3)")
  if (addName)
    root.append("text")
      .attr("x", 5)
      .attr("y", 16)
      .text("or")
  return g;
}

/**
 * Draw a NOR gate symbol
 */
function NOR(root) {
  // width="33" height="25"
  var g = OR(root, false);
  g.append("circle")
    .attr("cx", "34")
    .attr("cy", "12.5")
    .attr("r", "3");
  root.append("text")
    .attr("x", 5)
    .attr("y", 16)
    .text("!|")
}


/**
 * Draw a XOR gate symbol
 */
function XOR(root) {
  var g = OR(root, false);
  g.append("path")
    .attr("d", "M0,0 A30 25 0 0 1 0,25")
  root.append("text")
    .attr("x", 8)
    .attr("y", 16)
    .text("^")

  return g;
}


/**
 * Draw a NXOR gate symbol
 */
function NXOR(root) {
  // width="33" height="25"
  var g = XOR(root);
  negationCircle(g, 35, 12.5);
  root.append("text")
    .attr("x", 4)
    .attr("y", 16)
    .text("!^")
}

/**
 * Draw a NOT gate symbol
 */
function NOT(root) {
  // width="30" height="20"
  root.append("path")
    .attr("d", "M0,2.5 L0,22.5 L20,12.5 Z");
  negationCircle(root, 23, 12.5);
  root.append("text")
    .attr("x", 2)
    .attr("y", 16)
    .text("!")
}

/**
 * Draw a FF register symbol
 */
function FF(root) {
  // width="25" height="25"
  operatorBox(root);

  root.append("path")
    .attr("d", "M0,2 L5,7 L0,12");

  root.append("text")
    .attr("x", 5)
    .attr("y", 16)
    .text("FF");
}

function FF_ARST(root, arstPolarity, clkPolarity) {
    root.append("rect")
        .attr("width", "40")
        .attr("height", "50")
        .attr("x", "0")
        .attr("y", "0");

    //component name
    root.append("text")
        .attr("x", 7)
        .attr("y", 16)
        .text("ADFF");

    //triangle
    root.append("path")
        .attr("d", "M0,7.5 L6,12.5 L0,17.5 z");

    if (!clkPolarity) {
        root.append("circle")
            .attr("cx", 1)
            .attr("cy", 12.5)
            .attr("r", "1.5")
            .style("fill", "white");
    }

    if (!arstPolarity) {
        root.append("circle")
            .attr("cx", 1)
            .attr("cy", 25)
            .attr("r", "1.5")
            .style("fill", "white");
    }

    root.append("text")
        .attr("x", 4)
        .attr("y", 27.5)
        .style("font-size", "8px")
        .text("ARST");
}
function DLATCH(root, enPolarity) {
  root.append("rect")
      .attr("width", "50")
      .attr("height", "25")
      .attr("x", "0")
      .attr("y", "0");

  root.append("text")
      .attr("x", 3)
      .attr("y", 12)
      .text("DLATCH");

  if (!enPolarity) {
    root.append("circle")
        .attr("cx", 1)
        .attr("cy", 16.5)
        .attr("r", "1.5")
        .style("fill", "white");
  }

  root.append("text")
      .attr("x", 4)
      .attr("y", 19)
      .style("font-size", "8px")
      .text("en");
}
function RISING_EDGE(root) {
  // width="25" height="25"
  operatorBox(root);

  root.append("path")
    .attr("d", "M5,20 L12.5,20 L12.5,5 L20,5");
}

function FALLING_EDGE(root) {
  // width="25" height="25"
  operatorBox(root);

  root.append("path")
    .attr("d", "M5,5 L12.5,5 L12.5,20 L20,20");
}


const DEFAULT_NODE_SIZE = [25, 25];
export const SHAPES = {
  "NOT": [NOT, DEFAULT_NODE_SIZE],

  "AND": [AND, DEFAULT_NODE_SIZE],
  "NAND": [NAND, DEFAULT_NODE_SIZE],
  "OR": [OR, DEFAULT_NODE_SIZE],
  "NOR": [NOR, DEFAULT_NODE_SIZE],
  "XOR": [XOR, DEFAULT_NODE_SIZE],
  "NXOR": [NXOR, DEFAULT_NODE_SIZE],

  "RISING_EDGE": [RISING_EDGE, DEFAULT_NODE_SIZE],
  "FALLING_EDGE": [FALLING_EDGE, DEFAULT_NODE_SIZE],

  "ADD": [function ADD(root) {
    nodeCircleWithText(root, "+");
  }, DEFAULT_NODE_SIZE],
  "SUB": [function SUB(root) {
    nodeCircleWithText(root, "-");
  }, DEFAULT_NODE_SIZE],

  "EQ": [function EQ(root) {
    nodeCircleWithText(root, "=");
  }, DEFAULT_NODE_SIZE],
  "NE": [function NE(root) {
    nodeCircleWithText(root, "!=");
  }, DEFAULT_NODE_SIZE],
  "LT": [function LT(root) {
    nodeCircleWithText(root, "<");
  }, DEFAULT_NODE_SIZE],
  "LE": [function LE(root) {
    nodeCircleWithText(root, "<=");
  }, DEFAULT_NODE_SIZE],
  "GE": [function GE(root) {
    nodeCircleWithText(root, ">=");
  }, DEFAULT_NODE_SIZE],
  "GT": [function GT(root) {
    nodeCircleWithText(root, ">");
  }, DEFAULT_NODE_SIZE],
  "SHL": [function GT(root) {
    nodeCircleWithText(root, "<<");
  }, DEFAULT_NODE_SIZE],
  "SHR": [function GT(root) {
    nodeCircleWithText(root, ">>");
  }, DEFAULT_NODE_SIZE],
  "SHIFT": [function GT(root) {
    nodeBiggerCircleWithText(root, "<<,>>");
  }, [50, 50]],
  "MUL": [function GT(root) {
    nodeCircleWithText(root, "*");
  }, DEFAULT_NODE_SIZE],
  "DIV": [function GT(root) {
    nodeCircleWithText(root, "/");
  }, DEFAULT_NODE_SIZE],

  "FF": [FF, DEFAULT_NODE_SIZE],
  "FF_ARST_clk0_rst0": [(root) => { return FF_ARST(root, false, false)}, [40, 50]],
  "FF_ARST_clk1_rst1": [(root) => { return FF_ARST(root, true, true)}, [40, 50]],
  "FF_ARST_clk0_rst1": [(root) => { return FF_ARST(root, true, false)}, [40, 50]],
  "FF_ARST_clk1_rst0": [(root) => { return FF_ARST(root, false, true)}, [40, 50]],
  "DLATCH_en0": [(root) => {return DLATCH(root,false)}, [50, 25]],
  "DLATCH_en1": [(root) => {return DLATCH(root,true)}, [50, 25]],


};

