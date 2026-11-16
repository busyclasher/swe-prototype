// Single coherent mock-data source (skills.md section 4).
// createSeedData() returns a fresh copy each time, which is how "Reset demo data" works.
//
// All data here is fictional sample data for the INF2001 prototype.

import { DEMO_TODAY, HORIZON_END, JOB_MINUTES } from '../config.js';
import { ROLES } from '../lib/roles.js';
import { addDays, datesBetween, dayIndex, weekStart } from '../lib/time.js';
import { isLateSubmission } from '../lib/availability.js';
import { validateAllocation } from '../lib/validation.js';
import { JOB_STATUS } from '../lib/workload.js';

export const INSTRUMENTS = ['Piano', 'Voice', 'Violin', 'Cello', 'Flute', 'Guitar', 'Drums'];

const STUDIOS = [
  { id: 'S1', name: 'Studio 1', hasDrumKit: false },
  { id: 'S2', name: 'Studio 2', hasDrumKit: false },
  { id: 'S3', name: 'Studio 3', hasDrumKit: false },
  { id: 'S4', name: 'Studio 4', hasDrumKit: false },
  { id: 'S5', name: 'Studio 5', hasDrumKit: true },
];

// Clearly labelled mock list - NOT an official public holiday calendar.
const HOLIDAYS = [
  { date: '2026-11-26', name: 'Sample Public Holiday (mock data)' },
  { date: '2026-12-25', name: 'Christmas Day (mock data)' },
  { date: '2027-01-01', name: "New Year's Day (mock data)" },
];

const h = (hh, mm = 0) => hh * 60 + mm;

/**
 * Teacher definitions. `pattern` drives the generated weekly schedule:
 * days are 0=Mon..6=Sun, blocks are teaching blocks, avail is the Availability
 * window submitted for that day, fill is the share of 30-min slots booked.
 */
const TEACHERS = [
  {
    id: 'T01', name: 'Alice Tan', username: 'alice.tan', email: 'alice.tan@sonara.example',
    profile: { instruments: ['Piano', 'Voice'], expertise: ['ABRSM exam preparation', 'Classical repertoire'], yearsExperience: 9 },
    studios: ['S3', 'S4', 'S1', 'S2'], fill: 0.85,
    pattern: [{ days: [0, 2, 4, 5], blocks: [[h(10), h(13)], [h(14), h(16)]], avail: [h(9, 30), h(17)] }],
    decAvailUntil: '2026-12-13', decSubmittedOn: '2026-11-12',
  },
  {
    id: 'T02', name: 'Benjamin Lee', username: 'benjamin.lee', email: 'benjamin.lee@sonara.example',
    profile: { instruments: ['Guitar', 'Drums'], expertise: ['Rock and pop', 'Rhythm training'], yearsExperience: 6 },
    studios: ['S5', 'S4', 'S2', 'S1'], fill: 0.9,
    pattern: [{ days: [0, 1, 2, 3, 4], blocks: [[h(14), h(18)], [h(19), h(21)]], avail: [h(13, 30), h(21)] }],
    decAvailUntil: null, // has not submitted December Availability yet
  },
  {
    id: 'T03', name: 'Chloe Ng', username: 'chloe.ng', email: 'chloe.ng@sonara.example',
    profile: { instruments: ['Violin', 'Piano'], expertise: ['Orchestral preparation', 'Suzuki method'], yearsExperience: 12 },
    studios: ['S1', 'S2', 'S3', 'S4'], fill: 1,
    pattern: [{ days: [0, 1, 2, 3, 4, 5, 6], blocks: [[h(9), h(13)], [h(14), h(17)]], avail: [h(8, 30), h(17, 30)] }],
    decAvailUntil: HORIZON_END, decSubmittedOn: '2026-11-10',
  },
  {
    id: 'T04', name: 'Daniel Wong', username: 'daniel.wong', email: 'daniel.wong@sonara.example',
    profile: { instruments: ['Drums', 'Guitar'], expertise: ['Jazz drumming', 'Grade exam preparation'], yearsExperience: 4 },
    studios: ['S5', 'S1', 'S2', 'S3'], fill: 0.8,
    pattern: [
      { days: [1, 3], blocks: [[h(10), h(13)]], avail: [h(8), h(17)] },
      { days: [5, 6], blocks: [[h(8), h(12)], [h(13), h(16)]], avail: [h(8), h(16, 30)] },
    ],
    decAvailUntil: HORIZON_END, decSubmittedOn: '2026-11-18',
  },
  {
    id: 'T05', name: 'Farah Rahman', username: 'farah.rahman', email: 'farah.rahman@sonara.example',
    profile: { instruments: ['Voice', 'Piano'], expertise: ['Musical theatre', 'Vocal health'], yearsExperience: 7 },
    studios: ['S2', 'S1', 'S3', 'S4'], fill: 1,
    pattern: [{ days: [0, 1, 2, 3, 4, 5, 6], blocks: [[h(12), h(16)], [h(17), h(20, 30)]], avail: [h(11, 30), h(21)] }],
    decAvailUntil: HORIZON_END, decSubmittedOn: '2026-11-15',
  },
  {
    id: 'T06', name: 'Gabriel Lim', username: 'gabriel.lim', email: 'gabriel.lim@sonara.example',
    profile: { instruments: ['Cello', 'Piano'], expertise: ['Chamber music'], yearsExperience: 3 },
    studios: ['S4', 'S3', 'S1', 'S2'], fill: 0.7,
    pattern: [{ days: [1, 3], blocks: [[h(16), h(19)]], avail: [h(15), h(20)] }],
    decAvailUntil: HORIZON_END, decSubmittedOn: '2026-11-19',
  },
  {
    id: 'T07', name: 'Hui Min Chua', username: 'huimin.chua', email: 'huimin.chua@sonara.example',
    profile: { instruments: ['Flute', 'Piano'], expertise: ['Music theory', 'Sight-reading'], yearsExperience: 5 },
    studios: ['S3', 'S1', 'S2', 'S4'], fill: 0.75,
    pattern: [{ days: [1, 4], blocks: [[h(17), h(20)]], avail: [h(16, 30), h(21)] }],
    decAvailUntil: HORIZON_END, decSubmittedOn: '2026-11-08',
  },
  {
    id: 'T08', name: 'Isaac Koh', username: 'isaac.koh', email: 'isaac.koh@sonara.example',
    profile: { instruments: ['Guitar', 'Voice'], expertise: ['Songwriting', 'Acoustic guitar'], yearsExperience: 2 },
    studios: ['S4', 'S1', 'S2', 'S3'], fill: 1,
    pattern: [
      { days: [1, 3], blocks: [[h(18), h(20)]], avail: [h(15), h(21)] },
      { days: [0, 2, 4], blocks: [], avail: [h(15), h(21)] },
    ],
    decAvailUntil: HORIZON_END, decSubmittedOn: '2026-11-21', // submitted after the 19th -> Late
  },
];

