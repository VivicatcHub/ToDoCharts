"use client";

import { useState } from "react";
import { DOW_LABELS, WEEK_COLORS } from "@/lib/dates";
import { habitState, isHabitApplicable } from "@/lib/habits";
import type {
  Completions,
  Habit,
  MonthStats,
  PerDayStat,
  StandoutDays,
} from "@/lib/types";
import TristateBox from "./TristateBox";

export default function MonthGrid({
  stats,
  habits,
  completions,
  todayISO,
  onCycle,
}: {
  stats: MonthStats;
  habits: Habit[];
  completions: Completions;
  todayISO: string;
  onCycle: (habitId: string, iso: string) => void;
}) {
  const { weeks, perDay, perHabit, standout } = stats;
  const allDays = weeks.flat();
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);

  const weekIdxByIso: Record<string, number> = {};
  weeks.forEach((w, wi) => {
    w.forEach((d) => {
      weekIdxByIso[d.iso] = wi;
    });
  });

  let fullWeekCounter = 0;
  const weekMeta = weeks.map((w) => {
    const isFull = w.length === 7;
    if (isFull) fullWeekCounter++;
    return { length: w.length, label: isFull ? `Week ${fullWeekCounter}` : "" };
  });

  return (
    <section className="grid-wrap">
      <table className="month-grid">
        <tbody>
          <tr>
            <th className="corner" />
            {weeks.map((w, wi) => (
              <th
                key={wi}
                className="week-band"
                colSpan={w.length}
                style={{
                  background: `var(${WEEK_COLORS[wi % WEEK_COLORS.length]})`,
                }}
              >
                {weekMeta[wi].label}
              </th>
            ))}
            <th className="spacer-col" />
            <th className="corner-fill" />
            <th className="corner-fill" />
          </tr>

          <tr>
            <th className="corner">My Habits</th>
            {allDays.map(({ day, iso, wIdx }) => {
              const weekIdxForDay = weekIdxByIso[iso];
              return (
                <th
                  key={iso}
                  className={"day-head" + (iso === todayISO ? " is-today" : "")}
                  title={standoutTitle(standout, iso)}
                  style={{
                    background: `var(${WEEK_COLORS[weekIdxForDay % WEEK_COLORS.length]})`,
                  }}
                >
                  <span className="dow">{DOW_LABELS[wIdx]}</span>
                  <span className="dom">{day}</span>
                </th>
              );
            })}
            <th className="spacer-col" />
            <th className="corner-fill" />
            <th className="corner-fill" />
          </tr>

          {habits.length === 0 && (
            <tr>
              <td
                colSpan={allDays.length + 3}
                style={{
                  textAlign: "center",
                  padding: 24,
                  color: "var(--text-dim)",
                }}
              >
                No habits yet. Click the gear icon to add your first habit.
              </td>
            </tr>
          )}

          {habits.map((habit) => {
            const habitStat = perHabit.find((p) => p.habit.id === habit.id)!;
            if (habitStat.applicableCount <= 0) return;
            const isSelected = habit.id === selectedHabitId;
            return (
              <tr
                key={habit.id}
                className={isSelected ? "is-selected" : undefined}
              >
                <td className="habit-name">
                  <button
                    type="button"
                    className="habit-name-btn"
                    aria-pressed={isSelected}
                    onClick={() =>
                      setSelectedHabitId(isSelected ? null : habit.id)
                    }
                  >
                    {habit.name}
                  </button>
                </td>
                {allDays.map(({ iso }) => {
                  const applicable = isHabitApplicable(habit, iso);
                  const state = applicable
                    ? habitState(completions, habit.id, iso)
                    : "none";
                  return (
                    <td
                      key={iso}
                      className={
                        "day-cell" +
                        (iso === todayISO ? " is-today" : "") +
                        (!applicable ? " not-applicable" : "")
                      }
                    >
                      {applicable && (
                        <TristateBox
                          state={state}
                          onClick={() => onCycle(habit.id, iso)}
                          doneColor={`var(${WEEK_COLORS[weekIdxByIso[iso] % WEEK_COLORS.length]})`}
                        />
                      )}
                    </td>
                  );
                })}
                <td className="spacer-col" />
                <td className="habit-pct-bar-cell">
                  <div className="mini-bar-outer">
                    <div
                      className="mini-bar-inner"
                      style={{
                        clipPath: `inset(0 ${100 - Math.min(100, habitStat.pct)}% 0 0)`,
                      }}
                    />
                  </div>
                </td>
                <td className="habit-pct">{habitStat.pct.toFixed(2)}%</td>
              </tr>
            );
          })}

          <tr>
            <td />
          </tr>

          <SummaryRow
            label="Progress"
            perDay={perDay}
            standout={standout}
            cls="progress"
            valueFn={(d) => `${d.pct.toFixed(0)}%`}
          />
          <SummaryRow
            label="Done"
            perDay={perDay}
            standout={standout}
            cls="done"
            valueFn={(d) => d.done}
          />
          <SummaryRow
            label="Not Done"
            perDay={perDay}
            standout={standout}
            cls="notdone"
            valueFn={(d) => d.notDone}
          />
        </tbody>
      </table>
    </section>
  );
}

function SummaryRow({
  label,
  perDay,
  standout,
  cls,
  valueFn,
}: {
  label: string;
  perDay: PerDayStat[];
  standout: StandoutDays;
  cls: string;
  valueFn: (d: PerDayStat) => string | number;
}) {
  return (
    <tr className={`summary-row ${cls}`}>
      <th className="corner" style={{ textAlign: "left" }}>
        {label}
      </th>
      {perDay.map((d) => (
        <td key={d.iso} className={standoutKind(standout, d.iso) || undefined}>
          <span className="summary-val">{valueFn(d)}</span>
        </td>
      ))}
      <td className="spacer-col" />
      <td />
      <td />
    </tr>
  );
}

function standoutKind(standout: StandoutDays, iso: string): string {
  if (standout.bestISOs.includes(iso)) return "best-day";
  if (standout.worstISOs.includes(iso)) return "worst-day";
  return "";
}

function standoutTitle(
  standout: StandoutDays,
  iso: string,
): string | undefined {
  if (standout.bestISOs.includes(iso)) return "Best day of the month";
  if (standout.worstISOs.includes(iso)) return "Roughest day of the month";
  return undefined;
}
