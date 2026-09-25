"use client";

import { useMemo } from "react";
import { Users, User } from "lucide-react";
import { formatZerodhaAccountName } from "@/helpers/formatters";
import type { ZerodhaAccountFilterPillsProps } from "@/types/zerodha";

export default function ZerodhaAccountFilterPills({
  members,
  selectedAccount,
  onSelect,
  className = "",
}: ZerodhaAccountFilterPillsProps) {
  const isAllSelected = !selectedAccount || selectedAccount === "all";

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      const nameA = formatZerodhaAccountName(a.clientId, a.name);
      const nameB = formatZerodhaAccountName(b.clientId, b.name);
      return nameA.localeCompare(nameB);
    });
  }, [members]);

  return (
    <div
      className={`flex flex-wrap items-center gap-2 max-w-full ${className}`}
    >
      <button
        onClick={() => onSelect("all")}
        className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
          isAllSelected
            ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20 font-bold"
            : "bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800"
        }`}
      >
        <Users size={12} />
        <span>All Accounts</span>
      </button>

      {sortedMembers.map((member) => {
        const isSelected = selectedAccount === member.clientId;
        return (
          <button
            key={member.clientId}
            onClick={() => onSelect(member.clientId)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              isSelected
                ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20 font-bold"
                : "bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800"
            }`}
          >
            <User size={12} />
            <span>
              {formatZerodhaAccountName(member.clientId, member.name)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
