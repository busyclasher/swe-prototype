# Prototype Limitations, NFR Coverage and Assumptions

## Limitations
This is a frontend-only prototype with in-memory mock data. It **does not** provide or prove:
- production security
- persistence (a page reload restores the initial data)
- backups
- server performance
- availability

Login, role checks, lockout and timeout are **simulated in the browser** to demonstrate behaviour. They can be bypassed with developer tools and are not security controls.

## NFR coverage

| NFR | Status | What the prototype shows | What needs production infrastructure |
|---|---|---|---|
| NFR-01 page load ≤ 2 s (95%, 15 users) | Partially demonstrable | Static SPA, ~74 kB gzipped JS; pages render instantly locally | Load test against a deployed server with 15 concurrent users |
| NFR-02 allocation checks ≤ 3 s | Demonstrable (client side) | Result panel shows measured check time (typically < 5 ms) | Measure end-to-end with real data volumes and network |
| NFR-03 80% task completion in 3 min | Not verifiable here | UI designed for it: labelled steps, inline errors, consistent controls | Usability test with ≥ 5 first-time users |
| NFR-04 not colour alone | Demonstrated | Every status has text + icon (Above 40 hours, Late, Unallocated, Passed/Failed); striped over-threshold bars; focus rings | Formal accessibility audit |
| NFR-05 99% availability | Not verifiable | — | Hosting, monitoring |
| NFR-06 daily backups | Not verifiable | — | Database backup jobs |
| NFR-07 saved data survives restart | **Not met by design** | Saved data stays consistent across all views during a session | Database persistence |
| NFR-08 unauthenticated → login only | Simulated | Route guard redirects to login | Server-side session enforcement |
| NFR-09 role restriction | Simulated | Role-based nav, Access denied page, role re-check in every action | Server-side authorisation |
| NFR-10 Teacher data isolation | Simulated | Teacher pages only use the signed-in Teacher's id; actions refuse other Teachers' records | Server-side authorisation |
| NFR-11 salted password hashes | **Not met by design** | Demo passwords are plain text in memory (stated on the account form) | Hashing (e.g. bcrypt/Argon2) on the server |
| NFR-12 30-minute inactivity timeout | Simulated | Real 30-min idle timer + "Simulate 30-minute inactivity" demo tool | Server session expiry |
| NFR-13 lock after 5 failures for 15 min | Simulated | 5 wrong passwords lock an account with a live countdown; Reset clears it | Server-side lockout |

## Assumptions made (please confirm with the team)
These are defaults for details the brief did not specify. Each is isolated in code so it is easy to change.

1. **A1 – Location (FR-17)** means the Studio(s) where the Teacher has allocated Jobs on the selected date. *The brief doesn't define Location; if it means something else (e.g. a campus or branch), the comparison card needs changing.*
2. **A2 – "One month ahead"** = today to the same date next month inclusive (23 Nov – 23 Dec). Allocation and Job Preference weeks run from the current week to the week containing that date.
3. **A3 – Continuous-teaching limit (FR-25):** gaps shorter than 1 hour do not end a block. A block is measured from its first start to its last end and must be ≤ 4 h.
4. **A4 – Late (FR-10):** an entry is Late when it is for the month after the submission month and is saved after the 19th (on the 19th is on time). Editing counts as re-submitting, so edits after the deadline are marked Late.
5. **A5 – Unallocated Jobs** keep their date, time, Instrument and Studio but have no Teacher. They do not count towards Workload or block a Studio (FR-23 checks allocated Jobs only).
6. **A6 – Job rejection** is allowed only for upcoming Jobs (not already started at the demo time). The rejected Job is removed from the Teacher's schedule; there is no reassignment or notification.
7. **A7 – Workload** = allocated Jobs × 30 min. "Current month" = calendar month of the demo date.
8. **A8 – Job Preference** = one or more preferred day/time ranges plus requested hours (0.5–60, in half hours) per week.
9. **A9 – Availability** may be outside opening hours (the opening-hours rule applies to Jobs). Ranges for the same date may not overlap. There is no delete action, because only add/edit are required.
10. **A10 – Past dates:** allocation dates before the demo date are disabled in the form.
11. **A11 – Public holidays** are a labelled mock list: 26 Nov 2026 (sample), 25 Dec 2026, 1 Jan 2027.
12. **A12 – New Teacher accounts** create a Teacher Profile with no Instruments. A Manager must add Instruments before Jobs can be allocated (FR-26 would reject them).
13. **A13 – Fixed demo clock** of Mon 23 Nov 2026 08:00 so the demo is repeatable (`src/config.js`).

## Not cross-checked
The M2 class diagram, component diagram and formal use-case documents were not provided. Terminology follows the brief (Teacher, Manager, IT Administrator, Job, Availability, Job Preference, Workload, Studio, Profile, Unallocated). Code names such as `validateAllocation` and `rejectJob` should be aligned with the approved class names once shared.
