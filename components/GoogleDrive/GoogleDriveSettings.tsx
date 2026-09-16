"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { CURRENT_SCHEMA_VERSION } from "@/lib/types";
import type { Completions, Habit, UpdateInfo } from "@/lib/types";
import {
  clearAccessToken,
  fetchUserEmail,
  getStoredAccessToken,
  getStoredUserEmail,
  setAccessToken,
  storeUserEmail,
} from "@/lib/google-drive/auth";
import { downloadBackup, uploadBackup } from "@/lib/google-drive/sync";
import GoogleDriveButton from "./GoogleDriveButton";
import type { Dispatch, SetStateAction } from "react";

interface GoogleTokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
}

interface GoogleTokenError {
  type: "popup_failed_to_open" | "popup_closed" | "unknown";
  message?: string;
}

interface GoogleTokenClient {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: GoogleTokenResponse) => void;
            error_callback?: (error: GoogleTokenError) => void;
          }) => GoogleTokenClient;
        };
      };
    };
  }
}

interface Props {
  habits: Habit[];
  setHabits: Dispatch<SetStateAction<Habit[]>>;
  completions: Completions;
  setCompletions: Dispatch<SetStateAction<Completions>>;
  updateInfo: UpdateInfo;
  setUpdateInfo: Dispatch<SetStateAction<UpdateInfo>>;
}

const PUSH_DEBOUNCE_MS = 3_000;
const SYNC_INTERVAL_MS = 30_000;

const GOOGLE_TOKEN_SCOPE =
  "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email";
const REFRESH_BUFFER_MS = 5 * 60 * 1000;
const CONNECT_TIMEOUT_MS = 10_000;

const DRIVE_ICON = (
  <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#0f9d58" d="M30.2 6H17.8L30.6 28h12.4z" />
    <path fill="#4285f4" d="M17.8 6 5 28l6.2 10.7L30.6 6z" />
    <path fill="#ffcd40" d="M11.2 38.7h25.6L43 28H17.8z" />
  </svg>
);

