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

/**
 * Draw a AND gate symbol
 */
function AND(root) {
// width="30" height="25"
  root.append("path")
    .attr("d","M0,0 L0,25 L15,25 A15 12.5 0 0 0 15,0 Z");
}

/**
 * Draw a NAND gate symbol
 */
function NAND(root) {
// width="30" height="25"
  AND(root);
  negationCircle(root, 34, 12.5);
}

/**
 * Draw a FF register symbol
 */
function FF(root) {
// width="25" height="25"
  root.append("rect")
   .attr("width", "25")
   .attr("height", "25")
   .attr("x", "0")
   .attr("y", "0");
   
  root.append("path")
    .attr("d","M0,2 L5,7 L0,12");
}

/**
 * Draw a equal operator symbol
 */
function EQ(root) {
  // width="25" height="25">
  nodeCircle(root);
  root.append("line")
   .attr("x1", 7.5)
   .attr("x2", 17.5)
   .attr("y1", 10)
   .attr("y2", 10);
  root.append("line")
   .attr("x1", 7.5)
   .attr("x2", 17.5)
   .attr("y1", 15)
   .attr("y2", 15);
}

/**
 * Draw a not equal operator symbol
 */
function NEQ(root) {
  // width="25" height="25"
  EQ(root);
  root.append("line")
    .attr("x1", 9)
    .attr("x2", 16)
    .attr("y1", 17)
    .attr("y2", 8);
}

/**
 * Draw a OR gate symbol
 */
function OR(root) { 
  // width="30" height="25"
  root.append("path")
    .attr("d", "M0,25 L0,25 L15,25 A15 12.5 0 0 0 15,0 L0,0");
  root.append("path")
    .attr("d", "M0,0 A30 25 0 0 1 0,25");
}

/**
 * Draw a NOR gate symbol
 */
function NOR(root) {
  // width="33" height="25"
  OR(root);
  root.append("circle")
    .attr("cx", "34")
    .attr("cy", "12.5")
    .attr("r",   "3");
}


/**
 * Draw a XOR gate symbol
 */
function XOR(root) {
  var g = root.append("g");
  g.attr("transform", "scale(0.75) translate(0, 3.5)")
  // width="33" height="25"
  g.append("path")
    .attr("d", "M3,0 A30 25 0 0 1 3,25 A30 25 0 0 0 33,12.5 A30 25 0 0 0 3,0");
  g.append("path")
    .attr("d", "M0,0 A30 25 0 0 1 0,25")
  return g;
}


/**
 * Draw a NXOR gate symbol
 */
function NXOR(root) {
  // width="33" height="25"
  XOR(root);
  negationCircle(root, 35, 12.5);
}

/**
 * Draw a NOT gate symbol
 */
function NOT(root) {
  // width="30" height="20"
  root.append("path")
    .attr("d", "M0,0 L0,20 L20,10 Z");
  negationCircle(root, 23, 10);
}

/**
 * Draw a substraction operator symbol
 */
function SUB(root) {
  // width="25" height="25"
  nodeCircle(root)
  root.append("line")
    .attr("x1", 7.5)
    .attr("x2", 17.5)
    .attr("y1", 12.5)
    .attr("y2", 12.5);
}

/**
 * Draw a addition operator symbol
 */
function ADD(root) {
  // width="25" height="25"
  SUB(root);
  root.append("line")
    .attr("x1", 12.5)
    .attr("x2", 12.5)
    .attr("y1", 7.5)
    .attr("y2", 17.5);
}


export const SHAPES = {
  "NOT": NOT,
  
  "AND": AND ,
  "NAND":NAND,
  "OR":  OR  ,
  "NOR": NOR ,
  "XOR": XOR ,
  "NXOR":NXOR,
  
  "ADD": ADD,
  "SUB": SUB,
  
  "EQ":  EQ ,
  // "LT":,
  // "LE":,
  // "GE":,
  // "GT":,
  "NEQ": NEQ,
  
  "FF": FF,
};

