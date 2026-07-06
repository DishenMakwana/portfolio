"use client";

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  AlertTriangle,
  TrendingUp,
  Info,
  Percent,
  Layers,
  Activity,
  PieChart,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  TrendingDown,
  DollarSign,
  Sparkles
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

interface FundDetailsClientProps {
  holding: {
    id: number;
    schemeId: number | null;
    memberId: number | null;
    schemeName: string | null;
    category: string | null;
    schemeCodeApi: string | null;
    folioNo: string;
    balanceUnits: number;
    purchaseNav: number;
    purchaseValue: number;
    currentNav: number;
    currentValue: number;
    dividend: number | null;
    gain: number;
    holdingDays: number;
    absoluteReturn: number;
    cagr: number;
    comments: string | null;
    memberName: string | null;
    memberPan: string | null;
    asOfDate: string | null;
  };
  transactions: any[];
  metrics: {
    portfolioXirr: number;
    benchmarkXirr: number;
    alpha: number;
  };
  factsheetMeta: {
    profile: {
      launchDate: string;
      corpusCr: number;
      expenseRatio: number;
      exitLoad: string;
      benchmarkName: string;
    };
    allocation: {
      equity: number;
      debt: number;
      gold: number;
      globalEquity: number;
      other: number;
    };
  };
  volatilityStats: {
    alpha: number;
    sharpe: number;
    mean: number;
    beta: number;
    stdDev: number;
    ytm: number;
    modifiedDuration: number;
    avgMaturity: number;
  };
  chartData: {
    date: string;
    timestamp: number;
    fundNav: number;
    benchNav: number;
    fundReturn: number;
    benchReturn: number;
    txs?: { type: string; amount: number }[];
  }[];
}

