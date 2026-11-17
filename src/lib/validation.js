// Job allocation validation: the eight business rules (FR-19 to FR-26)
// and the rule-specific explanation shown to the Manager (FR-27).
//
// validateAllocation() is pure: it never changes data. All eight checks are
// always run so the Manager sees every broken rule, not just the first.

import {
  CONTINUOUS_LIMIT_MINUTES,
  JOB_MINUTES,
  MIN_BREAK_MINUTES,
  OPENING_HOURS,
} from '../config.js';
import { fmtDate, fmtDuration, fmtRange, fmtTime, isWeekend, mergeIntervals, overlaps } from './time.js';
import { isAllocated } from './workload.js';

export const RULES = [
  { id: 'AVAILABILITY', fr: 'FR-19', label: 'Teacher Availability covers the whole Job' },
  { id: 'OPENING_HOURS', fr: 'FR-20', label: 'Job is entirely within opening hours' },
  { id: 'PUBLIC_HOLIDAY', fr: 'FR-21', label: 'Job date is not a public holiday' },
  { id: 'TEACHER_OVERLAP', fr: 'FR-22', label: "No overlap with the Teacher's other Jobs" },
  { id: 'STUDIO_OVERLAP', fr: 'FR-23', label: 'No overlap with another Job in the same Studio' },
  { id: 'DRUM_KIT', fr: 'FR-24', label: 'Drum Jobs only in the Studio with a drum kit' },
  { id: 'CONTINUOUS_LIMIT', fr: 'FR-25', label: 'Continuous-teaching limit is not breached' },
  { id: 'QUALIFICATION', fr: 'FR-26', label: 'Teacher is qualified for the Instrument' },
];

export const DRUM_INSTRUMENT = 'Drums';

export const openingHoursFor = (dateIso) => (isWeekend(dateIso) ? OPENING_HOURS.weekend : OPENING_HOURS.weekday);

const pass = (message) => ({ passed: true, message });
const fail = (message) => ({ passed: false, message });

/**
 * @param {{teacherId:string,date:string,start:number,instrument:string,studioId:string,id?:string}} job
 * @param {{teachers:any[],studios:any[],jobs:any[],availability:any[],holidays:any[]}} data
 * @returns {{ok:boolean, checks:Array, failures:Array, end:number}}
 */
