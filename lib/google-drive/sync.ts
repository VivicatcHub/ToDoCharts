import type { Completions, Habit, HabitBackup } from "@/lib/types";
import { createBackup, isValidBackup } from "./backup";
import {
  createBackupFile,
  downloadBackupFile,
  findBackupFile,
  updateBackupFile,
} from "./drive";

export async function uploadBackup(
  habits: Habit[],
  completions: Completions,
): Promise<HabitBackup> {
  const backup = createBackup(habits, completions);
  const json = JSON.stringify(backup, null, 2);
  const existingFileId = await findBackupFile();

  if (existingFileId) {
    await updateBackupFile(existingFileId, json);
  } else {
    await createBackupFile(json);
  }
  return backup;
}

export async function downloadBackup() {
  const fileId = await findBackupFile();
  if (!fileId) {
    return null;
  }
  const json = await downloadBackupFile(fileId);
  const backup = JSON.parse(json);
  if (!isValidBackup(backup)) {
    throw new Error("Invalid backup format");
  }
  return backup;
}

const FILE_ID_KEY = "google-drive-file-id";

export function getStoredFileId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem(FILE_ID_KEY);
}

export function storeFileId(fileId: string): void {
  localStorage.setItem(FILE_ID_KEY, fileId);
}

export function clearStoredFileId(): void {
  localStorage.removeItem(FILE_ID_KEY);
}
