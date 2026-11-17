// Teacher "Indicate Interest" workflow (prototype extension, see docs/TRACEABILITY.md).
//
// Teachers do NOT allocate Jobs to themselves: allocation stays with the
// Manager (UC07, FR-12). A Teacher browses Unallocated Jobs, indicates
// interest, and the Manager approves (which allocates the Job) or declines.
//
// Every function here is pure: it takes the data object and returns either
// { ok: true, data, ... } with a new data object, or { ok: false, error }.
// The same eight allocation rules (FR-19 to FR-26) are applied when the
// Teacher indicates interest AND again when the Manager approves, so the
// continuous-teaching limit (FR-25) cannot be bypassed through this workflow.

import { DEMO_NOW_MINUTES, DEMO_TODAY } from '../config.js';
import { validateAllocation } from './validation.js';
import { JOB_STATUS, byDateTime, isAllocated } from './workload.js';

export const INTEREST_STATUS = {
  PENDING: 'PENDING', // waiting for the Manager
  APPROVED: 'APPROVED', // Manager allocated the Job to this Teacher
  DECLINED: 'DECLINED', // Manager declined this request
  CLOSED: 'CLOSED', // Job was allocated to someone else, or the Teacher withdrew
};

const isUpcoming = (j) => j.date > DEMO_TODAY || (j.date === DEMO_TODAY && j.start >= DEMO_NOW_MINUTES);

/** Unallocated Jobs that have not started yet, i.e. Jobs a Teacher may request. */
export function openJobs(data) {
  return data.jobs.filter((j) => j.status === JOB_STATUS.UNALLOCATED && !j.teacherId && isUpcoming(j)).sort(byDateTime);
}

export const pendingInterests = (data) => (data.interests || []).filter((i) => i.status === INTEREST_STATUS.PENDING);

export function interestFor(data, jobId, teacherId) {
  return (data.interests || []).filter((i) => i.jobId === jobId && i.teacherId === teacherId).at(-1) || null;
}

/**
 * Eligibility of `teacherId` for an open Job. The Teacher's other PENDING
 * requests are treated as if already allocated, so a Teacher cannot request
 * overlapping Jobs or a run of Jobs that together breach the continuous limit.
 */
export function checkEligibility(data, jobId, teacherId) {
  const job = data.jobs.find((j) => j.id === jobId);
  if (!job) return { ok: false, error: 'This Job no longer exists.' };
  const otherPending = new Set(
    pendingInterests(data).filter((i) => i.teacherId === teacherId && i.jobId !== jobId).map((i) => i.jobId),
  );
  const jobs = otherPending.size
    ? data.jobs.map((j) => (otherPending.has(j.id) ? { ...j, teacherId, status: JOB_STATUS.ALLOCATED, tentative: true } : j))
    : data.jobs;
  const result = validateAllocation({ ...job, teacherId }, { ...data, jobs });
  return { ok: true, result };
}

export function indicateInterest(data, teacherId, jobId) {
  const job = data.jobs.find((j) => j.id === jobId);
  if (!job || isAllocated(job)) return { ok: false, error: 'This Job has already been allocated and is no longer available.' };
  if (!isUpcoming(job)) return { ok: false, error: 'This Job has already started and can no longer be requested.' };
  const existing = interestFor(data, jobId, teacherId);
  if (existing?.status === INTEREST_STATUS.PENDING) return { ok: false, error: 'You have already indicated interest in this Job.' };
  const { result } = checkEligibility(data, jobId, teacherId);
  if (!result.ok) return { ok: false, result, error: 'You are not eligible for this Job.' };
  const seq = data.seq.interest ?? 1;
  const interest = {
    id: `I-${String(seq).padStart(3, '0')}`,
    jobId,
    teacherId,
    status: INTEREST_STATUS.PENDING,
    createdOn: DEMO_TODAY,
  };
  return {
    ok: true,
    interest,
    data: { ...data, interests: [...(data.interests || []), interest], seq: { ...data.seq, interest: seq + 1 } },
  };
}

export function withdrawInterest(data, teacherId, interestId) {
  const it = (data.interests || []).find((i) => i.id === interestId);
  if (!it || it.teacherId !== teacherId) return { ok: false, error: 'You can only withdraw your own requests.' };
  if (it.status !== INTEREST_STATUS.PENDING) return { ok: false, error: 'Only pending requests can be withdrawn.' };
  return {
    ok: true,
    data: { ...data, interests: data.interests.map((i) => (i.id === interestId ? { ...i, status: INTEREST_STATUS.CLOSED, note: 'Withdrawn by Teacher' } : i)) },
  };
}

/**
 * Close every other PENDING request for a Job once it has been allocated,
 * so the same Job can never be approved twice.
 */
export function closeInterestsForJob(interests, jobId, keepId, note) {
  return (interests || []).map((i) =>
    i.jobId === jobId && i.id !== keepId && i.status === INTEREST_STATUS.PENDING ? { ...i, status: INTEREST_STATUS.CLOSED, note } : i,
  );
}

/** Manager approves: re-validates all eight rules, allocates the Job, closes competing requests. */
export function approveInterest(data, interestId, teacherName = 'another Teacher') {
  const it = (data.interests || []).find((i) => i.id === interestId);
  if (!it || it.status !== INTEREST_STATUS.PENDING) return { ok: false, error: 'This request is no longer pending.' };
  const job = data.jobs.find((j) => j.id === it.jobId);
  if (!job || isAllocated(job)) return { ok: false, error: `Job ${it.jobId} has already been allocated. It cannot be allocated twice.` };
  const result = validateAllocation({ ...job, teacherId: it.teacherId }, data);
  if (!result.ok) return { ok: false, result, error: `Approval refused: ${result.failures.length} allocation rule${result.failures.length === 1 ? '' : 's'} broken.` };
  const allocated = { ...job, teacherId: it.teacherId, status: JOB_STATUS.ALLOCATED };
  let interests = data.interests.map((i) => (i.id === interestId ? { ...i, status: INTEREST_STATUS.APPROVED } : i));
  interests = closeInterestsForJob(interests, job.id, interestId, `Allocated to ${teacherName}`);
  return {
    ok: true,
    job: allocated,
    result,
    data: { ...data, jobs: data.jobs.map((j) => (j.id === job.id ? allocated : j)), interests },
  };
}

export function declineInterest(data, interestId) {
  const it = (data.interests || []).find((i) => i.id === interestId);
  if (!it || it.status !== INTEREST_STATUS.PENDING) return { ok: false, error: 'This request is no longer pending.' };
  return {
    ok: true,
    data: { ...data, interests: data.interests.map((i) => (i.id === interestId ? { ...i, status: INTEREST_STATUS.DECLINED, note: 'Declined by Manager' } : i)) },
  };
}
