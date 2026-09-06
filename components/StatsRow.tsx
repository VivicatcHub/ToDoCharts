"use client";

export default function StatsRow({
  numHabits,
  completed,
  progressPct,
}: {
  numHabits: number;
  completed: number;
  progressPct: number;
}) {
  return (
    <section className="stats-row">
      <div className="stat-card">
        <span className="stat-label">Number of Habits</span>
        <span className="stat-value">{numHabits}</span>
      </div>
      <div className="stat-card">
        <span className="stat-label">Completed Habits</span>
        <span className="stat-value">{completed}</span>
      </div>
      <div className="stat-card progress-card">
        <span className="stat-label">Progress</span>
        <div className="progress-bar-outer">
          <div className="progress-bar-inner" />
          <div
            className="progress-bar-hide"
            style={{
              left: `${Math.min(100, progressPct)}%`,
            }}
          />
        </div>
      </div>
      <div className="stat-card">
        <span className="stat-label">Progress in %</span>
        <span className="stat-value">{progressPct.toFixed(2)}%</span>
      </div>
    </section>
  );
}
