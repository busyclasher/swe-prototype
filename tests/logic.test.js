// Run with: npm test
// Verifies the business logic used by the prototype (no browser needed).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSeedData } from '../src/data/seed.js';
import { validateAllocation, RULES, teachingBlocks } from '../src/lib/validation.js';
import * as interest from '../src/lib/interest.js';
import { isLateSubmission, validateAvailabilityInput, isWithinHorizon } from '../src/lib/availability.js';
import { weeklyWorkloadRows, lowestWorkload, monthlyHours, isAllocated } from '../src/lib/workload.js';
import { addMonths, weekStart, fmtTime } from '../src/lib/time.js';
import { CONTINUOUS_LIMIT_MINUTES, CURRENT_WEEK_START, HORIZON_END, MIN_BREAK_MINUTES } from '../src/config.js';

const h = (hh, mm = 0) => hh * 60 + mm;
const failedFRs = (job, data) => validateAllocation(job, data).failures.map((f) => f.fr);

// The demonstration scenarios from docs/DEMO_SCRIPT.md. Each must fail ONLY its own rule.
export const DEMO_SCENARIOS = {
  success: { teacherId: 'T08', date: '2026-11-25', start: h(18), instrument: 'Trumpet', studioId: 'S3' },
  'FR-19': { teacherId: 'T08', date: '2026-11-28', start: h(10), instrument: 'Trumpet', studioId: 'S4' },
  'FR-20': { teacherId: 'T04', date: '2026-11-24', start: h(8, 30), instrument: 'Trumpet', studioId: 'S2' },
  'FR-21': { teacherId: 'T08', date: '2026-11-26', start: h(18), instrument: 'Trumpet', studioId: 'S3' },
  'FR-22': { teacherId: 'T08', date: '2026-11-24', start: h(19), instrument: 'Trumpet', studioId: 'S1' },
  'FR-23': { teacherId: 'T08', date: '2026-11-25', start: h(18), instrument: 'Trumpet', studioId: 'S2' },
  'FR-24': { teacherId: 'T04', date: '2026-11-24', start: h(15), instrument: 'Drums', studioId: 'S3' },
  'FR-25': { teacherId: 'T03', date: '2026-11-23', start: h(13), instrument: 'Violin', studioId: 'S4' },
  'FR-26': { teacherId: 'T08', date: '2026-11-25', start: h(18), instrument: 'Piano', studioId: 'S3' },
};

test('date helpers', () => {
  assert.equal(weekStart('2026-11-26'), '2026-11-23');
  assert.equal(addMonths('2026-01-31', 1), '2026-02-28');
  assert.equal(CURRENT_WEEK_START, '2026-11-23');
  assert.equal(HORIZON_END, '2026-12-23');
  assert.equal(fmtTime(h(21)), '9:00 PM');
  assert.equal(fmtTime(h(0, 30)), '12:30 AM');
});

test('seed data is internally consistent: every allocated Job passes all eight rules', () => {
  const data = createSeedData();
  for (const job of data.jobs.filter(isAllocated)) {
    const r = validateAllocation(job, data);
    assert.ok(r.ok, `${job.id} fails ${r.failures.map((f) => f.fr)}`);
  }
});

test('validation always runs all eight rules', () => {
  const r = validateAllocation(DEMO_SCENARIOS.success, createSeedData());
  assert.equal(r.checks.length, 8);
  assert.deepEqual(r.checks.map((c) => c.fr), RULES.map((x) => x.fr));
});

for (const [name, job] of Object.entries(DEMO_SCENARIOS)) {
  test(`demo scenario ${name}`, () => {
    const expected = name === 'success' ? [] : [name];
    assert.deepEqual(failedFRs(job, createSeedData()), expected);
  });
}

test('multiple rules can fail together and all are reported', () => {
  const job = { teacherId: 'T08', date: '2026-11-26', start: h(21), instrument: 'Drums', studioId: 'S1' };
  assert.deepEqual(failedFRs(job, createSeedData()), ['FR-19', 'FR-20', 'FR-21', 'FR-24', 'FR-26']);
});

