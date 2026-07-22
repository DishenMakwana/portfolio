"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Home, Compass } from "lucide-react";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-950 relative overflow-hidden min-h-screen">
      {/* Background radial gradients for glass effect */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-500/10 rounded-full filter blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full filter blur-[100px] pointer-events-none" />

      <div className="max-w-md w-full text-center relative z-10 space-y-8">
        {/* Glowing compass navigation icon */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex justify-center"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-teal-500/20 rounded-3xl filter blur-xl animate-pulse" />
            <div className="relative border border-slate-800/80 bg-slate-900/60 p-6 rounded-3xl backdrop-blur-xl shadow-2xl flex items-center justify-center w-24 h-24">
              <Compass className="text-teal-400 w-12 h-12 stroke-[1.5] animate-[spin_20s_linear_infinite]" />
            </div>
          </div>
        </motion.div>

        {/* Text Description */}
        <div className="space-y-3">
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-emerald-400 to-indigo-500"
          >
            404
          </motion.h1>
          <motion.h2
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-xl font-extrabold text-slate-200"
          >
            Portfolio Path Lost
          </motion.h2>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-sm font-semibold text-slate-400 leading-relaxed max-w-sm mx-auto"
          >
            The page you are trying to view cannot be valued. It may have been
            moved, deleted, or mapping failed.
          </motion.p>
        </div>

        {/* Action Buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2"
        >
          <button
            onClick={() => router.back()}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-800 bg-slate-900/60 text-slate-300 font-bold text-xs flex items-center justify-center gap-2 hover:border-slate-700 hover:text-slate-100 transition cursor-pointer"
          >
            <ArrowLeft size={14} />
            Go Back
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-teal-500/20"
          >
            <Home size={14} />
            Go Dashboard
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
