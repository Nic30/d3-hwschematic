module comparator(a, b, a_gt_b);
input [4:0] a, b;
output a_gt_b;
assign a_gt_b = a > b;
endmodule