export default function FundDetailsClient({
  holding,
  transactions,
  metrics,
  factsheetMeta,
  volatilityStats,
  chartData
}: FundDetailsClientProps) {
  const router = useRouter();
  const [showExplanation, setShowExplanation] = useState(false);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatPercent = (val: number) => {
    return `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const cleanCategory = holding.category || 'N/A';
  const isDebt = cleanCategory.toLowerCase().includes('debt') || cleanCategory.toLowerCase().includes('liquid');

  // Custom chart tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const fundVal = payload[0].value;
      const benchVal = payload[1].value;
      const dataPoint = payload[0].payload;
      return (
        <div className="bg-slate-900/95 border border-slate-800 p-4 rounded-xl shadow-2xl backdrop-blur-md">
          <p className="text-slate-400 text-xs font-bold mb-2">{dataPoint.date}</p>
          <div className="space-y-1 text-sm font-medium">
            <div className="flex justify-between items-center gap-6">
              <span className="flex items-center gap-1.5 text-teal-400">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-400"></span>
                Fund NAV Return:
              </span>
              <span className="font-mono text-teal-300 font-bold">{formatPercent(fundVal)}</span>
            </div>
            <div className="flex justify-between items-center gap-6">
              <span className="flex items-center gap-1.5 text-indigo-400">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-400"></span>
                Nifty 50 Return:
              </span>
              <span className="font-mono text-indigo-300 font-bold">{formatPercent(benchVal)}</span>
            </div>
          </div>
          {dataPoint.txs && dataPoint.txs.length > 0 && (
            <div className="mt-3 pt-2 border-t border-slate-800 space-y-1">
              <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Transactions on date</p>
              {dataPoint.txs.map((tx: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center gap-4 text-xs">
                  <span className={`font-semibold ${tx.type === 'BUY' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {tx.type === 'BUY' ? 'Invested' : 'Redeemed'}
                  </span>
                  <span className="font-mono font-bold text-slate-300">{formatCurrency(tx.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Back Button and Title Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-6 gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 p-2.5 rounded-lg transition duration-200 cursor-pointer flex items-center justify-center shadow-md hover:scale-105 active:scale-95"
            title="Go Back"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">{holding.schemeName || 'Unknown Scheme'}</h1>
              <span className="bg-slate-800/80 text-teal-400 border border-teal-950/60 text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                {cleanCategory}
              </span>
            </div>
            <p className="text-slate-400 mt-1 text-sm font-medium">
              Holder: <strong className="text-slate-300">{holding.memberName || 'Unknown Holder'}</strong> • Folio: <span className="font-mono text-slate-300 font-bold">{holding.folioNo}</span>
            </p>
          </div>
        </div>
        <div className="text-sm text-slate-400 bg-slate-900/60 border border-slate-800/80 px-4 py-2.5 rounded-xl shrink-0 font-medium shadow-inner flex items-center gap-2">
          <Calendar size={16} className="text-teal-400" />
          <span>Snapshot Date: <strong className="text-slate-200">{formatDate(holding.asOfDate)}</strong></span>
        </div>
      </header>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Card 1: Valuation */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950/90 border border-slate-800/80 rounded-xl p-4.5 shadow-xl flex flex-col justify-between hover:border-slate-700 transition duration-300">
          <span className="text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Current value</span>
          <div className="mt-2">
            <div className="text-xl font-black text-slate-100 tracking-tight">{formatCurrency(holding.currentValue)}</div>
            <div className="text-[10px] text-slate-500 mt-1 font-semibold">Valuation price</div>
          </div>
        </div>

        {/* Card 2: Invested Cost */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950/90 border border-slate-800/80 rounded-xl p-4.5 shadow-xl flex flex-col justify-between hover:border-slate-700 transition duration-300">
          <span className="text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Invested Cost</span>
          <div className="mt-2">
            <div className="text-xl font-black text-slate-100 tracking-tight">{formatCurrency(holding.purchaseValue)}</div>
            <div className="text-[10px] text-slate-500 mt-1 font-semibold">Principal amount</div>
          </div>
        </div>

        {/* Card 3: Returns */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950/90 border border-slate-800/80 rounded-xl p-4.5 shadow-xl flex flex-col justify-between hover:border-slate-700 transition duration-300">
          <span className="text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Net returns</span>
          <div className="mt-2">
            <div className={`text-xl font-black ${holding.gain >= 0 ? 'text-emerald-400' : 'text-red-400'} tracking-tight`}>
              {formatCurrency(holding.gain)}
            </div>
            <div className={`text-[10px] font-extrabold mt-1 ${holding.gain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {holding.absoluteReturn.toFixed(2)}% Abs
            </div>
          </div>
        </div>

        {/* Card 4: Scheme XIRR */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950/90 border border-slate-800/80 rounded-xl p-4.5 shadow-xl flex flex-col justify-between hover:border-slate-700 transition duration-300">
          <span className="text-slate-400 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
            Scheme XIRR
            <span title="Calculated from reconstructed transactions"><Info size={12} className="text-slate-500 cursor-pointer" /></span>
          </span>
          <div className="mt-2">
            <div className="text-xl font-black text-teal-400 tracking-tight">{formatPercent(metrics.portfolioXirr)}</div>
            <div className="text-[10px] text-slate-500 mt-1 font-semibold">Annualized IRR</div>
          </div>
        </div>

        {/* Card 5: Benchmark XIRR */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950/90 border border-slate-800/80 rounded-xl p-4.5 shadow-xl flex flex-col justify-between hover:border-slate-700 transition duration-300">
          <span className="text-slate-400 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
            Nifty 50 XIRR
            <span title="Benchmark return on same cash flow dates"><Info size={12} className="text-slate-500 cursor-pointer" /></span>
          </span>
          <div className="mt-2">
            <div className="text-xl font-black text-indigo-400 tracking-tight">{formatPercent(metrics.benchmarkXirr)}</div>
            <div className="text-[10px] text-slate-500 mt-1 font-semibold">Simulated Index</div>
          </div>
        </div>

        {/* Card 6: Alpha */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950/90 border border-slate-800/80 rounded-xl p-4.5 shadow-xl flex flex-col justify-between hover:border-slate-700 transition duration-300">
          <span className="text-slate-400 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
            Alpha
            <span title="Outperformance over index"><Info size={12} className="text-slate-500 cursor-pointer" /></span>
          </span>
          <div className="mt-2">
            <div className={`text-xl font-black ${metrics.alpha >= 0 ? 'text-emerald-400' : 'text-red-400'} tracking-tight`}>
              {metrics.alpha.toFixed(2)}%
            </div>
            <div className="text-[10px] text-slate-500 mt-1 font-semibold">
              {metrics.alpha >= 0 ? 'Outperforming' : 'Underperforming'}
            </div>
          </div>
        </div>
      </div>

      {/* CHART COMPARISON CARD */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-100 tracking-tight flex items-center gap-2">
              <TrendingUp size={20} className="text-teal-400" />
              <span>Historical Returns Analysis</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1 font-medium">Growth Comparison of Fund vs Nifty 50 Index over the last 3 years</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-teal-400">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-400"></span>
              Fund Return
            </span>
            <span className="flex items-center gap-1.5 text-indigo-400">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400"></span>
              Nifty 50
            </span>
          </div>
        </div>

        {chartData.length > 0 ? (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorFund" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorBench" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="timestamp"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  dy={10}
                  tickFormatter={(t) => new Date(t).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                  dx={-10}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="fundReturn"
                  stroke="#14b8a6"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorFund)"
                />
                <Area
                  type="monotone"
                  dataKey="benchReturn"
                  stroke="#6366f1"
                  strokeWidth={1.8}
                  fillOpacity={1}
                  fill="url(#colorBench)"
                  strokeDasharray="4 4"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-72 border border-dashed border-slate-800 rounded-xl flex flex-col justify-center items-center text-center p-8 bg-slate-950/40">
            <AlertTriangle className="text-amber-500 mb-3" size={32} />
            <h4 className="text-sm font-bold text-slate-300">NAV History Not Found</h4>
            <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
              Please map this scheme to an AMFI Scheme Code in the mapping tab to unlock dynamic line chart visualisations and comparison stats.
            </p>
          </div>
        )}
      </div>

      {/* DETAILED FACTSHEET PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* PANEL 1: SCHEME PROFILE */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between hover:border-slate-850 transition duration-305 backdrop-blur-sm">
          <div>
            <h3 className="text-base font-black text-slate-100 mb-5 tracking-tight flex items-center gap-2 border-b border-slate-850 pb-3">
              <Layers size={18} className="text-teal-400" />
              <span>Scheme Profile</span>
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm border-b border-slate-850/60 pb-2">
                <span className="text-slate-400 font-medium">Launch Date</span>
                <span className="font-semibold text-slate-200">{factsheetMeta.profile.launchDate}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-slate-850/60 pb-2">
                <span className="text-slate-400 font-medium">Corpus (Cr)</span>
                <span className="font-mono font-bold text-slate-200">₹{factsheetMeta.profile.corpusCr.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-slate-850/60 pb-2">
                <span className="text-slate-400 font-medium">Category</span>
                <span className="font-semibold text-slate-200">{cleanCategory}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-slate-850/60 pb-2">
                <span className="text-slate-400 font-medium">Expense Ratio</span>
                <span className="font-mono font-bold text-slate-200">{factsheetMeta.profile.expenseRatio.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-slate-850/60 pb-2">
                <span className="text-slate-400 font-medium">Scheme Type</span>
                <span className="font-semibold text-teal-400">Open-Ended</span>
              </div>
              <div className="flex justify-between items-start text-sm border-b border-slate-850/60 pb-2">
                <span className="text-slate-400 font-medium">Benchmark</span>
                <span className="font-semibold text-indigo-400 text-right text-xs max-w-[200px]">{factsheetMeta.profile.benchmarkName}</span>
              </div>
              <div className="flex flex-col text-sm pt-1">
                <span className="text-slate-400 font-medium mb-1">Exit Load</span>
                <span className="text-xs text-slate-300 bg-slate-950/40 p-2.5 border border-slate-850/80 rounded-lg leading-relaxed italic">
                  {factsheetMeta.profile.exitLoad}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* PANEL 2: COMPOSITION */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between hover:border-slate-850 transition duration-305 backdrop-blur-sm">
          <div>
            <h3 className="text-base font-black text-slate-100 mb-5 tracking-tight flex items-center gap-2 border-b border-slate-850 pb-3">
              <PieChart size={18} className="text-teal-400" />
              <span>Asset Composition (%)</span>
            </h3>

            <div className="space-y-4">
              {/* Equity */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-300">Equity Allocation</span>
                  <span className="text-teal-400 font-mono">{factsheetMeta.allocation.equity.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-950/80 h-2.5 rounded-full overflow-hidden border border-slate-850/60">
                  <div
                    className="bg-teal-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${factsheetMeta.allocation.equity}%` }}
                  ></div>
                </div>
              </div>

              {/* Debt */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-300">Debt Allocation</span>
                  <span className="text-purple-400 font-mono">{factsheetMeta.allocation.debt.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-950/80 h-2.5 rounded-full overflow-hidden border border-slate-850/60">
                  <div
                    className="bg-purple-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${factsheetMeta.allocation.debt}%` }}
                  ></div>
                </div>
              </div>

              {/* Gold */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-300">Gold</span>
                  <span className="text-amber-400 font-mono">{factsheetMeta.allocation.gold.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-950/80 h-2.5 rounded-full overflow-hidden border border-slate-850/60">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${factsheetMeta.allocation.gold}%` }}
                  ></div>
                </div>
              </div>

              {/* Global Equity */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-300">Global Equity</span>
                  <span className="text-blue-400 font-mono">{factsheetMeta.allocation.globalEquity.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-950/80 h-2.5 rounded-full overflow-hidden border border-slate-850/60">
                  <div
                    className="bg-blue-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${factsheetMeta.allocation.globalEquity}%` }}
                  ></div>
                </div>
              </div>

              {/* Other */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-300">Other (Cash/Call Money)</span>
                  <span className="text-slate-400 font-mono">{factsheetMeta.allocation.other.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-950/80 h-2.5 rounded-full overflow-hidden border border-slate-850/60">
                  <div
                    className="bg-slate-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${factsheetMeta.allocation.other}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-[10px] text-slate-500 border-t border-slate-850 pt-4 mt-6 leading-relaxed">
            Note: Portfolio allocations are estimated based on standard mutual fund category guidelines. Real-time updates reflect fund house holdings updates.
          </div>
        </div>

        {/* PANEL 3: VOLATILITY MEASURES */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between hover:border-slate-850 transition duration-305 backdrop-blur-sm">
          <div>
            <h3 className="text-base font-black text-slate-100 mb-5 tracking-tight flex items-center gap-2 border-b border-slate-850 pb-3">
              <Activity size={18} className="text-teal-400" />
              <span>Volatility Measures</span>
            </h3>

            <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
              <div className="bg-slate-950/40 p-3 border border-slate-850 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider flex items-center gap-1">
                  Alpha
                  <span title="Outperformance over index return"><Info size={10} className="text-slate-600" /></span>
                </span>
                <span className={`text-base font-black font-mono block mt-1 ${volatilityStats.alpha >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {volatilityStats.alpha.toFixed(2)}%
                </span>
              </div>
              <div className="bg-slate-950/40 p-3 border border-slate-850 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider flex items-center gap-1">
                  Sharpe Ratio
                  <span title="Risk-adjusted outperformance return"><Info size={10} className="text-slate-600" /></span>
                </span>
                <span className="text-base font-black font-mono text-teal-400 block mt-1">
                  {volatilityStats.sharpe.toFixed(2)}
                </span>
              </div>
              <div className="bg-slate-950/40 p-3 border border-slate-850 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider flex items-center gap-1">
                  Mean Return
                  <span title="Average annualized return rate"><Info size={10} className="text-slate-600" /></span>
                </span>
                <span className="text-base font-black font-mono text-slate-200 block mt-1">
                  {volatilityStats.mean.toFixed(2)}%
                </span>
              </div>
              <div className="bg-slate-950/40 p-3 border border-slate-850 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider flex items-center gap-1">
                  Beta
                  <span title="Market sensitivity volatility ratio"><Info size={10} className="text-slate-600" /></span>
                </span>
                <span className="text-base font-black font-mono text-indigo-400 block mt-1">
                  {volatilityStats.beta.toFixed(2)}
                </span>
              </div>
              <div className="bg-slate-950/40 p-3 border border-slate-850 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider flex items-center gap-1">
                  Std. Deviation
                  <span title="Overall historical return volatility"><Info size={10} className="text-slate-600" /></span>
                </span>
                <span className="text-base font-black font-mono text-slate-200 block mt-1">
                  {volatilityStats.stdDev.toFixed(2)}%
                </span>
              </div>
              <div className="bg-slate-950/40 p-3 border border-slate-850 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider flex items-center gap-1">
                  YTM (Debt)
                  <span title="Yield to maturity (only for Debt)"><Info size={10} className="text-slate-600" /></span>
                </span>
                <span className="text-base font-black font-mono text-slate-400 block mt-1">
                  {volatilityStats.ytm > 0 ? `${volatilityStats.ytm.toFixed(2)}%` : '0.0%'}
                </span>
              </div>
              <div className="bg-slate-950/40 p-3 border border-slate-850 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider flex items-center gap-1">
                  Mod. Duration
                  <span title="Debt yield sensitivity time frame"><Info size={10} className="text-slate-600" /></span>
                </span>
                <span className="text-base font-black font-mono text-slate-400 block mt-1">
                  {volatilityStats.modifiedDuration > 0 ? `${volatilityStats.modifiedDuration.toFixed(2)} Yr` : '0.0'}
                </span>
              </div>
              <div className="bg-slate-950/40 p-3 border border-slate-850 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider flex items-center gap-1">
                  Avg Maturity
                  <span title="Average holding debt maturity period"><Info size={10} className="text-slate-600" /></span>
                </span>
                <span className="text-base font-black font-mono text-slate-400 block mt-1">
                  {volatilityStats.avgMaturity > 0 ? `${volatilityStats.avgMaturity.toFixed(2)} Yr` : '0.0'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="text-[10px] text-slate-500 border-t border-slate-850 pt-4 mt-6 leading-relaxed">
            Note: Volatility metrics are calculated weekly over a rolling 2-year period against the Nifty 50 Index.
          </div>
        </div>
      </div>

      {/* EDUCATIONAL METRIC EXPLANATIONS */}
      <div className="bg-slate-900/40 border border-slate-850/60 rounded-2xl overflow-hidden shadow-lg">
        <button
          onClick={() => setShowExplanation(!showExplanation)}
          className="w-full p-5 flex justify-between items-center text-left hover:bg-slate-900/60 transition cursor-pointer select-none"
        >
          <div className="flex items-center gap-2.5">
            <HelpCircle size={20} className="text-teal-400" />
            <h4 className="text-sm font-black text-slate-200 tracking-tight">Understanding Volatility and Factsheet Metrics</h4>
          </div>
          {showExplanation ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
        </button>
        {showExplanation && (
          <div className="p-6 border-t border-slate-850/60 bg-slate-950/20 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Alpha */}
              <div className="bg-slate-950/50 p-4 border border-slate-850/80 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-850/60 pb-2">
                  <span className="font-bold text-slate-200">Alpha (α)</span>
                  <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Outperformance</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-400 font-mono text-sm bg-slate-950/80 p-2.5 rounded-lg border border-slate-900/60 justify-center">
                  <span>α = Rₚ - [ R_f + β ( R_m - R_f ) ]</span>
                </div>
                <div className="text-slate-400 text-xs leading-relaxed space-y-1">
                  <p>Measures risk-adjusted outperformance (CAPM model). Represents the value added by the fund manager relative to the benchmark Nifty 50 after accounting for risk.</p>
                  <p className="text-[10px] text-slate-500 font-semibold mt-1">Where: Rₚ = Portfolio XIRR, R_f = Risk-free rate (6.0%), R_m = Benchmark return, β = Beta</p>
                </div>
              </div>

              {/* Sharpe Ratio */}
              <div className="bg-slate-950/50 p-4 border border-slate-850/80 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-850/60 pb-2">
                  <span className="font-bold text-slate-200">Sharpe Ratio</span>
                  <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Risk-Adjusted Return</span>
                </div>
                <div className="flex items-center gap-2 text-teal-400 font-mono text-sm bg-slate-950/80 p-2.5 rounded-lg border border-slate-900/60 justify-center">
                  <span>Sharpe =</span>
                  <div className="flex items-center gap-2">
                    <span>( Rₚ - R_f )</span>
                    <span className="text-slate-500">/</span>
                    <span>σₚ</span>
                  </div>
                </div>
                <div className="text-slate-400 text-xs leading-relaxed space-y-1">
                  <p>Shows risk-adjusted return. It measures how much excess return you get per unit of total volatility. A higher Sharpe ratio indicates better investment efficiency.</p>
                  <p className="text-[10px] text-slate-500 font-semibold mt-1">Where: Rₚ = Portfolio Return, R_f = Risk-free rate (6.0%), σₚ = Annualized Standard Deviation</p>
                </div>
              </div>

              {/* Beta */}
              <div className="bg-slate-950/50 p-4 border border-slate-850/80 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-850/60 pb-2">
                  <span className="font-bold text-slate-200">Beta (β)</span>
                  <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Market Sensitivity</span>
                </div>
                <div className="flex items-center gap-2 text-indigo-400 font-mono text-sm bg-slate-950/80 p-2.5 rounded-lg border border-slate-900/60 justify-center">
                  <span>β = Cov(Rₚ, R_m) / Var(R_m)</span>
                </div>
                <div className="text-slate-400 text-xs leading-relaxed space-y-1">
                  <p>Measures sensitivity to market movements. A Beta of 1.0 means the fund moves in line with Nifty 50. Beta of 0.95 means it fluctuates 5% less than the market.</p>
                  <p className="text-[10px] text-slate-500 font-semibold mt-1">Where: Rₚ = Weekly returns of fund, R_m = Weekly returns of benchmark</p>
                </div>
              </div>

              {/* Standard Deviation */}
              <div className="bg-slate-950/50 p-4 border border-slate-850/80 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-850/60 pb-2">
                  <span className="font-bold text-slate-200">Standard Deviation (σ)</span>
                  <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Total Risk</span>
                </div>
                <div className="flex items-center gap-2 text-slate-200 font-mono text-sm bg-slate-950/80 p-2.5 rounded-lg border border-slate-900/60 justify-center">
                  <span>σ = √[ Σ(R_i - R̄)² / (n - 1) ] × √52</span>
                </div>
                <div className="text-slate-400 text-xs leading-relaxed space-y-1">
                  <p>Measures overall price volatility. Represents how much the fund's returns deviate from its average returns. Higher values represent greater price fluctuations.</p>
                  <p className="text-[10px] text-slate-500 font-semibold mt-1">Where: R_i = Weekly return, R̄ = Average weekly return, n = 104 weeks</p>
                </div>
              </div>

              {/* Mean Return */}
              <div className="bg-slate-950/50 p-4 border border-slate-850/80 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-850/60 pb-2">
                  <span className="font-bold text-slate-200">Mean Return</span>
                  <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Average Return</span>
                </div>
                <div className="flex items-center gap-2 text-slate-200 font-mono text-sm bg-slate-950/80 p-2.5 rounded-lg border border-slate-900/60 justify-center">
                  <span>Mean Return = R̄ × 52</span>
                </div>
                <div className="text-slate-400 text-xs leading-relaxed space-y-1">
                  <p>The annualized average return of the mutual fund over the calculated rolling period, computed as average weekly returns multiplied by 52 weeks.</p>
                  <p className="text-[10px] text-slate-500 font-semibold mt-1">Where: R̄ = Average weekly return</p>
                </div>
              </div>

              {/* Debt Metrics */}
              <div className="bg-slate-950/50 p-4 border border-slate-850/80 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-850/60 pb-2">
                  <span className="font-bold text-slate-200">YTM / Duration / Maturity</span>
                  <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Debt Specifics</span>
                </div>
                <div className="flex items-center gap-2 text-slate-200 font-mono text-sm bg-slate-950/80 p-2.5 rounded-lg border border-slate-900/60 justify-center">
                  <span>Δ Price ≈ - Duration × Δy</span>
                </div>
                <div className="text-slate-400 text-xs leading-relaxed space-y-1">
                  <p>YTM is the yield if held to maturity. Modified Duration measures bond price sensitivity to interest rate shifts (a 1% yield rise drops price by Duration %).</p>
                  <p className="text-[10px] text-slate-500 font-semibold mt-1">Where: Δ Price = Price change %, Δy = Yield change %</p>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* COMMENTS & GENERAL METRIC TABLE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* SNAPSHOT FIELDS DETAIL */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl md:col-span-2 backdrop-blur-sm">
          <h3 className="text-base font-black text-slate-100 mb-4 flex items-center gap-2 border-b border-slate-850 pb-2">
            <Layers size={18} className="text-teal-400" />
            <span>Excel Sheet Data Fields</span>
          </h3>

          <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
            <div className="border-b border-slate-850/60 pb-2">
              <div className="text-slate-500 text-[10px] font-extrabold uppercase tracking-wider">Balance Units</div>
              <div className="font-mono text-slate-200 mt-0.5 font-bold">{holding.balanceUnits.toFixed(4)}</div>
            </div>
            <div className="border-b border-slate-850/60 pb-2">
              <div className="text-slate-500 text-[10px] font-extrabold uppercase tracking-wider">Holding Period</div>
              <div className="text-slate-200 mt-0.5 font-bold">{holding.holdingDays} Days</div>
            </div>
            <div className="border-b border-slate-850/60 pb-2">
              <div className="text-slate-500 text-[10px] font-extrabold uppercase tracking-wider">Purchase NAV</div>
              <div className="font-mono text-slate-200 mt-0.5 font-bold">₹{holding.purchaseNav.toFixed(4)}</div>
            </div>
            <div className="border-b border-slate-850/60 pb-2">
              <div className="text-slate-500 text-[10px] font-extrabold uppercase tracking-wider">Current NAV</div>
              <div className="font-mono text-slate-200 mt-0.5 font-bold">₹{holding.currentNav.toFixed(4)}</div>
            </div>
            <div className="border-b border-slate-850/60 pb-2">
              <div className="text-slate-500 text-[10px] font-extrabold uppercase tracking-wider">Dividend Paid</div>
              <div className="font-mono text-slate-200 mt-0.5 font-bold">₹{(holding.dividend ?? 0).toFixed(2)}</div>
            </div>
            <div className="border-b border-slate-850/60 pb-2">
              <div className="text-slate-500 text-[10px] font-extrabold uppercase tracking-wider">Report CAGR</div>
              <div className="text-slate-200 mt-0.5 font-black">{holding.cagr.toFixed(2)}%</div>
            </div>
            <div className="col-span-2">
              <div className="text-slate-500 text-[10px] font-extrabold uppercase tracking-wider">Comments</div>
              <div className="text-slate-300 mt-1 italic text-xs bg-slate-950/40 p-3.5 border border-slate-850 rounded-xl leading-relaxed">
                {holding.comments || 'No comments found in Excel file.'}
              </div>
            </div>
          </div>
        </div>

        {/* BENCHMARK STATUS CARD */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between hover:border-slate-850 transition duration-305 backdrop-blur-sm">
          <div>
            <h3 className="text-base font-black text-slate-100 mb-4 flex items-center gap-2 border-b border-slate-850 pb-2">
              <span>Benchmark Integration</span>
            </h3>

            <div className="space-y-4">
              <div className="flex justify-between items-start text-sm">
                <span className="text-slate-400 font-medium">Benchmark Scheme:</span>
                <span className="font-semibold text-slate-200 text-right text-xs">SBI Nifty 50 Index Fund</span>
              </div>
              <div className="flex justify-between items-start text-sm">
                <span className="text-slate-400 font-medium">Scheme Code API:</span>
                {holding.schemeCodeApi ? (
                  <span className="font-mono text-emerald-400 font-bold bg-emerald-950/20 px-2.5 py-0.5 border border-emerald-900/40 rounded text-xs">
                    {holding.schemeCodeApi}
                  </span>
                ) : (
                  <span className="font-mono text-amber-500 bg-amber-950/20 px-2.5 py-0.5 border border-amber-900/40 rounded text-xs flex items-center gap-1 font-bold">
                    <AlertTriangle size={12} />
                    <span>Unmapped</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mt-2 font-medium">
                When mapped, we download historical NAV details from `api.mfapi.in` dynamically. Transactions are mirrored into Nifty 50 to compute true portfolio outperformance.
              </p>
            </div>
          </div>

          {!holding.schemeCodeApi && (
            <div className="bg-amber-950/40 border border-amber-800/40 rounded-xl p-3 text-xs text-amber-300 mt-4 leading-relaxed font-semibold">
              Assign a Scheme Code in the mapping tab to unlock dynamic Alpha calculations.
            </div>
          )}
        </div>
      </div>

      {/* TRANSACTION HISTORY SECTION */}
      <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
        <div className="p-6 border-b border-slate-850 flex items-center justify-between">
          <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
            <Calendar className="text-teal-400" size={18} />
            <span>Reconstructed Transaction History ({transactions.length})</span>
          </h3>
          <span className="text-slate-400 text-xs font-semibold">Calculated from chronological snapshots</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider border-b border-slate-850">
                <th className="p-4">Transaction Date</th>
                <th className="p-4">Type</th>
                <th className="p-4">Units</th>
                <th className="p-4">NAV</th>
                <th className="p-4">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-slate-300 text-sm font-medium">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 font-semibold">
                    No transactions found for this fund holding.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-950/40 transition">
                    <td className="p-4">{formatDate(tx.date)}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-black tracking-wider ${tx.type === 'BUY' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/40' : 'bg-red-950/80 text-red-400 border border-red-800/40'}`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold">{tx.units.toFixed(4)}</td>
                    <td className="p-4 font-mono font-bold">₹{tx.nav.toFixed(4)}</td>
                    <td className="p-4 font-mono font-black text-slate-200">{formatCurrency(tx.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
