// Workload calculations (FR-01, FR-02, FR-03, FR-06, FR-15).
// Workload = number of allocated Jobs x 30 minutes, expressed in hours.

import { JOB_MINUTES, WORKLOAD_THRESHOLD_HOURS } from '../config.js';
import { inWeek, monthKey } from './time.js';

export const JOB_STATUS = { ALLOCATED: 'ALLOCATED', UNALLOCATED: 'UNALLOCATED' };

export const isAllocated = (job) => job.status === JOB_STATUS.ALLOCATED && Boolean(job.teacherId);

export function teacherJobsInWeek(jobs, teacherId, weekStartIso) {
  return jobs
    .filter((j) => isAllocated(j) && j.teacherId === teacherId && inWeek(j.date, weekStartIso))
    .sort(byDateTime);
}

export const jobsToHours = (count) => (count * JOB_MINUTES) / 60;

export function weeklyHours(jobs, teacherId, weekStartIso) {
  return jobsToHours(teacherJobsInWeek(jobs, teacherId, weekStartIso).length);
}

export function monthlyHours(jobs, teacherId, key) {
  return jobsToHours(jobs.filter((j) => isAllocated(j) && j.teacherId === teacherId && monthKey(j.date) === key).length);
}

export const exceedsThreshold = (hours) => hours > WORKLOAD_THRESHOLD_HOURS;

/** Rows for every Teacher, sorted by name. */
export function weeklyWorkloadRows(teachers, jobs, weekStartIso) {
  return teachers
    .map((t) => {
      const count = teacherJobsInWeek(jobs, t.id, weekStartIso).length;
      const hours = jobsToHours(count);
      return { teacher: t, jobCount: count, hours, overThreshold: exceedsThreshold(hours) };
    })
    .sort((a, b) => a.teacher.name.localeCompare(b.teacher.name));
}

/** FR-02: three Teachers with the lowest allocated Workload (ties broken by name). */
export function lowestWorkload(rows, n = 3) {
  return [...rows].sort((a, b) => a.hours - b.hours || a.teacher.name.localeCompare(b.teacher.name)).slice(0, n);
}

export function byDateTime(a, b) {
  return a.date.localeCompare(b.date) || a.start - b.start;
}
