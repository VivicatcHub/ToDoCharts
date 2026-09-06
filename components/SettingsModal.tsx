"use client";

import { useState, type FormEvent } from "react";
import { mondayIndex } from "@/lib/dates";
import { uid } from "@/lib/habits";
import type { Habit, Recurrence } from "@/lib/types";
import WeekdayPicker from "./WeekdayPicker";

type RecurType = Recurrence["type"];

function recurrenceFromInputs(
  typeVal: RecurType,
  intervalVal: number,
  weekdays: number[],
): Recurrence {
  if (typeVal === "interval")
    return { type: "interval", days: Math.max(1, intervalVal || 2) };
  if (typeVal === "weekly")
    return { type: "weekly", weekdays: [...weekdays].sort((a, b) => a - b) };
  return { type: "daily" };
}

export default function SettingsModal({
  onClose,
  habits,
  todayISO,
  onAddHabit,
  onUpdateHabit,
  onDeleteHabit,
}: {
  onClose: () => void;
  habits: Habit[];
  todayISO: string;
  onAddHabit: (habit: Habit) => void;
  onUpdateHabit: (id: string, patch: Partial<Habit>) => void;
  onDeleteHabit: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [start, setStart] = useState(todayISO);
  const [end, setEnd] = useState("");
  const [recurType, setRecurType] = useState<RecurType>("daily");
  const [interval, setInterval_] = useState(2);
  const [weekdays, setWeekdays] = useState<number[]>([]);

  function handleRecurTypeChange(t: RecurType) {
    setRecurType(t);
    if (t === "weekly" && weekdays.length === 0) {
      setWeekdays([mondayIndex(new Date())]);
    }
  }

  function toggleWeekday(idx: number) {
    setWeekdays((prev) =>
      prev.includes(idx) ? prev.filter((w) => w !== idx) : [...prev, idx],
    );
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const habit: Habit = {
      id: uid(),
      name: trimmed,
      startDate: start || todayISO,
      endDate: end || null,
      recurrence: recurrenceFromInputs(recurType, interval, weekdays),
    };
    onAddHabit(habit);
    setName("");
    setStart(todayISO);
    setEnd("");
    setRecurType("daily");
    setWeekdays([]);
  }

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal">
        <div className="modal-header">
          <h2>My Habits</h2>
          <button className="icon-btn" aria-label="Close" onClick={onClose}>
            &#10005;
          </button>
        </div>

        <form className="add-habit-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="New habit name"
            required
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <label className="date-field">
            <span>Starts on</span>
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label className="date-field">
            <span>Ends on (optional)</span>
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
          <label className="date-field">
            <span>Repeats</span>
            <select
              value={recurType}
              onChange={(e) =>
                handleRecurTypeChange(e.target.value as RecurType)
              }
            >
              <option value="daily">Every day</option>
              <option value="interval">Every N days</option>
              <option value="weekly">Specific weekdays</option>
            </select>
          </label>
          {recurType === "interval" && (
            <label className="date-field">
              <span>Every how many days</span>
              <input
                type="number"
                min={2}
                max={365}
                value={interval}
                onChange={(e) =>
                  setInterval_(Math.max(1, parseInt(e.target.value, 10) || 2))
                }
              />
            </label>
          )}
          {recurType === "weekly" && (
            <WeekdayPicker selected={weekdays} onToggle={toggleWeekday} />
          )}
          <button type="submit" className="btn primary">
            Add habit
          </button>
        </form>

        <ul className="habit-list">
          {habits.map((habit) => (
            <HabitEditCard
              key={habit.id}
              habit={habit}
              onUpdate={(patch) => onUpdateHabit(habit.id, patch)}
              onDelete={() => onDeleteHabit(habit.id)}
            />
          ))}
        </ul>
        {habits.length === 0 && (
          <p className="empty-hint" style={{ display: "block" }}>
            No habits yet — add your first one above.
          </p>
        )}
      </div>
    </div>
  );
}

function HabitEditCard({
  habit,
  onUpdate,
  onDelete,
}: {
  habit: Habit;
  onUpdate: (patch: Partial<Habit>) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(habit.name);
  const [interval, setInterval_] = useState(
    habit.recurrence.type === "interval" ? habit.recurrence.days : 2,
  );
  const weekdays =
    habit.recurrence.type === "weekly" ? habit.recurrence.weekdays : [];

  function commitName() {
    const trimmed = name.trim();
    if (trimmed && trimmed !== habit.name) onUpdate({ name: trimmed });
    else setName(habit.name);
  }

  function commitInterval() {
    const days = Math.max(1, interval || 2);
    if (
      habit.recurrence.type === "interval" &&
      days !== habit.recurrence.days
    ) {
      onUpdate({ recurrence: { type: "interval", days } });
    }
  }

  function handleRecurTypeChange(t: Recurrence["type"]) {
    if (t === "interval") {
      onUpdate({
        recurrence: { type: "interval", days: Math.max(1, interval || 2) },
      });
    } else if (t === "weekly") {
      const initial = weekdays.length ? weekdays : [mondayIndex(new Date())];
      onUpdate({ recurrence: { type: "weekly", weekdays: initial } });
    } else {
      onUpdate({ recurrence: { type: "daily" } });
    }
  }

  function toggleWeekday(idx: number) {
    const next = weekdays.includes(idx)
      ? weekdays.filter((w) => w !== idx)
      : [...weekdays, idx];
    onUpdate({
      recurrence: { type: "weekly", weekdays: next.sort((a, b) => a - b) },
    });
  }

  return (
    <li className="habit-edit-card">
      <div className="habit-edit-row">
        <input
          type="text"
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
        />
        <button
          type="button"
          className="btn danger"
          onClick={() => {
            if (
              confirm(
                `Delete habit "${habit.name}"? This also removes its history.`,
              )
            )
              onDelete();
          }}
        >
          Delete
        </button>
      </div>

      <div className="habit-edit-row">
        <label className="date-field">
          <span>Starts on</span>
          <input
            type="date"
            value={habit.startDate}
            onChange={(e) =>
              onUpdate({ startDate: e.target.value || habit.startDate })
            }
          />
        </label>
        <label className="date-field">
          <span>Ends on</span>
          <input
            type="date"
            value={habit.endDate || ""}
            onChange={(e) => onUpdate({ endDate: e.target.value || null })}
          />
        </label>
      </div>

      <div className="habit-edit-row">
        <label className="date-field">
          <span>Repeats</span>
          <select
            value={habit.recurrence.type}
            onChange={(e) =>
              handleRecurTypeChange(e.target.value as Recurrence["type"])
            }
          >
            <option value="daily">Every day</option>
            <option value="interval">Every N days</option>
            <option value="weekly">Specific weekdays</option>
          </select>
        </label>
        {habit.recurrence.type === "interval" && (
          <label className="date-field">
            <span>Every how many days</span>
            <input
              type="number"
              min={2}
              max={365}
              value={interval}
              onChange={(e) => setInterval_(parseInt(e.target.value, 10) || 2)}
              onBlur={commitInterval}
            />
          </label>
        )}
        {habit.recurrence.type === "weekly" && (
          <WeekdayPicker selected={weekdays} onToggle={toggleWeekday} />
        )}
      </div>
    </li>
  );
}
