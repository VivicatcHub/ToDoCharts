"use client";

import type { TristateState } from "@/lib/types";

const GLYPH: Record<TristateState, string> = { none: "", done: "✓", skip: "–" };
const LABEL: Record<TristateState, string> = {
  none: "not done",
  done: "done",
  skip: "skipped (does not count)",
};

export default function TristateBox({
  state,
  onClick,
  large,
  doneColor,
}: {
  state: TristateState;
  onClick: () => void;
  large?: boolean;
  doneColor?: string;
}) {
  return (
    <button
      type="button"
      className={`tristate-box state-${state}${large ? " lg" : ""}`}
      aria-label={LABEL[state]}
      title={LABEL[state]}
      onClick={onClick}
      style={
        state === "done" && doneColor
          ? { background: doneColor, borderColor: doneColor }
          : undefined
      }
    >
      {GLYPH[state]}
    </button>
  );
}
