import Link from "next/link";
import { ShieldCheck, AlertTriangle, ExternalLink } from "lucide-react";
import type { SchemeCardProps } from "@/types/mapping";

export default function SchemeCard({
  scheme,
  onOpenManualModal,
  onMapScheme,
}: SchemeCardProps) {
  return (
    <div className="p-4 sm:p-5 bg-slate-950/60 hover:bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 rounded-2xl transition duration-200 shadow-md flex flex-col gap-3.5">
      {/* Top Row: Scheme Title, Status Badge, and Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h5 className="font-bold text-slate-100 text-sm sm:text-base tracking-tight leading-snug">
              {scheme.name}
            </h5>

            {/* Holding Status Badge */}
            {scheme.holdingStatus === "active" && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active Holdings
              </span>
            )}
            {scheme.holdingStatus === "sold" && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Sold / Zero Balance
              </span>
            )}
            {scheme.holdingStatus === "mixed" && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                Active + Sold
              </span>
            )}
            {scheme.holdingStatus === "none" && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-800/80 text-slate-400 border border-slate-700/60 shrink-0">
                No Folios
              </span>
            )}
          </div>

          {/* Metadata Badges: Category & API Mapping Code */}
          <div className="flex items-center gap-2 mt-2 flex-wrap text-xs">
            <span className="bg-slate-800/90 text-slate-300 font-medium px-2.5 py-1 rounded-lg border border-slate-700/50">
              {scheme.category}
            </span>

            {scheme.schemeCodeApi ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/25">
                <ShieldCheck size={13} className="text-emerald-400 shrink-0" />
                <span>Code:</span>
                <span className="font-bold text-emerald-300">
                  {scheme.schemeCodeApi}
                </span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-400 font-semibold bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/25">
                <AlertTriangle size={13} className="text-amber-400 shrink-0" />
                Not mapped
              </span>
            )}
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-center shrink-0 mt-1 sm:mt-0">
          {scheme.schemeCodeApi && (
            <button
              onClick={() => onMapScheme(scheme.id, null)}
              className="text-xs text-red-400 hover:text-red-300 font-semibold px-3 py-1.5 border border-red-800/40 bg-red-950/20 hover:bg-red-950/60 rounded-xl transition cursor-pointer"
            >
              Reset
            </button>
          )}
          <button
            onClick={() => onOpenManualModal(scheme.id, scheme.name)}
            className="text-xs text-slate-950 bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 font-bold px-4 py-1.5 rounded-xl shadow-md hover:shadow-teal-500/20 transition cursor-pointer"
          >
            {scheme.schemeCodeApi ? "Remap" : "Assign Code"}
          </button>
        </div>
      </div>

      {/* Folios Section Panel */}
      <div className="pt-3 border-t border-slate-800/60 flex flex-col gap-2.5 bg-slate-950/40 -mx-4 -mb-4 sm:-mx-5 sm:-mb-5 p-3.5 sm:p-4 rounded-b-2xl">
        {(scheme.activeFolioItems && scheme.activeFolioItems.length > 0) ||
        (scheme.zeroBalanceFolioItems &&
          scheme.zeroBalanceFolioItems.length > 0) ? (
          <div className="flex flex-col gap-2.5 text-xs">
            {/* Active Folios Row */}
            {scheme.activeFolioItems && scheme.activeFolioItems.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-teal-300 font-bold bg-teal-500/10 border border-teal-500/25 px-2.5 py-1 rounded-lg text-xs shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  {scheme.activeFoliosCount} Active{" "}
                  {scheme.activeFoliosCount === 1 ? "Folio" : "Folios"}:
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {scheme.activeFolioItems.map((item) => (
                    <Link
                      key={item.folioNo}
                      href={item.url}
                      className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-teal-950/80 border border-teal-500/30 hover:border-teal-400 text-teal-300 hover:text-teal-100 text-xs font-semibold transition duration-150 cursor-pointer shadow-xs hover:scale-[1.02]"
                      title={`View fund details for folio ${item.folioNo}`}
                    >
                      <span>{item.folioNo}</span>
                      <ExternalLink
                        size={11}
                        className="opacity-50 group-hover:opacity-100 group-hover:text-teal-300 transition duration-150"
                      />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Sold Folios Row */}
            {scheme.zeroBalanceFolioItems &&
              scheme.zeroBalanceFolioItems.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-amber-300 font-bold bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 rounded-lg text-xs shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    {scheme.zeroBalanceFoliosCount} Sold / Zero Bal:
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {scheme.zeroBalanceFolioItems.map((item) => (
                      <Link
                        key={item.folioNo}
                        href={item.url}
                        className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-amber-950/80 border border-amber-500/30 hover:border-amber-400 text-amber-300 hover:text-amber-100 text-xs font-semibold transition duration-150 cursor-pointer shadow-xs hover:scale-[1.02]"
                        title={`View fund details for sold folio ${item.folioNo}`}
                      >
                        <span>{item.folioNo}</span>
                        <ExternalLink
                          size={11}
                          className="opacity-50 group-hover:opacity-100 group-hover:text-amber-300 transition duration-150"
                        />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
          </div>
        ) : (
          <div className="text-xs text-slate-500 italic flex items-center gap-2">
            <span>No folios linked to this scheme</span>
          </div>
        )}
      </div>
    </div>
  );
}
