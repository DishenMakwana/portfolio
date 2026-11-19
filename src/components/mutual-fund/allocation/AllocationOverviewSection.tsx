"use client";

import dynamic from "next/dynamic";
import AllocationInvestorTable from "./overview/AllocationInvestorTable";
import AllocationProductTable from "./overview/AllocationProductTable";
import type { AllocationOverviewSectionProps } from "@/types/allocation";

const AllocationCategoryDonutCard = dynamic(
  () => import("./overview/AllocationCategoryDonutCard"),
  {
    ssr: false,
    loading: () => (
      <div className="h-72 w-full animate-pulse rounded-2xl bg-slate-900/60 border border-slate-800/80 p-6 flex items-center justify-center text-slate-500 text-sm">
        Loading category allocation chart...
      </div>
    ),
  }
);

export default function AllocationOverviewSection({
  sortedMembers,
  grandTotal,
  investorSort,
  onInvestorSort,
  categoryData,
}: AllocationOverviewSectionProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-5 items-start relative z-10">
      {/* LEFT: Investor table */}
      <div className="space-y-4">
        <AllocationInvestorTable
          sortedMembers={sortedMembers}
          grandTotal={grandTotal}
          sortCol={investorSort.col}
          sortDir={investorSort.dir}
          onSort={onInvestorSort}
        />
      </div>

      {/* RIGHT: Product table top + Legend + Pie underneath */}
      <div className="space-y-4">
        <AllocationProductTable grandTotal={grandTotal} />
        <AllocationCategoryDonutCard categoryData={categoryData} />
      </div>
    </div>
  );
}
