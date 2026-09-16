import {
  DOW_LABELS,
  daysBetweenISO,
  daysInMonth,
  dateToISO,
  mondayIndex,
  toISODate,
} from "./dates";
import type {
  Completions,
  DayCell,
  Habit,
  MonthStats,
  Recurrence,
  TristateState,
  Week,
} from "./types";

export function matchesRecurrence(habit: Habit, iso: string): boolean {
  const rec = habit.recurrence || { type: "daily" };
  if (rec.type === "interval") {
    const n = Math.max(1, rec.days || 1);
    const diff = daysBetweenISO(habit.startDate, iso);
    return diff >= 0 && diff % n === 0;
  }
  if (rec.type === "weekly") {
    const [y, m, d] = iso.split("-").map(Number);
    const wd = mondayIndex(new Date(y, m - 1, d));
    return (rec.weekdays || []).includes(wd);
  }
  return true;
}

export function isHabitApplicable(habit: Habit, iso: string): boolean {
  if (habit.startDate && iso < habit.startDate) return false;
  if (habit.endDate && iso > habit.endDate) return false;
  return matchesRecurrence(habit, iso);
}

export function habitState(
  completions: Completions,
  habitId: string,
  iso: string,
): TristateState {
  const v = completions[iso] && completions[iso][habitId];
  if (v === "done") return "done";
  if (v === "skip") return "skip";
  return "none";
}

export function nextTristate(current: TristateState): TristateState {
  return current === "none" ? "done" : current === "done" ? "skip" : "none";
}

export function buildWeeks(year: number, monthIndex: number): Week[] {
  const total = daysInMonth(year, monthIndex);
  const weeks: Week[] = [];
  let current: DayCell[] | null = null;
  for (let day = 1; day <= total; day++) {
    const date = new Date(year, monthIndex, day);
    const wIdx = mondayIndex(date);
    if (!current || wIdx === 0) {
      current = [];
      weeks.push(current);
    }
    current.push({ day, date, iso: dateToISO(date), wIdx });
  }
  return weeks;
}

export function computeMonthStats(
  habits: Habit[],
  completions: Completions,
  year: number,
  monthIndex: number,
): MonthStats {
  const weeks = buildWeeks(year, monthIndex);
  const allDays = weeks.flat();
  const monthStart = toISODate(year, monthIndex, 1);
  const monthEnd = toISODate(year, monthIndex, daysInMonth(year, monthIndex));

  const applicableHabits = habits.filter(
    (h) => h.startDate <= monthEnd && (!h.endDate || h.endDate >= monthStart),
  );

  let completed = 0;
  let totalApplicable = 0;
  const perDay = allDays.map(({ iso }) => {
    const scheduled = habits.filter((h) => isHabitApplicable(h, iso));
    const counted = scheduled.filter(
      (h) => habitState(completions, h.id, iso) !== "skip",
    );
    const done = counted.filter(
      (h) => habitState(completions, h.id, iso) === "done",
    ).length;
    totalApplicable += counted.length;
    completed += done;
    return {
      iso,
      applicableCount: counted.length,
      done,
      notDone: counted.length - done,
      pct: counted.length ? (done / counted.length) * 100 : 0,
    };
  });

  const perHabit = habits.map((h) => {
    const scheduledDays = allDays.filter((d) => isHabitApplicable(h, d.iso));
    const countedDays = scheduledDays.filter(
      (d) => habitState(completions, h.id, d.iso) !== "skip",
    );
    const done = countedDays.filter(
      (d) => habitState(completions, h.id, d.iso) === "done",
    ).length;
    return {
      habit: h,
      applicableCount: countedDays.length,
      done,
      pct: countedDays.length ? (done / countedDays.length) * 100 : 0,
    };
  });

  return {
    weeks,
    numHabits: applicableHabits.length,
    completed,
    totalApplicable,
    progressPct: totalApplicable ? (completed / totalApplicable) * 100 : 0,
    perDay,
    perHabit,
  };
}

export function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID)
    return crypto.randomUUID();
  return "id-" + Date.now() + "-" + Math.random().toString(16).slice(2);
}

const FULL_DOW = [
  "Mondays",
  "Tuesdays",
  "Wednesdays",
  "Thursdays",
  "Fridays",
  "Saturdays",
  "Sundays",
];

export function describeRecurrence(rec: Recurrence): string {
  if (rec.type === "interval") {
    return `Every ${rec.days} days`;
  }
  if (rec.type === "weekly") {
    if (rec.weekdays.length === 0) return "No days picked yet";
    if (rec.weekdays.length === 7) return "Every day";
    if (rec.weekdays.length === 1) return FULL_DOW[rec.weekdays[0]];
    return rec.weekdays.map((d) => DOW_LABELS[d]).join(" · ");
  }
  return "Every day";
}
