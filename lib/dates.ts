export const pad2 = (n: number) => String(n).padStart(2, "0");

export function toISODate(y: number, m: number, d: number): string {
  return `${y}-${pad2(m + 1)}-${pad2(d)}`;
}

export function dateToISO(date: Date): string {
  return toISODate(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isoAddDays(iso: string, delta: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d + delta);
  return dateToISO(date);
}

export function daysBetweenISO(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const da = new Date(ay, am - 1, ad);
  const db = new Date(by, bm - 1, bd);
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export const DOW_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
export const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
export const WEEK_COLORS = [
  "--week-1",
  "--week-2",
  "--week-3",
  "--week-4",
  "--week-5",
  "--week-6",
];

export interface DayParts {
  weekday: string;
  rest: string;
}

export function formatDayParts(iso: string): DayParts {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return {
    weekday: date.toLocaleDateString(undefined, { weekday: "long" }),
    rest: `${MONTH_LABELS[date.getMonth()]} ${d}, ${y}`,
  };
}
