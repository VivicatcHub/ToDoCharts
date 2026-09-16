"use client";

import { useMemo, useState } from "react";
import { dateToISO, isoAddDays, MONTH_LABELS } from "@/lib/dates";
import { computeMonthStats, habitState, nextTristate } from "@/lib/habits";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import {
  CURRENT_SCHEMA_VERSION,
  type Completions,
  type Habit,
  type TristateState,
  type UpdateInfo,
} from "@/lib/types";
import TopBar from "./TopBar";
import StatsRow from "./StatsRow";
import ProgressChart from "./ProgressChart";
import MonthGrid from "./MonthGrid";
import DayView from "./DayView";
import SettingsModal from "./SettingsModal";
import GoogleDriveSettings from "./GoogleDrive/GoogleDriveSettings";

const HABITS_KEY = "todocharts.habits";
const COMPLETIONS_KEY = "todocharts.completions";
const UPDATE_INFO_KEY = "todocharts.update.info";

export default function App() {
  const [habits, setHabits] = useLocalStorageState<Habit[]>(HABITS_KEY, []);
  const [completions, setCompletions] = useLocalStorageState<Completions>(
    COMPLETIONS_KEY,
    {},
  );
  const [updateInfo, setUpdateInfo] = useLocalStorageState<UpdateInfo>(
    UPDATE_INFO_KEY,
    { schemaVersion: 0, updatedAt: "" },
  );

  const [today] = useState(() => new Date());
  const todayISO = useMemo(() => dateToISO(today), [today]);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [dayViewISO, setDayViewISO] = useState(todayISO);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const stats = useMemo(
    () => computeMonthStats(habits, completions, viewYear, viewMonth),
    [habits, completions, viewYear, viewMonth],
  );

  function touchUpdateInfo() {
    setUpdateInfo({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
    });
  }

  function setCompletionState(
    habitId: string,
    iso: string,
    state: TristateState,
  ) {
    touchUpdateInfo();
    setCompletions((prev) => {
      const next = { ...prev };
      if (state === "none") {
        if (next[iso]) {
          const dayMap = { ...next[iso] };
          delete dayMap[habitId];

          if (Object.keys(dayMap).length === 0) {
            delete next[iso];
          } else {
            next[iso] = dayMap;
          }
        }
      } else {
        next[iso] = {
          ...(next[iso] || {}),
          [habitId]: state,
        };
      }
      return next;
    });
  }

  function cycleHabitState(habitId: string, iso: string) {
    const current = habitState(completions, habitId, iso);
    setCompletionState(habitId, iso, nextTristate(current));
  }

  function addHabit(habit: Habit) {
    touchUpdateInfo();
    setHabits((prev) => [...prev, habit]);
  }

  function updateHabit(id: string, patch: Partial<Habit>) {
    touchUpdateInfo();
    setHabits((prev) =>
      prev.map((h) => (h.id === id ? { ...h, ...patch } : h)),
    );
  }

  function deleteHabit(id: string) {
    touchUpdateInfo();
    setHabits((prev) => prev.filter((h) => h.id !== id));
    setCompletions((prev) => {
      const next: Completions = {};
      for (const iso of Object.keys(prev)) {
        if (!(id in prev[iso])) {
          next[iso] = prev[iso];
          continue;
        }
        const dayMap = { ...prev[iso] };
        delete dayMap[id];

        if (Object.keys(dayMap).length > 0) {
          next[iso] = dayMap;
        }
      }
      return next;
    });
  }

  function goPrevMonth() {
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }

  function goNextMonth() {
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }

  function goToday() {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  }

  const monthLabel = `${MONTH_LABELS[viewMonth]} ${viewYear}`;

  return (
    <>
      <div id="app">
        <TopBar
          monthLabel={monthLabel}
          onPrevMonth={goPrevMonth}
          onNextMonth={goNextMonth}
          onToday={goToday}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        <main className="desktop-only">
          <StatsRow
            numHabits={stats.numHabits}
            completed={stats.completed}
            progressPct={stats.progressPct}
          />
          <ProgressChart perDay={stats.perDay} />
          <MonthGrid
            stats={stats}
            habits={habits}
            completions={completions}
            todayISO={todayISO}
            onCycle={cycleHabitState}
          />
        </main>

        <DayView
          dayViewISO={dayViewISO}
          todayISO={todayISO}
          habits={habits}
          completions={completions}
          onPrevDay={() => setDayViewISO((iso) => isoAddDays(iso, -1))}
          onNextDay={() => setDayViewISO((iso) => isoAddDays(iso, 1))}
          onToday={() => setDayViewISO(todayISO)}
          onCycle={cycleHabitState}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        <GoogleDriveSettings
          habits={habits}
          setHabits={setHabits}
          completions={completions}
          setCompletions={setCompletions}
          updateInfo={updateInfo}
          setUpdateInfo={setUpdateInfo}
        />
      </div>

      {settingsOpen && (
        <SettingsModal
          onClose={() => setSettingsOpen(false)}
          habits={habits}
          todayISO={todayISO}
          onAddHabit={addHabit}
          onUpdateHabit={updateHabit}
          onDeleteHabit={deleteHabit}
        />
      )}
    </>
  );
}
