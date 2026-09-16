import {
  CURRENT_SCHEMA_VERSION,
  type Completions,
  type Habit,
  type HabitBackup,
} from "@/lib/types";

export function createBackup(
  habits: Habit[],
  completions: Completions,
): HabitBackup {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    data: {
      habits,
      completions,
    },
  };
}

export function isValidBackup(value: unknown): value is HabitBackup {
  if (!value || typeof value !== "object") {
    return false;
  }
  const backup = value as Partial<HabitBackup>;
  if (backup.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    return false;
  }
  if (typeof backup.updatedAt !== "string") {
    return false;
  }
  if (!backup.data || typeof backup.data !== "object") {
    return false;
  }
  if (!Array.isArray(backup.data.habits)) {
    return false;
  }
  if (!backup.data.completions || typeof backup.data.completions !== "object") {
    return false;
  }
  return true;
}
