"use client";

export default function TopBar({
  monthLabel,
  mobileDateLabel,
  onPrevMonth,
  onNextMonth,
  onToday,
  onOpenSettings,
}: {
  monthLabel: string;
  mobileDateLabel: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-dot" />
        <span>ToDoCharts</span>
      </div>

      <div className="month-nav desktop-only">
        <button
          className="icon-btn"
          aria-label="Previous month"
          onClick={onPrevMonth}
        >
          &#8249;
        </button>
        <h1>{monthLabel}</h1>
        <button
          className="icon-btn"
          aria-label="Next month"
          onClick={onNextMonth}
        >
          &#8250;
        </button>
        <button className="btn ghost" onClick={onToday}>
          Today
        </button>
      </div>

      <div className="today-label mobile-only">{mobileDateLabel}</div>

      <button
        className="icon-btn settings-btn"
        aria-label="Settings"
        onClick={onOpenSettings}
      >
        &#9881;
      </button>
    </header>
  );
}
