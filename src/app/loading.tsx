"use client";

import { motion } from "framer-motion";

export default function Loading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[70vh] bg-slate-950/20 px-4">
      <div className="relative w-28 h-28 flex items-center justify-center">
        {/* Glowing aura background */}
        <div className="absolute inset-0 bg-teal-500/10 rounded-full blur-2xl animate-pulse" />

        {/* Outer orbital ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="absolute w-24 h-24 rounded-full border border-dashed border-teal-500/30"
        />

        {/* Mid-level spinning gradient ring */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="absolute w-20 h-20 rounded-full border-2 border-transparent border-t-teal-400 border-r-emerald-500/60"
        />

        {/* Inner fast spinning accent ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
          className="absolute w-14 h-14 rounded-full border border-transparent border-b-teal-300"
        />

        {/* Core pulsing glass circle */}
        <motion.div
          animate={{ scale: [0.9, 1.1, 0.9] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/20"
        >
          <div className="w-2.5 h-2.5 rounded-full bg-slate-950 animate-ping" />
        </motion.div>
      </div>

      {/* Elegant loading text with sequential fade */}
      <div className="mt-8 flex flex-col items-center gap-1.5">
        <motion.span
          initial={{ opacity: 0.4 }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="text-sm font-extrabold uppercase tracking-[0.25em] text-teal-400"
        >
          Fetching Insights
        </motion.span>
        <span className="text-[11px] font-medium text-slate-500 tracking-wider">
          Analyzing portfolio performance...
        </span>
      </div>
    </div>
  );
}
