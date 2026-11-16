import Icon from './Icon.jsx';
import { addDays, addMonths, fmtDate, monthLabel, parseDate, toISO, weekStart } from '../lib/time.js';

/**
 * Month grid (Mon-Sun). `info(date)` returns { count, late, holiday } for display.
 * Dates where `selectable(date)` is false are disabled.
 */
export default function MonthCalendar({ month, minMonth, maxMonth, onMonthChange, selected, onSelect, selectable, info }) {
  const first = `${month}-01`;
  const d = parseDate(first);
  const last = toISO(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  const gridStart = weekStart(first);
  const cells = [];
  for (let date = gridStart; date <= last || cells.length % 7 !== 0; date = addDays(date, 1)) cells.push(date);
  const prev = addMonths(first, -1).slice(0, 7);
  const next = addMonths(first, 1).slice(0, 7);

  return (
    <div className="calendar">
      <div className="calendar-head">
        <button type="button" className="icon-btn" onClick={() => onMonthChange(prev)} disabled={prev < minMonth} aria-label={`Previous month, ${monthLabel(prev)}`}>
          <Icon name="chevronLeft" />
        </button>
        <h3 className="calendar-title" aria-live="polite">{monthLabel(month)}</h3>
        <button type="button" className="icon-btn" onClick={() => onMonthChange(next)} disabled={next > maxMonth} aria-label={`Next month, ${monthLabel(next)}`}>
          <Icon name="chevronRight" />
        </button>
      </div>
      <div className="calendar-grid" aria-label={`Dates in ${monthLabel(month)}`}>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((w) => (
          <div key={w} className="calendar-dow" aria-hidden="true">{w}</div>
        ))}
        {cells.map((date) => {
          const inMonth = date.slice(0, 7) === month;
          const ok = inMonth && selectable(date);
          const meta = inMonth ? info(date) : {};
          const label = [
            fmtDate(date),
            meta.count ? `${meta.count} Availability entr${meta.count === 1 ? 'y' : 'ies'}` : 'No Availability',
            meta.late ? 'includes Late submission' : '',
            meta.holiday ? `public holiday: ${meta.holiday}` : '',
            ok ? '' : 'not available for selection',
          ].filter(Boolean).join(', ');
          return (
            <button
              type="button"
              key={date}
              className={`calendar-cell ${inMonth ? '' : 'outside'} ${selected === date ? 'selected' : ''} ${meta.count ? 'has-avail' : ''}`}
              disabled={!ok}
              aria-pressed={selected === date}
              aria-label={label}
              onClick={() => onSelect(date)}
            >
              <span className="calendar-day tabular">{inMonth ? parseDate(date).getDate() : ''}</span>
              {inMonth && meta.count > 0 && (
                <span className="calendar-mark">
                  <Icon name="check" size={12} /> {meta.count}
                </span>
              )}
              {inMonth && meta.late && <span className="calendar-late">Late</span>}
              {inMonth && meta.holiday && <span className="calendar-hol">Holiday</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
