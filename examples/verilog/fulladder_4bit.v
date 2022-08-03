module fulladd(s, c_out, ain, bin, c_in);
   output s, c_out;
   input ain, bin, c_in;
   assign s = (ain^bin)^c_in; // sum bit
   assign c_out = (ain & bin) | (bin & c_in) | (c_in & ain); //carry bit
endmodule

module fulladder_4bit(sum, cout, a, b, cin);
//input output port declarations
   output [3:0] sum;
   output cout;
   input [3:0] a, b;
   input cin;
   wire c1, c2, c3;
// Instantiate four 1-bit full adders
   fulladd f0 (sum[0], c1, a[0], b[0], cin);
   fulladd f1 (sum[1], c2, a[1], b[1], c1);
   fulladd f2 (sum[2], c3, a[2], b[2], c2);
   fulladd f3 (sum[3], cout, a[3], b[3], c3);
endmodule
