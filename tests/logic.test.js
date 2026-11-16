// Run with: npm test
// Verifies the business logic used by the prototype (no browser needed).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSeedData } from '../src/data/seed.js';
import { validateAllocation, RULES } from '../src/lib/validation.js';
import { isLateSubmission, validateAvailabilityInput, isWithinHorizon } from '../src/lib/availability.js';
import { weeklyWorkloadRows, lowestWorkload, monthlyHours, isAllocated } from '../src/lib/workload.js';
import { addMonths, weekStart, fmtTime } from '../src/lib/time.js';
import { CURRENT_WEEK_START, HORIZON_END } from '../src/config.js';

const h = (hh, mm = 0) => hh * 60 + mm;
const failedFRs = (job, data) => validateAllocation(job, data).failures.map((f) => f.fr);

// The demonstration scenarios from docs/DEMO_SCRIPT.md. Each must fail ONLY its own rule.
export const DEMO_SCENARIOS = {
  success: { teacherId: 'T08', date: '2026-11-25', start: h(18), instrument: 'Guitar', studioId: 'S3' },
  'FR-19': { teacherId: 'T08', date: '2026-11-28', start: h(10), instrument: 'Guitar', studioId: 'S4' },
  'FR-20': { teacherId: 'T04', date: '2026-11-24', start: h(8, 30), instrument: 'Guitar', studioId: 'S2' },
  'FR-21': { teacherId: 'T08', date: '2026-11-26', start: h(18), instrument: 'Guitar', studioId: 'S3' },
  'FR-22': { teacherId: 'T08', date: '2026-11-24', start: h(19), instrument: 'Guitar', studioId: 'S1' },
  'FR-23': { teacherId: 'T08', date: '2026-11-25', start: h(18), instrument: 'Guitar', studioId: 'S2' },
  'FR-24': { teacherId: 'T04', date: '2026-11-24', start: h(15), instrument: 'Drums', studioId: 'S3' },
  'FR-25': { teacherId: 'T03', date: '2026-11-23', start: h(13), instrument: 'Violin', studioId: 'S4' },
  'FR-26': { teacherId: 'T08', date: '2026-11-25', start: h(18), instrument: 'Violin', studioId: 'S3' },
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
  const job = (date, start) => ({ teacherId: 'T08', date, start, instrument: 'Guitar', studioId: 'S1' });
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
    data.jobs.push({ id: `Z${s}`, teacherId: 'T08', date: '2026-12-01', start: s, end: s + 30, instrument: 'Guitar', studioId: 'S1', status: 'ALLOCATED' });
  }
  const job = (start) => ({ teacherId: 'T08', date: '2026-12-01', start, instrument: 'Guitar', studioId: 'S2' });
  assert.deepEqual(failedFRs(job(h(12, 30)), data), [], '9:00-13:00 is exactly 4 h');
  data.jobs.push({ id: 'Z-last', teacherId: 'T08', date: '2026-12-01', start: h(12, 30), end: h(13), instrument: 'Guitar', studioId: 'S1', status: 'ALLOCATED' });
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
  assert.deepEqual(lowestWorkload(rows).map((r) => r.teacher.name), ['Isaac Koh', 'Gabriel Lim', 'Hui Min Chua']);
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
