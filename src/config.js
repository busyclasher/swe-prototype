// Central business-rule values and demo clock.
// Values come from PROJECT_BRIEF.md section 6 (approved M2 values).

import { addMonths, weekStart } from './lib/time.js';

/**
 * Fixed demonstration "today". The prototype uses a fixed clock so the
 * scripted presentation is repeatable on any day. Monday 23 Nov 2026 is
 * after the 19th, so Availability added for December shows the Late label
 * (FR-10). Change this one value to move the whole demo in time.
 */
export const DEMO_TODAY = '2026-11-23';
export const DEMO_NOW_MINUTES = 8 * 60; // 08:00 on DEMO_TODAY

export const CURRENT_WEEK_START = weekStart(DEMO_TODAY);
/** "Up to one month ahead" (FR-04, FR-07, FR-08): today to the same date next month, inclusive. */
export const HORIZON_END = addMonths(DEMO_TODAY, 1);

export const JOB_MINUTES = 30;

/** Opening hours in minutes after midnight. Mon-Fri 9:00-21:00, Sat-Sun 8:00-21:00. */
export const OPENING_HOURS = {
  weekday: { open: 9 * 60, close: 21 * 60 },
  weekend: { open: 8 * 60, close: 21 * 60 },
};

/** At most 4 continuous hours, then a break of at least 1 hour (FR-25). */
export const CONTINUOUS_LIMIT_MINUTES = 4 * 60;
export const MIN_BREAK_MINUTES = 60;

/** Workload threshold: more than 40 allocated hours in one week (FR-03). */
export const WORKLOAD_THRESHOLD_HOURS = 40;

/** Availability for the following month is late if submitted after this day of the month (FR-10). */
export const AVAILABILITY_DEADLINE_DAY = 19;

/** Prototype demonstrations of NFR-12 and NFR-13. */
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
export const LOCKOUT_ATTEMPTS = 5;
export const LOCKOUT_MS = 15 * 60 * 1000;

export const MAX_COMPARE = 3;
