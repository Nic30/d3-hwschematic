/**
 * Draw a multiplexer operator symbol
 */
function MUX(root) {
  // width="20" height="40"
  root.append("path")
    .attr("d","M0,0 L20,10 L20,30 L0,40 Z");
}