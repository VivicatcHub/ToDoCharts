"use client";

import { formatDayParts } from "@/lib/dates";
import {
  describeRecurrence,
  habitState,
  isHabitApplicable,
} from "@/lib/habits";
import type {
  Completions,
  Habit,
  StandoutDays,
  TristateState,
} from "@/lib/types";
import TristateBox from "./TristateBox";

const STATE_LABEL: Record<TristateState, string> = {
  none: "Mark as done",
  done: "Done — tap to mark failed",
  fail: "Failed — tap to skip",
  skip: "Skipped — tap to clear",
};

function ringColor(pct: number, hasHabits: boolean): string {
  if (!hasHabits) return "var(--panel-3)";
  if (pct >= 100) return "var(--week-4)";
  if (pct >= 60) return "var(--week-3)";
  if (pct > 0) return "var(--week-2)";
  return "var(--week-1)";
}

export default function DayView({
  dayViewISO,
  todayISO,
  habits,
  completions,
  standout,
  embedded,
  onPrevDay,
  onNextDay,
  onToday,
  onCycle,
  onOpenSettings,
}: {
  dayViewISO: string;
  todayISO: string;
  habits: Habit[];
  completions: Completions;
  standout: StandoutDays;
  embedded?: boolean;
  onPrevDay: () => void;
  onNextDay: () => void;
  onToday: () => void;
  onCycle: (habitId: string, iso: string) => void;
  onOpenSettings: () => void;
}) {
  const { weekday, rest } = formatDayParts(dayViewISO);
  const isToday = dayViewISO === todayISO;

  const applicable = habits.filter((h) => isHabitApplicable(h, dayViewISO));
  const counted = applicable.filter(
    (h) => habitState(completions, h.id, dayViewISO) !== "skip",
  );
  const done = counted.filter(
    (h) => habitState(completions, h.id, dayViewISO) === "done",
  ).length;
  const failed = counted.filter(
    (h) => habitState(completions, h.id, dayViewISO) === "fail",
  ).length;
  const isBest = standout.bestISOs.includes(dayViewISO);
  const isWorst = standout.worstISOs.includes(dayViewISO);
  const pct = counted.length ? Math.round((done / counted.length) * 100) : 0;
  const remaining = counted.length - done;

  const headline =
    counted.length === 0
      ? "Nothing due"
      : remaining === 0
        ? "All done 🎉"
        : `${remaining} to go`;

  return (
    <section className={"day-view" + (embedded ? "" : " mobile-only")}>
      <div className="day-nav">
        <button
          className="icon-btn"
          aria-label="Previous day"
          onClick={onPrevDay}
        >
          &#8249;
        </button>
        <div className="day-nav-label">
          <span className="weekday">{weekday}</span>
          <span className={"sub" + (isToday ? " is-today" : "")}>
            {isToday ? "Today" : rest}
          </span>
        </div>
        <button className="icon-btn" aria-label="Next day" onClick={onNextDay}>
          &#8250;
        </button>
      </div>

      {!isToday && (
        <div className="day-today-row">
          <button className="today-chip" onClick={onToday}>
            Jump to today
          </button>
        </div>
      )}

      <div
        className={
          "day-summary" +
          (isBest ? " best-day" : "") +
          (isWorst ? " worst-day" : "")
        }
      >
        <div
          className="progress-ring"
          style={
            {
              "--pct": pct,
              "--ring": isBest
                ? "var(--gold)"
                : ringColor(pct, counted.length > 0),
            } as React.CSSProperties
          }
          role="img"
          aria-label={`${pct}% complete`}
        >
          <span>{pct}%</span>
        </div>
        <div className="day-summary-meta">
          {isBest && (
            <span className="standout-chip">♛ Best day of the month</span>
          )}
          {isWorst && (
            <span className="standout-chip">⛈ Roughest day of the month</span>
          )}
          <span className="headline">{headline}</span>
          <span className="sub">
            {done}/{counted.length} habits done
            {failed > 0 && ` · ${failed} failed`}
            {applicable.length !== counted.length &&
              ` · ${applicable.length - counted.length} skipped`}
          </span>
        </div>
      </div>

      {applicable.length === 0 ? (
        <div className="empty-state">
          <span className="emoji" aria-hidden="true">
            {habits.length === 0 ? "✦" : "☾"}
          </span>
          <span className="title">
            {habits.length === 0 ? "No habits yet" : "Nothing scheduled"}
          </span>
          <span className="desc">
            {habits.length === 0
              ? "Create your first habit and start tracking it today."
              : "None of your habits repeat on this day. Enjoy the break."}
          </span>
          {habits.length === 0 && (
            <button className="btn primary" onClick={onOpenSettings}>
              Add a habit
            </button>
          )}
        </div>
      ) : (
        <div className="habit-list-mobile">
          {applicable.map((h) => {
            const state = habitState(completions, h.id, dayViewISO);
            return (
              <button
                type="button"
                className={`habit-row-mobile state-${state}`}
                key={h.id}
                aria-label={`${h.name}: ${STATE_LABEL[state]}`}
                onClick={() => onCycle(h.id, dayViewISO)}
              >
                <span className="row-text">
                  <span className="name">{h.name}</span>
                  <span className="meta">
                    {describeRecurrence(h.recurrence)}
                  </span>
                </span>
                <TristateBox state={state} large indicator />
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
