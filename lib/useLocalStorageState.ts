"use client";

import { useEffect, useRef, useState } from "react";

export function useLocalStorageState<T>(key: string, fallback: T) {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch (e) {
      console.error("Failed to load", key, e);
      return fallback;
    }
  });

  const isFirstRun = useRef(true);
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (e) {
      console.error("Failed to save", key, e);
    }
  }, [key, state]);

  return [state, setState] as const;
}
