"use client";

import type { SipsMemberFilterPillsProps } from "@/types/sips";

export default function SipsMemberFilterPills({
  members,
  mandates,
  filterMember,
  onSelectMember,
}: SipsMemberFilterPillsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelectMember("all")}
        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition cursor-pointer ${filterMember === "all" ? "bg-teal-500 text-slate-950 border-teal-500" : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"}`}
      >
        All Members ({mandates.length})
      </button>
      {members.map((m) => {
        const count = mandates.filter((x) => x.memberName === m).length;
        return (
          <button
            key={m}
            onClick={() => onSelectMember(m)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition cursor-pointer ${filterMember === m ? "bg-teal-500 text-slate-950 border-teal-500" : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"}`}
          >
            {m.split(" ")[0]} ({count})
          </button>
        );
      })}
    </div>
  );
}
