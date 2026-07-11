"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  Calendar,
  Calculator,
  Coins,
  HelpCircle,
  Info,
  ChevronDown,
  RefreshCw,
} from "lucide-react";
import { BullionRates, ChartDataPoint, CITIES } from "@/lib/bullionService";
import { refreshBullionDataAction } from "@/app/actions";

interface BullionClientProps {
  initialRates: BullionRates;
  initialChartData: ChartDataPoint[];
}

export default function BullionClient({
  initialRates,
  initialChartData,
}: BullionClientProps) {
  const [rates, setRates] = useState<BullionRates>(initialRates);
  const [chartDataState, setChartDataState] =
    useState<ChartDataPoint[]>(initialChartData);
  const [selectedTab, setSelectedTab] = useState<
    "Gold" | "Silver" | "Platinum"
  >("Gold");
  const [selectedCity, setSelectedCity] = useState(CITIES[0]);
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [timeframe, setTimeframe] = useState<"7D" | "30D" | "1Y">("1Y");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string): void => {
    setToastMessage(msg);
    const customWindow = window as unknown as {
      __toastTimer?: ReturnType<typeof setTimeout>;
    };
    const timerId = customWindow.__toastTimer;
    if (timerId) clearTimeout(timerId);
    customWindow.__toastTimer = setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Calculator State
  const [purity, setPurity] = useState<string>("22K");
  const [weight, setWeight] = useState<number>(10);
  const [makingCharges, setMakingCharges] = useState<number>(12);
  const [gstType, setGstType] = useState<"Incl" | "Excl">("Incl");

  // Budget Calculator State
  const [budget, setBudget] = useState<number>(10000);
  const [calculatedWeight, setCalculatedWeight] = useState<number | null>(null);

  // Sync default purity when selected tab changes
  useEffect(() => {
    if (selectedTab === "Gold") {
      setPurity("22K");
    } else if (selectedTab === "Silver") {
      setPurity("999");
    } else if (selectedTab === "Platinum") {
      setPurity("PT950");
    }
  }, [selectedTab]);

  // Adjust base price by city offset
  const getAdjustedPrice = (basePrice: number): number => {
    return Math.round(basePrice * (1 + selectedCity.offset));
  };

  // Indian Rupee custom formatter
  const formatINR = (val: number, decimals = 0) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: decimals,
    }).format(val);
  };

  // Get active price per gram based on selected purity
  const getActivePricePerGram = (): number => {
    if (selectedTab === "Gold") {
      if (purity === "24K") return getAdjustedPrice(rates.gold["24K"]);
      if (purity === "22K") return getAdjustedPrice(rates.gold["22K"]);
      if (purity === "18K") return getAdjustedPrice(rates.gold["18K"]);
    } else if (selectedTab === "Silver") {
      if (purity === "999") return getAdjustedPrice(rates.silver["999"]);
      if (purity === "925") return getAdjustedPrice(rates.silver["925"]);
      if (purity === "800") return getAdjustedPrice(rates.silver["800"]);
    } else {
      if (purity === "PT950") return getAdjustedPrice(rates.platinum["PT950"]);
      if (purity === "PT900") return getAdjustedPrice(rates.platinum["PT900"]);
      if (purity === "PT850") return getAdjustedPrice(rates.platinum["PT850"]);
    }
    return 0;
  };

  const activePricePerGram = getActivePricePerGram();

  // Calculator Math
  const baseValue = activePricePerGram * weight;
  const makingChargesVal = baseValue * (makingCharges / 100);

  let gstValue = 0;
  let totalAmount = 0;

  if (gstType === "Incl") {
    // If GST is included, it means the base+making already includes the 3% GST
    // Total = Base + Making. GST = Total - (Total / 1.03)
    const rawTotal = baseValue + makingChargesVal;
    gstValue = Math.round(rawTotal - rawTotal / 1.03);
    totalAmount = rawTotal;
  } else {
    // Excl: GST is added on top of base + making
    const rawTotal = baseValue + makingChargesVal;
    gstValue = Math.round(rawTotal * 0.03);
    totalAmount = rawTotal + gstValue;
  }

  // Reverse budget weight calculator
  const handleCalculateBudget = () => {
    // Find price of 1 gram including making & GST
    const basePerGram = activePricePerGram;
    const makingPerGram = basePerGram * (makingCharges / 100);
    const rawTotalPerGram = basePerGram + makingPerGram;
    const totalPerGram =
      gstType === "Excl" ? rawTotalPerGram * 1.03 : rawTotalPerGram;

    if (totalPerGram > 0) {
      const calculatedGrams = budget / totalPerGram;
      setCalculatedWeight(calculatedGrams);
    }
  };

  // Recalculate weight when inputs change
  useEffect(() => {
    if (calculatedWeight !== null) {
      handleCalculateBudget();
    }
  }, [budget, activePricePerGram, makingCharges, gstType]);

  // Prepare chart data for active tab based on selected timeframe
  const getChartData = () => {
    let rawData = chartDataState;
    if (timeframe === "7D") {
      rawData = chartDataState.slice(-7);
    } else if (timeframe === "30D") {
      rawData = chartDataState.slice(-30);
    }

    return rawData.map((d) => ({
      date: d.date,
      Price: getAdjustedPrice(
        selectedTab === "Gold"
          ? d.Gold
          : selectedTab === "Silver"
            ? d.Silver
            : d.Platinum
      ),
    }));
  };

  const chartData = getChartData();

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    const res = await refreshBullionDataAction();
    setIsRefreshing(false);
    if (res.success && res.data) {
      setRates(res.data.rates);
      setChartDataState(res.data.chartData);
      if (res.data.isThrottled) {
        showToast("Prices are already up to date (refreshed recently)");
      } else {
        showToast("Prices refreshed successfully!");
      }
    } else if (res.error) {
      showToast(`Refresh failed: ${res.error}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Controls Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/30 border border-slate-800/40 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
            <Coins size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">
              Live Precious Metals Tracker
            </h1>
            <p className="text-xs text-slate-400">
              Track and calculate current retail bullion prices in India
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            aria-label="Refresh live prices"
            title="Refresh live prices"
            className="flex items-center gap-2 px-4 py-2 bg-slate-900/60 border border-slate-800 rounded-xl text-sm font-semibold text-slate-300 hover:border-slate-700 hover:text-white hover:bg-slate-800 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw
              size={16}
              className={`text-teal-400 ${isRefreshing ? "animate-spin" : ""}`}
            />
            <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </button>

          {/* Date Stamp */}
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/60 border border-slate-800 rounded-xl text-sm font-semibold text-slate-300">
            <Calendar size={16} className="text-teal-400" />
            <span>{rates.asOfDate}</span>
          </div>

          {/* City Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen)}
              className="flex items-center justify-between gap-2 min-w-32 px-4 py-2 bg-slate-900/60 border border-slate-800 rounded-xl text-sm font-semibold text-slate-200 hover:border-slate-700 hover:text-white transition"
            >
              <span>{selectedCity.name}</span>
              <ChevronDown
                size={14}
                className={`text-slate-400 transition-transform ${isCityDropdownOpen ? "rotate-180" : ""}`}
              />
            </button>
            {isCityDropdownOpen && (
              <div className="absolute right-0 mt-2 z-20 w-40 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1 overflow-hidden">
                {CITIES.map((city) => (
                  <button
                    key={city.id}
                    onClick={() => {
                      setSelectedCity(city);
                      setIsCityDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-xs font-semibold hover:bg-slate-800/80 transition ${
                      selectedCity.id === city.id
                        ? "text-teal-400 bg-teal-500/5"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {city.name}{" "}
                    {city.offset !== 0
                      ? `(${city.offset > 0 ? "+" : ""}${(city.offset * 100).toFixed(2)}%)`
                      : ""}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex bg-slate-900/40 p-1 border border-slate-800/80 rounded-2xl max-w-sm">
        {(["Gold", "Silver", "Platinum"] as const).map((tab) => {
          const isActive = selectedTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all cursor-pointer ${
                isActive
                  ? "bg-teal-500 text-slate-950 font-extrabold shadow-lg shadow-teal-500/10"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Price Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {selectedTab === "Gold" && (
          <>
            {renderPriceCard(
              "24K Gold /g",
              getAdjustedPrice(rates.gold["24K"]),
              rates.gold.change
            )}
            {renderPriceCard(
              "22K Gold /g",
              getAdjustedPrice(rates.gold["22K"]),
              rates.gold.change * (22 / 24)
            )}
            {renderPriceCard(
              "18K Gold /g",
              getAdjustedPrice(rates.gold["18K"]),
              rates.gold.change * (18 / 24)
            )}
          </>
        )}

        {selectedTab === "Silver" && (
          <>
            {renderPriceCard(
              "999 Fine Silver /g",
              getAdjustedPrice(rates.silver["999"]),
              rates.silver.change
            )}
            {renderPriceCard(
              "925 Sterling Silver /g",
              getAdjustedPrice(rates.silver["925"]),
              rates.silver.change * 0.925
            )}
            {renderPriceCard(
              "800 Alloy Silver /g",
              getAdjustedPrice(rates.silver["800"]),
              rates.silver.change * 0.8
            )}
          </>
        )}

        {selectedTab === "Platinum" && (
          <>
            {renderPriceCard(
              "PT950 Platinum /g",
              getAdjustedPrice(rates.platinum["PT950"]),
              rates.platinum.change
            )}
            {renderPriceCard(
              "PT900 Platinum /g",
              getAdjustedPrice(rates.platinum["PT900"]),
              rates.platinum.change * 0.9474
            )}
            {renderPriceCard(
              "PT850 Platinum /g",
              getAdjustedPrice(rates.platinum["PT850"]),
              rates.platinum.change * 0.8947
            )}
          </>
        )}
      </div>

      {/* Main Calculation & History Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Calculator */}
        <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Calculator size={18} className="text-teal-400" />
              <h2 className="text-base font-bold text-slate-200">
                Precious Metals Calculator
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Purity Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Purity
                </label>
                <div className="flex bg-slate-900/60 p-1 border border-slate-800 rounded-xl">
                  {getPurityOptions().map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setPurity(opt)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                        purity === opt
                          ? "bg-teal-500/20 text-teal-400 border border-teal-500/20 font-extrabold shadow-sm"
                          : "text-slate-400 hover:text-slate-200 border border-transparent"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Weight (gm) */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Weight (gm)
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={weight}
                  onChange={(e) =>
                    setWeight(Math.max(0, parseFloat(e.target.value) || 0))
                  }
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2 text-sm font-semibold text-slate-200 focus:outline-none focus:border-teal-500 transition"
                />
              </div>

              {/* Making Charges (%) */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Making (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={makingCharges}
                  onChange={(e) =>
                    setMakingCharges(
                      Math.max(0, parseFloat(e.target.value) || 0)
                    )
                  }
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2 text-sm font-semibold text-slate-200 focus:outline-none focus:border-teal-500 transition"
                />
              </div>
            </div>

            {/* GST Option selector (Incl or Excl) */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                GST
              </label>
              <div className="relative w-40">
                <select
                  value={gstType}
                  onChange={(e) =>
                    setGstType(e.target.value as "Incl" | "Excl")
                  }
                  className="appearance-none w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2 text-sm font-semibold text-slate-200 focus:outline-none focus:border-teal-500 cursor-pointer"
                >
                  <option value="Incl">Incl. 3%</option>
                  <option value="Excl">Excl. 3%</option>
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-3 top-3 text-slate-400 pointer-events-none"
                />
              </div>
            </div>
          </div>

          {/* Calculator Output Display */}
          <div className="grid grid-cols-1 md:grid-cols-2 border border-slate-800/80 rounded-xl overflow-hidden mt-4">
            <div className="p-4 bg-slate-950/20 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Base value</span>
                <span className="font-semibold text-slate-200">
                  {formatINR(baseValue)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Making charges</span>
                <span className="font-semibold text-slate-200">
                  {formatINR(makingChargesVal)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">GST (3%)</span>
                <span className="font-semibold text-slate-200">
                  {formatINR(gstValue)}
                </span>
              </div>
            </div>

            <div className="p-6 bg-teal-950/15 border-t md:border-t-0 md:border-l border-slate-800/80 flex flex-col justify-center items-center text-center">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Total Amount
              </div>
              <div className="text-3xl font-black text-teal-400 tracking-tight">
                {formatINR(totalAmount)}
              </div>
              <div className="text-[10px] text-slate-500 font-semibold mt-1">
                Incl. all charges
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Column: Reverse Calculator */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <HelpCircle size={18} className="text-teal-400" />
              <h2 className="text-base font-bold text-slate-200">
                Know your money's worth!
              </h2>
            </div>

            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Enter any budget amount to find out the approximate physical metal
              weight you can obtain under current rates and charges.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Budget (INR)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-2 text-slate-400 text-sm font-semibold">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="1"
                    value={budget}
                    onChange={(e) =>
                      setBudget(Math.max(0, parseInt(e.target.value) || 0))
                    }
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-xl pl-8 pr-4 py-2 text-sm font-semibold text-slate-200 focus:outline-none focus:border-teal-500 transition"
                  />
                </div>
              </div>

              <button
                onClick={handleCalculateBudget}
                className="w-full py-2 bg-teal-500 hover:bg-teal-600 active:scale-[0.98] text-slate-950 font-bold rounded-xl transition shadow-lg shadow-teal-500/10 cursor-pointer"
              >
                Try now
              </button>
            </div>
          </div>

          {calculatedWeight !== null && (
            <div className="bg-slate-950/30 border border-slate-800/80 rounded-xl p-4 text-center mt-6">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Purchasable weight
              </div>
              <div className="text-2xl font-black text-slate-200 tracking-tight">
                {calculatedWeight.toFixed(3)} gm
              </div>
              <div className="text-[10px] text-slate-400 font-semibold mt-1">
                of {purity} {selectedTab}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Historical Trend Chart */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-teal-400" />
            <h2 className="text-base font-bold text-slate-200">
              Price Trend ({selectedTab})
            </h2>
          </div>
          <div className="flex bg-slate-950/60 p-0.5 border border-slate-800 rounded-lg text-xs font-bold w-full sm:w-auto">
            {(["7D", "30D", "1Y"] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-md transition cursor-pointer ${
                  timeframe === tf
                    ? "bg-teal-500/20 text-teal-400 font-extrabold shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1e293b"
                opacity={0.3}
              />
              <XAxis
                dataKey="date"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                domain={["auto", "auto"]}
                tickFormatter={(value) => `₹${value}`}
              />
              <Tooltip content={<CustomChartTooltip />} />
              <Area
                type="monotone"
                dataKey="Price"
                name={`${selectedTab} Price`}
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorPrice)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-slate-800 text-slate-200 text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2"
          >
            <Info size={14} className="text-teal-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  // Helper component to render individual purity price cards
  function renderPriceCard(title: string, value: number, change: number) {
    const isUp = change >= 0;
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between shadow-lg"
      >
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          {title}
        </div>
        <div className="flex justify-between items-baseline gap-4 mt-2">
          <div className="text-2xl font-black text-slate-100 tracking-tight">
            {formatINR(value)}
          </div>
          <div
            className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-lg border ${
              isUp
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                : "border-red-500/20 bg-red-500/10 text-red-400"
            }`}
          >
            <span>
              {isUp ? "+" : ""}
              {change.toFixed(decimalsForChange())}
            </span>
            <span>{isUp ? "▲" : "▼"}</span>
          </div>
        </div>
      </motion.div>
    );
  }

  function decimalsForChange(): number {
    return selectedTab === "Gold" ? 0 : 1;
  }

  // Get active purity list
  function getPurityOptions(): string[] {
    if (selectedTab === "Gold") return ["24K", "22K", "18K"];
    if (selectedTab === "Silver") return ["999", "925", "800"];
    return ["PT950", "PT900", "PT850"];
  }

  interface CustomChartTooltipProps {
    active?: boolean;
    payload?: Array<{
      name: string;
      value: number;
    }>;
    label?: string;
  }

  // Custom Chart Tooltip
  function CustomChartTooltip({
    active,
    payload,
    label,
  }: CustomChartTooltipProps): React.JSX.Element | null {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-2xl">
          <p className="text-xs text-slate-400 mb-1 font-semibold">{label}</p>
          <div className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full bg-teal-400" />
            <span className="text-slate-300">{payload[0].name}:</span>
            <span className="font-bold text-slate-100">
              {formatINR(payload[0].value)}
            </span>
          </div>
        </div>
      );
    }
    return null;
  }
}
