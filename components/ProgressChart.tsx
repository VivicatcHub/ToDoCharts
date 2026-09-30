"use client";

import { useEffect, useRef } from "react";
import { WEEK_COLORS } from "@/lib/dates";
import type { PerDayStat, Week } from "@/lib/types";

export default function ProgressChart({
  perDay,
  weeks,
}: {
  perDay: PerDayStat[];
  weeks: Week[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    function draw() {
      const canvas = canvasRef.current;
      if (!canvas || !canvas.parentElement) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const cssWidth = canvas.parentElement.clientWidth - 18 * 2;
      const cssHeight = 140;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = cssWidth * dpr;
      canvas.height = cssHeight * dpr;
      canvas.style.width = cssWidth + "px";
      canvas.style.height = cssHeight + "px";
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, cssWidth, cssHeight);

      const padding = { top: 10, right: 14, bottom: 20, left: 34 };
      const w = cssWidth - padding.left - padding.right;
      const h = cssHeight - padding.top - padding.bottom;
      const data = perDay;
      if (data.length === 0) return;

      const styles = getComputedStyle(document.documentElement);
      const gridColor = styles.getPropertyValue("--border").trim() || "#2a2f3a";
      const dayColors = weeks.flatMap((week, wi) =>
        week.map(
          () =>
            styles
              .getPropertyValue(WEEK_COLORS[wi % WEEK_COLORS.length])
              .trim() || "#4a90d9",
        ),
      );
      const dimColor =
        styles.getPropertyValue("--text-dim").trim() || "#9aa1b1";

      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 1;
      ctx.fillStyle = dimColor;
      ctx.font = "11px sans-serif";
      [0, 50, 100].forEach((pct) => {
        const y = padding.top + h - (pct / 100) * h;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + w, y);
        ctx.stroke();
        ctx.fillText(`${pct}%`, 2, y + 4);
      });

      const xAt = (i: number) =>
        padding.left + (i / Math.max(1, data.length - 1)) * w;
      const yAt = (i: number) =>
        padding.top + h - (Math.min(100, data[i].pct) / 100) * h;

      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      for (let i = 1; i < data.length; i++) {
        const [x0, y0, x1, y1] = [xAt(i - 1), yAt(i - 1), xAt(i), yAt(i)];
        if (dayColors[i - 1] === dayColors[i]) {
          ctx.strokeStyle = dayColors[i];
        } else {
          const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
          gradient.addColorStop(0, dayColors[i - 1]);
          gradient.addColorStop(1, dayColors[i]);
          ctx.strokeStyle = gradient;
        }
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      }

      ctx.fillStyle = dimColor;
      const step = Math.max(1, Math.round(data.length / 8));
      data.forEach((d, i) => {
        if (i % step !== 0 && i !== data.length - 1) return;
        const x = padding.left + (i / Math.max(1, data.length - 1)) * w;
        ctx.fillText(String(i + 1), x - 4, cssHeight - 4);
      });
    }

    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [perDay, weeks]);

  return (
    <section className="chart-card">
      <h2>Daily progress this month</h2>
      <canvas ref={canvasRef} height={140} />
    </section>
  );
}
