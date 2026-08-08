"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Table2,
  GitMerge,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  Repeat2,
  PieChart,
  ArrowLeftRight,
  CalendarDays,
  CalendarRange,
  Coins,
  Briefcase,
  Lightbulb,
  Rocket,
  ShieldCheck,
  BarChart3,
  Zap,
  Layers,
  LineChart,
  History,
  Target,
} from "lucide-react";

interface SubTabItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

const INSIGHTS_SUB_TABS: SubTabItem[] = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "funds", label: "Funds", icon: TrendingUp },
  { id: "members", label: "Members", icon: Users },
  { id: "sip", label: "SIP Planner", icon: CalendarRange },
  { id: "actions", label: "Actions", icon: Zap },
  { id: "overlaps", label: "Overlaps", icon: Layers },
  { id: "amc", label: "AMC Analysis", icon: LineChart },
  { id: "category", label: "Category Allocation", icon: Layers },
  { id: "sold", label: "Past Sold Funds", icon: History },
];

const ZERODHA_SUB_TABS: SubTabItem[] = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "stocks", label: "Stocks", icon: TrendingUp },
  { id: "funds", label: "Mutual Funds", icon: Target },
  { id: "mapping", label: "Fund Mapping", icon: GitMerge },
  { id: "files", label: "Upload Tracker", icon: CalendarDays },
  { id: "insights", label: "Insights", icon: Lightbulb },
];

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/family", label: "Family Portfolio", icon: Users },
  { href: "/holdings", label: "Holdings", icon: Table2 },
  { href: "/sips", label: "My SIPs", icon: Repeat2 },
  { href: "/future-projection", label: "Future Projection", icon: Rocket },
  { href: "/allocation", label: "Asset Allocation", icon: PieChart },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/fy-tracker", label: "FY Investment Tracker", icon: CalendarRange },
  { href: "/uploads", label: "Upload Tracker", icon: CalendarDays },
  { href: "/bullion", label: "Gold & Silver", icon: Coins },
  { href: "/mapping", label: "Fund Mapping", icon: GitMerge },
  {
    href: "/insights",
    label: "Insights",
    icon: Lightbulb,
    subTabs: INSIGHTS_SUB_TABS,
  },
  { href: "/audit", label: "CAS Audit", icon: ShieldCheck },
  {
    href: "/zerodha",
    label: "Zerodha Portfolio",
    icon: Briefcase,
    subTabs: ZERODHA_SUB_TABS,
  },
  { href: "/msfl", label: "MSFL Stocks", icon: TrendingUp },
];

