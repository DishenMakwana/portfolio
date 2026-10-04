import Image from "next/image";
import {
  Globe,
  Pin,
  Copy,
  Check,
  Edit3,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { CATEGORY_COLORS } from "@/constants/analysisLinks";
import type { AnalysisLinksBentoCardProps } from "@/types/analysisLinks";

export default function AnalysisLinksBentoCard({
  link,
  index,
  onTogglePin,
  onCopyUrl,
  isCopied,
  onEdit,
  onDelete,
}: AnalysisLinksBentoCardProps) {
  const catStyle = CATEGORY_COLORS[link.category] || CATEGORY_COLORS.General;

  return (
    <div
      className={`bg-slate-900/70 backdrop-blur-md border ${
        link.pinned
          ? "border-amber-500/40 shadow-amber-500/5"
          : "border-slate-800/80"
      } hover:border-sky-500/40 rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-200 shadow-md group relative`}
    >
      <div>
        {/* Card Top Row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            {link.faviconUrl ? (
              <Image
                src={link.faviconUrl}
                alt=""
                width={16}
                height={16}
                unoptimized
                className="w-4 h-4 rounded-sm shrink-0 object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              <Globe size={14} className="text-slate-500 shrink-0" />
            )}
            <span className="text-[11px] text-slate-400">{link.domain}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onTogglePin(link)}
              className={`p-1 rounded transition-colors cursor-pointer ${
                link.pinned
                  ? "text-amber-300"
                  : "text-slate-600 hover:text-slate-400"
              }`}
            >
              <Pin size={13} className={link.pinned ? "fill-amber-300" : ""} />
            </button>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-950/60 border border-slate-800/80 px-1.5 py-0.5 rounded">
              #{index}
            </span>
            <span
              className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
            >
              {link.category}
            </span>
          </div>
        </div>

        {/* Card Title */}
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block font-bold text-slate-100 text-sm leading-snug group-hover:text-sky-400 transition-colors line-clamp-2"
        >
          {link.title}
        </a>

        {/* Card Description */}
        {link.description && (
          <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">
            {link.description}
          </p>
        )}
      </div>

      {/* Card Bottom Row */}
      <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500 mt-2">
        <button
          type="button"
          onClick={() => onCopyUrl(link.id, link.url)}
          className="hover:text-sky-300 transition-colors flex items-center gap-1 cursor-pointer"
        >
          {isCopied ? (
            <>
              <Check size={12} className="text-emerald-300" />
              <span className="text-emerald-300 text-[11px]">Copied</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span className="text-[11px]">Copy</span>
            </>
          )}
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(link)}
            className="p-1 hover:text-amber-300 transition-colors cursor-pointer"
          >
            <Edit3 size={13} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(link.id)}
            className="p-1 hover:text-rose-400 transition-colors cursor-pointer"
          >
            <Trash2 size={13} />
          </button>
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 text-sky-300 hover:text-sky-200 transition-colors ml-1"
          >
            <ExternalLink size={13} />
          </a>
        </div>
      </div>
    </div>
  );
}
