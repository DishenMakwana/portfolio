import AllocationInvestorTable from "./overview/AllocationInvestorTable";
import AllocationProductTable from "./overview/AllocationProductTable";
import AllocationCategoryDonutCard from "./overview/AllocationCategoryDonutCard";
import type { AllocationOverviewSectionProps } from "@/types/allocation";

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
