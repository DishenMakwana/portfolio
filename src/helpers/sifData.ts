import type {
  SifSchemeComparison,
  SifVsTraditionalPillar,
  SifAssetClass,
} from "@/types/sif";

export const SIF_SCHEMES_COMPARISON_DATA: SifSchemeComparison[] = [
  // ── 1. Equity SIFs ────────────────────────────────────────────────────────
  {
    id: 1,
    srNo: 1,
    assetClass: "Equity",
    schemeName: "Equity Long Short",
    traditionalScheme: "Flexicap",
    minimumRequirements: "80% in Equity across market cap",
    derivativesLimit: "25%",
    derivativesPct: 25,
    redemptionFrequency: "Daily",
    riskLevel: "High",
    targetReturn: "11-12%",
    returnMin: 11,
    returnMax: 12,
    taxation: {
      taxCategory: "Equity",
      stcg: "20%",
      ltcg: "12.50%",
      holdingPeriodLtcg: "> 12 Months",
      note: "Taxed as pure domestic equity fund (>= 65% equity mandate).",
    },
    description:
      "A dynamic multi-cap equity strategy that maintains 80%+ gross equity exposure while utilizing up to 25% short derivative positions to hedge market drawdowns and extract long-short alpha.",
    mechanism:
      "Goes long on high-conviction large/mid/small cap stocks while taking synthetic short/hedge positions on overvalued stocks or index futures to generate positive spread returns regardless of market cycle.",
    keyAdvantages: [
      "Downside cushion during sharp market corrections",
      "Lower beta compared to standard long-only Flexicap funds",
      "Equity tax efficiency with daily redemption liquidity",
    ],
    downsideProtectionMechanics:
      "Can short index futures or single-stock futures up to 25% of net assets when valuation multiples become euphoric.",
    idealInvestorProfile:
      "Core equity investors seeking market-like returns (11-12%) with 20-30% lower drawdowns during market corrections.",
  },
  {
    id: 2,
    srNo: 2,
    assetClass: "Equity",
    schemeName: "Equity (Ex-Top 100) Long - Short",
    traditionalScheme: "Mid & Small Cap",
    minimumRequirements: "65% in Mid & Small",
    derivativesLimit: "25%",
    derivativesPct: 25,
    redemptionFrequency: "Daily",
    riskLevel: "High",
    targetReturn: "12-14%",
    returnMin: 12,
    returnMax: 14,
    taxation: {
      taxCategory: "Equity",
      stcg: "20%",
      ltcg: "12.50%",
      holdingPeriodLtcg: "> 12 Months",
      note: "Qualifies for equity capital gains tax rates.",
    },
    description:
      "Focuses outside the NIFTY 100 large-caps, allocating at least 65% in high-growth mid and small-cap opportunities with active derivative risk management.",
    mechanism:
      "Exploits broader market inefficiencies in mid and small caps by pairing long positions in structural compounders with short hedges on high-beta or weak-governance names.",
    keyAdvantages: [
      "Mitigates the brutal drawdowns typical of Mid & Small cap indices",
      "Generates alpha through high stock dispersion outside the Top 100",
      "Superior risk-adjusted Sharpe ratio vs vanilla Mid/Small Cap MFs",
    ],
    downsideProtectionMechanics:
      "Utilizes derivatives to neutralize broad market beta, allowing fund manager to capture pure business outperformance.",
    idealInvestorProfile:
      "Growth seekers wanting mid/small-cap compounding (12-14%) without suffering prolonged 30%+ peak-to-trough crashes.",
  },
  {
    id: 3,
    srNo: 3,
    assetClass: "Equity",
    schemeName: "Sector Rotation Long Short",
    traditionalScheme: "Sector Funds",
    minimumRequirements: "80% in 4 sectors",
    derivativesLimit: "25%",
    derivativesPct: 25,
    redemptionFrequency: "Daily",
    riskLevel: "High",
    targetReturn: "12-14%",
    returnMin: 12,
    returnMax: 14,
    taxation: {
      taxCategory: "Equity",
      stcg: "20%",
      ltcg: "12.50%",
      holdingPeriodLtcg: "> 12 Months",
      note: "Equity fund taxation with daily settlement window.",
    },
    description:
      "Rotates aggressively between top-performing macroeconomic sectors (min 80% across 4 chosen sectors) while hedging lagging industries with derivatives.",
    mechanism:
      "Goes overweight/long on expanding sectors (e.g., Banking, Infra, Tech) while shorting/underweighting cyclical down-trend sectors to capture inter-sector divergence.",
    keyAdvantages: [
      "Eliminates single-sector concentration risk of traditional thematic funds",
      "Dynamic sector exposure adjusted to monetary and capex cycles",
      "Captures both winning sector rallies and short gains on declining sectors",
    ],
    downsideProtectionMechanics:
      "Protects against cyclical sector peaks by establishing short derivative legs as earnings momentum wanes.",
    idealInvestorProfile:
      "Thematic investors who want tactical sectoral alpha without getting trapped in long multi-year down-cycles.",
  },

  // ── 2. Debt SIFs ──────────────────────────────────────────────────────────
  {
    id: 4,
    srNo: 4,
    assetClass: "Debt",
    schemeName: "Debt Long Short",
    traditionalScheme: "Dynamic Bond Fund",
    minimumRequirements: "Across Duration",
    derivativesLimit: "25%",
    derivativesPct: 25,
    redemptionFrequency: "1s a week",
    redemptionNote: "Redemption processed weekly (Once a week)",
    riskLevel: "High",
    targetReturn: "8%",
    returnMin: 8,
    returnMax: 8,
    taxation: {
      taxCategory: "Debt",
      stcg: "Slab",
      ltcg: "Slab",
      holdingPeriodLtcg: "No Indexation",
      note: "Taxed as non-equity debt instrument as per slab rate.",
    },
    description:
      "An unconstrained fixed-income strategy investing across the yield curve duration, using interest rate futures and debt derivatives (up to 25%) to profit from rate shifts.",
    mechanism:
      "Takes long positions in sovereign and corporate bonds while shorting rate futures during rising yield regimes, neutralizing duration risk that crushes traditional bond funds.",
    keyAdvantages: [
      "Can generate positive returns even during RBI rate hike cycles",
      "Freedom to dynamically flex modified duration from 0 to 10+ years",
      "Higher yield target than traditional short-duration funds",
    ],
    downsideProtectionMechanics:
      "Shorts bond futures or utilizes interest rate swaps to insulate portfolio when benchmark yields surge.",
    idealInvestorProfile:
      "Fixed-income investors wanting predictable ~8% yields immune to interest rate volatility.",
  },
  {
    id: 5,
    srNo: 5,
    assetClass: "Debt",
    schemeName: "Sectorial Debt Long Short",
    traditionalScheme: "NA",
    minimumRequirements:
      "Minimum 2 sectors to invest in. 1 sector cant have more than 75% weight",
    derivativesLimit: "25%",
    derivativesPct: 25,
    redemptionFrequency: "1s a week",
    redemptionNote: "Redemption processed weekly (Once a week)",
    riskLevel: "High",
    targetReturn: "8-9%",
    returnMin: 8,
    returnMax: 9,
    taxation: {
      taxCategory: "Debt",
      stcg: "Slab",
      ltcg: "Slab",
      holdingPeriodLtcg: "No Indexation",
      note: "Subject to standard debt taxation at applicable slab rates.",
    },
    description:
      "Specialized credit and sectoral bond strategy targeting high-yield sectoral spreads with mandatory diversification across at least two distinct economic sectors.",
    mechanism:
      "Capitalizes on yield credit spreads across power, NBFCs, infrastructure, and manufacturing, shorting vulnerable credit segments with derivatives.",
    keyAdvantages: [
      "Rigid diversification rules prevent single-sector credit contamination",
      "Enhanced yield target (8-9%) backed by high-grade sectoral selection",
      "Derivative hedging mitigates systemic liquidity crunches",
    ],
    downsideProtectionMechanics:
      "Enforces a strict 75% single-sector cap and deploys derivatives to hedge sector-specific default risks.",
    idealInvestorProfile:
      "Sophisticated debt allocators seeking credit alpha (8-9%) with structural institutional risk controls.",
  },

  // ── 3. Hybrid SIFs ────────────────────────────────────────────────────────
  {
    id: 6,
    srNo: 6,
    assetClass: "Hybrid",
    schemeName: "Active Asset Allocator Long Short",
    traditionalScheme: "Multi Asset Fund",
    minimumRequirements: "Across Assets",
    derivativesLimit: "25%",
    derivativesPct: 25,
    redemptionFrequency: "Twice a week",
    redemptionNote: "Redemption processed twice weekly (Bi-weekly liquidity)",
    riskLevel: "High",
    targetReturn: "10-12%",
    returnMin: 10,
    returnMax: 12,
    taxation: {
      taxCategory: "Hybrid",
      stcg: "Slab",
      ltcg: "12.50%",
      holdingPeriodLtcg: "> 24 Months",
      note: "Specified mutual fund / hybrid fund taxation (LTCG 12.50% after 2 years).",
    },
    description:
      "Multi-asset vehicle investing dynamically across Equities, Fixed Income, Gold/Silver, and Commodities with long-short derivative overlays on each asset class.",
    mechanism:
      "Optimizes macroeconomic asset allocation models, going long on undervalued asset classes and shorting overextended assets to harvest smooth risk-adjusted returns.",
    keyAdvantages: [
      "True multi-asset diversification with long and short levers",
      "All-weather portfolio resilient against stagflation and recessions",
      "Target CAGR of 10-12% with bond-like volatility",
    ],
    downsideProtectionMechanics:
      "Rebalances across asset classes and utilizes 25% derivatives to hedge whichever asset is under macro stress.",
    idealInvestorProfile:
      "Conservative growth investors seeking an all-in-one wealth compounder with low drawdowns and multi-asset breadth.",
  },
  {
    id: 7,
    srNo: 7,
    assetClass: "Hybrid",
    schemeName: "Hybrid Long Short Fund",
    traditionalScheme: "Balanced Advantage",
    minimumRequirements: "25% in Equity & 25% in Debt",
    derivativesLimit: "25%",
    derivativesPct: 25,
    redemptionFrequency: "Twice a week",
    redemptionNote: "Redemption processed twice weekly (Bi-weekly liquidity)",
    riskLevel: "High",
    targetReturn: "8-10%",
    returnMin: 8,
    returnMax: 10,
    taxation: {
      taxCategory: "Equity",
      stcg: "20%",
      ltcg: "12.50%",
      holdingPeriodLtcg: "> 12 Months",
      note: "If gross equity exposure >= 65%: Equity taxation (STCG 20%, LTCG 12.5%).",
    },
    alternativeTaxation: {
      taxCategory: "Hybrid",
      stcg: "Slab",
      ltcg: "12.50%",
      holdingPeriodLtcg: "> 24 Months",
      note: "If equity between 35%-65%: Hybrid taxation (STCG Slab, LTCG 12.5% after 24m).",
    },
    description:
      "Enhanced dynamic asset allocation fund maintaining at least 25% equity and 25% debt, deploying long-short hedges to capture market upside while preserving capital.",
    mechanism:
      "Upgrades the traditional Balanced Advantage model (BAF) by using active 25% short derivative strategies to eliminate downside volatility while keeping equity tax qualification.",
    keyAdvantages: [
      "Superior drawdown containment compared to traditional BAF funds",
      "Flexible asset allocation mandate (25% Equity min, 25% Debt min)",
      "Tax efficiency flexibility with predictable 8-10% return band",
    ],
    downsideProtectionMechanics:
      "Active hedged equity positions keep net equity low during market tops without triggering taxable portfolio turnover.",
    idealInvestorProfile:
      "First-time equity investors or retirees needing steady 8-10% compounding with institutional downside protection.",
  },
];

