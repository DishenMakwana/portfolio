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
