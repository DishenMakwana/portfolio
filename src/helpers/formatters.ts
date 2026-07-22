/**
 * Centralized formatting utilities for the portfolio app.
 * Import from here instead of defining local helpers in component files.
 */

// ─── Currency Formatters ──────────────────────────────────────────────────────

/**
 * Formats a number as an Indian Rupee currency string using Intl.NumberFormat.
 * Example: 1234567 → "₹12,34,567"
 */
export function formatCurrency(val: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);
}

/**
 * Formats a number in Indian locale with no decimal places.
 * Returns "—" when value is zero.
 * Example: 1234567 → "12,34,567" | 0 → "—"
 */
export function formatIndianNumber(val: number): string {
  return val === 0
    ? "—"
    : val.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

/**
 * Formats a number as a compact Indian Rupee amount with Cr / L suffix.
 * Example: 10000000 → "₹1.00 Cr" | 100000 → "₹1.00 L"
 */
export function formatInrCompact(val: number): string {
  if (val >= 1_00_00_000) return `₹${(val / 1_00_00_000).toFixed(2)}\u00A0Cr`;
  if (val >= 1_00_000) return `₹${(val / 1_00_000).toFixed(2)}\u00A0L`;
  return `₹${val.toLocaleString("en-IN")}`;
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
 * Example: "2026-07-13" → "13 Jul 2026"
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
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
export function formatInr(val: number, decimals = 0): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
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
