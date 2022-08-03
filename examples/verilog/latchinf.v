// https://www.intel.com/content/www/us/en/programmable/quartushelp/14.1/mergedProjects/hdl/vlog/vlog_pro_latches.htm
module latchinf (enable, data, q);
   input  enable, data;
   output q;
   reg    q;
   always @ (enable or data)
      if (enable)
         q <= data;
endmodule
