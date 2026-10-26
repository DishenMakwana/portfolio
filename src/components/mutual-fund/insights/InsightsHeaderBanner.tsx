import type { InsightsHeaderBannerProps } from "@/types/insights";

export default function InsightsHeaderBanner({
  reportDate,
  memberCount,
  uniqueSchemes,
  icon: Icon,
  title,
}: InsightsHeaderBannerProps) {
  return (
    <div>
      <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2">
        <Icon size={22} className="text-teal-400" />
        {title}
      </h1>
      <p className="text-sm text-slate-500 mt-1">
        As of <span className="text-teal-400 font-semibold">{reportDate}</span>{" "}
        · {memberCount} members · {uniqueSchemes} schemes
      </p>
    </div>
  );
}
