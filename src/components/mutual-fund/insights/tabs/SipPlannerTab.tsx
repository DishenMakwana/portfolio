import { motion } from "framer-motion";
import { formatInrCompact } from "@/helpers/formatters";
import type { SipPlannerTabProps } from "@/types/insights";

export default function SipPlannerTab({
  baseSip,
  projectionRows,
  stepUpPct,
  onStepUpChange,
}: SipPlannerTabProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-teal-500/20 bg-slate-900/70 backdrop-blur-md p-5 space-y-5 shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
            Step-Up Projection
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">Annual Step-Up:</span>
            <span className="text-teal-300 font-extrabold text-lg w-12">
              {stepUpPct}%
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <input
            type="range"
            min={5}
            max={25}
            step={1}
            value={stepUpPct}
            onChange={(event) => onStepUpChange(Number(event.target.value))}
            className="w-full h-2 rounded-full appearance-none bg-slate-700 accent-teal-400 cursor-pointer"
            id="step-up-slider"
          />
          <div className="flex justify-between text-xs text-slate-600">
            <span>5%</span>
            <span>15%</span>
            <span>25%</span>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          Projection assumes 14% CAGR, {stepUpPct}% annual SIP step-up, starting
          from {formatInrCompact(baseSip)}/mo
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                {["Year", "Monthly SIP", "Annual SIP", "Projected Corpus"].map(
                  (heading) => (
                    <th
                      key={heading}
                      className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
                    >
                      {heading}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {projectionRows.map((row) => (
                <motion.tr
                  key={row.year}
                  layout
                  className="hover:bg-slate-700/20 transition-colors"
                >
                  <td className="px-4 py-3 font-semibold text-slate-300">
                    Year {row.year}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-200">
                    {formatInrCompact(row.monthlySip)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">
                    {formatInrCompact(row.monthlySip * 12)}
                  </td>
                  <td className="px-4 py-3 font-bold text-teal-300">
                    {formatInrCompact(row.corpus)}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
