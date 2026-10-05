"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { refreshBullionDataAction } from "@/actions/portfolio";
import { toast } from "react-hot-toast";
import {
  getAdjustedBullionPrice,
  calculateBullionAthData,
  CITIES,
} from "@/helpers/bullion";
import BullionHeaderToolbar from "@/components/bullion/BullionHeaderToolbar";
import BullionMetalTabs from "@/components/bullion/BullionMetalTabs";
import BullionAthCorrectionCards from "@/components/bullion/BullionAthCorrectionCards";
import BullionPriceCards from "@/components/bullion/BullionPriceCards";
import BullionCalculator from "@/components/bullion/BullionCalculator";
import BullionBudgetEstimator from "@/components/bullion/BullionBudgetEstimator";
import BullionTrendChart from "@/components/bullion/BullionTrendChart";
import {
  BullionClientProps,
  BullionRates,
  ChartDataPoint,
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
  BullionCity,
} from "@/types/bullion";

export default function BullionClient({
  initialRates,
  initialChartData,
}: BullionClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [rates, setRates] = useState<BullionRates>(initialRates);
  const [chartDataState, setChartDataState] =
    useState<ChartDataPoint[]>(initialChartData);
  const [selectedTab, setSelectedTab] = useState<BullionMetal>(() => {
    const rawMetal = searchParams.get("metal");
    return rawMetal &&
      [
        BULLION_METALS.GOLD,
        BULLION_METALS.SILVER,
        BULLION_METALS.PLATINUM,
      ].includes(rawMetal as BullionMetal)
      ? (rawMetal as BullionMetal)
      : BULLION_METALS.GOLD;
  });
  const [selectedCity, setSelectedCity] = useState<BullionCity>(() => {
    const rawCityName = searchParams.get("city");
    return (
      CITIES.find((c) => c.name.toLowerCase() === rawCityName?.toLowerCase()) ||
      CITIES[0]
    );
  });
  const [timeframe, setTimeframe] = useState<Timeframe>(() => {
    const rawTf = searchParams.get("tf");
    return rawTf && Object.values(TIMEFRAMES).includes(rawTf as Timeframe)
      ? (rawTf as Timeframe)
      : TIMEFRAMES.TF_1Y;
  });
  const [showHighLow, setShowHighLow] = useState<boolean>(false);
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const selectedPriceTrend = BULLION_PRICE_TRENDS[selectedTab];

  const updateUrl = (updates: Record<string, string | null>) => {
    const searchString =
      typeof window !== "undefined"
        ? window.location.search
        : searchParams.toString();
    const current = new URLSearchParams(searchString);
    for (const [key, value] of Object.entries(updates)) {
      if (
        value === null ||
        value === "" ||
        (key === "metal" && value === BULLION_METALS.GOLD) ||
        (key === "city" && value === CITIES[0].name) ||
        (key === "tf" && value === TIMEFRAMES.TF_1Y)
      ) {
        current.delete(key);
      } else {
        current.set(key, value);
      }
    }
    const query = current.toString();
    const url = `${pathname}${query ? `?${query}` : ""}`;
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", url);
    }
    router.replace(url, { scroll: false });
  };

  useEffect(() => {
    const rawMetal = searchParams.get("metal");
    if (
      rawMetal &&
      [
        BULLION_METALS.GOLD,
        BULLION_METALS.SILVER,
        BULLION_METALS.PLATINUM,
      ].includes(rawMetal as BullionMetal)
    ) {
      setSelectedTab(rawMetal as BullionMetal);
    }
    const rawCityName = searchParams.get("city");
    if (rawCityName) {
      const match = CITIES.find(
        (c) => c.name.toLowerCase() === rawCityName.toLowerCase()
      );
      if (match) setSelectedCity(match);
    }
    const rawTf = searchParams.get("tf");
    if (rawTf && Object.values(TIMEFRAMES).includes(rawTf as Timeframe)) {
      setTimeframe(rawTf as Timeframe);
    }
  }, [searchParams]);

  // Calculator State
  const [purity, setPurity] = useState<string>(GOLD_PURITIES.K24);
  const [weight, setWeight] = useState<number>(10);
  const [makingCharges, setMakingCharges] = useState<number>(0);
  const [gstType, setGstType] = useState<GstType>(GST_TYPES.INCL);

  // Budget Calculator State
  const [budget, setBudget] = useState<number>(10000);
  const [calculatedWeight, setCalculatedWeight] = useState<number | null>(null);

  // All-Time High & Drawdown Data
  const athData = useMemo(
    () => calculateBullionAthData(rates, chartDataState, selectedCity.offset),
    [rates, chartDataState, selectedCity.offset]
  );

  const handleSelectMetalFromAth = (metal: BullionMetal, p: string) => {
    setSelectedTab(metal);
    setPurity(p);
  };

  // Sync default purity when selected tab changes
  useEffect(() => {
    if (selectedTab === BULLION_METALS.GOLD) {
      setPurity(GOLD_PURITIES.K24);
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
    const rawTotal = baseValue + makingChargesVal;
    gstValue = Math.round(rawTotal - rawTotal / 1.03);
    totalAmount = rawTotal;
  } else {
    const rawTotal = baseValue + makingChargesVal;
    gstValue = Math.round(rawTotal * 0.03);
    totalAmount = rawTotal + gstValue;
  }

  // Reverse budget weight calculator
  const handleCalculateBudget = () => {
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
        toast("Live prices unavailable; showing saved prices", { icon: "ℹ️" });
      } else if (res.data.isThrottled) {
        toast("Prices are already up to date (refreshed recently)", {
          icon: "ℹ️",
        });
      } else {
        toast.success("Prices refreshed successfully!");
      }
    } else if (res.error) {
      toast.error(`Refresh failed: ${res.error}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Controls Bar */}
      <BullionHeaderToolbar
        asOfDate={rates.asOfDate}
        selectedCity={selectedCity}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        onSelectCity={(city) => {
          setSelectedCity(city);
          updateUrl({ city: city.name });
        }}
      />

      {/* Tabs Selector */}
      <BullionMetalTabs
        selectedTab={selectedTab}
        onSelectTab={(tab) => {
          setSelectedTab(tab);
          updateUrl({ metal: tab });
        }}
      />

      {/* All-Time High & Correction Tracker */}
      <BullionAthCorrectionCards
        athData={athData}
        onSelectMetal={handleSelectMetalFromAth}
      />

      {/* Price Cards Grid */}
      <BullionPriceCards
        selectedTab={selectedTab}
        rates={rates}
        selectedCity={selectedCity}
      />

      {/* Main Calculation & History Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <BullionCalculator
          selectedTab={selectedTab}
          purity={purity}
          weight={weight}
          makingCharges={makingCharges}
          gstType={gstType}
          baseValue={baseValue}
          makingChargesVal={makingChargesVal}
          gstValue={gstValue}
          totalAmount={totalAmount}
          onPurityChange={setPurity}
          onWeightChange={setWeight}
          onMakingChargesChange={setMakingCharges}
          onGstTypeChange={setGstType}
        />

        <BullionBudgetEstimator
          selectedTab={selectedTab}
          purity={purity}
          budget={budget}
          calculatedWeight={calculatedWeight}
          onBudgetChange={setBudget}
          onCalculate={handleCalculateBudget}
        />
      </div>

      {/* Historical Trend Chart */}
      <BullionTrendChart
        selectedTab={selectedTab}
        timeframe={timeframe}
        showHighLow={showHighLow}
        chartData={chartData}
        selectedPriceTrend={selectedPriceTrend}
        periodHighLow={periodHighLow}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        onTimeframeChange={(tf) => {
          setTimeframe(tf);
          updateUrl({ tf });
        }}
        onToggleHighLow={() => setShowHighLow(!showHighLow)}
        onApplyCustomDateRange={(start, end) => {
          setCustomStartDate(start);
          setCustomEndDate(end);
          setTimeframe(TIMEFRAMES.TF_CUSTOM);
        }}
        onResetCustomDateRange={() => {
          setCustomStartDate("");
          setCustomEndDate("");
          setTimeframe(TIMEFRAMES.TF_1Y);
        }}
      />
    </div>
  );
}
