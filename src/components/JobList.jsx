import Icon from './Icon.jsx';
import { Badge } from './ui.jsx';
import { fmtDateLong, fmtDuration, fmtRange } from '../lib/time.js';
import { JOB_STATUS } from '../lib/workload.js';
import { teachingBlocks } from '../lib/validation.js';
import { CONTINUOUS_LIMIT_MINUTES, MIN_BREAK_MINUTES } from '../config.js';

/**
 * FR-25 summary for one day: continuous teaching blocks, the breaks between
 * them, and the mandatory break window after any block at the limit.
 */
export function DayBreaks({ jobs }) {
  const blocks = teachingBlocks(jobs);
  if (!blocks.length) return null;
  return (
    <ul className="day-breaks" aria-label="Continuous teaching and breaks">
      {blocks.map((b, i) => {
        const next = blocks[i + 1];
        return (
          <li key={b.start} className="day-breaks-item">
            <span className={`block-chip ${b.atLimit ? 'block-chip-limit' : ''}`}>
              <Icon name="clock" size={14} /> Teaching <span className="tabular">{fmtRange(b.start, b.end)}</span> ·{' '}
              <strong className="tabular">{fmtDuration(b.minutes)}</strong>
              {b.atLimit ? ` (limit ${fmtDuration(CONTINUOUS_LIMIT_MINUTES)} reached)` : ` of ${fmtDuration(CONTINUOUS_LIMIT_MINUTES)} max`}
            </span>
            {b.requiredBreak && (
              <span className="block-chip block-chip-break">
                <Icon name="coffee" size={14} /> Required break <span className="tabular">{fmtRange(b.requiredBreak.start, b.requiredBreak.end)}</span> — no Jobs
              </span>
            )}
            {next && !b.requiredBreak && (
              <span className="block-chip block-chip-gap">
                <Icon name="coffee" size={14} /> Break <span className="tabular">{fmtRange(b.end, next.start)}</span> ({fmtDuration(next.start - b.end)})
              </span>
            )}
          </li>
        );
      })}
      <li className="day-breaks-note muted small">
        Rule FR-25: at most {fmtDuration(CONTINUOUS_LIMIT_MINUTES)} continuous teaching; gaps shorter than {fmtDuration(MIN_BREAK_MINUTES)} do not count as a break.
      </li>
    </ul>
  );
}

export function JobStatusBadge({ status }) {
  return status === JOB_STATUS.ALLOCATED ? (
    <Badge tone="success">Allocated</Badge>
  ) : (
    <Badge tone="warning" icon="ban">Unallocated</Badge>
  );
}

export function studioLabel(studios, id) {
  const s = studios.find((x) => x.id === id);
  return s ? `${s.name}${s.hasDrumKit ? ' (drum kit)' : ''}` : id;
}

/** Jobs grouped by date. `renderAction(job)` adds a per-Job control. */
/** `showBreaks` adds the FR-25 teaching-block and break summary under each day (pass all of the Teacher's Jobs for that day). */
export default function JobList({ jobs, studios, renderAction, selectedId, onSelect, compact, showBreaks, hideStatus }) {
  const byDate = jobs.reduce((acc, j) => {
    (acc[j.date] ||= []).push(j);
    return acc;
  }, {});
  return (
    <div className="job-days">
      {Object.entries(byDate).map(([date, list]) => (
        <section key={date} className="job-day" aria-label={fmtDateLong(date)}>
          <h3 className="job-day-title">
            {fmtDateLong(date)} <span className="muted">· {list.length} Job{list.length === 1 ? '' : 's'}</span>
          </h3>
          <ul className="job-rows">
            {list.map((j) => {
              const content = (
                <>
                  <span className="job-time tabular"><Icon name="clock" size={16} /> {fmtRange(j.start, j.end)}</span>
                  <span className="job-inst"><Icon name="music" size={16} /> {j.instrument}</span>
                  <span className="job-studio"><Icon name="pin" size={16} /> {studioLabel(studios, j.studioId)}</span>
                  {!compact && <span className="job-id muted tabular">{j.id}</span>}
                  {!hideStatus && <span className="job-status"><JobStatusBadge status={j.status} /></span>}
                </>
              );
              return (
                <li key={j.id} className={`job-row ${selectedId === j.id ? 'selected' : ''}`}>
                  {onSelect ? (
                    <button type="button" className="job-row-btn" aria-pressed={selectedId === j.id} onClick={() => onSelect(j.id)}>
                      {content}
                    </button>
                  ) : (
                    <div className="job-row-inner">{content}</div>
                  )}
                  {renderAction && <span className="job-action">{renderAction(j)}</span>}
                </li>
              );
            })}
          </ul>
          {showBreaks && <DayBreaks jobs={list} />}
        </section>
      ))}
    </div>
  );
}
