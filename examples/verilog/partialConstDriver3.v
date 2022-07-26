module partialConstDriver3(input [2-1:0] in, output [8-1:0] out);
  assign out = {2'B 11, in, 3'B 101};
endmodule
