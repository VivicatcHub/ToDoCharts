import { getAccessToken } from "./auth";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const UPLOAD_API = "https://www.googleapis.com/upload/drive/v3/files";

async function getHeaders(): Promise<HeadersInit> {
  const token = getAccessToken();
  if (!token) {
    throw new Error("Google Drive is not connected.");
  }
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function findBackupFile(): Promise<string | null> {
  const headers = await getHeaders();
  const query = encodeURIComponent(
    "name = 'Habit Tracker Data' " + "and trashed = false",
  );
  const response = await fetch(
    `${DRIVE_API}/files?q=${query}&fields=files(id,name,modifiedTime)`,
    {
      headers,
    },
  );
  if (!response.ok) {
    throw new Error(`Failed to search Google Drive (${response.status})`);
  }
  const result = await response.json();
  return result.files?.[0]?.id ?? null;
}

export async function createBackupFile(backup: string): Promise<string> {
  const headers = await getHeaders();
  const metadata = {
    name: "Habit Tracker Data",
    mimeType: "application/json",
  };
  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" }),
  );
  form.append(
    "file",
    new Blob([backup], {
      type: "application/json",
    }),
  );
  const response = await fetch(
    `${UPLOAD_API}?uploadType=multipart&fields=id,name,modifiedTime`,
    {
      method: "POST",
      headers,
      body: form,
    },
  );
  if (!response.ok) {
    throw new Error(`Failed to create backup (${response.status})`);
  }

  const result = await response.json();
  return result.id;
}

export async function updateBackupFile(
  fileId: string,
  backup: string,
): Promise<void> {
  const headers = new Headers(await getHeaders());
  headers.set("Content-Type", "application/json");
  const response = await fetch(`${UPLOAD_API}/${fileId}?uploadType=media`, {
    method: "PATCH",
    headers,
    body: backup,
  });
  if (!response.ok) {
    throw new Error(`Failed to update backup (${response.status})`);
  }
}

export async function downloadBackupFile(fileId: string): Promise<string> {
  const headers = await getHeaders();
  const response = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
    headers,
  });
  if (!response.ok) {
    throw new Error(`Failed to download backup (${response.status})`);
  }
  return response.text();
}
