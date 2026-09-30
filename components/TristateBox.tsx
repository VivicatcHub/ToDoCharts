"use client";

import type { TristateState } from "@/lib/types";

const GLYPH: Record<TristateState, string> = {
  none: "",
  done: "✓",
  fail: "✕",
  skip: "–",
};
const LABEL: Record<TristateState, string> = {
  none: "not filled",
  done: "done",
  fail: "failed",
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
  const color = doneColor && state === "fail" ? darken(doneColor) : doneColor;
  const style =
    color && (state === "done" || state === "fail")
      ? { background: color, borderColor: color }
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

function darken(color: string): string {
  return `color-mix(in srgb, ${color} 45%, #000)`;
}
