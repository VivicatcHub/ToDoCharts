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
  indicator,
}: {
  state: TristateState;
  onClick?: () => void;
  large?: boolean;
  doneColor?: string;
  indicator?: boolean;
}) {
  const className = `tristate-box state-${state}${large ? " lg" : ""}${
    indicator ? " static" : ""
  }`;
  const style =
    state === "done" && doneColor
      ? { background: doneColor, borderColor: doneColor }
      : undefined;

  if (indicator) {
    return (
      <span className={className} style={style} aria-hidden="true">
        {GLYPH[state]}
      </span>
    );
  }

  return (
    <button
      type="button"
      className={className}
      aria-label={LABEL[state]}
      title={LABEL[state]}
      onClick={onClick}
      style={style}
    >
      {GLYPH[state]}
    </button>
  );
}
