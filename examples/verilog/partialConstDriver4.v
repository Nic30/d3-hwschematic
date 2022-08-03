module partialConstDriver4(input [3-1:0] in, output [8-1:0] out);
  assign out = {1'B 1, in, 3'B 101};
endmodule
