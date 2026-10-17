import {
  Compass,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import type { SipFutureStrategyCardProps } from "@/types/sips";

export default function SipFutureStrategyCard({
  guidanceList,
}: SipFutureStrategyCardProps) {
  return (
    <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-5 shadow-lg space-y-3">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Compass size={16} />
          </div>
          <div>
            <h4 className="font-bold text-slate-100 text-xs sm:text-sm leading-tight">
              Future SIP Strategy &amp; Guidance
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Where to consider starting your next SIP
            </p>
          </div>
        </div>
        <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
          ADVISORY
        </span>
      </div>

      <div className="space-y-2.5">
        {guidanceList.map((item, idx) => {
          let badgeClass = "text-teal-400 bg-teal-500/10 border-teal-500/20";
          let borderAccent = "border-l-teal-400";
          let IconComponent = CheckCircle2;

          if (item.type === "warning") {
            badgeClass = "text-amber-400 bg-amber-500/10 border-amber-500/20";
            borderAccent = "border-l-amber-400";
            IconComponent = AlertTriangle;
          } else if (item.type === "opportunity") {
            badgeClass = "text-sky-400 bg-sky-500/10 border-sky-500/20";
            borderAccent = "border-l-sky-400";
            IconComponent = Lightbulb;
          } else if (item.type === "info") {
            badgeClass =
              "text-indigo-400 bg-indigo-500/10 border-indigo-500/20";
            borderAccent = "border-l-indigo-400";
            IconComponent = Sparkles;
          }

          return (
            <div
              key={`${item.title}-${idx}`}
              className={`bg-slate-900/70 border border-slate-800/70 ${borderAccent} border-l-2 rounded-xl p-3.5 space-y-1.5 shadow-sm hover:border-slate-700/80 transition`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-200">
                  <IconComponent size={14} className="shrink-0" />
                  <span className="truncate">{item.title}</span>
                </div>
                <span
                  className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${badgeClass}`}
                >
                  {item.badge}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {item.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
