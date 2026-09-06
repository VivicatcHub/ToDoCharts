"use client";

import { formatNiceDate } from "@/lib/dates";
import { habitState, isHabitApplicable } from "@/lib/habits";
import type { Completions, Habit } from "@/lib/types";
import TristateBox from "./TristateBox";

export default function DayView({
  dayViewISO,
  habits,
  completions,
  onPrevDay,
  onNextDay,
  onCycle,
}: {
  dayViewISO: string;
  habits: Habit[];
  completions: Completions;
  onPrevDay: () => void;
  onNextDay: () => void;
  onCycle: (habitId: string, iso: string) => void;
}) {
  const niceDate = formatNiceDate(dayViewISO);

  const applicable = habits.filter((h) => isHabitApplicable(h, dayViewISO));
  const counted = applicable.filter(
    (h) => habitState(completions, h.id, dayViewISO) !== "skip",
  );
  const done = counted.filter(
    (h) => habitState(completions, h.id, dayViewISO) === "done",
  ).length;
  const pct = counted.length ? Math.round((done / counted.length) * 100) : 0;

  return (
    <section className="day-view mobile-only">
      <div className="day-view-nav">
        <button
          className="icon-btn"
          aria-label="Previous day"
          onClick={onPrevDay}
        >
          &#8249;
        </button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{niceDate}</div>
        </div>
        <button className="icon-btn" aria-label="Next day" onClick={onNextDay}>
          &#8250;
        </button>
      </div>

      <div className="day-view-progress">
        <div>
          <div className="stat-label">Progress</div>
          <div className="big-pct">{pct}%</div>
        </div>
        <div>
          <div className="stat-label">Done</div>
          <div className="big-pct">
            {done}/{counted.length}
          </div>
        </div>
      </div>

      {applicable.length === 0 ? (
        <div className="no-habits-msg">
          {habits.length === 0
            ? "No habits yet. Tap the gear icon to add one."
            : "No habits scheduled for this day."}
        </div>
      ) : (
        applicable.map((h) => {
          const state = habitState(completions, h.id, dayViewISO);
          return (
            <div className={`habit-row-mobile state-${state}`} key={h.id}>
              <span className="name">{h.name}</span>
              <TristateBox
                state={state}
                large
                onClick={() => onCycle(h.id, dayViewISO)}
              />
            </div>
          );
        })
      )}
    </section>
  );
}
