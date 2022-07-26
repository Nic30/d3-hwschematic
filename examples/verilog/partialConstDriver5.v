module partialConstDriver5(input [3-1:0] in, output [8-1:0] out0, output [8-1:0] out1);
  assign out0 = {1'B 1, in, 3'B 101};
  assign out1 = {1'B 1, 3'B 101, in};
endmodule
