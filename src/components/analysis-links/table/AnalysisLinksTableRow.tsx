import Image from "next/image";
import {
  Pin,
  Globe,
  ExternalLink,
  Copy,
  Check,
  Edit3,
  Trash2,
} from "lucide-react";
import { CATEGORY_COLORS } from "@/constants/analysisLinks";
import type { AnalysisLinksTableRowProps } from "@/types/analysisLinks";

export default function AnalysisLinksTableRow({
  link,
  index,
  onTogglePin,
  onCopyUrl,
  isCopied,
  onEdit,
  onDelete,
}: AnalysisLinksTableRowProps) {
  const catStyle = CATEGORY_COLORS[link.category] || CATEGORY_COLORS.General;

  return (
    <tr
      className={`hover:bg-slate-800/40 transition-colors group ${
        link.pinned ? "bg-amber-500/[0.02]" : ""
      }`}
    >
      {/* Pin Button */}
      <td className="py-3 px-3 text-center">
        <button
          type="button"
          onClick={() => onTogglePin(link)}
          className={`p-1 rounded-md transition-colors cursor-pointer ${
            link.pinned
              ? "text-amber-300 hover:text-amber-200"
              : "text-slate-600 hover:text-slate-400"
          }`}
          title={link.pinned ? "Unpin" : "Pin to top"}
        >
          <Pin size={14} className={link.pinned ? "fill-amber-300" : ""} />
        </button>
      </td>

      {/* Row Index */}
      <td className="py-3 px-3 text-center text-[11px] text-slate-500">
        {index}
      </td>

      {/* Title, Favicon & Full URL */}
      <td className="py-3 px-4 max-w-sm sm:max-w-md">
        <div className="flex items-start gap-2.5">
          {link.faviconUrl ? (
            <Image
              src={link.faviconUrl}
              alt=""
              width={16}
              height={16}
              unoptimized
              className="w-4 h-4 rounded-sm shrink-0 mt-0.5 object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          ) : (
            <Globe size={14} className="text-slate-500 shrink-0 mt-0.5" />
          )}
          <div className="flex flex-col min-w-0">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-slate-100 hover:text-sky-300 transition-colors inline-flex items-center gap-1 line-clamp-1 group-hover:underline text-xs sm:text-sm"
            >
              <span>{link.title}</span>
              <ExternalLink
                size={11}
                className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-sky-300"
              />
            </a>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-slate-400 hover:text-sky-300 transition-colors line-clamp-1 break-all mt-0.5"
            >
              {link.url}
            </a>
          </div>
        </div>
      </td>

      {/* Category Tag */}
      <td className="py-3 px-4">
        <span
          className={`px-2.5 py-0.5 rounded-md border text-[11px] font-semibold inline-block ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
        >
          {link.category}
        </span>
      </td>

      {/* Domain / Copy URL */}
      <td className="py-3 px-4 text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-300">{link.domain}</span>
          <button
            type="button"
            onClick={() => onCopyUrl(link.id, link.url)}
            className="p-1 text-slate-500 hover:text-sky-300 transition-colors rounded cursor-pointer"
            title="Copy URL"
          >
            {isCopied ? (
              <Check size={12} className="text-emerald-300" />
            ) : (
              <Copy size={12} />
            )}
          </button>
        </div>
      </td>

      {/* Notes / Description */}
      <td className="py-3 px-4 text-slate-400 max-w-xs">
        <p className="line-clamp-1 text-[11px]">{link.description || "—"}</p>
      </td>

      {/* Actions */}
      <td className="py-3 px-4 text-right">
        <div className="flex items-center justify-end gap-1">
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-slate-400 hover:text-sky-300 hover:bg-sky-500/10 rounded-lg transition-colors"
            title="Open in new tab"
          >
            <ExternalLink size={14} />
          </a>
          <button
            type="button"
            onClick={() => onEdit(link)}
            className="p-1.5 text-slate-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg transition-colors cursor-pointer"
            title="Edit link"
          >
            <Edit3 size={14} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(link.id)}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
            title="Delete link"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}
