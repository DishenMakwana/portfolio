"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Repeat2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Trash2,
  ChevronDown,
  Users,
  IndianRupee,
  X,
} from "lucide-react";
import { uploadSipAction, clearSipMandatesAction } from "@/app/actions";
import { formatCurrency } from "@/lib/formatters";
import type { SipMandateRow } from "@/lib/portfolioService";

interface SipsClientProps {
  mandates: SipMandateRow[];
}

export default function SipsClient({ mandates }: SipsClientProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<{
    inserted: number;
    total: number;
  } | null>(null);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [filterMember, setFilterMember] = useState<string>("all");

  // ── Upload handler
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);
    const formData = new FormData();
    formData.append("file", file);
    const res = await uploadSipAction(formData);
    setIsUploading(false);
    if (res.success) {
      setUploadSuccess({ inserted: res.inserted!, total: res.total! });
      startTransition(() => router.refresh());
    } else {
      setUploadError(res.error || "Upload failed");
    }
    e.target.value = "";
  };

  // ── Clear handler
  const handleClear = async () => {
    if (!confirm("Delete all SIP mandates from the database?")) return;
    const res = await clearSipMandatesAction();
    if (res.success) startTransition(() => router.refresh());
    else alert(res.error);
  };

  // ── Derived data
  const members = Array.from(new Set(mandates.map((m) => m.memberName)));
  const filteredMandates =
    filterMember === "all"
      ? mandates
      : mandates.filter((m) => m.memberName === filterMember);

  const totalMonthly = mandates
    .filter((m) => m.isActive)
    .reduce((a, m) => a + m.monthlyAmount, 0);
  const activeSips = mandates.filter((m) => m.isActive).length;
  const pausedSips = mandates.filter((m) => !m.isActive).length;

  // Group by member for the card view
  const byMember: Record<string, SipMandateRow[]> = {};
  filteredMandates.forEach((m) => {
    if (!byMember[m.memberName]) byMember[m.memberName] = [];
    byMember[m.memberName].push(m);
  });

  // Month columns from first mandate's history (consistent across all)
  const monthCols =
    mandates.length > 0 ? Object.keys(mandates[0].monthlyHistory) : [];

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* ── HEADER + UPLOAD ── */}
      <div className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
              <Repeat2 size={20} className="text-teal-400" /> My SIP Mandates
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Fixed monthly SIP schedule for all family members. Upload your
              &ldquo;My SIP&rsquo;s&rdquo; Excel export to sync.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {mandates.length > 0 && (
              <button
                onClick={handleClear}
                className="flex items-center gap-2 text-red-400 hover:text-red-300 border border-red-800/40 bg-red-950/20 hover:bg-red-950/50 px-3 py-2 rounded-xl text-sm font-semibold transition cursor-pointer"
              >
                <Trash2 size={14} /> Clear All
              </button>
            )}
            <label className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-slate-950 font-bold px-5 py-2.5 rounded-xl shadow-lg cursor-pointer transition text-sm">
              {isUploading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Upload size={15} />
              )}
              {isUploading ? "Uploading…" : "Upload SIP's Excel"}
              <input
                type="file"
                accept=".xlsx"
                onChange={handleUpload}
                className="hidden"
                disabled={isUploading}
              />
            </label>
          </div>
        </div>

        {/* Status alerts */}
        <AnimatePresence>
          {uploadError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 flex items-center gap-3 bg-red-950/60 border border-red-800/60 rounded-xl px-4 py-3 text-red-300 text-sm animate-fade-in"
            >
              <XCircle size={16} className="shrink-0" />
              <span className="flex-1">{uploadError}</span>
              <button
                onClick={() => setUploadError(null)}
                className="ml-auto text-red-400 hover:text-red-200 cursor-pointer flex items-center justify-center p-1 rounded hover:bg-red-500/10 transition"
                aria-label="Close error"
              >
                <X size={15} />
              </button>
            </motion.div>
          )}
          {uploadSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 flex items-center gap-3 bg-emerald-950/60 border border-emerald-800/60 rounded-xl px-4 py-3 text-emerald-300 text-sm animate-fade-in"
            >
              <CheckCircle2 size={16} className="shrink-0" />
              <span className="flex-1">
                Successfully saved <strong>{uploadSuccess.inserted}</strong> SIP
                mandates from {uploadSuccess.total} rows.
              </span>
              <button
                onClick={() => setUploadSuccess(null)}
                className="ml-auto text-emerald-400 hover:text-emerald-200 cursor-pointer flex items-center justify-center p-1 rounded hover:bg-emerald-500/10 transition"
                aria-label="Close success"
              >
                <X size={15} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {mandates.length === 0 ? (
        /* Empty state */
        <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-16 text-center">
          <Repeat2 className="mx-auto text-teal-500/50 w-16 h-16 mb-4" />
          <h2 className="text-xl font-bold text-slate-300 mb-2">
            No SIP data yet
          </h2>
          <p className="text-slate-500 text-sm">
            Upload your &ldquo;My SIP&rsquo;s&rdquo; Excel export from I Plus
            Financial Services to track your monthly mandates.
          </p>
        </div>
      ) : (
        <>
          {/* ── KPI SUMMARY CARDS ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: "Total Monthly SIP",
                value: formatCurrency(totalMonthly),
                sub: "Active mandates only",
                color: "text-teal-400",
                icon: IndianRupee,
                bg: "bg-teal-500/10",
                border: "border-teal-500/20",
              },
              {
                label: "Total Mandates",
                value: String(mandates.length),
                sub: `${activeSips} active`,
                color: "text-slate-100",
                icon: Repeat2,
                bg: "bg-slate-700/30",
                border: "border-slate-700/50",
              },
              {
                label: "Active SIPs",
                value: String(activeSips),
                sub: "Running this month",
                color: "text-emerald-400",
                icon: CheckCircle2,
                bg: "bg-emerald-500/10",
                border: "border-emerald-500/20",
              },
              {
                label: "Paused / Stopped",
                value: String(pausedSips),
                sub: "Zero in latest month",
                color: "text-amber-400",
                icon: AlertTriangle,
                bg: "bg-amber-500/10",
                border: "border-amber-500/20",
              },
            ].map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className={`bg-slate-900/70 backdrop-blur-md border ${card.border} rounded-2xl p-5 shadow-xl`}
              >
                <div className={`inline-flex p-2 rounded-xl ${card.bg} mb-3`}>
                  <card.icon size={18} className={card.color} />
                </div>
                <div className={`text-2xl font-extrabold ${card.color}`}>
                  {card.value}
                </div>
                <div className="text-xs text-slate-500 mt-1 font-medium">
                  {card.label}
                </div>
                <div className="text-[11px] text-slate-600 mt-0.5">
                  {card.sub}
                </div>
              </motion.div>
            ))}
          </div>

          {/* ── MEMBER FILTER ── */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterMember("all")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition cursor-pointer ${filterMember === "all" ? "bg-teal-500 text-slate-950 border-teal-500" : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"}`}
            >
              All Members ({mandates.length})
            </button>
            {members.map((m) => {
              const count = mandates.filter((x) => x.memberName === m).length;
              return (
                <button
                  key={m}
                  onClick={() => setFilterMember(m)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition cursor-pointer ${filterMember === m ? "bg-teal-500 text-slate-950 border-teal-500" : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"}`}
                >
                  {m.split(" ")[0]} ({count})
                </button>
              );
            })}
          </div>

          {/* ── PER-MEMBER TABLES ── */}
          <div className="space-y-4">
            {Object.entries(byMember).map(([memberName, sips]) => {
              const memberTotal = sips
                .filter((s) => s.isActive)
                .reduce((a, s) => a + s.monthlyAmount, 0);
              const isExpanded =
                expandedMember === null || expandedMember === memberName;

              return (
                <motion.div
                  key={memberName}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl"
                >
                  {/* Member header */}
                  <button
                    onClick={() =>
                      setExpandedMember(
                        expandedMember === memberName ? null : memberName
                      )
                    }
                    className="w-full flex items-center justify-between px-6 py-4 border-b border-slate-800/60 cursor-pointer hover:bg-slate-800/20 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500/30 to-emerald-500/20 flex items-center justify-center border border-teal-500/20">
                        <Users size={16} className="text-teal-400" />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-slate-100 text-sm">
                          {memberName}
                        </div>
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
                          {formatCurrency(memberTotal)}
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
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-slate-950/50">
                                <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                                  Scheme
                                </th>
                                <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                                  Folio
                                </th>
                                <th className="px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                                  SIP Amount
                                </th>
                                {monthCols.map((col) => (
                                  <th
                                    key={col}
                                    className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap"
                                  >
                                    {col}
                                  </th>
                                ))}
                                <th className="px-5 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                  Status
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/40">
                              {sips.map((sip, i) => (
                                <tr
                                  key={sip.id}
                                  className={
                                    i % 2 === 0 ? "" : "bg-slate-950/20"
                                  }
                                >
                                  <td className="px-5 py-3 font-medium text-slate-200 max-w-xs">
                                    <div className="truncate">
                                      {sip.schemeName}
                                    </div>
                                  </td>
                                  <td className="px-5 py-3 font-mono text-xs text-slate-400">
                                    {sip.folioNo}
                                  </td>
                                  <td className="px-5 py-3 text-right font-bold text-slate-100">
                                    {formatCurrency(sip.monthlyAmount)}
                                  </td>
                                  {monthCols.map((col) => {
                                    const amt = sip.monthlyHistory[col] ?? 0;
                                    return (
                                      <td
                                        key={col}
                                        className={`px-3 py-3 text-right text-xs font-semibold ${amt > 0 ? "text-emerald-400" : "text-slate-600"}`}
                                      >
                                        {amt > 0
                                          ? `₹${amt.toLocaleString("en-IN")}`
                                          : "—"}
                                      </td>
                                    );
                                  })}
                                  <td className="px-5 py-3 text-center">
                                    {sip.isActive ? (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />{" "}
                                        Active
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                                        Paused
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="border-t border-slate-700/60 bg-slate-950/40">
                                <td
                                  colSpan={2}
                                  className="px-5 py-3 text-xs font-bold text-slate-400 uppercase"
                                >
                                  {memberName.split(" ")[0]}&apos;s Total
                                </td>
                                <td className="px-5 py-3 text-right font-extrabold text-teal-400">
                                  {formatCurrency(memberTotal)}
                                </td>
                                {monthCols.map((col) => {
                                  const colTotal = sips.reduce(
                                    (a, s) => a + (s.monthlyHistory[col] ?? 0),
                                    0
                                  );
                                  return (
                                    <td
                                      key={col}
                                      className={`px-3 py-3 text-right text-xs font-bold ${colTotal > 0 ? "text-teal-400" : "text-slate-600"}`}
                                    >
                                      {colTotal > 0
                                        ? `₹${colTotal.toLocaleString("en-IN")}`
                                        : "—"}
                                    </td>
                                  );
                                })}
                                <td />
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

          {/* ── GRAND TOTAL ROW ── */}
          <div className="bg-slate-900/70 backdrop-blur-md border border-teal-500/20 rounded-2xl p-5 shadow-xl">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div className="text-sm font-bold text-slate-300">
                Family Grand Total — {activeSips} active SIPs across{" "}
                {members.length} investors
              </div>
              <div className="flex items-center gap-6">
                {monthCols.map((col) => {
                  const colTotal = mandates.reduce(
                    (a, m) => a + (m.monthlyHistory[col] ?? 0),
                    0
                  );
                  return (
                    <div key={col} className="text-center">
                      <div className="text-[11px] text-slate-500 font-medium">
                        {col}
                      </div>
                      <div
                        className={`text-sm font-bold ${colTotal > 0 ? "text-teal-400" : "text-slate-600"}`}
                      >
                        {colTotal > 0 ? formatCurrency(colTotal) : "—"}
                      </div>
                    </div>
                  );
                })}
                <div className="text-center border-l border-slate-700 pl-6">
                  <div className="text-[11px] text-slate-500 font-medium">
                    Monthly
                  </div>
                  <div className="text-xl font-extrabold text-teal-400">
                    {formatCurrency(totalMonthly)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Full-screen upload loader */}
      {isUploading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="w-14 h-14 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-100">
              Parsing SIP file…
            </h3>
            <p className="text-slate-400 mt-2 text-sm">
              Reading monthly mandate amounts for all investors.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
