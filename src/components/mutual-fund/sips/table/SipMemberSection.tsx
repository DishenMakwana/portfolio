"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Users, ChevronDown } from "lucide-react";
import { formatCurrency } from "@/helpers/formatters";
import SipMemberTable from "./SipMemberTable";
import type { SipMemberSectionProps } from "@/types/sips";

export default function SipMemberSection({
  memberName,
  sips,
  monthCols,
  stats,
  isExpanded,
  onToggleExpand,
  onSelectFund,
}: SipMemberSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl"
    >
      {/* Member header */}
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between px-6 py-4 border-b border-slate-800/60 cursor-pointer hover:bg-slate-800/20 transition"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500/30 to-emerald-500/20 flex items-center justify-center border border-teal-500/20">
            <Users size={16} className="text-teal-400" />
          </div>
          <div className="text-left">
            <div className="font-bold text-slate-100 text-sm">{memberName}</div>
            <div className="text-xs text-slate-500">
              {sips.filter((s) => s.isActive).length} active ·{" "}
              {sips.filter((s) => !s.isActive).length} paused
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-slate-500 font-medium">
              Monthly SIP
            </div>
            <div className="text-base font-extrabold text-teal-400">
              {formatCurrency(stats?.memberTotal ?? 0)}
            </div>
          </div>
          <ChevronDown
            size={16}
            className={`text-slate-500 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {/* SIP table */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="content"
            initial="collapsed"
            animate="open"
            exit="collapsed"
            variants={{
              open: { opacity: 1, height: "auto" },
              collapsed: { opacity: 0, height: 0 },
            }}
            transition={{
              duration: 0.3,
              ease: [0.04, 0.62, 0.23, 0.98],
            }}
            className="overflow-hidden"
          >
            <SipMemberTable
              sips={sips}
              monthCols={monthCols}
              memberName={memberName}
              stats={stats}
              onSelectFund={onSelectFund}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
