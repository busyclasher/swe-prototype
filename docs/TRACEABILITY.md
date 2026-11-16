# FR-to-Screen Traceability Matrix

"Verified" names the automated check that exercises the requirement: **U** = unit test in `tests/logic.test.js`, **E** = end-to-end step in `scripts/screenshots.mjs`. All checks passed on the final build (19 unit, 51 end-to-end).

| FR | Screen / component | Role | Interaction | Expected result | Verified |
|---|---|---|---|---|---|
| FR-01 | Manager Dashboard › "Weekly Workload by Teacher" table | Manager | Sign in | Every Teacher with Jobs count and allocated hours for the current week | E: UC05 |
| FR-02 | Manager Dashboard › "Lowest allocated Workload" | Manager | Sign in | Three lowest Teachers ranked (Isaac 2.0 h, Gabriel 2.5 h, Hui Min 4.0 h) | U: Workload figures; E: UC05 |
| FR-03 | Manager Dashboard › "Above 40 hours" card + table status + metric | Manager | Sign in | Chloe Ng and Farah Rahman flagged with the text "Above 40 hours", an icon, a striped bar and a red edge (not colour alone) | U; E: UC05 |
| FR-04 | Teacher Availability (Manager) | Manager | Choose Teacher (or All Teachers) and a date from today to 23 Dec | Availability ranges with Late/On time labels; read-only | E: FR-04 |
| FR-05 | Teacher Dashboard › "This week's allocated Jobs" | Teacher | Sign in | Own Jobs Mon–Sun grouped by day: time, Instrument, Studio, status | E: UC03 |
| FR-06 | Teacher Dashboard › "Total Workload – November 2026" | Teacher | Sign in | Own allocated hours for the current month | U; E: UC03 |
| FR-07 | My Availability › calendar + "Add Availability" | Teacher | Select a date within one month, choose From/To, Save | Entry appears on the date and the calendar count updates; dates outside the range are disabled; field errors for invalid times or overlaps | U: input validation; E: UC01 add, validation |
| FR-08 | My Availability › "Edit" on a saved entry | Teacher | Edit, change times, Save changes | The existing record is updated (not duplicated) | E: UC01 edit |
| FR-09 | Job Preferences | Teacher | Choose week; add preferred day/time rows and requested hours; Save; Edit | Saved summary for that week; the week chip shows "Recorded" | E: UC02 |
| FR-10 | My Availability (Late badge, deadline banner, pre-save warning); Manager Availability and Comparison | Teacher / Manager | Save December Availability after 19 Nov | Record marked "Late" | U: FR-10; E: UC01 add, FR-04 |
| FR-11 | Teacher Profiles | Manager | Select Teacher › Edit Profile › change Instruments, expertise, years › Save | Profile updates everywhere it is shown (comparison, dashboard Instruments, FR-26 check) | E: UC06 |
| FR-12 | Job Allocation › week picker + form | Manager | Select one week; enter the Job; Validate and allocate | Job saved only when all rules pass; the date must be in the selected week | E: UC07 success |
| FR-13 | Job Allocation › "2. Compare Teachers" | Manager | Toggle Teacher chips | Up to 3 cards; a 4th selection is refused with a message | E: UC07 compare |
| FR-14 | Comparison card › Availability (selected week) | Manager | Select Teacher | Per-day ranges, Late flagged | E: UC07 compare |
| FR-15 | Comparison card › Workload (selected week) | Manager | Select Teacher | Hours + threshold label | E: UC07 compare |
| FR-16 | Comparison card › Job Preference (selected week) | Manager | Select Teacher | Requested hours + preferred times, or "No Job Preference recorded" | E: UC07 compare |
| FR-17 | Comparison card › Location on [date] | Manager | Choose "Location on date" | Studio(s) and times where the Teacher is teaching that day | E: UC07 compare |
| FR-18 | Comparison card › Profile | Manager | Select Teacher | Instruments, expertise, years | E: UC07 compare |
| FR-19 | `validateAllocation` rule 1 | Manager | Isaac, Sat 28 Nov 10:00 AM | "…has no Availability on Sat 28 Nov…" | U + E |
| FR-20 | rule 2 | Manager | Daniel, Tue 24 Nov 8:30 AM | "…starts before opening (9:00 AM)…" plus boundary tests | U + E |
| FR-21 | rule 3 | Manager | Isaac, Thu 26 Nov | "…is a public holiday (Sample Public Holiday (mock data))…" | U + E |
| FR-22 | rule 4 | Manager | Isaac, Tue 24 Nov 7:00 PM, Studio 1 | "Isaac Koh already has Job J-… at 7:00 PM…" | U + E |
| FR-23 | rule 5 | Manager | Isaac, Wed 25 Nov 6:00 PM, Studio 2 | "Studio 2 is already in use by Job J-… (Farah Rahman…)" | U + E |
| FR-24 | rule 6 | Manager | Daniel, Drums, Studio 3 | "Drum Jobs must be held in the Studio with a drum kit (Studio 5)…" | U + E |
| FR-25 | rule 7 | Manager | Chloe, Mon 23 Nov 1:00 PM | "…continuous teaching block of 8 h (9:00 AM – 5:00 PM)…limit is 4 h…break of at least 1 h" | U (incl. 4 h/4.5 h/1 h-break edges) + E |
| FR-26 | rule 8 | Manager | Isaac, Violin | "Isaac Koh is not qualified to teach Violin. Qualified Instruments: Guitar, Voice." | U + E |
| FR-27 | Job Allocation › "Validation result" | Manager | Submit any invalid allocation | "Allocation rejected — n rules broken", each with FR id + specific reason, plus the full 8-rule checklist; nothing saved | E: all 8 scenarios |
| FR-28 | My Jobs › select Job › "Reject Job" | Teacher | Select own upcoming Job, Reject Job | Confirmation dialog opens | E: UC04 |
| FR-29 | Rejection dialog | Teacher | — | "Please discuss this Job with your Manager before confirming the rejection." with Cancel / Confirm rejection | E: UC04 |
| FR-30 | Store `rejectJob` → status `UNALLOCATED` | Teacher → Manager | Confirm rejection | Job leaves the Teacher's list and Workload; Manager sees it as Unallocated (dashboard count, Job list, "Job" dropdown). Cancel leaves it unchanged | E: UC04 + "Rejected Job appears as Unallocated" |
| FR-31 | Account Management | IT Administrator | Fill form, choose Teacher or Manager, Create account | Field-level validation (required, unique username/email, password ≥ 8, match); success panel; new account can sign in; IT Administrator not offered as a role | E: FR-31, new account sign-in |

