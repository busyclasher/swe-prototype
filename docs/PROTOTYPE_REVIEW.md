# Sonara 2.0 Prototype Review

**Reviewed against:** `PROJECT_BRIEF.md` (scope, FR-01 to FR-31, NFR-01 to NFR-13, acceptance checklist) and `skills.md` (build rules, traceability, validation, UC04, responsive, handoff)
**Code reviewed:** commit `84e6c90` (`main`)
**Review date:** 16 Nov 2026

---

## 1. Summary

The prototype meets the brief. Every FR from FR-01 to FR-31 maps to a screen you can use and to an automated check. The eight allocation rules are implemented as one pure function. UC04 follows the required order. Role checks run at both the route level and the action level, and the NFR limitations are documented honestly.

**Recommendation:** fix finding **F1** and finding **F2** before the presentation. Both affect live demo paths. Then bring the team questions in section 7 to the team. The other findings are minor.

| Area | Status |
|---|---|
| FR-01 to FR-31 coverage | ✅ All 31 present and demonstrable |
| Eight allocation rules + exact failure reason | ✅ All eight run on every attempt, and every broken rule is reported with an FR id and a specific message |
| UC01 to UC07 + FR-31 flows | ✅ Main path and an alternative path for each |
| Role-based access (NFR-08 to NFR-10) | ✅ Route guard, Access denied page, and `requireRole` on every store action |
| Responsive (desktop / tablet / mobile) | ✅ No horizontal overflow at 1440 / 768 / 390 px, and dialogs fit |
| Deliverables 1 to 10 | ✅ All present in `README.md` and `docs/` |
| Mock data consistency | ⚠️ Seeded Unallocated Jobs cannot be allocated as they are (F1) |
| Demo script reliability | ⚠️ One optional step fails as written (F2) |

---

## 2. Verification performed

| Check | Command | Result |
|---|---|---|
| Unit tests (business logic) | `npm test` | **19/19 pass** |
| Production build | `npm run build` | Builds cleanly; 239.7 kB JS (74.2 kB gzipped) |
| End-to-end walkthrough + responsive checks | `npm run screenshots` (Chrome, headless) | **51/51 checks pass** |
| Code read-through | All files in `src/` and `tests/`, plus `docs/` | Findings in section 5 |
| Targeted data probes | Node scripts run against `createSeedData()` + `validateAllocation()` | Confirmed F1, F2, F5 |

The walkthrough tests UC01 to UC07, FR-31, all eight rejection scenarios, a successful allocation, a 4th comparison being refused, Access denied, lockout, sign-in with a new account, the mobile drawer, and overflow checks on every page at three widths.

---

## 3. Acceptance checklist (brief §14)

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | FR-01 to FR-31 represented | ✅ | `docs/TRACEABILITY.md`; section 4 below |
| 2 | NFR-01 to NFR-13 considered, limitations documented | ✅ | `docs/LIMITATIONS.md` (each NFR is marked demonstrable, simulated, or not met by design) |
| 3 | Three role-based logins work | ✅ | `src/pages/Login.jsx`, `HOME_ROUTE` in `src/lib/roles.js` |
| 4 | Role restrictions work in the UI | ✅ | `ROUTES` role lists in `src/App.jsx`; `requireRole` in `src/state/store.jsx` |
| 5 | Teacher cannot access another Teacher's data | ✅ | Teacher pages filter by `session.teacherId`; `rejectJob` and `updateAvailability` refuse other Teachers' records; `?job=<other id>` shows nothing |
| 6 | IT Administrator creates Teacher and Manager accounts | ✅ | `createAccount`; IT Administrator is not offered as a role (`CREATABLE_ROLES`) |
| 7 | All seven use cases demonstrable | ✅ | E2E steps UC01 to UC07 |
| 8 | Availability add and edit | ✅ | `addAvailability` / `updateAvailability`; an edit updates the record in place |
| 9 | Job Preferences record and edit | ✅ | `saveJobPreference` (upsert per Teacher and week) |
| 10 | Workload displays correctly | ✅ | Unit test "Workload figures for the demo week" |
| 11 | Comparison limited to three | ✅ | `MAX_COMPARE`; a 4th selection shows a message |
| 12 | All eight validation conditions | ✅ | `src/lib/validation.js`; one unit test and one E2E scenario per rule |
| 13 | Failed allocations show the exact rule | ✅ | Result panel lists each failure with its FR id, plus the full 8-rule checklist |
| 14 | UC04 shows the Manager-discussion warning | ✅ | `TeacherJobs.jsx` modal: "Please discuss this Job with your Manager before confirming the rejection." |
| 15 | Confirmed rejection marks the Job Unallocated | ✅ | `rejectJob` sets `status: UNALLOCATED`, `teacherId: null`; Cancel leaves the Job unchanged |
| 16 | Updates show consistently across views | ✅ | Single store; all views derive from `data` (no copied state) |
| 17 | Desktop, tablet and mobile usable | ✅ | 0 overflow failures; screenshots in `docs/screenshots/` |
| 18 | No dead buttons or broken navigation | ✅ | No dead controls found in the code read-through |
| 19 | Demo data can be reset | ✅ | Demo tools → Reset demo data (also clears lockouts and created accounts) |
| 20 | Runs without a backend | ✅ | Vite SPA, hash router, in-memory state only |

