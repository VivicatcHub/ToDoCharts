# ToDoCharts

A habit tracker with a monthly grid, a daily-progress chart, and per-habit stats — built with Next.js (App Router), React, TypeScript, and Tailwind CSS. All data is stored in the browser's `localStorage`; there is no backend.

Ported from an earlier vanilla HTML/CSS/JS version (see `PLAN.md` for the original spec and `image.png` for the Google Sheets reference this design is based on).

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

- Auto-generated month grid with weekly color bands, a tristate checkbox per habit/day (not done → done → skipped), and per-habit/day/summary percentages.
- Daily progress line chart (canvas) for the selected month.
- Settings modal to add/edit/delete habits, each with a start date, optional end date, and a recurrence rule (every day, every N days, or specific weekdays). A habit only counts in stats from its start date onward.
- Responsive: desktop shows the full month grid; mobile shows a single-day view with prev/next navigation.

## Project structure

- `app/` — Next.js App Router entry (`layout.tsx`, `page.tsx`, `globals.css`).
- `components/` — UI components (`App`, `TopBar`, `StatsRow`, `ProgressChart`, `MonthGrid`, `DayView`, `SettingsModal`, `WeekdayPicker`, `TristateBox`).
- `lib/` — pure date/habit domain logic (`dates.ts`, `habits.ts`, `types.ts`) and the `useLocalStorageState` hook.

`components/App.tsx` is rendered client-only (`next/dynamic` with `ssr: false`) since the app's state lives entirely in `localStorage` and today's date is resolved in the browser.
