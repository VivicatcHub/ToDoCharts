"use client";

let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

const TOKEN_KEY = "todocharts.google.token";
const MIN_REMAINING_MS = 60 * 1000;

interface StoredToken {
  token: string;
  expiresAt: number;
}

export function setAccessToken(token: string, expiresInSeconds?: number): void {
  accessToken = token;
  if (typeof window === "undefined") {
    return;
  }
  if (expiresInSeconds) {
    const stored: StoredToken = {
      token,
      expiresAt: Date.now() + expiresInSeconds * 1000,
    };
    localStorage.setItem(TOKEN_KEY, JSON.stringify(stored));
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function clearAccessToken(): void {
  accessToken = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function getStoredAccessToken(): {
  token: string;
  expiresInSeconds: number;
} | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = localStorage.getItem(TOKEN_KEY);
  if (!raw) {
    return null;
  }
  try {
    const stored = JSON.parse(raw) as StoredToken;
    if (
      typeof stored.token !== "string" ||
      typeof stored.expiresAt !== "number"
    ) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    const remainingMs = stored.expiresAt - Date.now();
    if (remainingMs < MIN_REMAINING_MS) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    accessToken = stored.token;
    return {
      token: stored.token,
      expiresInSeconds: Math.floor(remainingMs / 1000),
    };
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }
}

const LAST_USER_KEY = "todocharts.google.lastUser";

export function getStoredUserEmail(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem(LAST_USER_KEY);
}

export function storeUserEmail(email: string): void {
  localStorage.setItem(LAST_USER_KEY, email);
}

export function clearStoredUserEmail(): void {
  localStorage.removeItem(LAST_USER_KEY);
}

export async function fetchUserEmail(token: string): Promise<string | null> {
  const response = await fetch(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok) {
    return null;
  }
  const data = await response.json();
  return typeof data.email === "string" ? data.email : null;
}