test('opening-hour boundaries', () => {
  const data = createSeedData();
  // Isolate the opening-hours rule: give the Teacher full-day Availability on clean dates.
  data.availability.push({ id: 'X1', teacherId: 'T08', date: '2026-12-01', start: 0, end: h(24) });
  data.availability.push({ id: 'X2', teacherId: 'T08', date: '2026-12-05', start: 0, end: h(24) });
  const job = (date, start) => ({ teacherId: 'T08', date, start, instrument: 'Trumpet', studioId: 'S1' });
  assert.ok(!failedFRs(job('2026-12-01', h(9)), data).includes('FR-20'), 'weekday 9:00 opens');
  assert.ok(failedFRs(job('2026-12-01', h(8, 30)), data).includes('FR-20'), 'weekday 8:30 closed');
  assert.ok(!failedFRs(job('2026-12-01', h(20, 30)), data).includes('FR-20'), 'last weekday Job 8:30 PM');
  assert.ok(failedFRs(job('2026-12-01', h(20, 45)), data).includes('FR-20'), 'Job ending 9:15 PM');
  assert.ok(!failedFRs(job('2026-12-05', h(8)), data).includes('FR-20'), 'Saturday 8:00 opens');
  assert.ok(failedFRs(job('2026-12-05', h(7, 30)), data).includes('FR-20'), 'Saturday 7:30 closed');
});

test('continuous-teaching limit: 4 h allowed, 4.5 h rejected, 1 h break resets', () => {
  const data = { ...createSeedData(), jobs: [] };
  data.availability.push({ id: 'X', teacherId: 'T08', date: '2026-12-01', start: h(9), end: h(21) });
  for (let s = h(9); s < h(12, 30); s += 30) {
    data.jobs.push({ id: `Z${s}`, teacherId: 'T08', date: '2026-12-01', start: s, end: s + 30, instrument: 'Trumpet', studioId: 'S1', status: 'ALLOCATED' });
  }
  const job = (start) => ({ teacherId: 'T08', date: '2026-12-01', start, instrument: 'Trumpet', studioId: 'S2' });
  assert.deepEqual(failedFRs(job(h(12, 30)), data), [], '9:00-13:00 is exactly 4 h');
  data.jobs.push({ id: 'Z-last', teacherId: 'T08', date: '2026-12-01', start: h(12, 30), end: h(13), instrument: 'Trumpet', studioId: 'S1', status: 'ALLOCATED' });
  assert.deepEqual(failedFRs(job(h(13)), data), ['FR-25'], 'no break -> 4.5 h');
  assert.deepEqual(failedFRs(job(h(13, 30)), data), ['FR-25'], '30-min gap is not a break');
  assert.deepEqual(failedFRs(job(h(14)), data), [], '1 h break starts a new block');
});

test('unallocated Jobs do not block a Studio or count as Workload', () => {
  const data = createSeedData();
  const un = data.jobs.find((j) => j.status === 'UNALLOCATED');
  assert.equal(un.teacherId, null);
  const rows = weeklyWorkloadRows(data.teachers, data.jobs, CURRENT_WEEK_START);
  assert.ok(rows.every((r) => r.hours >= 0));
});

test('Workload figures for the demo week', () => {
  const data = createSeedData();
  const rows = weeklyWorkloadRows(data.teachers, data.jobs, CURRENT_WEEK_START);
  const over = rows.filter((r) => r.overThreshold).map((r) => r.teacher.name);
  assert.deepEqual(over, ['Chloe Ng', 'Farah Rahman']);
  // Jamie Lim (live-demo Teacher) starts with no Jobs, so ranks first.
  assert.deepEqual(lowestWorkload(rows).map((r) => r.teacher.name), ['Jamie Lim', 'Isaac Koh', 'Gabriel Lim']);
  assert.ok(monthlyHours(data.jobs, 'T01', '2026-11') > 0);
});

test('FR-10 late Availability', () => {
  assert.equal(isLateSubmission('2026-12-03', '2026-11-19'), false, 'on the 19th is on time');
  assert.equal(isLateSubmission('2026-12-03', '2026-11-20'), true, 'after the 19th is late');
  assert.equal(isLateSubmission('2026-11-28', '2026-11-23'), false, 'current month is never late');
  const data = createSeedData();
  assert.ok(data.availability.some((a) => a.teacherId === 'T08' && a.late));
  assert.ok(data.availability.filter((a) => a.teacherId === 'T03').every((a) => !a.late));
});