export const SIF_VS_TRADITIONAL_PILLARS: SifVsTraditionalPillar[] = [
  {
    pillar: "Strategy Directionality",
    traditionalMf: "Long-Only (can only buy stocks/bonds and hope price rises)",
    sifStrategy:
      "Long-Short (buys winning assets and shorts overvalued/declining assets)",
    advantage: "Generates returns and hedges risk in falling/bear markets",
  },
  {
    pillar: "Derivatives Usage",
    traditionalMf: "Restricted primarily to simple cash-futures arbitrage",
    sifStrategy:
      "Active 25% derivative headroom for hedging, shorting, and tactical alpha",
    advantage: "Superior downside buffer and asymmetric risk-reward",
  },
  {
    pillar: "Market Drawdowns",
    traditionalMf:
      "Suffers full market fall (e.g. -30% to -40% in broad correction)",
    sifStrategy:
      "Short hedges cushion drops, typically preserving 50-70% of capital",
    advantage: "Smoother compounding with significantly lower volatility",
  },
  {
    pillar: "Redemption Liquidity",
    traditionalMf: "Daily redemption (T+1 or T+2 settlement)",
    sifStrategy:
      "Tiered liquidity (Daily for Equity, Weekly for Debt, Twice-weekly for Hybrid)",
    advantage:
      "Protects long-term investors from sudden retail panic redemption runs",
  },
  {
    pillar: "Tax Classification",
    traditionalMf: "Standard Equity (20%/12.5%) or Debt Slab",
    sifStrategy:
      "Fully aligned with standard MF taxation based on underlying gross allocation",
    advantage: "No separate punitive tax regime; same favorable MF brackets",
  },
  {
    pillar: "Target Audience",
    traditionalMf: "Retail & Systematic SIP investors",
    sifStrategy:
      "High Net Worth, sophisticated allocators, and risk-conscious investors",
    advantage:
      "Institutional-grade risk management accessible under MF structure",
  },
];

export function getSifAssetClassColor(assetClass: SifAssetClass): {
  bg: string;
  text: string;
  border: string;
  badge: string;
} {
  switch (assetClass) {
    case "Equity":
      return {
        bg: "bg-teal-500/10",
        text: "text-teal-400",
        border: "border-teal-500/30",
        badge: "bg-teal-500/15 text-teal-300 border-teal-500/30",
      };
    case "Debt":
      return {
        bg: "bg-blue-500/10",
        text: "text-blue-400",
        border: "border-blue-500/30",
        badge: "bg-blue-500/15 text-blue-300 border-blue-500/30",
      };
    case "Hybrid":
      return {
        bg: "bg-purple-500/10",
        text: "text-purple-400",
        border: "border-purple-500/30",
        badge: "bg-purple-500/15 text-purple-300 border-purple-500/30",
      };
  }
}