function formatClock(iso: string | null): string | null {
  if (!iso) {
    return null;
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  const time = date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (sameDay) {
    return `Last synced at ${time}`;
  }
  return `Last synced ${date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })} at ${time}`;
}

export default function GoogleDriveSettings({
  habits,
  setHabits,
  completions,
  setCompletions,
  updateInfo,
  setUpdateInfo,
}: Props) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [promptSelectAccount, setPromptSelectAccount] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(() =>
    getStoredUserEmail(),
  );
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const habitsRef = useRef(habits);
  const completionsRef = useRef(completions);
  const updateInfoRef = useRef(updateInfo);
  const selfWrittenAtRef = useRef<string | null>(null);
  const syncInFlightRef = useRef(false);
  const tokenClientRef = useRef<GoogleTokenClient | null>(null);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoReconnectTriedRef = useRef(false);
  const connectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    habitsRef.current = habits;
    completionsRef.current = completions;
    updateInfoRef.current = updateInfo;
  });

  function applySyncedUpdateInfo(info: UpdateInfo) {
    selfWrittenAtRef.current = info.updatedAt;
    setUpdateInfo(info);
  }

  function markSynced() {
    setSyncError(null);
    setLastSyncedAt(new Date().toISOString());
  }

  async function reconcile() {
    if (syncInFlightRef.current) {
      return;
    }
    syncInFlightRef.current = true;
    setSyncing(true);
    try {
      const backup = await downloadBackup();
      const hasLocalData =
        habitsRef.current.length > 0 ||
        Object.keys(completionsRef.current).length > 0;

      if (!backup && !hasLocalData) {
      } else if (
        backup &&
        (!hasLocalData || backup.updatedAt > updateInfoRef.current.updatedAt)
      ) {
        setHabits(backup.data.habits);
        setCompletions(backup.data.completions);
        applySyncedUpdateInfo({
          schemaVersion: backup.schemaVersion,
          updatedAt: backup.updatedAt,
        });
      } else {
        const pushed = await uploadBackup(
          habitsRef.current,
          completionsRef.current,
        );
        applySyncedUpdateInfo({
          schemaVersion: pushed.schemaVersion,
          updatedAt: pushed.updatedAt,
        });
      }
      markSynced();
    } finally {
      syncInFlightRef.current = false;
      setSyncing(false);
    }
  }

  async function pushLocal() {
    if (syncInFlightRef.current) {
      return;
    }
    syncInFlightRef.current = true;
    setSyncing(true);
    try {
      const pushed = await uploadBackup(
        habitsRef.current,
        completionsRef.current,
      );
      applySyncedUpdateInfo({
        schemaVersion: pushed.schemaVersion,
        updatedAt: pushed.updatedAt,
      });
      markSynced();
    } finally {
      syncInFlightRef.current = false;
      setSyncing(false);
    }
  }

  async function reconcileForNewUser() {
    if (syncInFlightRef.current) {
      return;
    }
    syncInFlightRef.current = true;
    setSyncing(true);
    try {
      const backup = await downloadBackup();
      if (backup) {
        setHabits(backup.data.habits);
        setCompletions(backup.data.completions);
        applySyncedUpdateInfo({
          schemaVersion: backup.schemaVersion,
          updatedAt: backup.updatedAt,
        });
      } else {
        setHabits([]);
        setCompletions({});
        applySyncedUpdateInfo({
          schemaVersion: CURRENT_SCHEMA_VERSION,
          updatedAt: new Date().toISOString(),
        });
      }
      markSynced();
    } finally {
      syncInFlightRef.current = false;
      setSyncing(false);
    }
  }

  async function handleToken(token: string, expiresInSeconds?: number) {
    setError(null);
    setAccessToken(token, expiresInSeconds);
    setConnected(true);
    setPromptSelectAccount(false);
    try {
      const email = await fetchUserEmail(token);
      const lastUser = getStoredUserEmail();
      const isDifferentUser =
        email !== null && lastUser !== null && email !== lastUser;

      if (email) {
        setUserEmail(email);
      }

      if (isDifferentUser) {
        await reconcileForNewUser();
      } else {
        await reconcile();
      }

      if (email) {
        storeUserEmail(email);
      }
    } catch (err) {
      console.error(err);
      setError("Couldn't sync with Google Drive.");
    }
  }

  function scheduleTokenRefresh(expiresInSeconds: number | undefined) {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
    if (!expiresInSeconds) {
      return;
    }
    const delay = Math.max(expiresInSeconds * 1000 - REFRESH_BUFFER_MS, 10_000);
    refreshTimeoutRef.current = setTimeout(() => {
      refreshTimeoutRef.current = null;
      clearAccessToken();
      setConnected(false);
      setSessionExpired(true);
    }, delay);
  }

  function clearConnectTimeout() {
    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }
  }

  function armConnectTimeout() {
    clearConnectTimeout();
    connectTimeoutRef.current = setTimeout(() => {
      connectTimeoutRef.current = null;
      setConnecting(false);
    }, CONNECT_TIMEOUT_MS);
  }

  function initializeGoogleClient() {
    if (!window.google || tokenClientRef.current) {
      return;
    }
    tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      scope: GOOGLE_TOKEN_SCOPE,
      callback: (response: GoogleTokenResponse) => {
        clearConnectTimeout();
        setConnecting(false);
        if (!response.access_token) {
          return;
        }
        scheduleTokenRefresh(response.expires_in);
        handleToken(response.access_token, response.expires_in);
      },
      error_callback: (err: GoogleTokenError) => {
        clearConnectTimeout();
        setConnecting(false);
        if (err.type === "popup_failed_to_open") {
          setError("Your browser blocked the Google sign-in popup.");
        }
      },
    });

    if (autoReconnectTriedRef.current) {
      return;
    }
    autoReconnectTriedRef.current = true;

    setTimeout(() => {
      const cached = getStoredAccessToken();
      if (cached) {
        scheduleTokenRefresh(cached.expiresInSeconds);
        handleToken(cached.token, cached.expiresInSeconds);
      }
    }, 0);
  }

  useEffect(() => {
    if (window.google) {
      initializeGoogleClient();
    }
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      clearConnectTimeout();
    };
  }, []);

  function connect() {
    if (!tokenClientRef.current) {
      initializeGoogleClient();
    }
    setError(null);
    setSessionExpired(false);
    setConnecting(true);
    armConnectTimeout();
    tokenClientRef.current?.requestAccessToken(
      promptSelectAccount
        ? { prompt: "select_account" }
        : userEmail
          ? { prompt: "" }
          : undefined,
    );
  }

  function handleChangeUser() {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
    clearAccessToken();
    setConnected(false);
    setPromptSelectAccount(true);
    setSessionExpired(false);
    setError(null);
    setSyncError(null);
    setUserEmail(null);
    setLastSyncedAt(null);
  }

  function handleSyncNow() {
    reconcile().catch((err) => {
      console.error(err);
      setSyncError("Sync failed — tap to retry.");
    });
  }

  useEffect(() => {
    if (!connected || syncing) {
      return;
    }
    if (updateInfo.updatedAt === selfWrittenAtRef.current) {
      return;
    }

    const timeout = setTimeout(() => {
      pushLocal().catch((err) => {
        console.error(err);
        setSyncError("Sync failed, will retry.");
      });
    }, PUSH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [connected, syncing, updateInfo.updatedAt]);

  useEffect(() => {
    if (!connected) {
      return;
    }
    const interval = setInterval(() => {
      reconcile().catch((err) => {
        console.error(err);
        setSyncError("Sync failed, will retry.");
      });
    }, SYNC_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [connected]);

  const status = error
    ? { tone: "bad", label: "Error" }
    : connecting
      ? { tone: "busy", label: "Connecting" }
      : !connected
        ? { tone: "idle", label: "Not connected" }
        : syncing
          ? { tone: "busy", label: "Syncing" }
          : syncError
            ? { tone: "bad", label: "Retrying" }
            : { tone: "ok", label: "Synced" };

  const syncedLabel = formatClock(lastSyncedAt);
  const alert = error || syncError;
  const canReconnect = !promptSelectAccount && userEmail !== null;

  return (
    <section className="drive-card">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={initializeGoogleClient}
      />

      <div className="drive-head">
        <span className="drive-logo">{DRIVE_ICON}</span>
        <span className="drive-head-text">
          <span className="drive-title">Google Drive backup</span>
          <span className="drive-sub">
            {connected
              ? "Your habits are backed up automatically."
              : "Keep your habits safe across devices."}
          </span>
        </span>
        <span className={`status-pill ${status.tone}`}>
          <span className="status-dot" />
          {status.label}
        </span>
      </div>

      {connected ? (
        <>
          <div className="drive-account">
            <span className="drive-avatar" aria-hidden="true">
              {(userEmail || "?").charAt(0)}
            </span>
            <span className="drive-account-text">
              <span className="email">{userEmail || "Google account"}</span>
              <span className="when">
                {syncing ? "Syncing…" : syncedLabel || "Waiting for first sync"}
              </span>
            </span>
          </div>

          <div className="drive-actions">
            <button
              type="button"
              className="btn"
              onClick={handleSyncNow}
              disabled={syncing}
            >
              {syncing ? "Syncing…" : "Sync now"}
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={handleChangeUser}
            >
              Change account
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="drive-blurb">
            {promptSelectAccount
              ? "Signed out. Connect again to pick a different Google account."
              : canReconnect
                ? sessionExpired
                  ? `Your Google session expired. Reconnect as ${userEmail} to resume syncing.`
                  : `Reconnect as ${userEmail} to resume syncing.`
                : "Connect to store a single backup file in your Drive and sync it automatically."}
          </p>
          <div className="drive-actions">
            <GoogleDriveButton
              onClick={connect}
              connecting={connecting}
              label={
                promptSelectAccount
                  ? "Connect another account"
                  : canReconnect
                    ? "Reconnect Google Drive"
                    : "Connect Google Drive"
              }
            />
          </div>
        </>
      )}

      {alert && (
        <div className="drive-alert" role="status">
          <span aria-hidden="true">!</span>
          <span>{alert}</span>
        </div>
      )}
    </section>
  );
}