test('Availability input validation', () => {
  assert.ok(isWithinHorizon('2026-12-23'));
  assert.ok(!isWithinHorizon('2026-12-24'));
  assert.ok(!isWithinHorizon('2026-11-22'));
  const existing = [{ id: 'A', date: '2026-12-01', start: h(10), end: h(12) }];
  assert.ok(validateAvailabilityInput({ date: '2026-12-24', start: h(9), end: h(10) }, existing).date);
  assert.ok(validateAvailabilityInput({ date: '2026-12-01', start: h(11), end: h(10) }, existing).end);
  assert.ok(validateAvailabilityInput({ date: '2026-12-01', start: h(11), end: h(13) }, existing).start, 'overlap');
  assert.deepEqual(validateAvailabilityInput({ date: '2026-12-01', start: h(11), end: h(13) }, existing, 'A'), {}, 'editing itself');
  assert.deepEqual(validateAvailabilityInput({ date: '2026-12-01', start: h(12), end: h(13) }, existing), {}, 'touching is fine');
});

test('every seeded Unallocated Job can be assigned without changing its details', () => {
  const data = createSeedData();
  const pending = data.jobs.filter((j) => !isAllocated(j));
  assert.ok(pending.length > 0);
  for (const job of pending) {
    const teacher = data.teachers.find((t) => validateAllocation({ ...job, teacherId: t.id }, data).ok);
    assert.ok(teacher, `${job.id} has no eligible Teacher`);
  }
  // The two original pending Jobs (Manager demo) can still be assigned in sequence.
  const [first, second] = pending;
  first.teacherId = data.teachers.find((t) => validateAllocation({ ...first, teacherId: t.id }, data).ok).id;
  first.status = 'ALLOCATED';
  assert.ok(data.teachers.some((t) => validateAllocation({ ...second, teacherId: t.id }, data).ok));
});

test('the two Monday 1:30 PM open Jobs clash on purpose (FR-22 demo)', () => {
  const data = createSeedData();
  const [a, b] = data.jobs.filter((j) => !isAllocated(j) && j.date === '2026-11-23' && j.start === h(13, 30));
  assert.ok(validateAllocation({ ...b, teacherId: 'T09' }, data).ok);
  a.teacherId = 'T09';
  a.status = 'ALLOCATED';
  assert.deepEqual(failedFRs({ ...b, teacherId: 'T09' }, data), ['FR-22']);
});

// ---------- Live demo: unassigned Teacher and Indicate Interest workflow ----------
const JAMIE = 'T09';
const ALICE = 'T01';
const openAt = (data, date, start, instrument) =>
  interest.openJobs(data).find((j) => j.date === date && j.start === start && j.instrument === instrument);

test('Jamie Lim starts with 0 allocated Jobs but has Availability and eligible open Jobs', () => {
  const data = createSeedData();
  assert.equal(data.jobs.filter((j) => j.teacherId === JAMIE).length, 0);
  assert.ok(data.availability.some((a) => a.teacherId === JAMIE));
  assert.ok(data.accounts.some((a) => a.username === 'jamie.lim' && a.teacherId === JAMIE));
  const eligible = interest.openJobs(data).filter((j) => interest.checkEligibility(data, j.id, JAMIE).result.ok);
  assert.ok(eligible.length >= 3);
  assert.deepEqual(data.interests, []);
});

test('Alice Tan demonstrates a valid timetable: no block over the limit, breaks at least the minimum', () => {
  const data = createSeedData();
  const dates = [...new Set(data.jobs.filter((j) => j.teacherId === ALICE).map((j) => j.date))];
  for (const date of dates) {
    const blocks = teachingBlocks(data.jobs.filter((j) => j.teacherId === ALICE && j.date === date && isAllocated(j)));
    for (const b of blocks) assert.ok(b.minutes <= CONTINUOUS_LIMIT_MINUTES, `${date} block ${b.minutes} min`);
    for (let i = 1; i < blocks.length; i++) assert.ok(blocks[i].start - blocks[i - 1].end >= MIN_BREAK_MINUTES);
  }
});

