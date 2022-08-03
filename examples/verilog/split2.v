module split2(input [8-1:0] in, output [4-1:0] out0, output [2-1:0] out1, output [2-1:0] out2);
  assign out0 = in[4-1:0];
  assign out1 = in[6-1:4];
  assign out2 = in[8-1:6];
endmodule
