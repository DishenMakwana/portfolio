"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
  PieChart, Pie, Cell
} from 'recharts';
import {
  TrendingUp, TrendingDown, IndianRupee, Info,
  Activity, Target, Zap, Shield, ArrowUpRight, ArrowDownRight,
  BarChart2, Users, PieChart as PieIcon, ChevronUp, ChevronDown
} from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/formatters';

const COLORS = ['#0d9488', '#8b5cf6', '#3b82f6', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];
const BG_CLASSES = ['bg-teal-600', 'bg-violet-500', 'bg-blue-500', 'bg-pink-500', 'bg-amber-500', 'bg-emerald-500', 'bg-red-500'];
const GRAD_CLASSES = [
  'from-teal-600 to-blue-500',
  'from-violet-500 to-pink-500',
  'from-blue-500 to-amber-500',
  'from-pink-500 to-emerald-500',
  'from-amber-500 to-red-500',
  'from-emerald-500 to-teal-600',
  'from-red-500 to-violet-500'
];

interface OverviewTabProps {
  totals: {
    currentValue: number;
    invested: number;
    gain: number;
    absoluteReturn: number;
    portfolioXirr: number;
    benchmarkXirr: number;
    alpha: number;
    cagr?: number | null;
  };
  metricDeltas: {
    previousDate: string | null;
    portfolioXirr: number | null;
    benchmarkXirr: number | null;
    alpha: number | null;
    cagr: number | null;
  };
  timelineData: {
    date: string;
    invested: number;
    value: number;
    portfolioXirr: number;
    benchmarkXirr: number;
    alpha: number;
  }[];
  categoryAllocation: { name: string; value: number }[];
  amcAllocation: { name: string; value: number }[];
  capAllocation: { name: string; value: number }[];
  memberSummaries: {
    name: string;
    pan: string | null;
    invested: number;
    currentValue: number;
    gain: number;
    cagr: number;
    xirr: number;
    alpha: number;
    cagrDelta: number | null;
    xirrDelta: number | null;
    alphaDelta: number | null;
  }[];
  holdings: any[];
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.4, ease: 'easeOut' as const }
  })
};

function CustomAreaTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-2xl">
        <p className="text-xs text-slate-400 mb-2 font-semibold">{label}</p>
        {payload.map((p: any, i: number) => {
          const dotBg = p.name === 'Current Value' ? 'bg-teal-400' : 'bg-slate-400';
          return (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className={`w-2 h-2 rounded-full ${dotBg}`} />
              <span className="text-slate-300">{p.name}:</span>
              <span className="font-bold text-slate-100">{formatCurrency(Number(p.value))}</span>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
}

function CustomXirrTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-2xl">
        <p className="text-xs text-slate-400 mb-2 font-semibold">{label}</p>
        {payload.map((p: any, i: number) => {
          const dotBg = p.dataKey === 'portfolioXirr' ? 'bg-amber-400' : 'bg-violet-400';
          return (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className={`w-2 h-2 rounded-full ${dotBg}`} />
              <span className="text-slate-300">{p.name}:</span>
              <span className="font-bold text-slate-100">{formatPercent(Number(p.value))}</span>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
}

function formatPointDelta(delta: number) {
  return `${delta >= 0 ? '+' : ''}${delta.toFixed(2)} pp`;
}

function DeltaBadge({ delta, label = 'vs prev' }: { delta: number | null; label?: string }) {
  if (delta === null) {
    return (
      <span className="inline-flex items-center rounded-md border border-slate-700/70 bg-slate-800/60 px-2 py-0.5 text-[10px] font-bold text-slate-500">
        No prior snapshot
      </span>
    );
  }

  const isUp = delta >= 0;
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold ${
      isUp
        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
        : 'border-red-500/20 bg-red-500/10 text-red-400'
    }`}>
      {isUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
      {formatPointDelta(delta)} {label}
    </span>
  );
}

export default function OverviewTab({
  totals,
  metricDeltas,
  timelineData,
  categoryAllocation,
  amcAllocation,
  capAllocation,
  memberSummaries,
  holdings,
}: OverviewTabProps) {
  const [investorSort, setInvestorSort] = useState<{
    field: 'name' | 'value' | 'xirr';
    direction: 'asc' | 'desc';
  }>({ field: 'value', direction: 'desc' });

  const [subCatSort, setSubCatSort] = useState<{
    field: 'name' | 'value';
    direction: 'asc' | 'desc';
  }>({ field: 'value', direction: 'desc' });

  const handleInvestorSort = (field: 'name' | 'value' | 'xirr') => {
    setInvestorSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const handleSubCatSort = (field: 'name' | 'value') => {
    setSubCatSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const renderSortIcon = (sortState: { field: string; direction: 'asc' | 'desc' }, field: string) => {
    const isActive = sortState.field === field;
    if (isActive) {
      return sortState.direction === 'asc' ? (
        <ChevronUp size={12} className="inline ml-1 text-teal-400" />
      ) : (
        <ChevronDown size={12} className="inline ml-1 text-teal-400" />
      );
    }
    return <ChevronDown size={12} className="inline ml-1 opacity-20" />;
  };

  const sortedMembers = [...memberSummaries].sort((a, b) => {
    let aVal: any = a.name;
    let bVal: any = b.name;

    if (investorSort.field === 'value') {
      aVal = a.currentValue;
      bVal = b.currentValue;
    } else if (investorSort.field === 'xirr') {
      aVal = a.xirr;
      bVal = b.xirr;
    }

    if (aVal < bVal) return investorSort.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return investorSort.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const sortedSubCats = [...capAllocation].sort((a, b) => {
    let aVal: any = a.name;
    let bVal: any = b.name;

    if (subCatSort.field === 'value') {
      aVal = a.value;
      bVal = b.value;
    }

    if (aVal < bVal) return subCatSort.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return subCatSort.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const isProfit = totals.gain >= 0;
  const isAlphaPositive = totals.alpha >= 0;

  const ltcgGain = holdings.filter(h => h.holdingDays > 365).reduce((acc, h) => acc + h.gain, 0);
  const stcgGain = holdings.filter(h => h.holdingDays <= 365).reduce((acc, h) => acc + h.gain, 0);

  const topFund = holdings.length > 0 ? [...holdings].sort((a, b) => b.absoluteReturn - a.absoluteReturn)[0] : null;
  const worstFund = holdings.length > 0 ? [...holdings].sort((a, b) => a.absoluteReturn - b.absoluteReturn)[0] : null;

  const totalCurrentValue = totals.currentValue;

  const portfolioCagr = totals.cagr !== undefined && totals.cagr !== null
    ? totals.cagr
    : (holdings.length > 0
        ? holdings.reduce((acc, h) => acc + (h.cagr || 0) * (h.purchaseValue || 0), 0) / (totals.invested || 1)
        : 0);

  const row1Cards = [
    {
      label: 'Current Value',
      value: formatCurrency(totals.currentValue),
      sub: isProfit ? 'In Profit ↑' : 'In Loss ↓',
      subColor: isProfit ? 'text-emerald-400' : 'text-red-400',
      icon: IndianRupee,
      iconBg: 'bg-teal-500/10', iconColor: 'text-teal-400',
      gradFrom: 'from-teal-500/10', border: 'border-teal-500/20',
    },
    {
      label: 'Invested Value',
      value: formatCurrency(totals.invested),
      sub: 'Principal Cost',
      subColor: 'text-slate-400',
      icon: Shield,
      iconBg: 'bg-indigo-500/10', iconColor: 'text-indigo-400',
      gradFrom: 'from-indigo-500/10', border: 'border-indigo-500/20',
    },
    {
      label: 'Unrealised Gain',
      value: formatCurrency(totals.gain),
      sub: `${totals.absoluteReturn.toFixed(2)}% Absolute`,
      subColor: isProfit ? 'text-emerald-400' : 'text-red-400',
      icon: isProfit ? TrendingUp : TrendingDown,
      iconBg: isProfit ? 'bg-emerald-500/10' : 'bg-red-500/10',
      iconColor: isProfit ? 'text-emerald-400' : 'text-red-400',
      gradFrom: isProfit ? 'from-emerald-500/10' : 'from-red-500/10',
      border: isProfit ? 'border-emerald-500/20' : 'border-red-500/20',
    },
  ];

  const performanceCards = [
    {
      label: 'Portfolio XIRR',
      value: formatPercent(totals.portfolioXirr),
      sub: 'Compounded Annualised',
      subColor: 'text-slate-400',
      icon: Activity,
      iconBg: 'bg-amber-500/10', iconColor: 'text-amber-400',
      gradFrom: 'from-amber-500/10', border: 'border-amber-500/20',
      delta: metricDeltas.portfolioXirr,
    },
    {
      label: 'Portfolio CAGR',
      value: formatPercent(portfolioCagr),
      sub: totals.cagr !== undefined && totals.cagr !== null ? 'Excel Reported CAGR' : 'Compounded Annualised',
      subColor: 'text-slate-400',
      icon: Target,
      iconBg: 'bg-pink-500/10', iconColor: 'text-pink-400',
      gradFrom: 'from-pink-500/10', border: 'border-pink-500/20',
      delta: metricDeltas.cagr,
    },
  ];

  return (
    <motion.div
      key="overview"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      {/* ── ROW 1: 5 KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {row1Cards.map((card, i) => (
          <motion.div
            key={card.label}
            custom={i}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
            className={`relative overflow-hidden bg-slate-900/70 backdrop-blur-md border ${card.border} rounded-2xl p-5 shadow-xl`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${card.gradFrom} to-transparent pointer-events-none`} />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">{card.label}</span>
                <div className={`p-2 rounded-xl ${card.iconBg}`}>
                  <card.icon size={17} className={card.iconColor} />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-slate-100 leading-tight">{card.value}</div>
              <div className={`text-xs font-semibold mt-2 ${card.subColor}`}>{card.sub}</div>
            </div>
          </motion.div>
        ))}

        {/* Best Performer */}
        <motion.div custom={3} initial="hidden" animate="visible" variants={cardVariants}
          className="relative overflow-hidden bg-slate-900/70 backdrop-blur-md border border-teal-500/20 rounded-2xl p-5 shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">Best Performer</span>
              <div className="p-2 rounded-xl bg-teal-500/10"><TrendingUp size={17} className="text-teal-400" /></div>
            </div>
            <div className="text-sm font-bold text-slate-200 leading-snug line-clamp-2 min-h-[36px]">
              {topFund ? topFund.schemeName : '—'}
            </div>
            <div className="text-xs font-semibold mt-2 text-teal-400">
              {topFund ? `+${topFund.absoluteReturn.toFixed(1)}% abs. return` : '—'}
            </div>
          </div>
        </motion.div>

        {/* Worst Fund */}
        <motion.div custom={4} initial="hidden" animate="visible" variants={cardVariants}
          className="relative overflow-hidden bg-slate-900/70 backdrop-blur-md border border-red-500/20 rounded-2xl p-5 shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">Needs Attention</span>
              <div className="p-2 rounded-xl bg-red-500/10"><TrendingDown size={17} className="text-red-400" /></div>
            </div>
            <div className="text-sm font-bold text-slate-200 leading-snug line-clamp-2 min-h-[36px]">
              {worstFund ? worstFund.schemeName : '—'}
            </div>
            <div className="text-xs font-semibold mt-2 text-red-400">
              {worstFund ? `${worstFund.absoluteReturn.toFixed(1)}% abs. return` : '—'}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── ROW 2: Benchmark + Alpha + XIRR/CAGR ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Benchmark XIRR */}
        <motion.div custom={5} initial="hidden" animate="visible" variants={cardVariants}
          className="relative overflow-hidden bg-slate-900/70 backdrop-blur-md border border-violet-500/20 rounded-2xl p-5 shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-500 flex items-center gap-1">
                Benchmark XIRR <span title="Simulated UTI Nifty 50 Index Fund Direct Growth (120716) XIRR"><Info size={10} className="text-slate-600" /></span>
              </span>
              <div className="p-2 rounded-xl bg-violet-500/10"><BarChart2 size={17} className="text-violet-400" /></div>
            </div>
            <div className="text-2xl font-extrabold text-violet-400 leading-tight">{formatPercent(totals.benchmarkXirr)}</div>
            <div className="mt-2">
              <DeltaBadge delta={metricDeltas.benchmarkXirr} />
            </div>
            <div className="text-xs font-semibold mt-2 text-slate-400">UTI Nifty 50 Index Direct</div>
          </div>
        </motion.div>

        {/* Alpha */}
        <motion.div custom={6} initial="hidden" animate="visible" variants={cardVariants}
          className={`relative overflow-hidden bg-slate-900/70 backdrop-blur-md border ${isAlphaPositive ? 'border-emerald-500/20' : 'border-red-500/20'} rounded-2xl p-5 shadow-xl`}>
          <div className={`absolute inset-0 bg-gradient-to-br ${isAlphaPositive ? 'from-emerald-500/10' : 'from-red-500/10'} to-transparent pointer-events-none`} />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-500 flex items-center gap-1">
                Alpha Generated <span title="Portfolio XIRR – UTI Nifty 50 Index Fund Direct (120716) XIRR"><Info size={10} className="text-slate-600" /></span>
              </span>
              <div className={`p-2 rounded-xl ${isAlphaPositive ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                <Zap size={17} className={isAlphaPositive ? 'text-emerald-400' : 'text-red-400'} />
              </div>
            </div>
            <div className={`text-2xl font-extrabold leading-tight ${isAlphaPositive ? 'text-emerald-400' : 'text-red-400'}`}>
              {totals.alpha >= 0 ? '+' : ''}{totals.alpha.toFixed(2)}%
            </div>
            <div className="mt-2">
              <DeltaBadge delta={metricDeltas.alpha} />
            </div>
            <div className={`text-xs font-semibold mt-2 flex items-center gap-1 ${isAlphaPositive ? 'text-emerald-400' : 'text-red-400'}`}>
              {isAlphaPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {isAlphaPositive ? 'Outperforming market' : 'Underperforming market'}
            </div>
          </div>
        </motion.div>

        {performanceCards.map((card, i) => (
          <motion.div
            key={card.label}
            custom={7 + i}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
            className={`relative overflow-hidden bg-slate-900/70 backdrop-blur-md border ${card.border} rounded-2xl p-5 shadow-xl`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${card.gradFrom} to-transparent pointer-events-none`} />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">{card.label}</span>
                <div className={`p-2 rounded-xl ${card.iconBg}`}>
                  <card.icon size={17} className={card.iconColor} />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-slate-100 leading-tight">{card.value}</div>
              <div className="mt-2">
                <DeltaBadge delta={card.delta ?? null} />
              </div>
              <div className={`text-xs font-semibold mt-2 ${card.subColor}`}>{card.sub}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── GROWTH TIMELINE CHART ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.4 }}
        className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl"
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <TrendingUp className="text-teal-400" size={18} />
              Portfolio Growth Timeline
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Current value vs. invested cost across uploaded snapshots</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1.5 rounded-full bg-teal-400 inline-block" />
              <span className="text-slate-400">Current Value</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1.5 rounded-full bg-violet-400 inline-block" />
              <span className="text-slate-400">Invested Cost</span>
            </div>
          </div>
        </div>
        <div className="h-72 w-full">
          {timelineData.length < 2 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-3">
              <BarChart2 size={40} className="opacity-25" />
              <p className="text-sm">Upload more reports over time to see the growth chart.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#475569" fontSize={11} tickLine={false} />
                <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false}
                  tickFormatter={(tick) => '₹' + Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(tick)} />
                <Tooltip content={<CustomAreaTooltip />} />
                <Area type="monotone" dataKey="value" name="Current Value" stroke="#0d9488" strokeWidth={2.5}
                  fillOpacity={1} fill="url(#colorValue)" dot={false} activeDot={{ r: 5, fill: '#0d9488' }} />
                <Area type="monotone" dataKey="invested" name="Invested Cost" stroke="#8b5cf6" strokeWidth={2}
                  strokeDasharray="6 4" fillOpacity={1} fill="url(#colorInvested)" dot={false} activeDot={{ r: 4, fill: '#8b5cf6' }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </motion.div>

      {/* ── XIRR TIMELINE CHART ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32, duration: 0.4 }}
        className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl"
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Activity className="text-amber-400" size={18} />
              XIRR Return Timeline
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Portfolio XIRR vs benchmark XIRR across uploaded snapshot dates</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1.5 rounded-full bg-amber-400 inline-block" />
              <span className="text-slate-400">Portfolio XIRR</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1.5 rounded-full bg-violet-400 inline-block" />
              <span className="text-slate-400" title="UTI Nifty 50 Index Fund Direct Growth (120716)">Benchmark (UTI Nifty 50)</span>
            </div>
          </div>
        </div>
        <div className="h-72 w-full">
          {timelineData.length < 2 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-3">
              <BarChart2 size={40} className="opacity-25" />
              <p className="text-sm">Upload more reports over time to compare XIRR history.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#475569" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#475569"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(tick) => `${Number(tick).toFixed(0)}%`}
                />
                <Tooltip content={<CustomXirrTooltip />} />
                <Line
                  type="monotone"
                  dataKey="portfolioXirr"
                  name="Portfolio XIRR"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#f59e0b' }}
                />
                <Line
                  type="monotone"
                  dataKey="benchmarkXirr"
                  name="Benchmark XIRR"
                  stroke="#8b5cf6"
                  strokeWidth={2.5}
                  strokeDasharray="6 4"
                  dot={{ r: 3, fill: '#8b5cf6', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#8b5cf6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </motion.div>

      {/* ── BOTTOM ROW: 3 panels ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Category Donut */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.4 }}
          className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl"
        >
          <h4 className="font-bold text-slate-100 mb-4 flex items-center gap-2 text-xs uppercase tracking-widest">
            <span className="w-1 h-4 rounded-full bg-teal-400 inline-block" />
            Category Allocation
          </h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryAllocation} innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value" strokeWidth={0}>
                  {categoryAllocation.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 shadow-2xl text-xs font-bold text-slate-100">
                      {formatCurrency(Number(payload[0].value))}
                    </div>
                  );
                }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-2">
            {categoryAllocation.map((cat, i) => {
              const pct = totalCurrentValue > 0 ? (cat.value / totalCurrentValue) * 100 : 0;
              return (
                <div key={cat.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-sm flex-shrink-0 ${BG_CLASSES[i % BG_CLASSES.length]}`} />
                    <span className="text-slate-300 truncate max-w-[140px]">{cat.name}</span>
                  </div>
                  <span className="text-slate-400 font-semibold ml-2">{pct.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* AMC Bars */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.4 }}
          className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl"
        >
          <h4 className="font-bold text-slate-100 mb-4 flex items-center gap-2 text-xs uppercase tracking-widest">
            <span className="w-1 h-4 rounded-full bg-teal-400 inline-block" />
            AMC Exposure
          </h4>
          <div className="space-y-5 max-h-80 overflow-y-auto pr-4 [scrollbar-gutter:stable]">
            {amcAllocation.map((amc, i) => {
              const pct = totalCurrentValue > 0 ? (amc.value / totalCurrentValue) * 100 : 0;
              return (
                <div key={amc.name}>
                  <div className="flex justify-between gap-4 text-xs mb-2.5">
                    <span className="font-medium text-slate-300 truncate max-w-[60%]">{amc.name}</span>
                    <span className="text-slate-400 font-bold shrink-0 tabular-nums">{pct.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full bg-gradient-to-r ${GRAD_CLASSES[i % GRAD_CLASSES.length]}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.5 + i * 0.05, duration: 0.6, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Tax + XIRR Comparison */}
        <div className="flex flex-col gap-4">
          {/* Capital Gains */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.4 }}
            className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-xl flex-1"
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-slate-100 text-xs uppercase tracking-widest">Capital Gains</h4>
              <div className="bg-amber-500/10 p-1.5 rounded-lg"><IndianRupee size={14} className="text-amber-400" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <div className="text-[11px] text-slate-400 font-medium">LTCG (&gt;1 year)</div>
                <div className="text-sm font-bold text-slate-200 mt-1">{formatCurrency(ltcgGain)}</div>
                <span className="text-[10px] text-emerald-400/80 mt-0.5 block">Exempt upto ₹1.25L</span>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <div className="text-[11px] text-slate-400 font-medium">STCG (≤1 year)</div>
                <div className="text-sm font-bold text-amber-400 mt-1">{formatCurrency(stcgGain)}</div>
                <span className="text-[10px] text-amber-400/70 mt-0.5 block">Flat 20% tax</span>
              </div>
            </div>
          </motion.div>

          {/* XIRR Comparison */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.4 }}
            className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-xl flex-1"
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-slate-100 text-xs uppercase tracking-widest">XIRR vs Benchmark</h4>
              <div className="bg-teal-500/10 p-1.5 rounded-lg"><Target size={14} className="text-teal-400" /></div>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-400">Your Portfolio</span>
                  <span className="flex items-center gap-2 font-bold text-teal-400">
                    {formatPercent(totals.portfolioXirr)}
                    <DeltaBadge delta={metricDeltas.portfolioXirr} label="" />
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <motion.div className="h-full bg-teal-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(Math.max(totals.portfolioXirr, 0) * 2.5, 100)}%` }}
                    transition={{ delay: 0.6, duration: 0.7 }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-400">Nifty 50 Index</span>
                  <span className="flex items-center gap-2 font-bold text-violet-400">
                    {formatPercent(totals.benchmarkXirr)}
                    <DeltaBadge delta={metricDeltas.benchmarkXirr} label="" />
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <motion.div className="h-full bg-violet-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(Math.max(totals.benchmarkXirr, 0) * 2.5, 100)}%` }}
                    transition={{ delay: 0.65, duration: 0.7 }}
                  />
                </div>
              </div>
              <div className={`text-center text-[11px] font-bold py-1.5 rounded-lg ${isAlphaPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                <span>Alpha: {totals.alpha >= 0 ? '+' : ''}{totals.alpha.toFixed(2)}% — {isAlphaPositive ? 'Beating the market' : 'Lagging behind'}</span>
                <span className="ml-2 inline-flex align-middle"><DeltaBadge delta={metricDeltas.alpha} label="" /></span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── NEW ROW: Investor Allocation + Sub Category Allocation ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">

        {/* Investor Allocation Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.4 }}
          className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl"
        >
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-800/60">
            <Users size={15} className="text-teal-400" />
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-100">Investor Allocation</h4>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-950/60">
                <th 
                  onClick={() => handleInvestorSort('name')}
                  className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:text-slate-300 transition-colors"
                >
                  Investor {renderSortIcon(investorSort, 'name')}
                </th>
                <th 
                  onClick={() => handleInvestorSort('value')}
                  className="px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:text-slate-300 transition-colors"
                >
                  Current Value {renderSortIcon(investorSort, 'value')}
                </th>
                <th 
                  onClick={() => handleInvestorSort('value')}
                  className="px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:text-slate-300 transition-colors"
                >
                  Share {renderSortIcon(investorSort, 'value')}
                </th>
                <th 
                  onClick={() => handleInvestorSort('xirr')}
                  className="px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:text-slate-300 transition-colors"
                >
                  XIRR {renderSortIcon(investorSort, 'xirr')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {sortedMembers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-slate-500 text-xs">No data</td>
                </tr>
              ) : (
                sortedMembers.map((m, i) => {
                  const share = totalCurrentValue > 0 ? (m.currentValue / totalCurrentValue) * 100 : 0;
                  return (
                    <tr key={m.name} className={i % 2 === 0 ? 'bg-transparent' : 'bg-slate-950/30'}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${BG_CLASSES[i % BG_CLASSES.length]}`} />
                          <span className="font-semibold text-slate-200">{m.name}</span>
                        </div>
                        {m.pan && (
                          <div className="text-[10px] text-slate-500 font-mono ml-4">{m.pan}</div>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-slate-100">{formatCurrency(m.currentValue)}</td>
                      <td className="px-5 py-3 text-right">
                        <span className="text-teal-400 font-semibold">{share.toFixed(1)}%</span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className={`font-bold text-xs ${m.xirr >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {formatPercent(m.xirr)}
                        </span>
                        <div className="mt-1">
                          <DeltaBadge delta={m.xirrDelta} label="" />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {memberSummaries.length > 0 && (
              <tfoot>
                <tr className="border-t border-slate-700/60 bg-slate-950/40">
                  <td className="px-5 py-3 text-xs font-bold text-slate-400 uppercase">Total</td>
                  <td className="px-5 py-3 text-right font-extrabold text-slate-100">{formatCurrency(totalCurrentValue)}</td>
                  <td className="px-5 py-3 text-right font-bold text-teal-400">100%</td>
                  <td className="px-5 py-3 text-right">
                    <div className="font-bold text-teal-400">{formatPercent(totals.portfolioXirr)}</div>
                    <div className="mt-1"><DeltaBadge delta={metricDeltas.portfolioXirr} label="" /></div>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </motion.div>

        {/* Sub Category (Cap) Allocation Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.4 }}
          className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl"
        >
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-800/60">
            <PieIcon size={15} className="text-violet-400" />
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-100">Sub Category Allocation</h4>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-950/60">
                <th 
                  onClick={() => handleSubCatSort('name')}
                  className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:text-slate-300 transition-colors"
                >
                  Category {renderSortIcon(subCatSort, 'name')}
                </th>
                <th 
                  onClick={() => handleSubCatSort('value')}
                  className="px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:text-slate-300 transition-colors"
                >
                  Current Value {renderSortIcon(subCatSort, 'value')}
                </th>
                <th 
                  onClick={() => handleSubCatSort('value')}
                  className="px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:text-slate-300 transition-colors"
                >
                  Share {renderSortIcon(subCatSort, 'value')}
                </th>
                <th className="px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Bar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {sortedSubCats.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-slate-500 text-xs">No data</td>
                </tr>
              ) : (
                sortedSubCats.map((cat, i) => {
                  const share = totalCurrentValue > 0 ? (cat.value / totalCurrentValue) * 100 : 0;
                  return (
                    <tr key={cat.name} className={i % 2 === 0 ? 'bg-transparent' : 'bg-slate-950/30'}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${BG_CLASSES[i % BG_CLASSES.length]}`} />
                          <span className="font-semibold text-slate-200">{cat.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-slate-100">{formatCurrency(cat.value)}</td>
                      <td className="px-5 py-3 text-right">
                        <span className="text-violet-400 font-semibold">{share.toFixed(1)}%</span>
                      </td>
                      <td className="px-5 py-3 text-right w-24">
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${BG_CLASSES[i % BG_CLASSES.length]}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${share}%` }}
                            transition={{ delay: 0.6 + i * 0.07, duration: 0.5, ease: 'easeOut' }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {capAllocation.length > 0 && (
              <tfoot>
                <tr className="border-t border-slate-700/60 bg-slate-950/40">
                  <td className="px-5 py-3 text-xs font-bold text-slate-400 uppercase">Total</td>
                  <td className="px-5 py-3 text-right font-extrabold text-slate-100">{formatCurrency(totalCurrentValue)}</td>
                  <td className="px-5 py-3 text-right font-bold text-violet-400">100%</td>
                  <td className="px-5 py-3" />
                </tr>
              </tfoot>
            )}
          </table>
        </motion.div>

      </div>
    </motion.div>
  );
}
