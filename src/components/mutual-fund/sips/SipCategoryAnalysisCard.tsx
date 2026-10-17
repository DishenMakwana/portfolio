"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { PieChart as PieIcon } from "lucide-react";
import { formatCurrency } from "@/helpers/formatters";
import { calculateSipCategoryAnalysis } from "@/helpers/sipCategoryAnalysis";
import { OVERVIEW_COLORS } from "@/types/overview";
import type {
  SipCategoryAnalysisCardProps,
  SipPieDataItem,
} from "@/types/sips";
import SipCategoryKpiCards from "./category/SipCategoryKpiCards";
import SipCategoryAccordionTable from "./category/SipCategoryAccordionTable";
import SipCategoryDonutChart from "./category/SipCategoryDonutChart";
import SipFutureStrategyCard from "./category/SipFutureStrategyCard";

export default function SipCategoryAnalysisCard({
  mandates,
  filterMember,
}: SipCategoryAnalysisCardProps) {
  const router = useRouter();
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const data = useMemo(() => {
    return calculateSipCategoryAnalysis(mandates, filterMember);
  }, [mandates, filterMember]);

  const pieData: SipPieDataItem[] = useMemo(() => {
    return data.categories.map((c, idx) => ({
      name: c.category,
      value: c.monthlyAmount,
      pct: c.pct,
      color: c.color || OVERVIEW_COLORS[idx % OVERVIEW_COLORS.length],
      activeCount: c.activeCount,
    }));
  }, [data.categories]);

  if (mandates.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-5"
    >
      {/* ── MAIN HEADER CARD ── */}
      <div className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/60 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 shrink-0">
              <PieIcon size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight">
                  Monthly Category SIP Allocation
                </h2>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-300 bg-slate-800/80 border border-slate-700/60 px-2 py-0.5 rounded-full">
                  MONTHLY COMMITMENTS
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Monthly commitment breakdown across fund categories &amp;
                strategic future deployment insights
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <div className="text-xs text-slate-400 font-medium">
                Active Outflow
              </div>
              <div className="text-base sm:text-lg font-extrabold text-teal-400">
                {formatCurrency(data.totalMonthly)}
                <span className="text-xs font-normal text-slate-400">
                  {" "}
                  / mo
                </span>
              </div>
            </div>
            <span className="text-xs text-slate-300 bg-slate-800/80 border border-slate-700/60 px-3 py-1.5 rounded-xl font-semibold">
              {data.activeSipCount} Active SIPs
            </span>
          </div>
        </div>

        {/* ── KPI METRIC CARDS ── */}
        <SipCategoryKpiCards data={data} />

        {/* ── BENTO GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ── LEFT COLUMN: CATEGORY BREAKDOWN ACCORDION TABLE ── */}
          <SipCategoryAccordionTable
            categories={data.categories}
            expandedCategory={expandedCategory}
            onToggleCategory={(category) =>
              setExpandedCategory(
                expandedCategory === category ? null : category
              )
            }
            onSelectFund={(url) => router.push(url)}
          />

          {/* ── RIGHT COLUMN: RECHARTS DONUT & FUTURE STRATEGY ── */}
          <div className="lg:col-span-5 space-y-5">
            {/* Visual Recharts Donut */}
            <SipCategoryDonutChart
              pieData={pieData}
              categories={data.categories}
              totalMonthly={data.totalMonthly}
              activeIndex={activeIndex}
              onSetActiveIndex={setActiveIndex}
            />

            {/* Future SIP Strategy & Advisory */}
            <SipFutureStrategyCard guidanceList={data.guidanceList} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
