module partialConstDriver6(input [3-1:0] in0, input [3-1:0] in1, output [8-1:0] out0, output [8-1:0] out1);
  assign out0 = {in1, in0, 2'B 10};
  assign out1 = {in0, 2'B 10, in1};
endmodule
