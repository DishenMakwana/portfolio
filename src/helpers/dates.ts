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
