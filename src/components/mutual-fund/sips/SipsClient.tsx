"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, useMemo, useEffect } from "react";
import { Repeat2 } from "lucide-react";
import { toast } from "react-hot-toast";

import { uploadSipAction, clearSipMandatesAction } from "@/actions/portfolio";
import { parseMonthYear } from "@/helpers/dates";
import type { SipMandateRow } from "@/types/portfolio";
import type { SipsClientProps, SipMemberStatsMap } from "@/types/sips";

import SipsHeaderUploadBanner from "./SipsHeaderUploadBanner";
import SipsKpiCards from "./SipsKpiCards";
import SipsMemberFilterPills from "./SipsMemberFilterPills";
import SipMemberSection from "./table/SipMemberSection";
import SipGrandTotalCard from "./table/SipGrandTotalCard";
import SipUploadLoadingModal from "./modal/SipUploadLoadingModal";
import SipCategoryAnalysisCard from "./SipCategoryAnalysisCard";
import ConfirmationModal from "@/components/shared/ConfirmationModal";

export default function SipsClient({ mandates }: SipsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const initialMember = searchParams.get("member") || "all";
  const [isUploading, setIsUploading] = useState(false);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [filterMember, setFilterMember] = useState<string>(initialMember);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    setFilterMember(searchParams.get("member") || "all");
  }, [searchParams]);

  const updateUrl = (updates: Record<string, string | null>) => {
    const searchString =
      typeof window !== "undefined"
        ? window.location.search
        : searchParams.toString();
    const current = new URLSearchParams(searchString);
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "" || value === "all") {
        current.delete(key);
      } else {
        current.set(key, value);
      }
    }
    const query = current.toString();
    const url = `${pathname}${query ? `?${query}` : ""}`;
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", url);
    }
    router.replace(url, { scroll: false });
  };

  const handleMemberChange = (member: string) => {
    setFilterMember(member);
    updateUrl({ member });
  };

  // ── Upload handler
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await uploadSipAction(formData);
    setIsUploading(false);
    if (res.success && res.data) {
      toast.success(
        `Successfully saved ${res.data.inserted} SIP mandates from ${res.data.total} rows.`
      );
      startTransition(() => router.refresh());
    } else {
      toast.error(res.error || "Upload failed");
    }
    e.target.value = "";
  };

  // ── Confirm Clear handler
  const handleConfirmClear = async () => {
    setIsClearing(true);
    const res = await clearSipMandatesAction();
    setIsClearing(false);
    setIsClearModalOpen(false);
    if (res.success) {
      toast.success("Successfully cleared all SIP mandates.");
      startTransition(() => router.refresh());
    } else {
      toast.error(res.error || "Failed to clear SIP mandates");
    }
  };

  // ── Derived data
  const { members, totalMonthly, activeSips, pausedSips, byMember, monthCols } =
    useMemo(() => {
      const mems = Array.from(new Set(mandates.map((m) => m.memberName))).sort(
        (a, b) => a.localeCompare(b)
      );
      const filtered =
        filterMember === "all"
          ? mandates
          : mandates.filter((m) => m.memberName === filterMember);

      const totalMon = mandates
        .filter((m) => m.isActive)
        .reduce((a, m) => a + m.monthlyAmount, 0);

      const act = mandates.filter((m) => m.isActive).length;
      const psd = mandates.filter((m) => !m.isActive).length;

      const grouped: Record<string, SipMandateRow[]> = {};
      filtered.forEach((m) => {
        if (!grouped[m.memberName]) grouped[m.memberName] = [];
        grouped[m.memberName].push(m);
      });

      const allMonthKeys = new Set<string>();
      mandates.forEach((m) => {
        if (m.monthlyHistory) {
          Object.keys(m.monthlyHistory).forEach((k) => allMonthKeys.add(k));
        }
      });

      const sortedCols = Array.from(allMonthKeys).sort((a, b) => {
        return parseMonthYear(a).getTime() - parseMonthYear(b).getTime();
      });

      // Show latest 5 cumulative months (e.g. MAY 26 to SEP 26), removing APR 26 and earlier records
      const displayedCols =
        sortedCols.length > 5 ? sortedCols.slice(-5) : sortedCols;

      return {
        members: mems,
        totalMonthly: totalMon,
        activeSips: act,
        pausedSips: psd,
        byMember: grouped,
        monthCols: displayedCols,
      };
    }, [mandates, filterMember]);

  const memberTotals = useMemo(() => {
    const totals: SipMemberStatsMap = {};

    for (const [memberName, sips] of Object.entries(byMember)) {
      const memberTotal = sips.reduce((a, s) => a + s.monthlyAmount, 0);
      const monthlyTotals: Record<string, number> = {};
      for (const col of monthCols) {
        monthlyTotals[col] = sips.reduce(
          (a, s) => a + (s.monthlyHistory[col] ?? 0),
          0
        );
      }
      totals[memberName] = {
        memberTotal,
        monthlyTotals,
      };
    }
    return totals;
  }, [byMember, monthCols]);

  const grandMonthlyTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const col of monthCols) {
      totals[col] = mandates.reduce(
        (a, m) => a + (m.monthlyHistory[col] ?? 0),
        0
      );
    }
    return totals;
  }, [mandates, monthCols]);

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* ── HEADER + UPLOAD ── */}
      <SipsHeaderUploadBanner
        mandatesCount={mandates.length}
        isUploading={isUploading}
        onUpload={handleUpload}
        onOpenClearModal={() => setIsClearModalOpen(true)}
      />

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
          <SipsKpiCards
            totalMonthly={totalMonthly}
            totalMandates={mandates.length}
            activeSips={activeSips}
            pausedSips={pausedSips}
          />

          {/* ── MEMBER FILTER ── */}
          <SipsMemberFilterPills
            members={members}
            mandates={mandates}
            filterMember={filterMember}
            onSelectMember={handleMemberChange}
          />

          {/* ── PER-MEMBER TABLES ── */}
          <div className="space-y-4">
            {Object.entries(byMember).map(([memberName, sips]) => (
              <SipMemberSection
                key={memberName}
                memberName={memberName}
                sips={sips}
                monthCols={monthCols}
                stats={memberTotals[memberName]}
                isExpanded={
                  expandedMember === null || expandedMember === memberName
                }
                onToggleExpand={() =>
                  setExpandedMember(
                    expandedMember === memberName ? null : memberName
                  )
                }
                onSelectFund={(url) => router.push(url)}
              />
            ))}
          </div>

          {/* ── GRAND TOTAL ROW ── */}
          <SipGrandTotalCard
            activeSips={activeSips}
            membersCount={members.length}
            monthCols={monthCols}
            grandMonthlyTotals={grandMonthlyTotals}
            totalMonthly={totalMonthly}
          />

          {/* ── SECTION SEPARATOR & STRATEGIC INSIGHTS DIVIDER ── */}
          <div className="pt-8 pb-3">
            <div className="flex items-center gap-4">
              <div className="h-px bg-slate-800/80 flex-1" />
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 shadow-inner text-[11px] font-bold uppercase tracking-widest text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                Category &amp; Strategic Allocation
              </div>
              <div className="h-px bg-slate-800/80 flex-1" />
            </div>
          </div>

          {/* ── MONTHLY CATEGORY SIP ALLOCATION & FUTURE ADVISORY ── */}
          <SipCategoryAnalysisCard
            mandates={mandates}
            filterMember={filterMember}
          />
        </>
      )}

      {/* Full-screen upload loader */}
      <SipUploadLoadingModal isOpen={isUploading} />

      {/* Confirmation Modal for Clearing SIP Mandates */}
      <ConfirmationModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={handleConfirmClear}
        title="Clear All SIP Mandates?"
        description="Are you sure you want to delete all SIP mandates and monthly history records from the database? This action cannot be undone."
        warningNote="All existing family member mandates will be permanently erased. You will need to re-upload your SIP Excel file to restore them."
        confirmText="Clear All Mandates"
        cancelText="Cancel"
        variant="danger"
        isPending={isClearing}
      />
    </div>
  );
}
