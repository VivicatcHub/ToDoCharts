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
      setSyncError(null);
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
      setSyncError(null);
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
      setSyncError(null);
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
      setError("Failed to synchronize with Google Drive.");
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
      tokenClientRef.current?.requestAccessToken({ prompt: "" });
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
        return;
      }

      if (getStoredUserEmail()) {
        setConnecting(true);
        armConnectTimeout();
        tokenClientRef.current?.requestAccessToken({ prompt: "" });
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
    setConnecting(true);
    armConnectTimeout();
    tokenClientRef.current?.requestAccessToken(
      promptSelectAccount ? { prompt: "select_account" } : undefined,
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
    setError(null);
    setSyncError(null);
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

  return (
    <section className="stats-row">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={initializeGoogleClient}
      />
      <div className="stat-card">
        <span className="stat-label">Google Drive</span>
        {error ? (
          <span className="stat-value">{error}</span>
        ) : !connected ? (
          <GoogleDriveButton onClick={connect} connecting={connecting} />
        ) : (
          <span className="stat-value">
            {syncing ? "Synchronizing..." : syncError || "✓ Connected"}
          </span>
        )}
      </div>
      <div className="stat-card">
        <span className="stat-label">Change User</span>
        {connected ? (
          <button
            type="button"
            onClick={handleChangeUser}
            className="cursor-pointer hover:bg-[#262b36] rounded-lg"
          >
            Change User
          </button>
        ) : (
          <span className="stat-value">
            {promptSelectAccount ? "Connect above to switch accounts" : "—"}
          </span>
        )}
      </div>
    </section>
  );
}
