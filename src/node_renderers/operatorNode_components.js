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
    .attr("r" , "3");
}

function nodeCircleWithText(root, text) {
  // width="25" height="25"
  var tl = text.length;
  if (tl > 2) {
    throw new Error("Text too big for small node circle");
  }  
  var x = 8;
  if (tl == 2)
    x = 4;
  
  nodeCircle(root);
  root.append("text")
    .attr("x", x)
    .attr("y", 16)
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
function AND(root, addName=true) {
// width="30" height="25"
  var g = root.append("g")
  g.append("path")
    .attr("d","M0,0 L0,25 L15,25 A15 12.5 0 0 0 15,0 Z");
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


var OR_SHAPE_PATH = "M3,0 A30 25 0 0 1 3,25 A30 25 0 0 0 33,12.5 A30 25 0 0 0 3,0";
/**
 * Draw a OR gate symbol
 */
function OR(root, addName=true) { 
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
    .attr("r",   "3");
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
    .attr("d","M0,2 L5,7 L0,12");
 
  root.append("text")
    .attr("x", 5)
    .attr("y", 16)
    .text("FF");
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



export const SHAPES = {
  "NOT": NOT,
  
  "AND": AND ,
  "NAND":NAND,
  "OR":  OR  ,
  "NOR": NOR ,
  "XOR": XOR ,
  "NXOR":NXOR,
  "RISING_EDGE": RISING_EDGE,
  "FALLING_EDGE": FALLING_EDGE,
  
  "ADD": function ADD(root) {
	  nodeCircleWithText(root, ">=");
  },
  "SUB": function SUB(root) {
	  nodeCircleWithText(root, "-");
  },
  
  "EQ": function EQ(root) {
	  nodeCircleWithText(root, "=");
  },
  "NEQ": function NEQ(root) {
	  nodeCircleWithText(root, "!=");
  },
  "LT": function LT(root) {
	  nodeCircleWithText(root, "<");
  },
  "LE": function LE(root) {
	  nodeCircleWithText(root, "<=");
  },
  "GE": function GE(root) {
	  nodeCircleWithText(root, ">=");
  },
  "GT": function GT(root) {
	  nodeCircleWithText(root, ">");
  },
  
  "FF": FF,
};

