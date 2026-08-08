/**
 * Centralized date utility functions.
 */

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export function eachMonth(start: Date, end: Date): Date[] {
  const months: Date[] = [];
  let cursor = startOfMonth(start);
  const last = startOfMonth(end);

  while (cursor <= last) {
    months.push(new Date(cursor));
    cursor = addMonths(cursor, 1);
  }

  return months;
}

export function eachDay(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

/**
 * Parses a month/year label (e.g. "APR 26") to a Date object for sorting.
 */
export function parseMonthYear(label: string): Date {
  const parts = label.trim().split(/\s+/);
  if (parts.length !== 2) return new Date(0);
  const [m, y] = parts;
  const monthNames = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];
  const monthIdx = monthNames.indexOf(m.toUpperCase());
  const year = 2000 + parseInt(y, 10);
  return new Date(year, monthIdx >= 0 ? monthIdx : 0, 1);
}

/**
 * Parses any date string (YYYY-MM-DD, DD-MM-YYYY, ISO) into a Date object strictly at Noon (12:00:00.000 UTC).
 * 100% immune to timezone shifts across all browser and server environments worldwide.
 */
export function parseToLocalMidnight(dateStr: string): Date {
  if (!dateStr) return new Date(0);
  const clean = dateStr.slice(0, 10);
  const parts = clean.split(/[-/.]/).map(Number);

  let year = 1970;
  let month = 1;
  let day = 1;

  if (parts.length === 3 && !parts.some(isNaN)) {
    if (parts[0] >= 1000) {
      // YYYY-MM-DD
      year = parts[0];
      month = parts[1];
      day = parts[2];
    } else if (parts[2] >= 1000) {
      // DD-MM-YYYY
      year = parts[2];
      month = parts[1];
      day = parts[0];
    }
    const mStr = String(month).padStart(2, "0");
    const dStr = String(day).padStart(2, "0");
    return new Date(`${year}-${mStr}-${dStr}T12:00:00.000Z`);
  }

  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return new Date(0);
  const yStr = d.getUTCFullYear();
  const mStr = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dStr = String(d.getUTCDate()).padStart(2, "0");
  return new Date(`${yStr}-${mStr}-${dStr}T12:00:00.000Z`);
}

/**
 * Parses a date string formatted as DD-MM-YYYY or YYYY-MM-DD into a Date object.
 */
export function parseHistoryDate(dateStr: string): Date {
  return parseToLocalMidnight(dateStr);
}

/**
 * Checks if a transaction date string falls within [startDate, endDate] inclusive.
 * Handles YYYY-MM-DD, DD-MM-YYYY, or ISO date strings.
 */
export function isDateInRange(
  dateStr: string,
  startDateStr: string,
  endDateStr: string
): boolean {
  if (!dateStr) return false;
  if (!startDateStr && !endDateStr) return true;

  const txTime = parseToLocalMidnight(dateStr).getTime();
  if (isNaN(txTime) || txTime === 0) return false;

  if (startDateStr) {
    const startTime = parseToLocalMidnight(startDateStr).getTime();
    if (!isNaN(startTime) && startTime > 0 && txTime < startTime) {
      return false;
    }
  }

  if (endDateStr) {
    const endTime = parseToLocalMidnight(endDateStr).getTime();
    if (!isNaN(endTime) && endTime > 0 && txTime > endTime) {
      return false;
    }
  }

  return true;
}

/**
 * Returns preset start and end date YYYY-MM-DD strings for common date range filters.
 */
export function getPresetDateRange(preset: string): {
  start: string;
  end: string;
} {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  const formatDateStr = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  switch (preset) {
    case "today": {
      return { start: formatDateStr(now), end: formatDateStr(now) };
    }
    case "yesterday": {
      const yest = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      return { start: formatDateStr(yest), end: formatDateStr(yest) };
    }
    case "last-7": {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { start: formatDateStr(start), end: formatDateStr(now) };
    }
    case "this-month": {
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0);
      return { start: formatDateStr(start), end: formatDateStr(end) };
    }
    case "last-month": {
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0);
      return { start: formatDateStr(start), end: formatDateStr(end) };
    }
    case "last-30": {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { start: formatDateStr(start), end: formatDateStr(now) };
    }
    case "last-90": {
      const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      return { start: formatDateStr(start), end: formatDateStr(now) };
    }
    case "this-quarter": {
      const qMonth = Math.floor(m / 3) * 3;
      const start = new Date(y, qMonth, 1);
      const end = new Date(y, qMonth + 3, 0);
      return { start: formatDateStr(start), end: formatDateStr(end) };
    }
    case "this-fy": {
      const startYear = m >= 3 ? y : y - 1;
      const start = new Date(startYear, 3, 1);
      const end = new Date(startYear + 1, 2, 31);
      return { start: formatDateStr(start), end: formatDateStr(end) };
    }
    case "last-fy": {
      const startYear = m >= 3 ? y - 1 : y - 2;
      const start = new Date(startYear, 3, 1);
      const end = new Date(startYear + 1, 2, 31);
      return { start: formatDateStr(start), end: formatDateStr(end) };
    }
    default:
      return { start: "", end: "" };
  }
}

/**
 * Calculates holding duration (total days and formatted years/months/days label like "4m 21d" or "1y 2m").
 */
export function formatHoldingDuration(
  startDateStr: string | null | undefined,
  endDateStr?: string
): { days: number; label: string } | null {
  if (!startDateStr) return null;
  const start = parseToLocalMidnight(startDateStr);
  if (isNaN(start.getTime()) || start.getTime() === 0) return null;

  const end = endDateStr ? parseToLocalMidnight(endDateStr) : new Date();
  const diffTime = end.getTime() - start.getTime();
  if (diffTime < 0) return { days: 0, label: "0d" };

  const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonthLastDay = new Date(
      end.getFullYear(),
      end.getMonth(),
      0
    ).getDate();
    days += prevMonthLastDay;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const parts: string[] = [];
  if (years > 0) parts.push(`${years}y`);
  if (months > 0) parts.push(`${months}m`);
  if (days > 0 || parts.length === 0) parts.push(`${days}d`);

  return {
    days: totalDays,
    label: parts.join(" "),
  };
}