const OTHER_ACCOUNTS = [
  { id: 'U-M01', name: 'Grace Ho', username: 'grace.ho', email: 'grace.ho@sonara.example', password: 'manager123', role: ROLES.MANAGER },
  { id: 'U-A01', name: 'Ravi Kumar', username: 'it.admin', email: 'it.admin@sonara.example', password: 'admin123', role: ROLES.IT_ADMIN },
];

export const TEACHER_DEMO_PASSWORD = 'teacher123';

const JOBS_FROM = '2026-11-02';
const JOBS_TO = '2026-11-29';
const AVAIL_FROM = '2026-11-02';

// Deterministic pseudo-random generator so the dataset is identical on every reset.
function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSeedData() {
  const rand = mulberry32(2001);
  const studios = STUDIOS.map((s) => ({ ...s }));
  const holidays = HOLIDAYS.map((x) => ({ ...x }));
  const teachers = TEACHERS.map((t) => ({
    id: t.id,
    name: t.name,
    email: t.email,
    profile: { ...t.profile, instruments: [...t.profile.instruments], expertise: [...t.profile.expertise] },
  }));

  const accounts = [
    ...TEACHERS.map((t) => ({
      id: `U-${t.id}`, name: t.name, username: t.username, email: t.email,
      password: TEACHER_DEMO_PASSWORD, role: ROLES.TEACHER, teacherId: t.id, createdInDemo: false,
    })),
    ...OTHER_ACCOUNTS.map((a) => ({ ...a, teacherId: null, createdInDemo: false })),
  ];

  // ---- Availability ----
  const availability = [];
  let availSeq = 1;
  for (const def of TEACHERS) {
    const lastDate = def.decAvailUntil ?? '2026-11-30';
    for (const date of datesBetween(AVAIL_FROM, lastDate)) {
      const entry = def.pattern.find((p) => p.days.includes(dayIndex(date)));
      if (!entry) continue;
      const isDecember = date >= '2026-12-01';
      const submittedOn = isDecember ? def.decSubmittedOn : '2026-10-15';
      availability.push({
        id: `A-${String(availSeq++).padStart(4, '0')}`,
        teacherId: def.id,
        date,
        start: entry.avail[0],
        end: entry.avail[1],
        submittedOn,
        late: isLateSubmission(date, submittedOn),
      });
    }
  }

  // ---- Jobs ----
  const jobs = [];
  let jobSeq = 1001;
  const data = { teachers, studios, jobs, availability, holidays };
  for (const date of datesBetween(JOBS_FROM, JOBS_TO)) {
    if (holidays.some((x) => x.date === date)) continue; // school closed
    for (const def of TEACHERS) {
      const entry = def.pattern.find((p) => p.days.includes(dayIndex(date)));
      if (!entry) continue;
      const instruments = def.profile.instruments;
      for (const [bStart, bEnd] of entry.blocks) {
        for (let start = bStart; start + JOB_MINUTES <= bEnd; start += JOB_MINUTES) {
          if (rand() > def.fill) continue;
          const first = Math.floor(rand() * instruments.length);
          const tryInstruments = instruments.map((_, i) => instruments[(first + i) % instruments.length]);
          let placed = false;
          for (const instrument of tryInstruments) {
            for (const studioId of def.studios.concat(instrument === 'Drums' ? ['S5'] : [])) {
              const draft = { teacherId: def.id, date, start, instrument, studioId };
              if (validateAllocation(draft, data).ok) {
                jobs.push({ id: `J-${jobSeq++}`, ...draft, end: start + JOB_MINUTES, status: JOB_STATUS.ALLOCATED, teacherId: def.id });
                placed = true;
                break;
              }
            }
            if (placed) break;
          }
        }
      }
    }
  }

  // Jobs that are already Unallocated in the current week (e.g. rejected earlier).
  const unallocated = [
    { date: addDays(weekStart(DEMO_TODAY), 2), start: h(11), instrument: 'Piano', studioId: 'S4' },
    { date: addDays(weekStart(DEMO_TODAY), 4), start: h(19), instrument: 'Guitar', studioId: 'S3' },
  ];
  for (const u of unallocated) {
    jobs.push({ id: `J-${jobSeq++}`, ...u, end: u.start + JOB_MINUTES, teacherId: null, status: JOB_STATUS.UNALLOCATED });
  }

  // ---- Job Preferences ----
  const cw = weekStart(DEMO_TODAY);
  const preferences = [
    { teacherId: 'T01', weekStart: cw, requestedHours: 18, slots: [{ day: 0, start: h(10), end: h(16) }, { day: 2, start: h(10), end: h(16) }, { day: 4, start: h(10), end: h(16) }, { day: 5, start: h(10), end: h(13) }] },
    { teacherId: 'T03', weekStart: cw, requestedHours: 35, slots: [{ day: 0, start: h(9), end: h(17) }, { day: 2, start: h(9), end: h(17) }, { day: 4, start: h(9), end: h(17) }] },
    { teacherId: 'T06', weekStart: cw, requestedHours: 10, slots: [{ day: 1, start: h(16), end: h(19) }, { day: 3, start: h(16), end: h(19) }] },
    { teacherId: 'T08', weekStart: cw, requestedHours: 12, slots: [{ day: 0, start: h(15), end: h(21) }, { day: 2, start: h(15), end: h(21) }, { day: 4, start: h(15), end: h(21) }] },
    { teacherId: 'T08', weekStart: addDays(cw, 7), requestedHours: 15, slots: [{ day: 0, start: h(15), end: h(21) }, { day: 1, start: h(15), end: h(21) }, { day: 2, start: h(15), end: h(21) }] },
    { teacherId: 'T05', weekStart: cw, requestedHours: 30, slots: [{ day: 0, start: h(12), end: h(20) }, { day: 1, start: h(12), end: h(20) }, { day: 2, start: h(12), end: h(20) }] },
  ].map((p, i) => ({ id: `P-${String(i + 1).padStart(3, '0')}`, savedOn: '2026-11-16', ...p }));

  return {
    instruments: [...INSTRUMENTS],
    studios,
    holidays,
    teachers,
    accounts,
    availability,
    jobs,
    preferences,
    seq: { job: jobSeq, avail: availSeq, pref: preferences.length + 1, account: 1, teacher: TEACHERS.length + 1 },
  };
}
