"use client";

import { DOW_LABELS } from "@/lib/dates";

export default function WeekdayPicker({
  selected,
  onToggle,
}: {
  selected: number[];
  onToggle: (idx: number) => void;
}) {
  return (
    <div className="weekday-picker">
      {DOW_LABELS.map((label, idx) => (
        <button
          key={idx}
          type="button"
          className={"weekday-chip" + (selected.includes(idx) ? " active" : "")}
          onClick={() => onToggle(idx)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
