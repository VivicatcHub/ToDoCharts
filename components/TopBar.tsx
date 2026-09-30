"use client";

export default function TopBar({
  monthLabel,
  onPrevMonth,
  onNextMonth,
  onToday,
  onOpenSettings,
  splitView,
  onToggleSplitView,
}: {
  monthLabel: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onOpenSettings: () => void;
  splitView: boolean;
  onToggleSplitView: () => void;
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

      <div className="topbar-actions">
        <button
          className={
            "icon-btn view-toggle desktop-only" + (splitView ? " active" : "")
          }
          aria-label={
            splitView ? "Switch to full view" : "Switch to split view"
          }
          title={splitView ? "Full view" : "Split view (desktop + phone)"}
          aria-pressed={splitView}
          onClick={onToggleSplitView}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <rect
              x="1.5"
              y="2.5"
              width="15"
              height="13"
              rx="2"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <line
              x1="11.5"
              y1="2.5"
              x2="11.5"
              y2="15.5"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
        </button>
        <button
          className="icon-btn settings-btn"
          aria-label="Settings"
          onClick={onOpenSettings}
        >
          &#9881;
        </button>
      </div>
    </header>
  );
}
