"use client";

import { formatInr } from "@/helpers/formatters";
import { getAdjustedBullionPrice, CITIES } from "@/helpers/bullion";
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Label,
  ReferenceLine,
  ReferenceDot,
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
  Layers,
  Check,
  X,
} from "lucide-react";
import { refreshBullionDataAction } from "@/actions/portfolio";
import {
  BullionClientProps,
  BullionRates,
  ChartDataPoint,
  CustomChartTooltipProps,
  BULLION_METALS,
  BULLION_PRICE_TRENDS,
  BullionMetal,
  GOLD_PURITIES,
  SILVER_PURITIES,
  PLATINUM_PURITIES,
  GST_TYPES,
  GstType,
  TIMEFRAMES,
  Timeframe,
} from "@/types/bullion";

export default function BullionClient({
  initialRates,
  initialChartData,
}: BullionClientProps) {
  const [rates, setRates] = useState<BullionRates>(initialRates);
  const [chartDataState, setChartDataState] =
    useState<ChartDataPoint[]>(initialChartData);
  const [selectedTab, setSelectedTab] = useState<BullionMetal>(
    BULLION_METALS.GOLD
  );
  const [selectedCity, setSelectedCity] = useState(CITIES[0]);
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [timeframe, setTimeframe] = useState<Timeframe>(TIMEFRAMES.TF_1Y);
  const [showHighLow, setShowHighLow] = useState<boolean>(false);
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [tempStartDate, setTempStartDate] = useState<string>("");
  const [tempEndDate, setTempEndDate] = useState<string>("");
  const [isCustomDatePickerOpen, setIsCustomDatePickerOpen] =
    useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const selectedPriceTrend = BULLION_PRICE_TRENDS[selectedTab];

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
  const [purity, setPurity] = useState<string>(GOLD_PURITIES.K22);
  const [weight, setWeight] = useState<number>(10);
  const [makingCharges, setMakingCharges] = useState<number>(12);
  const [gstType, setGstType] = useState<GstType>(GST_TYPES.INCL);

  // Budget Calculator State
  const [budget, setBudget] = useState<number>(10000);
  const [calculatedWeight, setCalculatedWeight] = useState<number | null>(null);

  // Sync default purity when selected tab changes
  useEffect(() => {
    if (selectedTab === BULLION_METALS.GOLD) {
      setPurity(GOLD_PURITIES.K22);
    } else if (selectedTab === BULLION_METALS.SILVER) {
      setPurity(SILVER_PURITIES.P999);
    } else if (selectedTab === BULLION_METALS.PLATINUM) {
      setPurity(PLATINUM_PURITIES.PT950);
    }
  }, [selectedTab]);

  // Get active price per gram based on selected purity
  const getActivePricePerGram = (): number => {
    if (selectedTab === BULLION_METALS.GOLD) {
      if (purity === GOLD_PURITIES.K24)
        return getAdjustedBullionPrice(rates.gold["24K"], selectedCity.offset);
      if (purity === GOLD_PURITIES.K22)
        return getAdjustedBullionPrice(rates.gold["22K"], selectedCity.offset);
      if (purity === GOLD_PURITIES.K18)
        return getAdjustedBullionPrice(rates.gold["18K"], selectedCity.offset);
    } else if (selectedTab === BULLION_METALS.SILVER) {
      if (purity === SILVER_PURITIES.P999)
        return getAdjustedBullionPrice(
          rates.silver["999"],
          selectedCity.offset
        );
      if (purity === SILVER_PURITIES.P925)
        return getAdjustedBullionPrice(
          rates.silver["925"],
          selectedCity.offset
        );
      if (purity === SILVER_PURITIES.P800)
        return getAdjustedBullionPrice(
          rates.silver["800"],
          selectedCity.offset
        );
    } else {
      if (purity === PLATINUM_PURITIES.PT950)
        return getAdjustedBullionPrice(
          rates.platinum["PT950"],
          selectedCity.offset
        );
      if (purity === PLATINUM_PURITIES.PT900)
        return getAdjustedBullionPrice(
          rates.platinum["PT900"],
          selectedCity.offset
        );
      if (purity === PLATINUM_PURITIES.PT850)
        return getAdjustedBullionPrice(
          rates.platinum["PT850"],
          selectedCity.offset
        );
    }
    return 0;
  };

  const activePricePerGram = getActivePricePerGram();

  // Calculator Math
  const baseValue = activePricePerGram * weight;
  const makingChargesVal = baseValue * (makingCharges / 100);

  let gstValue = 0;
  let totalAmount = 0;

  if (gstType === GST_TYPES.INCL) {
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
      gstType === GST_TYPES.EXCL ? rawTotalPerGram * 1.03 : rawTotalPerGram;

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

  // Prepare chart data for active tab based on selected timeframe & custom date range
  const chartData = useMemo(() => {
    let rawData = chartDataState;

    if (timeframe === TIMEFRAMES.TF_7D) {
      rawData = chartDataState.slice(-7);
    } else if (timeframe === TIMEFRAMES.TF_30D) {
      rawData = chartDataState.slice(-30);
    } else if (timeframe === TIMEFRAMES.TF_3M) {
      rawData = chartDataState.slice(-90);
    } else if (timeframe === TIMEFRAMES.TF_6M) {
      rawData = chartDataState.slice(-180);
    } else if (timeframe === TIMEFRAMES.TF_1Y) {
      rawData = chartDataState.slice(-365);
    } else if (
      timeframe === TIMEFRAMES.TF_CUSTOM &&
      customStartDate &&
      customEndDate
    ) {
      const startTs = new Date(customStartDate + "T00:00:00").getTime();
      const endTs = new Date(customEndDate + "T23:59:59").getTime();
      rawData = chartDataState.filter((d) => {
        const ts = d.timestamp || Date.parse(d.date) || 0;
        return ts >= startTs && ts <= endTs;
      });
    }

    return rawData.map((d) => ({
      date: d.date,
      timestamp: d.timestamp || Date.parse(d.date) || 0,
      Price: d[selectedPriceTrend.priceKey],
    }));
  }, [
    chartDataState,
    timeframe,
    customStartDate,
    customEndDate,
    selectedPriceTrend.priceKey,
  ]);

  // Compute Period High and Period Low for active chart data
  const periodHighLow = useMemo(() => {
    if (!chartData || chartData.length === 0) return null;

    let highPt = chartData[0];
    let lowPt = chartData[0];

    for (const pt of chartData) {
      if (pt.Price > highPt.Price) highPt = pt;
      if (pt.Price < lowPt.Price) lowPt = pt;
    }

    const startPrice = chartData[0].Price;
    const highReturnPct =
      startPrice > 0 ? ((highPt.Price - startPrice) / startPrice) * 100 : 0;
    const lowReturnPct =
      startPrice > 0 ? ((lowPt.Price - startPrice) / startPrice) * 100 : 0;
    const priceDiff = Math.abs(highPt.Price - lowPt.Price);
    const rangePct =
      lowPt.Price > 0 ? ((highPt.Price - lowPt.Price) / lowPt.Price) * 100 : 0;

    const highTs = highPt.timestamp || Date.parse(highPt.date) || 0;
    const lowTs = lowPt.timestamp || Date.parse(lowPt.date) || 0;
    const daysApart = Math.round(
      Math.abs(highTs - lowTs) / (24 * 60 * 60 * 1000)
    );

    return {
      highPt,
      lowPt,
      highReturnPct,
      lowReturnPct,
      priceDiff,
      rangePct,
      daysApart,
    };
  }, [chartData]);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    const res = await refreshBullionDataAction();
    setIsRefreshing(false);
    if (res.success && res.data) {
      setRates(res.data.rates);
      setChartDataState(res.data.chartData);
      if (res.data.isStale) {
        showToast("Live prices unavailable; showing saved prices");
      } else if (res.data.isThrottled) {
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
        {(
          [
            BULLION_METALS.GOLD,
            BULLION_METALS.SILVER,
            BULLION_METALS.PLATINUM,
          ] as const
        ).map((tab) => {
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
        {selectedTab === BULLION_METALS.GOLD && (
          <>
            {renderPriceCard(
              "24K Gold /g",
              getAdjustedBullionPrice(rates.gold["24K"], selectedCity.offset),
              rates.gold.change
            )}
            {renderPriceCard(
              "22K Gold /g",
              getAdjustedBullionPrice(rates.gold["22K"], selectedCity.offset),
              rates.gold.change * (22 / 24)
            )}
            {renderPriceCard(
              "18K Gold /g",
              getAdjustedBullionPrice(rates.gold["18K"], selectedCity.offset),
              rates.gold.change * (18 / 24)
            )}
          </>
        )}

        {selectedTab === BULLION_METALS.SILVER && (
          <>
            {renderPriceCard(
              "999 Fine Silver /g",
              getAdjustedBullionPrice(rates.silver["999"], selectedCity.offset),
              rates.silver.change
            )}
            {renderPriceCard(
              "925 Sterling Silver /g",
              getAdjustedBullionPrice(rates.silver["925"], selectedCity.offset),
              rates.silver.change * 0.925
            )}
            {renderPriceCard(
              "800 Alloy Silver /g",
              getAdjustedBullionPrice(rates.silver["800"], selectedCity.offset),
              rates.silver.change * 0.8
            )}
          </>
        )}

        {selectedTab === BULLION_METALS.PLATINUM && (
          <>
            {renderPriceCard(
              "PT950 Platinum /g",
              getAdjustedBullionPrice(
                rates.platinum["PT950"],
                selectedCity.offset
              ),
              rates.platinum.change
            )}
            {renderPriceCard(
              "PT900 Platinum /g",
              getAdjustedBullionPrice(
                rates.platinum["PT900"],
                selectedCity.offset
              ),
              rates.platinum.change * 0.9474
            )}
            {renderPriceCard(
              "PT850 Platinum /g",
              getAdjustedBullionPrice(
                rates.platinum["PT850"],
                selectedCity.offset
              ),
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
                  onChange={(e) => setGstType(e.target.value as GstType)}
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
                  {formatInr(baseValue)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Making charges</span>
                <span className="font-semibold text-slate-200">
                  {formatInr(makingChargesVal)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">GST (3%)</span>
                <span className="font-semibold text-slate-200">
                  {formatInr(gstValue)}
                </span>
              </div>
            </div>

            <div className="p-6 bg-teal-950/15 border-t md:border-t-0 md:border-l border-slate-800/80 flex flex-col justify-center items-center text-center">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Total Amount
              </div>
              <div className="text-3xl font-black text-teal-400 tracking-tight">
                {formatInr(totalAmount)}
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
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-xl relative">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-teal-400" />
            <h2 className="text-base font-bold text-slate-200">
              Price Trend ({selectedPriceTrend.label})
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-start sm:justify-end">
            {/* Timeframe Pill Buttons */}
            <div className="flex bg-slate-950/60 p-0.5 border border-slate-800 rounded-lg text-xs font-bold">
              {(
                [
                  TIMEFRAMES.TF_7D,
                  TIMEFRAMES.TF_30D,
                  TIMEFRAMES.TF_3M,
                  TIMEFRAMES.TF_6M,
                  TIMEFRAMES.TF_1Y,
                ] as const
              ).map((tf) => (
                <button
                  key={tf}
                  onClick={() => {
                    setTimeframe(tf);
                    setIsCustomDatePickerOpen(false);
                  }}
                  className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
                    timeframe === tf
                      ? "bg-teal-500/20 text-teal-400 font-extrabold shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            {/* Custom Date Picker Dropdown Button */}
            <div className="relative">
              <button
                onClick={() =>
                  setIsCustomDatePickerOpen(!isCustomDatePickerOpen)
                }
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                  timeframe === TIMEFRAMES.TF_CUSTOM
                    ? "bg-teal-500/20 text-teal-300 border-teal-500/40 shadow-sm"
                    : "bg-slate-950/80 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:bg-slate-900/60"
                }`}
              >
                <Calendar size={13} className="text-teal-400" />
                <span>
                  {timeframe === TIMEFRAMES.TF_CUSTOM &&
                  customStartDate &&
                  customEndDate
                    ? `${customStartDate} to ${customEndDate}`
                    : "Custom Date"}
                </span>
              </button>

              {/* Custom Date Picker Popover */}
              {isCustomDatePickerOpen && (
                <div className="absolute right-0 top-11 z-30 w-80 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-slate-200">
                      Custom Date Range
                    </span>
                    <button
                      onClick={() => setIsCustomDatePickerOpen(false)}
                      className="text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={tempStartDate}
                        onChange={(e) => setTempStartDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={tempEndDate}
                        onChange={(e) => setTempEndDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <button
                      onClick={() => {
                        setCustomStartDate("");
                        setCustomEndDate("");
                        setTempStartDate("");
                        setTempEndDate("");
                        setTimeframe(TIMEFRAMES.TF_1Y);
                        setIsCustomDatePickerOpen(false);
                      }}
                      className="text-xs font-semibold text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      Reset
                    </button>
                    <button
                      onClick={() => {
                        if (tempStartDate && tempEndDate) {
                          setCustomStartDate(tempStartDate);
                          setCustomEndDate(tempEndDate);
                          setTimeframe(TIMEFRAMES.TF_CUSTOM);
                          setIsCustomDatePickerOpen(false);
                        }
                      }}
                      disabled={!tempStartDate || !tempEndDate}
                      className="flex items-center gap-1 px-3 py-1.5 bg-teal-500 hover:bg-teal-600 disabled:opacity-40 text-slate-950 font-bold rounded-lg text-xs transition cursor-pointer"
                    >
                      <Check size={13} />
                      <span>Apply Range</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* High / Low Toggle Button */}
            <button
              onClick={() => setShowHighLow(!showHighLow)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition duration-200 cursor-pointer border flex items-center gap-1.5 shadow-sm ${
                showHighLow
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-amber-950/40"
                  : "bg-slate-950/80 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:bg-slate-900/60"
              }`}
              title="Toggle High and Low points on graph"
            >
              <Layers size={13} />
              <span>High / Low</span>
            </button>
          </div>
        </div>

        {/* Chart Viewport */}
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 15, right: 15, left: 10, bottom: 30 }}
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
                height={45}
                tick={{ dy: 2 }}
              >
                <Label
                  value="Date"
                  position="insideBottom"
                  offset={0}
                  fill="#94a3b8"
                  fontSize={11}
                  fontWeight={700}
                />
              </XAxis>
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                domain={["auto", "auto"]}
                tickFormatter={(value) => `₹${value}`}
                width={65}
              >
                <Label
                  value="Price (₹)"
                  angle={-90}
                  position="insideLeft"
                  style={{
                    textAnchor: "middle",
                    fill: "#94a3b8",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                />
              </YAxis>
              <Tooltip content={<CustomChartTooltip />} />
              <Area
                type="monotone"
                dataKey="Price"
                name={selectedPriceTrend.label}
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorPrice)"
              />

              {/* Period High / Low Reference Lines & Dots */}
              {showHighLow && periodHighLow && (
                <>
                  {/* High Line & Dot */}
                  <ReferenceLine
                    x={periodHighLow.highPt.date}
                    stroke="#10b981"
                    strokeDasharray="3 3"
                    strokeWidth={1.5}
                    opacity={0.6}
                  />
                  <ReferenceLine
                    y={periodHighLow.highPt.Price}
                    stroke="#10b981"
                    strokeDasharray="3 3"
                    strokeWidth={1.5}
                    opacity={0.6}
                  />
                  <ReferenceDot
                    x={periodHighLow.highPt.date}
                    y={periodHighLow.highPt.Price}
                    r={7}
                    fill="#10b981"
                    stroke="#022c22"
                    strokeWidth={2.5}
                    label={
                      <HighLabelBadge
                        value={`High: ${formatInr(periodHighLow.highPt.Price)}`}
                      />
                    }
                  />

                  {/* Low Line & Dot */}
                  <ReferenceLine
                    x={periodHighLow.lowPt.date}
                    stroke="#f43f5e"
                    strokeDasharray="3 3"
                    strokeWidth={1.5}
                    opacity={0.6}
                  />
                  <ReferenceLine
                    y={periodHighLow.lowPt.Price}
                    stroke="#f43f5e"
                    strokeDasharray="3 3"
                    strokeWidth={1.5}
                    opacity={0.6}
                  />
                  {periodHighLow.lowPt.date !== periodHighLow.highPt.date && (
                    <ReferenceDot
                      x={periodHighLow.lowPt.date}
                      y={periodHighLow.lowPt.Price}
                      r={7}
                      fill="#f43f5e"
                      stroke="#4c0519"
                      strokeWidth={2.5}
                      label={
                        <LowLabelBadge
                          value={`Low: ${formatInr(periodHighLow.lowPt.Price)}`}
                        />
                      }
                    />
                  )}
                </>
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* High / Low Stat Pill Summary Bar */}
        {showHighLow && periodHighLow && (
          <div className="mt-5 p-3.5 bg-slate-950/80 border border-slate-800/80 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-inner">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-slate-400 font-semibold">Period High:</span>
              <strong className="text-emerald-400 font-bold">
                {formatInr(periodHighLow.highPt.Price)}
              </strong>
              <span className="text-slate-500">
                ({periodHighLow.highPt.date},{" "}
                {periodHighLow.highReturnPct >= 0 ? "+" : ""}
                {periodHighLow.highReturnPct.toFixed(1)}%)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
              <span className="text-slate-400 font-semibold">Period Low:</span>
              <strong className="text-rose-400 font-bold">
                {formatInr(periodHighLow.lowPt.Price)}
              </strong>
              <span className="text-slate-500">
                ({periodHighLow.lowPt.date},{" "}
                {periodHighLow.lowReturnPct >= 0 ? "+" : ""}
                {periodHighLow.lowReturnPct.toFixed(1)}%)
              </span>
            </div>

            <div className="flex items-center gap-2 text-slate-300 font-medium border-t sm:border-t-0 sm:border-l border-slate-800 pt-2 sm:pt-0 sm:pl-3">
              <span>Range:</span>
              <strong className="text-amber-400 font-bold">
                {periodHighLow.rangePct.toFixed(1)}% (
                {formatInr(periodHighLow.priceDiff)})
              </strong>

              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-[11px] text-slate-300 ml-1">
                <Calendar size={12} className="text-amber-400" />
                <span>
                  {periodHighLow.daysApart}{" "}
                  {periodHighLow.daysApart === 1 ? "day" : "days"} apart
                </span>
              </div>
            </div>
          </div>
        )}
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
          <div className="text-xl font-black text-slate-100 tracking-tight">
            {formatInr(value)}
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
    return selectedTab === BULLION_METALS.GOLD ? 0 : 1;
  }

  // Get active purity list
  function getPurityOptions(): string[] {
    if (selectedTab === BULLION_METALS.GOLD)
      return [GOLD_PURITIES.K24, GOLD_PURITIES.K22, GOLD_PURITIES.K18];
    if (selectedTab === BULLION_METALS.SILVER)
      return [SILVER_PURITIES.P999, SILVER_PURITIES.P925, SILVER_PURITIES.P800];
    return [
      PLATINUM_PURITIES.PT950,
      PLATINUM_PURITIES.PT900,
      PLATINUM_PURITIES.PT850,
    ];
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
              {formatInr(payload[0].value)}
            </span>
          </div>
        </div>
      );
    }
    return null;
  }
}

const HighLabelBadge = (props: {
  viewBox?: { x?: number; y?: number };
  value?: string;
}) => {
  const { viewBox, value } = props;
  if (!viewBox || viewBox.x === undefined || viewBox.y === undefined)
    return null;
  const { x, y } = viewBox;

  const isNearRightEdge = x > 500;
  const rectX = isNearRightEdge ? -120 : -60;
  const textX = isNearRightEdge ? -60 : 0;

  return (
    <g transform={`translate(${x}, ${y - 14})`}>
      <rect
        x={rectX}
        y={-18}
        width={120}
        height={22}
        rx={6}
        fill="#047857"
        stroke="#34d399"
        strokeWidth={1.5}
        style={{ filter: "drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.5))" }}
      />
      <text
        x={textX}
        y={-6}
        fill="#ecfdf5"
        fontSize={11}
        fontWeight="800"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {value}
      </text>
    </g>
  );
};

const LowLabelBadge = (props: {
  viewBox?: { x?: number; y?: number };
  value?: string;
}) => {
  const { viewBox, value } = props;
  if (!viewBox || viewBox.x === undefined || viewBox.y === undefined)
    return null;
  const { x, y } = viewBox;

  const isNearRightEdge = x > 500;
  const rectX = isNearRightEdge ? -110 : -55;
  const textX = isNearRightEdge ? -55 : 0;

  return (
    <g transform={`translate(${x}, ${y + 14})`}>
      <rect
        x={rectX}
        y={-4}
        width={110}
        height={22}
        rx={6}
        fill="#be123c"
        stroke="#f43f5e"
        strokeWidth={1.5}
        style={{ filter: "drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.5))" }}
      />
      <text
        x={textX}
        y={8}
        fill="#fff1f2"
        fontSize={11}
        fontWeight="800"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {value}
      </text>
    </g>
  );
};
