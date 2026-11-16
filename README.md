# Sonara 2.0 – Interactive Prototype (INF2001)

Frontend-only, responsive React prototype of the Sonara 2.0 Management System.
It covers the Teacher, Manager and IT Administrator workflows (FR-01 to FR-31) using in-memory mock data.
There is no backend, API or database.

## Run locally

Requires Node.js 18+.

```bash
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

| Command | Purpose |
|---|---|
| `npm test` | 19 unit tests for the business logic (allocation rules, Workload, late Availability, demo scenarios) |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build |
| `npm run screenshots` | Run `npm run build` first. Drives Microsoft Edge/Chrome through every use case (51 checks), checks layouts at 1440/768/390 px for horizontal overflow, and writes `docs/screenshots/` |

## Demonstration accounts

| Role | Username | Password | Notes |
|---|---|---|---|
| Teacher | `alice.tan` | `teacher123` | Main Teacher demo account |
| Teacher | `isaac.koh` | `teacher123` | Lowest Workload; his December Availability is Late |
| Teacher | `chloe.ng`, `farah.rahman` | `teacher123` | Above the 40-hour threshold |
| Teacher | `benjamin.lee`, `daniel.wong`, `gabriel.lim`, `huimin.chua` | `teacher123` | |
| Manager | `grace.ho` | `manager123` | |
| IT Administrator | `it.admin` | `admin123` | |

Accounts created by the IT Administrator can sign in straight away. They last until **Demo tools → Reset demo data** or a page reload.

## Demo clock

The prototype runs on a fixed date, **Monday 23 November 2026, 8:00 AM** (`src/config.js`), so the scripted demo is the same every time.
That date falls after the 19th, so December Availability saved during the demo is marked **Late** (FR-10).
The demo date is always shown in the top bar.

## Project structure

```
src/
  config.js               business-rule values + demo clock
  lib/                    pure logic (no React): time, roles, workload, validation (8 rules), availability
  data/seed.js            single mock-data source; Jobs are generated only if they pass the 8 rules
  state/store.jsx         in-memory state + role-checked actions (login, lockout, timeout, CRUD, reset)
  state/router.js         hash router
  components/             AppShell, UI kit (Button, Badge, Card, Modal, Toast, Field…), JobList, MonthCalendar
  pages/teacher|manager|admin/
tests/logic.test.js       node:test unit tests
scripts/screenshots.mjs   end-to-end walkthrough + screenshots
docs/                     traceability matrix, demo script, limitations, screenshots
```

See `docs/TRACEABILITY.md`, `docs/DEMO_SCRIPT.md` and `docs/LIMITATIONS.md`.
