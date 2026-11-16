import Icon from './Icon.jsx';
import { Badge } from './ui.jsx';
import { fmtDateLong, fmtRange } from '../lib/time.js';
import { JOB_STATUS } from '../lib/workload.js';

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
export default function JobList({ jobs, studios, renderAction, selectedId, onSelect, compact }) {
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
                  <span className="job-status"><JobStatusBadge status={j.status} /></span>
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
        </section>
      ))}
    </div>
  );
}
