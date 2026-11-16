// Availability rules (FR-07, FR-08, FR-10).

import { AVAILABILITY_DEADLINE_DAY, DEMO_TODAY, HORIZON_END } from '../config.js';
import { addMonths, fmtDate, fmtRange, monthKey, monthLabel, overlaps, parseDate } from './time.js';

/** Dates a Teacher may add/edit, and a Manager may view: today up to one month ahead. */
export const isWithinHorizon = (dateIso) => dateIso >= DEMO_TODAY && dateIso <= HORIZON_END;

/** Deadline for submitting Availability for the month after `submittedOn`'s month. */
export function deadlineFor(targetDateIso) {
  const prevMonth = addMonths(`${monthKey(targetDateIso)}-01`, -1);
  return `${monthKey(prevMonth)}-${String(AVAILABILITY_DEADLINE_DAY).padStart(2, '0')}`;
}

/**
 * FR-10: Availability for the following month is late when submitted after
 * the deadline (the 19th of the month before).
 */
export function isLateSubmission(targetDateIso, submittedOnIso) {
  const followingMonth = monthKey(addMonths(`${monthKey(submittedOnIso)}-01`, 1));
  if (monthKey(targetDateIso) !== followingMonth) return false;
  return parseDate(submittedOnIso).getDate() > AVAILABILITY_DEADLINE_DAY;
}

/** Human explanation of the deadline for a target month, e.g. for December 2026. */
export function deadlineText(targetMonthKey) {
  return `Availability for ${monthLabel(targetMonthKey)} is due by ${fmtDate(deadlineFor(`${targetMonthKey}-01`))}. Later submissions are marked Late.`;
}

/**
 * Field-level validation for an Availability entry.
 * @returns {Record<string,string>} errors keyed by field
 */
export function validateAvailabilityInput({ date, start, end }, existingForTeacher, editingId = null) {
  const errors = {};
  if (!date) errors.date = 'Select a date.';
  else if (!isWithinHorizon(date))
    errors.date = `Choose a date from ${fmtDate(DEMO_TODAY)} to ${fmtDate(HORIZON_END)} (up to one month ahead).`;
  if (start === '' || start == null) errors.start = 'Select a start time.';
  if (end === '' || end == null) errors.end = 'Select an end time.';
  if (!errors.start && !errors.end && Number(end) <= Number(start)) errors.end = 'End time must be after the start time.';
  if (!Object.keys(errors).length) {
    const clash = existingForTeacher.find(
      (a) => a.id !== editingId && a.date === date && overlaps(Number(start), Number(end), a.start, a.end),
    );
    if (clash)
      errors.start = `Overlaps your existing Availability ${fmtRange(clash.start, clash.end)} on this date. Edit that entry instead.`;
  }
  return errors;
}