---

## 4. Functional requirements spot-check

The existing `docs/TRACEABILITY.md` is accurate. This review confirmed the following points in code:

- **FR-01 to FR-03:** `weeklyWorkloadRows` / `lowestWorkload` / `exceedsThreshold` (`> 40`, so exactly 40 h is "Within threshold"). Warnings use text, an icon and a striped bar, not colour alone (NFR-04).
- **FR-04:** Manager Availability is read-only and limited to today through `HORIZON_END` (23 Dec 2026).
- **FR-05 / FR-06:** The Teacher Dashboard reads only the signed-in Teacher's Jobs. The monthly total is the calendar month of the demo date.
- **FR-07 / FR-08 / FR-10:** Range limit, overlap check, and Late marking for following-month entries saved after the 19th. A deadline banner and a warning before saving are shown.
- **FR-09:** Week chips from the current week to the horizon week. Preferred times plus requested hours (in half-hour steps).
- **FR-11:** At least one Instrument is required, years must be a whole number from 0 to 60, and the change appears in comparison and in the FR-26 check.
- **FR-12 to FR-18:** Allocation is for one week at a time (enforced in the store). Comparison cards show Workload, Availability, Job Preference, Location on the chosen date, and Profile.
- **FR-19 to FR-27:** Time intervals are half-open `[start, end)` integer minutes. Availability ranges are merged before the coverage check. The continuous block merges gaps under 60 minutes. Opening-hour edges are unit-tested.
- **FR-28 to FR-30:** Select a Job → Reject Job → warning → Confirm or Cancel → Unallocated. The Manager dashboard count and the Job Allocation list update.
- **FR-31:** Required fields, username format, unique username and email, password of at least 8 characters with confirmation. A new account can sign in immediately.
- **No automatic allocation:** the Manager always picks the Teacher and the Studio.

---

## 5. Findings

Severity: **High** = can break the live demo or contradict the brief. **Medium** = a data or behaviour issue a lecturer could notice. **Low** = polish or a documentation gap.

### F1 — High — Seeded Unallocated Jobs cannot be allocated as they are
`src/data/seed.js` (the `unallocated` array) adds two Unallocated Jobs to the current week **after** generating the allocated Jobs, without checking them. Result:

| Job | Slot | Every qualified Teacher fails on |
|---|---|---|
| J-2353 | Wed 25 Nov, 11:00 AM, Piano, Studio 4 | Alice and Chloe: FR-22; Farah: FR-19, FR-25; Gabriel and Hui Min: FR-19 |
| J-2354 | Fri 27 Nov, 7:00 PM, Trumpet, Studio 3 | **Studio 3 is already used by allocated Job J-2261 at the same time**; Isaac fails only FR-23 |

J-2354 is a data inconsistency: an Unallocated Job and an allocated Job share a Studio and time. If a lecturer asks the team to "allocate one of the Unallocated Jobs", it cannot be done without changing its details.
**Fix:** move both Jobs to slots where at least one Teacher passes all eight rules (for example, J-2354 to a free Studio so Isaac can take it). Add a unit test: *every seeded Unallocated Job is allocatable by at least one Teacher*.

### F2 — High — Demo script step 4.5 fails as written
`docs/DEMO_SCRIPT.md` §4 step 5 says to load Alice's rejected Job (J-2053, Mon 23 Nov 10:00 AM, Violin, Studio 3) and "allocate it to someone qualified". Probe result: **every Teacher except Alice fails** (Farah and Isaac fail FR-19 because neither has Availability at 10:00 AM on Monday; everyone else also fails FR-26). Doing this live will show a rejection where the script expects a success.
**Fix (pick one):** (a) extend a Violin/Piano Teacher's Monday Availability in the seed so they can cover 10:00 AM, (b) change the script to choose a different Job to reject, or (c) present the step as an intended FR-19 failure.

### F3 — Medium — Loading an Unallocated Job lets the Manager change its details
In `JobAllocation.jsx`, `loadJob` fills the form, but date, time, Instrument and Studio stay editable. `allocateJob` then overwrites the existing Job with the new values. This goes beyond "allocate Jobs to Teachers" (FR-12): it edits the Job itself. See Q1.
**Fix if the team says Jobs are fixed:** disable those four fields while an existing Job is loaded, so only the Teacher (and possibly the Studio) can be chosen.