test('ineligible open Jobs explain why: not qualified, not available, continuous limit', () => {
  const data = createSeedData();
  const fr = (job, t) => interest.checkEligibility(data, job.id, t).result.failures.map((f) => f.fr);
  assert.deepEqual(fr(openAt(data, '2026-11-24', h(16), 'Violin'), JAMIE), ['FR-26']);
  assert.deepEqual(fr(openAt(data, '2026-11-24', h(19), 'Piano'), JAMIE), ['FR-19']);
  const monPiano = openAt(data, '2026-11-23', h(13, 30), 'Piano');
  assert.deepEqual(fr(monPiano, ALICE), ['FR-25'], 'Alice has no 1 h break around 1:30 PM');
  const res = interest.indicateInterest(data, ALICE, monPiano.id);
  assert.equal(res.ok, false, 'ineligible interest is refused');
  assert.match(res.result.failures[0].message, /exceed the maximum continuous teaching duration/);
});

test('indicate interest -> Manager approves -> Job allocated once; duplicates and competing requests closed', () => {
  let data = createSeedData();
  const job = openAt(data, '2026-11-25', h(9, 30), 'Piano');
  let r = interest.indicateInterest(data, JAMIE, job.id);
  assert.ok(r.ok);
  data = r.data;
  assert.equal(data.jobs.find((j) => j.id === job.id).status, 'UNALLOCATED', 'interest alone does not allocate');
  assert.equal(interest.indicateInterest(data, JAMIE, job.id).ok, false, 'no duplicate request');
  r = interest.indicateInterest(data, ALICE, job.id); // Alice is eligible too
  assert.ok(r.ok);
  data = r.data;
  const [jamieReq, aliceReq] = data.interests;
  r = interest.approveInterest(data, jamieReq.id, 'Jamie Lim');
  assert.ok(r.ok);
  data = r.data;
  assert.equal(data.jobs.find((j) => j.id === job.id).teacherId, JAMIE);
  assert.equal(data.interests.find((i) => i.id === aliceReq.id).status, 'CLOSED');
  assert.equal(interest.approveInterest(data, aliceReq.id).ok, false, 'cannot approve twice');
  assert.equal(interest.indicateInterest(data, ALICE, job.id).ok, false, 'allocated Job is no longer available');
  assert.ok(!interest.openJobs(data).some((j) => j.id === job.id));
});

test('pending requests count toward conflicts, and approval re-checks the rules', () => {
  let data = createSeedData();
  const piano = openAt(data, '2026-11-23', h(13, 30), 'Piano');
  const trumpet = openAt(data, '2026-11-23', h(13, 30), 'Trumpet');
  data = interest.indicateInterest(data, JAMIE, piano.id).data;
  const fr = interest.checkEligibility(data, trumpet.id, JAMIE).result.failures.map((f) => f.fr);
  assert.deepEqual(fr, ['FR-22'], 'same-time Job conflicts with the pending request');
  // Approval is re-validated: if Jamie's Availability is removed, approval is refused.
  data = { ...data, availability: data.availability.filter((a) => !(a.teacherId === JAMIE && a.date === '2026-11-23')) };
  const r = interest.approveInterest(data, data.interests[0].id);
  assert.equal(r.ok, false);
  assert.deepEqual(r.result.failures.map((f) => f.fr), ['FR-19']);
});

test('withdraw and decline', () => {
  let data = createSeedData();
  const job = openAt(data, '2026-11-27', h(15), 'Trumpet');
  data = interest.indicateInterest(data, JAMIE, job.id).data;
  const id = data.interests[0].id;
  assert.equal(interest.withdrawInterest(data, ALICE, id).ok, false, 'only own requests');
  const w = interest.withdrawInterest(data, JAMIE, id);
  assert.equal(w.data.interests[0].status, 'CLOSED');
  const d = interest.declineInterest(data, id);
  assert.equal(d.data.interests[0].status, 'DECLINED');
  assert.ok(interest.indicateInterest(d.data, JAMIE, job.id).ok, 'can request again after a decline');
});

test('teachingBlocks: limit reached shows the required break; short gaps do not reset', () => {
  const j = (s, e) => ({ start: s, end: e });
  const blocks = teachingBlocks([j(h(9), h(11)), j(h(11, 30), h(13)), j(h(14), h(15))]);
  assert.equal(blocks.length, 2, '30-min gap joins; 1 h gap splits');
  assert.equal(blocks[0].minutes, 240);
  assert.ok(blocks[0].atLimit);
  assert.deepEqual(blocks[0].requiredBreak, { start: h(13), end: h(14) });
  assert.equal(blocks[1].requiredBreak, null);
});
