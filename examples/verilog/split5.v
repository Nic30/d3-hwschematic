module split5(input [8-1:0] in, output [4-1:0] out0, output [2-1:0] out1);
  assign out0 = in[4-1:0];
  assign out1 = in[2-1:0];
endmodule