function SidebarNav({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const reportId = searchParams.get("reportId");
  const activeTabParam = searchParams.get("tab");

  // Track currently user-expanded tree item href (e.g. "/insights" or "/zerodha" or "" for none)
  const [expandedTreeHref, setExpandedTreeHref] = useState<string | null>(null);

  // Active tree for the current page route if it has subTabs
  const routeTreeHref =
    NAV_ITEMS.find(
      (item) =>
        item.href === pathname && item.subTabs && item.subTabs.length > 0
    )?.href || null;

  // The active expanded tree is explicitly user-chosen tree (if set) OR the current route's tree
  const currentExpandedHref =
    expandedTreeHref !== null ? expandedTreeHref : routeTreeHref;

  return (
    <nav className="flex-1 overflow-y-auto space-y-1 px-3 py-3 scrollbar-none">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        const targetHref = reportId
          ? `${item.href}?reportId=${reportId}`
          : item.href;

        const subTabs = item.subTabs;
        const hasSubTabs = Boolean(subTabs && subTabs.length > 0);
        const isTreeExpanded = currentExpandedHref === item.href;

        const currentSubTab = activeTabParam || "overview";

        const handleMainClick = (e: React.MouseEvent) => {
          if (hasSubTabs) {
            e.preventDefault();
            // Toggle tree: if currently expanded, collapse it (""); else expand this tree
            setExpandedTreeHref(isTreeExpanded ? "" : item.href);
          } else {
            // Clicking any non-tree tab (like Fund Mapping, Family, etc.) closes all trees
            setExpandedTreeHref("");
          }
        };

        return (
          <div key={item.href} className="space-y-1">
            <Link
              href={
                reportId
                  ? { pathname: item.href, query: { reportId } }
                  : item.href
              }
              onClick={handleMainClick}
              prefetch={true}
              onMouseEnter={() => {
                try {
                  router.prefetch(targetHref);
                } catch {}
              }}
              title={collapsed ? item.label : undefined}
              aria-label={collapsed ? item.label : undefined}
              className={`group relative flex h-9 items-center gap-3 rounded-lg border text-[13px] font-semibold transition-all duration-150 cursor-pointer ${
                active
                  ? "bg-teal-500/10 text-teal-400 border-teal-500/30 shadow-[0_0_12px_-3px_rgba(20,184,166,0.15)]"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border-transparent"
              } ${collapsed ? "justify-center px-0" : "px-3"}`}
            >
              <item.icon
                size={18}
                className={`shrink-0 ${
                  active
                    ? "text-teal-400"
                    : "text-slate-500 group-hover:text-slate-300"
                }`}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {!collapsed && hasSubTabs && (
                <div className="ml-auto flex items-center gap-1.5 shrink-0">
                  {active && (
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
                  )}
                  <ChevronDown
                    size={14}
                    className={`shrink-0 transition-transform duration-200 ${
                      isTreeExpanded
                        ? "rotate-180 text-teal-400"
                        : "text-slate-500 group-hover:text-slate-300"
                    }`}
                  />
                </div>
              )}
              {!collapsed && !hasSubTabs && active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
              )}
            </Link>

            {/* Dribbble Vertical Tree Navigation Sub-Menu */}
            {hasSubTabs && !collapsed && (
              <AnimatePresence initial={false}>
                {isTreeExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="relative pl-3 pr-1 py-1 my-0.5 space-y-1 overflow-hidden"
                  >
                    {/* Continuous Vertical Spine Line */}
                    <div className="absolute left-[21px] top-2 bottom-3.5 w-[2px] bg-slate-700/60 rounded-full pointer-events-none" />

                    {subTabs?.map((sub) => {
                      const isSubActive = active && currentSubTab === sub.id;
                      const subQuery = reportId
                        ? { reportId, tab: sub.id }
                        : { tab: sub.id };

                      return (
                        <div
                          key={sub.id}
                          className="relative flex items-center pl-6"
                        >
                          {/* Curved Branch Connector */}
                          <div className="absolute left-[21px] top-0 bottom-1/2 w-3.5 border-l-2 border-b-2 border-slate-700/60 rounded-bl-xl pointer-events-none" />

                          <Link
                            href={{ pathname: item.href, query: subQuery }}
                            className={`group relative flex h-8 w-full items-center gap-2.5 rounded-xl px-2.5 text-xs transition-all duration-200 cursor-pointer select-none border ${
                              isSubActive
                                ? "bg-teal-500/20 text-teal-300 font-extrabold border-teal-500/40 shadow-[0_0_12px_-2px_rgba(20,184,166,0.25)] translate-x-1"
                                : "text-slate-400 hover:text-slate-100 font-medium hover:bg-slate-800/40 border-transparent"
                            }`}
                          >
                            <sub.icon
                              size={13}
                              className={`shrink-0 ${
                                isSubActive
                                  ? "text-teal-300"
                                  : "text-slate-400 group-hover:text-slate-200"
                              }`}
                            />
                            <span className="truncate">{sub.label}</span>
                          </Link>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
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
        collapsed ? "w-16" : "w-64"
      }`}
    >
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-expanded={!collapsed}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute right-0 top-4 z-30 flex h-7 w-7 translate-x-1/2 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 shadow-md shadow-slate-950/30 transition hover:border-teal-500/50 hover:bg-slate-700 hover:text-teal-300 cursor-pointer"
      >
        {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
      </button>

      <div
        className={`flex h-16 min-h-16 items-center gap-3 border-b border-slate-800/60 px-4 ${
          collapsed ? "justify-center" : ""
        }`}
      >
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shrink-0 shadow-md">
          <TrendingUp size={18} className="text-slate-950" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-base font-extrabold text-slate-100 leading-tight">
              Family
            </div>
            <div className="text-xs text-slate-500">Portfolio</div>
          </div>
        )}
      </div>

      <Suspense
        fallback={
          <div className="flex-1 space-y-1 px-3 py-3 animate-pulse bg-slate-900/20" />
        }
      >
        <SidebarNav collapsed={collapsed} />
      </Suspense>
    </aside>
  );
}
