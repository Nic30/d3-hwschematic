module concat2(input in0, input in1, input in2, output [2-1:0] out0, output [3-1:0] out1);
  wire [2-1:0] x;
  assign x = {in2, in1};
  assign out0 = x;
  assign out1 = {x, in0};
endmodule
