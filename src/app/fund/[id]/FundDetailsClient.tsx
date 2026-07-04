"use client";

import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, AlertTriangle, TrendingUp, Info } from 'lucide-react';

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
}

export default function FundDetailsClient({ holding, transactions, metrics }: FundDetailsClientProps) {
  const router = useRouter();

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

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* Back Button and Title Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-6 mb-8 gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="bg-slate-900 border border-slate-850 hover:bg-slate-850 text-slate-300 p-2.5 rounded-lg transition duration-200 cursor-pointer flex items-center justify-center"
            title="Go Back"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black text-slate-100">{holding.schemeName || 'Unknown Scheme'}</h1>
              <span className="bg-slate-800 text-slate-300 text-xs font-bold px-2 py-0.5 rounded uppercase">
                {holding.category || 'N/A'}
              </span>
            </div>
            <p className="text-slate-400 mt-1 text-sm">
              Holder: <strong className="text-slate-300">{holding.memberName || 'Unknown Holder'}</strong> • Folio: <span className="font-mono text-slate-300">{holding.folioNo}</span>
            </p>
          </div>
        </div>
        <div className="text-sm text-slate-400 bg-slate-900/60 border border-slate-850 px-4 py-2 rounded-lg shrink-0">
          As of Snapshot Date: <strong className="text-slate-200">{formatDate(holding.asOfDate)}</strong>
        </div>
      </header>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {/* Card 1: Valuation */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-xl p-4 shadow-lg flex flex-col justify-between">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Current value</span>
          <div className="mt-2">
            <div className="text-lg font-black text-slate-100">{formatCurrency(holding.currentValue)}</div>
            <div className="text-[10px] text-slate-500 mt-1">Valuation price</div>
          </div>
        </div>

        {/* Card 2: Invested Cost */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-xl p-4 shadow-lg flex flex-col justify-between">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Invested Cost</span>
          <div className="mt-2">
            <div className="text-lg font-black text-slate-100">{formatCurrency(holding.purchaseValue)}</div>
            <div className="text-[10px] text-slate-500 mt-1">Principal amount</div>
          </div>
        </div>

        {/* Card 3: Returns */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-xl p-4 shadow-lg flex flex-col justify-between">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Net returns</span>
          <div className="mt-2">
            <div className={`text-lg font-black ${holding.gain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatCurrency(holding.gain)}
            </div>
            <div className={`text-[10px] font-bold mt-1 ${holding.gain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {holding.absoluteReturn.toFixed(2)}% Abs
            </div>
          </div>
        </div>

        {/* Card 4: Scheme XIRR */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-xl p-4 shadow-lg flex flex-col justify-between">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-1">
            Scheme XIRR
            <span title="Calculated from reconstructed transactions"><Info size={12} className="text-slate-500 cursor-pointer" /></span>
          </span>
          <div className="mt-2">
            <div className="text-lg font-black text-teal-400">{formatPercent(metrics.portfolioXirr)}</div>
            <div className="text-[10px] text-slate-500 mt-1">Annualized IRR</div>
          </div>
        </div>

        {/* Card 5: Benchmark XIRR */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-xl p-4 shadow-lg flex flex-col justify-between">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-1">
            Nifty 50 XIRR
            <span title="Benchmark return on same cash flow dates"><Info size={12} className="text-slate-500 cursor-pointer" /></span>
          </span>
          <div className="mt-2">
            <div className="text-lg font-black text-indigo-400">{formatPercent(metrics.benchmarkXirr)}</div>
            <div className="text-[10px] text-slate-500 mt-1">Simulated Index</div>
          </div>
        </div>

        {/* Card 6: Alpha */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-xl p-4 shadow-lg flex flex-col justify-between">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-1">
            Alpha
            <span title="Outperformance over index"><Info size={12} className="text-slate-500 cursor-pointer" /></span>
          </span>
          <div className="mt-2">
            <div className={`text-lg font-black ${metrics.alpha >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {metrics.alpha.toFixed(2)}%
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              {metrics.alpha >= 0 ? 'Outperforming' : 'Underperforming'}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* SNAPSHOT FIELDS DETAIL */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-xl p-6 shadow-lg md:col-span-2">
          <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-teal-400" />
            <span>Excel Sheet Data Fields</span>
          </h3>

          <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
            <div className="border-b border-slate-850 pb-2">
              <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Balance Units</div>
              <div className="font-mono text-slate-200 mt-0.5">{holding.balanceUnits.toFixed(4)}</div>
            </div>
            <div className="border-b border-slate-850 pb-2">
              <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Holding Period</div>
              <div className="text-slate-200 mt-0.5 font-semibold">{holding.holdingDays} Days</div>
            </div>
            <div className="border-b border-slate-850 pb-2">
              <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Purchase NAV</div>
              <div className="font-mono text-slate-200 mt-0.5">₹{holding.purchaseNav.toFixed(4)}</div>
            </div>
            <div className="border-b border-slate-850 pb-2">
              <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Current NAV</div>
              <div className="font-mono text-slate-200 mt-0.5">₹{holding.currentNav.toFixed(4)}</div>
            </div>
            <div className="border-b border-slate-850 pb-2">
              <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Dividend Paid</div>
              <div className="font-mono text-slate-200 mt-0.5">₹{(holding.dividend ?? 0).toFixed(2)}</div>
            </div>
            <div className="border-b border-slate-850 pb-2">
              <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Report CAGR</div>
              <div className="text-slate-200 mt-0.5 font-semibold">{holding.cagr.toFixed(2)}%</div>
            </div>
            <div className="col-span-2">
              <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Comments</div>
              <div className="text-slate-300 mt-1 italic text-xs bg-slate-950/40 p-3 border border-slate-850 rounded-lg">
                {holding.comments || 'No comments found in Excel file.'}
              </div>
            </div>
          </div>
        </div>

        {/* BENCHMARK STATUS CARD */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-xl p-6 shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
              <span>Benchmark Integration</span>
            </h3>

            <div className="space-y-4">
              <div className="flex justify-between items-start text-sm">
                <span className="text-slate-400">Benchmark Scheme:</span>
                <span className="font-semibold text-slate-200 text-right">SBI Nifty 50 Index Fund</span>
              </div>
              <div className="flex justify-between items-start text-sm">
                <span className="text-slate-400">Scheme Code API:</span>
                {holding.schemeCodeApi ? (
                  <span className="font-mono text-emerald-400 font-bold bg-emerald-950/20 px-2 py-0.5 border border-emerald-900/40 rounded text-xs">
                    {holding.schemeCodeApi}
                  </span>
                ) : (
                  <span className="font-mono text-amber-500 bg-amber-950/20 px-2 py-0.5 border border-amber-900/40 rounded text-xs flex items-center gap-1 font-bold">
                    <AlertTriangle size={12} />
                    <span>Unmapped</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mt-2">
                When mapped, we download historical NAV details from `api.mfapi.in` dynamically. Transactions are mirrored into Nifty 50 to compute true portfolio outperformance.
              </p>
            </div>
          </div>

          {!holding.schemeCodeApi && (
            <div className="bg-amber-950/40 border border-amber-800/40 rounded-lg p-3 text-xs text-amber-300 mt-4">
              Assign a Scheme Code in the mapping tab to unlock dynamic Alpha calculations.
            </div>
          )}
        </div>
      </div>

      {/* TRANSACTION HISTORY SECTION */}
      <section className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-xl overflow-hidden shadow-lg">
        <div className="p-6 border-b border-slate-850 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Calendar className="text-teal-400" size={18} />
            <span>Reconstructed Transaction History ({transactions.length})</span>
          </h3>
          <span className="text-slate-400 text-xs">Calculated from chronological snapshots</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-850">
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
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No transactions found for this fund holding.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-950/40 transition">
                    <td className="p-4">{formatDate(tx.date)}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${tx.type === 'BUY' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/40' : 'bg-red-950/80 text-red-400 border border-red-800/40'}`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="p-4 font-mono">{tx.units.toFixed(4)}</td>
                    <td className="p-4 font-mono">₹{tx.nav.toFixed(4)}</td>
                    <td className="p-4 font-mono font-bold text-slate-200">{formatCurrency(tx.amount)}</td>
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