export function validateAllocation(job, data) {
  const { teachers, studios, jobs, availability, holidays } = data;
  const teacher = teachers.find((t) => t.id === job.teacherId);
  const studio = studios.find((s) => s.id === job.studioId);
  const start = job.start;
  const end = start + JOB_MINUTES;
  const when = `${fmtDate(job.date)}, ${fmtRange(start, end)}`;
  const tName = teacher ? teacher.name : 'The selected Teacher';
  const sameDayAllocated = jobs.filter((j) => j.id !== job.id && j.date === job.date && isAllocated(j));
  const teacherJobs = sameDayAllocated.filter((j) => j.teacherId === job.teacherId);
  const teacherName = (id) => teachers.find((t) => t.id === id)?.name ?? 'another Teacher';
  const studioName = (id) => studios.find((s) => s.id === id)?.name ?? id;

  const results = {};

  // 1. FR-19 Availability covers the complete Job interval.
  const ranges = mergeIntervals(
    availability.filter((a) => a.teacherId === job.teacherId && a.date === job.date),
  );
  const covering = ranges.find((r) => r.start <= start && r.end >= end);
  results.AVAILABILITY = covering
    ? pass(`Covered by Availability ${fmtRange(covering.start, covering.end)}.`)
    : fail(
        ranges.length
          ? `${tName} has no Availability covering ${when}. Availability on that date: ${ranges
              .map((r) => fmtRange(r.start, r.end))
              .join(', ')}.`
          : `${tName} has no Availability on ${fmtDate(job.date)}, so the Job at ${fmtRange(start, end)} is not covered.`,
      );

  // 2. FR-20 Entirely within opening hours.
  const hours = openingHoursFor(job.date);
  const dayType = isWeekend(job.date) ? 'Saturday and Sunday' : 'Monday to Friday';
  if (start >= hours.open && end <= hours.close) {
    results.OPENING_HOURS = pass(`Within opening hours ${fmtRange(hours.open, hours.close)}.`);
  } else {
    const which = start < hours.open ? `starts before opening (${fmtTime(hours.open)})` : `ends after closing (${fmtTime(hours.close)})`;
    results.OPENING_HOURS = fail(
      `The Job runs ${fmtRange(start, end)} and ${which}. Opening hours on ${dayType} are ${fmtRange(hours.open, hours.close)}.`,
    );
  }

  // 3. FR-21 Not a public holiday.
  const holiday = holidays.find((h) => h.date === job.date);
  results.PUBLIC_HOLIDAY = holiday
    ? fail(`${fmtDate(job.date)} is a public holiday (${holiday.name}). The school is closed on public holidays.`)
    : pass('Not a public holiday.');

  // 4. FR-22 No overlap with the Teacher's other Jobs.
  const tClash = teacherJobs.find((j) => overlaps(start, end, j.start, j.end));
  results.TEACHER_OVERLAP = tClash
    ? fail(
        `${tName} already has Job ${tClash.id} (${tClash.instrument}, ${studioName(tClash.studioId)}) at ${fmtRange(tClash.start, tClash.end)} on ${fmtDate(job.date)}.`,
      )
    : pass(`${tName} has no other Job at this time.`);

  // 5. FR-23 No overlap with another Job in the same Studio.
  const sClash = sameDayAllocated.find((j) => j.studioId === job.studioId && overlaps(start, end, j.start, j.end));
  results.STUDIO_OVERLAP = sClash
    ? fail(
        `${studioName(job.studioId)} is already in use by Job ${sClash.id} (${teacherName(sClash.teacherId)}, ${sClash.instrument}) at ${fmtRange(sClash.start, sClash.end)}. Only one Teacher may use a Studio at a time.`,
      )
    : pass(`${studio ? studio.name : 'Studio'} is free at this time.`);

  // 6. FR-24 Drum Job only in a Studio with a drum kit.
  if (job.instrument === DRUM_INSTRUMENT && !studio?.hasDrumKit) {
    const drumStudio = studios.find((s) => s.hasDrumKit);
    results.DRUM_KIT = fail(
      `Drum Jobs must be held in the Studio with a drum kit${drumStudio ? ` (${drumStudio.name})` : ''}. ${studio ? studio.name : 'The selected Studio'} has no drum kit.`,
    );
  } else {
    results.DRUM_KIT = pass(job.instrument === DRUM_INSTRUMENT ? `${studio.name} has a drum kit.` : 'Not a drum Job.');
  }

  // 7. FR-25 Continuous-teaching limit: max 4 h per block; blocks must be separated
  //    by a break of at least 1 hour. Gaps shorter than 1 h do not count as a break.
  const block = continuousBlockWith(teacherJobs, start, end);
  const blockLen = block.end - block.start;
  results.CONTINUOUS_LIMIT =
    blockLen > CONTINUOUS_LIMIT_MINUTES
      ? fail(
          `This Job would exceed the maximum continuous teaching duration: it makes a continuous teaching block of ${fmtDuration(blockLen)} (${fmtRange(block.start, block.end)}) for ${tName}. The limit is ${fmtDuration(CONTINUOUS_LIMIT_MINUTES)}, followed by a break of at least ${fmtDuration(MIN_BREAK_MINUTES)}. Please schedule the required break before continuing.`,
        )
      : pass(`Teaching block would be ${fmtDuration(blockLen)} (${fmtRange(block.start, block.end)}).`);

  // 8. FR-26 Qualified for the Instrument.
  const qualified = teacher?.profile.instruments ?? [];
  results.QUALIFICATION = qualified.includes(job.instrument)
    ? pass(`Qualified to teach ${job.instrument}.`)
    : fail(
        `${tName} is not qualified to teach ${job.instrument}. Qualified Instruments: ${qualified.length ? qualified.join(', ') : 'none recorded'}.`,
      );

  const checks = RULES.map((r) => ({ ...r, ...results[r.id] }));
  const failures = checks.filter((c) => !c.passed);
  return { ok: failures.length === 0, checks, failures, end };
}

/**
 * Returns the continuous teaching block (start/end) that contains [start, end)
 * once it is added to the Teacher's existing Jobs on that day.
 */
export function continuousBlockWith(teacherJobsSameDay, start, end) {
  const intervals = [...teacherJobsSameDay.map((j) => ({ start: j.start, end: j.end })), { start, end }].sort(
    (a, b) => a.start - b.start,
  );
  const blocks = [];
  for (const iv of intervals) {
    const last = blocks[blocks.length - 1];
    if (last && iv.start - last.end < MIN_BREAK_MINUTES) last.end = Math.max(last.end, iv.end);
    else blocks.push({ ...iv });
  }
  return blocks.find((b) => b.start <= start && b.end >= end);
}

/**
 * Continuous teaching blocks for one Teacher on one day (FR-25). Jobs separated
 * by less than MIN_BREAK_MINUTES belong to the same block. Each block reports
 * whether it has reached the limit and, if so, the mandatory break window that
 * must stay free of Jobs.
 * @param {Array<{start:number,end:number}>} jobsSameDay
 */
export function teachingBlocks(jobsSameDay) {
  const sorted = [...jobsSameDay].sort((a, b) => a.start - b.start);
  const blocks = [];
  for (const j of sorted) {
    const last = blocks[blocks.length - 1];
    if (last && j.start - last.end < MIN_BREAK_MINUTES) {
      last.end = Math.max(last.end, j.end);
      last.jobCount += 1;
    } else blocks.push({ start: j.start, end: j.end, jobCount: 1 });
  }
  return blocks.map((b) => {
    const minutes = b.end - b.start;
    const atLimit = minutes >= CONTINUOUS_LIMIT_MINUTES;
    return {
      ...b,
      minutes,
      atLimit,
      remaining: Math.max(0, CONTINUOUS_LIMIT_MINUTES - minutes),
      requiredBreak: atLimit ? { start: b.end, end: b.end + MIN_BREAK_MINUTES } : null,
    };
  });
}
