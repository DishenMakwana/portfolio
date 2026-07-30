import AllocationAnalysisTab from "@/components/shared/AllocationAnalysisTab";
import type { AnalysisTabProps } from "@/types/insights";

export default function AmcAnalysisTab(props: AnalysisTabProps) {
  return (
    <AllocationAnalysisTab
      {...props}
      entityLabel="AMC"
      entityDescription="Asset Management Company (AMC)"
      title="AMC Exposure & Performance Analysis"
      downloadPrefix="amc"
    />
  );
}
