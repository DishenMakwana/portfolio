/**
 * Centralized formatting utilities for the portfolio app.
 * Import from here instead of defining local helpers in component files.
 */
import { parseHistoryDate } from "./dates";

// ─── Currency Formatters ──────────────────────────────────────────────────────

/**
 * Formats a number as an Indian Rupee currency string using Intl.NumberFormat.
 * Example: 1234567 → "₹12,34,567"
 */
export function formatCurrency(val: number, decimals = 2): string {
  const safeVal = Math.abs(val || 0) < 0.005 ? 0 : val;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(safeVal);
}

/**
 * Formats a number in Indian locale with at least 2 decimal places.
 * Returns "—" when value is zero.
 * Example: 1234567.89 → "12,34,567.89" | 0 → "—"
 */
export function formatIndianNumber(val: number, decimals = 2): string {
  return val === 0
    ? "—"
    : val.toLocaleString("en-IN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
}

/**
 * Formats a number as a compact Indian Rupee amount with Cr / L suffix.
 * Handles negative values and optional explicit plus sign prefix.
 * Example: 10000000 → "₹1.00 Cr" | -1995682.01 → "-₹19.96 L" | (4362456.55, true) → "+₹43.62 L"
 */
export function formatInrCompact(val: number, showSign = false): string {
  const abs = Math.abs(val);
  const sign = val < 0 ? "-" : showSign && val > 0 ? "+" : "";
  if (abs >= 1_00_00_000)
    return `${sign}₹${(abs / 1_00_00_000).toFixed(2)}\u00A0Cr`;
  if (abs >= 1_00_000) return `${sign}₹${(abs / 1_00_000).toFixed(2)}\u00A0L`;
  return `${sign}${formatCurrency(abs, 2)}`;
}

// ─── Percent Formatters ───────────────────────────────────────────────────────

/**
 * Formats a signed percentage with sign prefix.
 * Example: 5.23 → "+5.23%" | -2.1 → "-2.10%"
 */
export function formatPercent(val: number): string {
  return `${val >= 0 ? "+" : ""}${val.toFixed(2)}%`;
}

/**
 * Formats a nullable percent value — returns "N/A" when null.
 * Example: null → "N/A" | 5.23 → "+5.23%"
 */
export function formatNullablePercent(val: number | null): string {
  return val === null ? "N/A" : `${val >= 0 ? "+" : ""}${val.toFixed(2)}%`;
}

/**
 * Formats a percentage value to 2 decimal places (no sign prefix).
 * Example: 5.234 → "5.23%"
 */
export function formatPct(val: number): string {
  return `${val.toFixed(2)}%`;
}

// ─── Misc Formatters ─────────────────────────────────────────────────────────

/**
 * Formats a signed percentage-point delta.
 * Example: 1.5 → "+1.50 pp" | -0.3 → "-0.30 pp"
 */
export function formatPointDelta(delta: number): string {
  return `${delta >= 0 ? "+" : ""}${delta.toFixed(2)} pp`;
}

// ─── Date & Time Formatters ──────────────────────────────────────────────────

/**
 * Formats a number as an Indian Rupee currency string with exactly 2 decimal places.
 * Example: 1234.56 → "₹1,234.56"
 */
export function formatCurrencyWithDecimals(val: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

/**
 * Parses a YYYY-MM-DD date string local to the timezone.
 */
export function parseLocalDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00`);
}

/**
 * Formats a local YYYY-MM-DD date string to a human-readable format.
 * Example: "2026-07-13" → "13 Jul 2026"
 */
export function formatLocalDateStr(dateStr: string): string {
  return parseLocalDate(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Formats a standard date string or Date object to a human-readable format.
 * Example: "2026-07-13" or "13-07-2026" → "13 Jul 2026"
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? parseHistoryDate(date) : date;
  if (!d || isNaN(d.getTime())) {
    return typeof date === "string" ? date : "N/A";
  }
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatNullableDate(date: string | null): string {
  return date ? formatDate(date) : "N/A";
}

/**
 * Formats an uploaded timestamp to a human-readable string.
 * Example: "2026-07-13T10:20:00Z" → "13 Jul, 10:20 AM"
 */
export function formatUploadedAt(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}
/**
 * Formats a number as an Indian Rupee currency string with customizable decimal places.
 */
export function formatInr(val: number, decimals = 2): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val);
}

/**
 * Formats a holding days count into compact Xyr Ym Zd or Ym Zd or Zd format.
 */
export function formatHoldingYearsAndDays(days: number): string {
  const roundedDays = Math.round(days);
  const yrs = Math.floor(roundedDays / 365);
  const remainingDays = roundedDays % 365;
  const months = Math.floor(remainingDays / 30);
  const finalDays = remainingDays % 30;

  if (yrs === 0) {
    if (months === 0) {
      return `${finalDays}d`;
    }
    if (finalDays === 0) {
      return `${months}m`;
    }
    return `${months}m ${finalDays}d`;
  }

  const parts: string[] = [`${yrs}yr`];
  if (months > 0) {
    parts.push(`${months}m`);
  }
  if (finalDays > 0) {
    parts.push(`${finalDays}d`);
  }
  return parts.join(" ");
}

/**
 * Formats a metric delta/difference value with a fallback label and color.
 * Displays "vs last" suffix for non-null differences.
 */
export function formatMetricDiff(
  diff: number | null | undefined,
  fallbackLabel: string,
  fallbackColor: string
): { sub: string; subColor: string } {
  const hasDiff = diff !== null && diff !== undefined;
  if (!hasDiff) {
    return {
      sub: fallbackLabel,
      subColor: fallbackColor,
    };
  }

  const rounded = Math.round(diff);
  if (rounded === 0 && rounded < 0.5) {
    return {
      sub: "No change",
      subColor: "text-slate-400",
    };
  }

  const isDiffPositive = diff >= 0;
  const sub =
    diff > 0
      ? `+${formatCurrency(diff)} vs last`
      : `${formatCurrency(diff)} vs last`;

  const subColor = isDiffPositive ? "text-emerald-400" : "text-red-400";

  return { sub, subColor };
}

// ─── Member Display Name ──────────────────────────────────────────────────────

/**
 * Overrides for raw DB member names to friendlier short display names.
 * Add entries here whenever a member's first-word split produces the wrong label.
 */
const MEMBER_DISPLAY_NAMES: Record<string, string> = {
  "MAKWANA SHAILESH R HUF": "SHAILESH HUF",
  "ALPESHKUMAR RAMJIBHAI MAKWANA (HUF)": "ALPESH HUF",
};

/**
 * Returns a short display name for a member.
 * Falls back to the first word of the raw name if no override exists.
 */
export function getMemberShortName(fullName: string): string {
  return MEMBER_DISPLAY_NAMES[fullName] ?? fullName.split(" ")[0];
}
