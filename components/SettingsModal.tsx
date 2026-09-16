"use client";

import { useEffect, useState, type FormEvent } from "react";
import { mondayIndex } from "@/lib/dates";
import { describeRecurrence, uid } from "@/lib/habits";
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

function TrashIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 7h16M10 7V5h4v2M6 7l1 13h10l1-13M10 11v6M14 11v6" />
    </svg>
  );
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

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

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
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <div className="modal-header">
          <div>
            <h2 id="settings-title">Settings</h2>
            <p className="subtitle">Create habits and tune their schedules</p>
          </div>
          <button className="icon-btn" aria-label="Close" onClick={onClose}>
            &#10005;
          </button>
        </div>

        <div className="modal-body">
          <section className="settings-section">
            <h3 className="section-title">Add a habit</h3>
            <form className="add-habit-form" onSubmit={handleSubmit}>
              <div className="field-grid">
                <label className="field full">
                  <span>Habit name</span>
                  <input
                    type="text"
                    placeholder="e.g. Read 20 minutes"
                    required
                    maxLength={60}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Starts on</span>
                  <input
                    type="date"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Ends on (optional)</span>
                  <input
                    type="date"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                  />
                </label>
                <label className="field">
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
                  <label className="field">
                    <span>Every how many days</span>
                    <input
                      type="number"
                      min={2}
                      max={365}
                      value={interval}
                      onChange={(e) =>
                        setInterval_(
                          Math.max(1, parseInt(e.target.value, 10) || 2),
                        )
                      }
                    />
                  </label>
                )}
                {recurType === "weekly" && (
                  <div className="field full">
                    <span>On these days</span>
                    <WeekdayPicker
                      selected={weekdays}
                      onToggle={toggleWeekday}
                    />
                  </div>
                )}
              </div>
              <button type="submit" className="btn primary block">
                Add habit
              </button>
            </form>
          </section>

          <section className="settings-section">
            <h3 className="section-title">
              Your habits
              <span className="count-badge">{habits.length}</span>
            </h3>

            {habits.length === 0 ? (
              <div className="empty-state">
                <span className="emoji" aria-hidden="true">
                  ✦
                </span>
                <span className="title">No habits yet</span>
                <span className="desc">
                  Add your first habit above — it will show up in the month grid
                  and in your daily view right away.
                </span>
              </div>
            ) : (
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
            )}
          </section>
        </div>
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
      <div className="habit-edit-head">
        <input
          type="text"
          maxLength={60}
          aria-label="Habit name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
        />
        <button
          type="button"
          className="icon-btn danger"
          aria-label={`Delete ${habit.name}`}
          title="Delete habit"
          onClick={() => {
            if (
              confirm(
                `Delete habit "${habit.name}"? This also removes its history.`,
              )
            )
              onDelete();
          }}
        >
          <TrashIcon />
        </button>
      </div>

      <span className="recurrence-tag">
        {describeRecurrence(habit.recurrence)}
        {habit.endDate ? ` · until ${habit.endDate}` : ""}
      </span>

      <div className="field-grid">
        <label className="field">
          <span>Starts on</span>
          <input
            type="date"
            value={habit.startDate}
            onChange={(e) =>
              onUpdate({ startDate: e.target.value || habit.startDate })
            }
          />
        </label>
        <label className="field">
          <span>Ends on</span>
          <input
            type="date"
            value={habit.endDate || ""}
            onChange={(e) => onUpdate({ endDate: e.target.value || null })}
          />
        </label>
        <label className="field">
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
          <label className="field">
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
          <div className="field full">
            <span>On these days</span>
            <WeekdayPicker selected={weekdays} onToggle={toggleWeekday} />
          </div>
        )}
      </div>
    </li>
  );
}
