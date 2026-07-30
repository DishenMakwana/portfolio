import AllocationAnalysisTab from "@/components/shared/AllocationAnalysisTab";
import type { AnalysisTabProps } from "@/types/insights";

export default function CategoryAnalysisTab(props: AnalysisTabProps) {
  return (
    <AllocationAnalysisTab
      {...props}
      entityLabel="Category"
      entityDescription="mutual fund category"
      title="Category Allocation & Performance Analysis"
      downloadPrefix="category"
    />
  );
}
