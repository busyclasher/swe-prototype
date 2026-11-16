// Date and time helpers. Dates are ISO strings 'YYYY-MM-DD' (local calendar dates);
// times are integer minutes after midnight. Intervals are half-open [start, end).

const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const pad = (n) => String(n).padStart(2, '0');

export function parseDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toISO(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addDays(iso, n) {
  const d = parseDate(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function addMonths(iso, n) {
  const d = parseDate(iso);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return toISO(d);
}

/** 0 = Monday ... 6 = Sunday */
export function dayIndex(iso) {
  return (parseDate(iso).getDay() + 6) % 7;
}

export const isWeekend = (iso) => dayIndex(iso) >= 5;

export function weekStart(iso) {
  return addDays(iso, -dayIndex(iso));
}

export function weekDates(weekStartIso) {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStartIso, i));
}

export const inWeek = (iso, weekStartIso) => iso >= weekStartIso && iso <= addDays(weekStartIso, 6);

export const monthKey = (iso) => iso.slice(0, 7);

export function monthLabel(key) {
  const [y, m] = key.split('-').map(Number);
  return `${MONTH_LONG[m - 1]} ${y}`;
}

export function datesBetween(fromIso, toIso) {
  const out = [];
  for (let d = fromIso; d <= toIso; d = addDays(d, 1)) out.push(d);
  return out;
}

/** 'Mon 23 Nov' */
export function fmtDateShort(iso) {
  const d = parseDate(iso);
  return `${DAY_SHORT[dayIndex(iso)]} ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
}

/** 'Mon 23 Nov 2026' */
export function fmtDate(iso) {
  return `${fmtDateShort(iso)} ${parseDate(iso).getFullYear()}`;
}

/** 'Monday, 23 November 2026' */
export function fmtDateLong(iso) {
  const d = parseDate(iso);
  return `${DAY_LONG[dayIndex(iso)]}, ${d.getDate()} ${MONTH_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

/** 'Mon 23 Nov – Sun 29 Nov 2026' */
export function fmtWeek(weekStartIso) {
  return `${fmtDateShort(weekStartIso)} – ${fmtDate(addDays(weekStartIso, 6))}`;
}

export const dayShort = (i) => DAY_SHORT[i];
export const dayLong = (i) => DAY_LONG[i];

/** 540 -> '9:00 AM' */
export function fmtTime(minutes) {
  const h24 = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const suffix = h24 < 12 ? 'AM' : 'PM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${pad(m)} ${suffix}`;
}

export const fmtRange = (start, end) => `${fmtTime(start)} – ${fmtTime(end)}`;

/** 270 -> '4 h 30 min' */
export function fmtDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h} h ${m} min`;
  if (h) return `${h} h`;
  return `${m} min`;
}

/** Workload hours with one decimal, e.g. '42.0 h' */
export const fmtHours = (hours) => `${hours.toFixed(1)} h`;

export const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;

/** Merge intervals that overlap or touch. Input: [{start, end}] */
export function mergeIntervals(intervals) {
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const out = [];
  for (const iv of sorted) {
    const last = out[out.length - 1];
    if (last && iv.start <= last.end) last.end = Math.max(last.end, iv.end);
    else out.push({ start: iv.start, end: iv.end });
  }
  return out;
}

/** Time options for selects, e.g. every 15 minutes between from and to inclusive. */
export function timeOptions(from, to, step = 15) {
  const out = [];
  for (let m = from; m <= to; m += step) out.push(m);
  return out;
}
