import { Globe } from "lucide-react";
import TablePagination from "@/components/shared/TablePagination";
import AnalysisLinksBentoCard from "./bento/AnalysisLinksBentoCard";
import type { AnalysisLinksBentoGridProps } from "@/types/analysisLinks";

export default function AnalysisLinksBentoGrid({
  filteredLinks,
  paginatedLinks,
  page,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
  searchQuery,
  selectedCategoryFilter,
  onResetFilters,
  onTogglePin,
  onCopyUrl,
  copiedId,
  onEdit,
  onDelete,
}: AnalysisLinksBentoGridProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredLinks.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 bg-slate-900/50 border border-slate-800 rounded-2xl">
            <Globe size={28} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium text-slate-400">
              No market links found
            </p>
            {(searchQuery || selectedCategoryFilter !== "ALL") && (
              <button
                type="button"
                onClick={onResetFilters}
                className="mt-2 text-xs font-semibold text-teal-400 hover:text-teal-300 transition underline cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          paginatedLinks.map((link, idx) => (
            <AnalysisLinksBentoCard
              key={link.id}
              link={link}
              index={(page - 1) * pageSize + idx + 1}
              onTogglePin={onTogglePin}
              onCopyUrl={onCopyUrl}
              isCopied={copiedId === link.id}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))
        )}
      </div>

      {/* ── Bento View Bottom Pagination ── */}
      <TablePagination
        page={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
        pageSize={pageSize}
        pageSizeOptions={[25, 50, 75, 100]}
        onPageSizeChange={onPageSizeChange}
        totalItems={filteredLinks.length}
        showingStart={Math.min((page - 1) * pageSize + 1, filteredLinks.length)}
        showingEnd={Math.min(page * pageSize, filteredLinks.length)}
        itemName="links"
        className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-4"
      />
    </div>
  );
}