## Use cases

| UC | Flow | Main path | Alternative/failure path shown |
|---|---|---|---|
| UC01 Submit Availability | Teacher › Availability | Add (Dec 14 → Late), Edit (Nov 25) | End before start; overlapping range; date out of range disabled |
| UC02 Record Job Preference | Teacher › Job Preferences | New week → save → edit | Missing times; hours not in 0.5 steps or > 60 |
| UC03 View Weekly Jobs and Workload | Teacher › Dashboard | Weekly Jobs + monthly total | New Teacher with no Jobs → empty state |
| UC04 Reject Job | Teacher › My Jobs | Select → Reject → warning → Confirm → Unallocated | Cancel keeps Job allocated |
| UC05 Monitor Staff Workload | Manager › Dashboard | Table, lowest 3, threshold | — |
| UC06 Update Teacher Profile | Manager › Teacher Profiles | Edit → Save | Empty years / no Instruments rejected |
| UC07 Allocate Weekly Jobs | Manager › Job Allocation | Week → compare → allocate → success | Each of the 8 rules; 4th comparison refused |
| FR-31 Create account | IT Admin › Account Management | Create Teacher/Manager → sign in | Duplicate username, missing fields |

## Access control (NFR-08 to NFR-10)

| Check | Where |
|---|---|
| Unauthenticated → redirected to login | `App.jsx` route guard (E: first step) |
| Wrong role → "Access denied" page | `ROUTES` role list (E: Teacher → /manager/allocation, Manager → /admin/accounts) |
| Actions re-check role | every action in `store.jsx` (`requireRole`) |
| Teacher sees only own data | Teacher pages read `session.teacherId` only; no Teacher id in URLs; `rejectJob`/`updateAvailability` refuse other Teachers' records |
