"use client";

import { DOW_LABELS, WEEK_COLORS } from "@/lib/dates";
import { habitState, isHabitApplicable } from "@/lib/habits";
import type { Completions, Habit, MonthStats, PerDayStat } from "@/lib/types";
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
  const { weeks, perDay, perHabit } = stats;
  const allDays = weeks.flat();

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
            return (
              <tr key={habit.id}>
                <td className="habit-name">{habit.name}</td>
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
                      style={{ width: `${Math.min(100, habitStat.pct)}%` }}
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
            cls="progress"
            valueFn={(d) => `${d.pct.toFixed(0)}%`}
          />
          <SummaryRow
            label="Done"
            perDay={perDay}
            cls="done"
            valueFn={(d) => d.done}
          />
          <SummaryRow
            label="Not Done"
            perDay={perDay}
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
  cls,
  valueFn,
}: {
  label: string;
  perDay: PerDayStat[];
  cls: string;
  valueFn: (d: PerDayStat) => string | number;
}) {
  return (
    <tr className={`summary-row ${cls}`}>
      <th className="corner" style={{ textAlign: "left" }}>
        {label}
      </th>
      {perDay.map((d) => (
        <td key={d.iso}>{valueFn(d)}</td>
      ))}
      <td className="spacer-col" />
      <td />
      <td />
    </tr>
  );
}
