"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import {
  LayoutDashboard,
  Users,
  Table2,
  GitMerge,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Repeat2,
  PieChart,
  CalendarDays,
  Coins,
  Briefcase,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/family", label: "Family Portfolio", icon: Users },
  { href: "/holdings", label: "Holdings", icon: Table2 },
  { href: "/sips", label: "My SIPs", icon: Repeat2 },
  { href: "/allocation", label: "Asset Allocation", icon: PieChart },
  { href: "/uploads", label: "Upload Tracker", icon: CalendarDays },
  { href: "/bullion", label: "Gold & Silver", icon: Coins },
  { href: "/mapping", label: "Fund Mapping", icon: GitMerge },
  { href: "/zerodha", label: "Zerodha Portfolio", icon: Briefcase },
];

function SidebarNav({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const reportId = searchParams.get("reportId");

  return (
    <nav className="flex-1 space-y-2 px-4 py-8">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={
              reportId
                ? { pathname: item.href, query: { reportId } }
                : item.href
            }
            title={collapsed ? item.label : undefined}
            aria-label={collapsed ? item.label : undefined}
            className={`group relative flex h-11 items-center gap-3.5 rounded-xl border text-sm font-semibold transition-all duration-200 ${
              active
                ? "bg-teal-500/10 text-teal-400 border-teal-500/30 shadow-[0_0_15px_-3px_rgba(20,184,166,0.1)]"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border-transparent"
            } ${collapsed ? "justify-center px-0" : "px-4"}`}
          >
            <item.icon
              size={20}
              className={`shrink-0 ${
                active
                  ? "text-teal-400"
                  : "text-slate-500 group-hover:text-slate-300"
              }`}
            />
            {!collapsed && <span className="truncate">{item.label}</span>}
            {active && !collapsed && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export default function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`sticky top-0 z-20 flex h-screen shrink-0 flex-col bg-slate-900/90 backdrop-blur-xl border-r border-slate-800/80 transition-[width] duration-300 ease-out ${
        collapsed ? "w-20" : "w-72"
      }`}
    >
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-expanded={!collapsed}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute right-0 top-6 z-30 flex h-9 w-9 translate-x-1/2 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-300 shadow-lg shadow-slate-950/30 transition hover:border-teal-500/50 hover:bg-slate-700 hover:text-teal-300 cursor-pointer"
      >
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>

      <div
        className={`flex min-h-28 items-center gap-4 border-b border-slate-800/60 px-6 ${
          collapsed ? "justify-center" : ""
        }`}
      >
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shrink-0 shadow-lg">
          <TrendingUp size={24} className="text-slate-950" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-xl font-extrabold text-slate-100 leading-tight">
              Family
            </div>
            <div className="text-sm text-slate-500">Portfolio</div>
          </div>
        )}
      </div>

      <Suspense
        fallback={
          <div className="flex-1 space-y-2 px-4 py-8 animate-pulse bg-slate-900/20" />
        }
      >
        <SidebarNav collapsed={collapsed} />
      </Suspense>
    </aside>
  );
}
