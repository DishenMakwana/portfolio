import { Globe } from "lucide-react";
import TablePagination from "@/components/shared/TablePagination";
import AnalysisLinksTableRow from "./table/AnalysisLinksTableRow";
import type { AnalysisLinksTableViewProps } from "@/types/analysisLinks";

export default function AnalysisLinksTableView({
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
}: AnalysisLinksTableViewProps) {
  return (
    <div className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden">
      {/* Table Top Bar with Page & Counter */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-950/80 border-b border-slate-850">
        <span className="text-xs text-slate-400 font-medium">
          Page <span className="text-slate-200 font-bold">{page}</span> of{" "}
          <span className="text-slate-200 font-bold">
            {Math.max(totalPages, 1)}
          </span>
        </span>
        <span className="text-xs text-slate-400 font-medium">
          Showing{" "}
          <span className="text-slate-200 font-bold">
            {paginatedLinks.length}
          </span>{" "}
          of{" "}
          <span className="text-slate-200 font-bold">
            {filteredLinks.length}
          </span>{" "}
          links
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
              <th className="py-3.5 px-3 w-10 text-center">Pin</th>
              <th className="py-3.5 px-3 w-12 text-center text-slate-500 ">
                #
              </th>
              <th className="py-3.5 px-4">Title & Source</th>
              <th className="py-3.5 px-4">Category</th>
              <th className="py-3.5 px-4">URL / Domain</th>
              <th className="py-3.5 px-4">Notes</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredLinks.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  <Globe size={28} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium text-slate-400">
                    No market links found
                  </p>
                  {searchQuery || selectedCategoryFilter !== "ALL" ? (
                    <button
                      type="button"
                      onClick={onResetFilters}
                      className="mt-2 text-xs font-semibold text-teal-400 hover:text-teal-300 transition underline cursor-pointer"
                    >
                      Reset Filters
                    </button>
                  ) : (
                    <p className="text-xs text-slate-600 mt-1">
                      Paste a URL above to save your first market research
                      resource.
                    </p>
                  )}
                </td>
              </tr>
            ) : (
              paginatedLinks.map((link, idx) => (
                <AnalysisLinksTableRow
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
          </tbody>
        </table>
      </div>

      {/* ── Table Bottom Pagination ── */}
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
      />
    </div>
  );
}
