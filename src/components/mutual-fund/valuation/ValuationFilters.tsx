import SearchFilterBar from "@/components/shared/SearchFilterBar";
import MemberFilterPills from "@/components/shared/MemberFilterPills";
import type { ValuationFiltersProps } from "@/types/valuation";

export default function ValuationFilters({
  searchQuery,
  selectedMember,
  membersList,
  onSearchChange,
  onMemberChange,
}: ValuationFiltersProps): React.JSX.Element {
  return (
    <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl px-4 py-3 shadow-xl flex flex-col gap-2.5">
      <SearchFilterBar
        value={searchQuery}
        onChange={onSearchChange}
        placeholder="Search scheme, folio or applicant…"
      />
      <MemberFilterPills
        members={membersList}
        selectedMember={selectedMember}
        onSelect={onMemberChange}
      />
    </div>
  );
}