### F4 — Medium — Unallocated Jobs do not hold their Studio (assumption A5)
FR-23 counts allocated Jobs only. A Manager can therefore book a new Job into the Studio and time of an Unallocated Job, and the original Job then becomes impossible to allocate in its own slot. This is a reasonable default and it is documented, but it changes how FR-23 behaves. See Q2.

### F5 — Low — A new Teacher account changes the "lowest three" figures
A Teacher created by the IT Administrator has 0 h, so they go straight to the top of FR-02. Probe result: the list changes from *Isaac 2.0 h, Gabriel 2.5 h, Hui Min 4.0 h* to *new Teacher 0 h, Isaac, Gabriel*. The demo script quotes the first list. This is fine because the IT Administrator section comes last, but **reset demo data** if you go back to the Manager view after creating an account.

### F6 — Low — Editing an on-time Availability entry after the 19th marks it Late
`updateAvailability` sets `submittedOn` to the demo date, so editing an on-time December entry on 23 Nov makes it Late (assumption A4). This is defensible, but a lecturer may ask about it. See Q3.

### F7 — Low — Reset demo data does not clear page-local state
`resetDemoData` replaces the store data, but open pages keep their own state. For example, the Job Allocation result panel can still say "Job J-2355 allocated" after a reset, and comparison selections remain. Found by reading the code, not reproduced. **Workaround:** reset from the login page or navigate away after resetting. **Fix:** key the page content on a reset counter so it remounts.

### F8 — Low — "No past dates" is enforced only in the UI
The allocation form disables past dates (A10), but `allocateJob` in the store does not check them. This has no demo impact today because the demo date is a Monday. To match the "actions re-check rules" principle, add the same check in the store.

### F9 — Low — UML alignment not yet checked
`docs/LIMITATIONS.md` says the M2 class diagram and use-case documents were not available. The code names (`validateAllocation`, `rejectJob`, `JOB_STATUS.UNALLOCATED`, the `Availability`/`Job` fields) still need checking against the approved UML (brief §3; skills.md §12).

### Observations (no action needed)
- The login page lists demo passwords, including those of accounts created during the demo. This is intended and labelled "Simulated login".
- `npm run screenshots` overwrites the committed PNGs in `docs/screenshots/`. Run it only when you mean to refresh the deliverable screenshots.
- A Teacher can be allocated a Job they have just rejected. No requirement forbids this (see Q4).

---

## 6. NFR position (brief §9)

`docs/LIMITATIONS.md` matches the brief's "prototype limitation" rule. Nothing claims production guarantees.

| Category | NFRs | Prototype position |
|---|---|---|
| Demonstrated | NFR-02 (measured check time shown), NFR-04 | Visible in the UI |
| Simulated (labelled) | NFR-08, 09, 10, 12, 13 | Route and action guards, 30-minute idle timer plus a "simulate" tool, 5-failure lockout with a countdown |
| Partly demonstrable | NFR-01 | Small static bundle; no load test |
| Needs real users | NFR-03 | Needs a usability test with at least 5 participants |
| Not met by design | NFR-05, 06, 07, 11 | No server, no persistence, plain-text demo passwords (stated on the account form) |

---

## 7. Questions for the team

These come from skills.md §12. Each one changes behaviour, so please confirm before the final build.

1. **Q1 (F3):** When a Manager allocates an existing Unallocated Job, may they change its date, time, Instrument or Studio, or only assign a Teacher?
2. **Q2 (F4):** Does an Unallocated Job still reserve its Studio for FR-23?
3. **Q3 (F6):** Should editing an Availability entry after the deadline mark it Late, or should the original submission date be kept?
4. **Q4:** May a rejected Job be allocated back to the Teacher who rejected it?
5. **Q5 (assumption A1):** Is FR-17 "Location" the Studio where the Teacher is teaching on that date (current behaviour), or something else in the UML?
6. **Q6 (assumption A3):** Is the FR-25 reading correct: gaps under 1 hour do not end a teaching block, and each block may be at most 4 hours?

---

## 8. Recommended actions before the presentation

| Priority | Action | Effort |
|---|---|---|
| 1 | Fix the seeded Unallocated Jobs (F1) and add a unit test for "allocatable by at least one Teacher" | Small |
| 2 | Fix the seed or the script for demo step 4.5 (F2); rehearse the full script once after reset | Small |
| 3 | Get answers to Q1 to Q6; apply F3 and F4 changes if needed and update `LIMITATIONS.md` | Small–Medium |
| 4 | Add a note to `DEMO_SCRIPT.md`: reset demo data before going back to the Manager after FR-31 (F5), and after any reset navigate away from Job Allocation (F7) | Trivial |
| 5 | Cross-check names against the approved UML once it is shared (F9) | Medium |
| 6 | Optional: add the store-level past-date check (F8) and remount pages on reset (F7) | Small |
