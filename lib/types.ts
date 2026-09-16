export type Recurrence =
  | { type: "daily" }
  | { type: "interval"; days: number }
  | { type: "weekly"; weekdays: number[] };

export interface Habit {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
  recurrence: Recurrence;
}

export type TristateValue = "done" | "skip";

export type Completions = Record<string, Record<string, TristateValue>>;

export type TristateState = "none" | "done" | "skip";

export interface DayCell {
  day: number;
  date: Date;
  iso: string;
  wIdx: number;
}

export type Week = DayCell[];

export interface PerDayStat {
  iso: string;
  applicableCount: number;
  done: number;
  notDone: number;
  pct: number;
}

export interface PerHabitStat {
  habit: Habit;
  applicableCount: number;
  done: number;
  pct: number;
}

export interface MonthStats {
  weeks: Week[];
  numHabits: number;
  completed: number;
  totalApplicable: number;
  progressPct: number;
  perDay: PerDayStat[];
  perHabit: PerHabitStat[];
}

export const CURRENT_SCHEMA_VERSION = 1;

export interface UpdateInfo {
  schemaVersion: number;
  updatedAt: string;
}

export interface HabitBackup {
  schemaVersion: number;
  updatedAt: string;
  data: {
    habits: Habit[];
    completions: Completions;
  };
}
