// UC05 Monitor Staff Workload - FR-01, FR-02, FR-03.

import { Badge, ButtonLink, Card, EmptyState, Meter, MetricCard, PageHeader } from '../../components/ui.jsx';
import { useStore } from '../../state/store.jsx';
import { CURRENT_WEEK_START, WORKLOAD_THRESHOLD_HOURS } from '../../config.js';
import { fmtHours, fmtWeek, inWeek } from '../../lib/time.js';
import { JOB_STATUS, lowestWorkload, weeklyWorkloadRows } from '../../lib/workload.js';

export function WorkloadBadge({ over }) {
  return over ? (
    <Badge tone="danger" icon="alert">Above {WORKLOAD_THRESHOLD_HOURS} hours</Badge>
  ) : (
    <Badge tone="success">Within threshold</Badge>
  );
}

export default function ManagerDashboard() {
  const { data } = useStore();
  const rows = weeklyWorkloadRows(data.teachers, data.jobs, CURRENT_WEEK_START);
  const lowest = lowestWorkload(rows);
  const over = rows.filter((r) => r.overThreshold).sort((a, b) => b.hours - a.hours);
  const total = rows.reduce((s, r) => s + r.hours, 0);
  const unallocated = data.jobs.filter((j) => j.status === JOB_STATUS.UNALLOCATED && inWeek(j.date, CURRENT_WEEK_START));
  const maxHours = Math.max(WORKLOAD_THRESHOLD_HOURS + 10, ...rows.map((r) => r.hours));

  return (
    <>
      <PageHeader
        title="Staff Workload"
        description={`Allocated Workload for the current week, ${fmtWeek(CURRENT_WEEK_START)}. Threshold: more than ${WORKLOAD_THRESHOLD_HOURS} hours in one week.`}
        actions={<ButtonLink to="/manager/allocation" variant="primary" icon="allocate">Allocate Jobs</ButtonLink>}
      />

      <div className="metrics">
        <MetricCard label="Teachers" value={rows.length} hint="Active Teacher Profiles" icon="users" />
        <MetricCard label="Allocated this week" value={fmtHours(total)} hint={`${rows.reduce((s, r) => s + r.jobCount, 0)} Jobs`} icon="clock" />
        <MetricCard label={`Above ${WORKLOAD_THRESHOLD_HOURS} hours`} value={over.length} hint={over.length ? 'Needs attention' : 'No Teachers above threshold'} icon="alert" tone={over.length ? 'danger' : undefined} />
        <MetricCard label="Unallocated Jobs this week" value={unallocated.length} hint={unallocated.length ? <ButtonLink to="/manager/allocation" size="sm" variant="ghost" icon="arrowRight" className="metric-link">Review pending Jobs</ButtonLink> : 'All Jobs allocated'} icon="ban" tone={unallocated.length ? 'warning' : undefined} />
      </div>

      <div className="grid-2">
        <Card title="Lowest allocated Workload" subtitle="Three Teachers with the least allocated hours this week">
          <ol className="rank-list">
            {lowest.map((r, i) => (
              <li key={r.teacher.id} className="rank-item">
                <span className="rank-num" aria-hidden="true">{i + 1}</span>
                <span className="rank-name">
                  {r.teacher.name}
                  <span className="muted small">{r.teacher.profile.instruments.join(', ') || 'No Instruments recorded'}</span>
                </span>
                <span className="rank-hours tabular">{fmtHours(r.hours)}</span>
              </li>
            ))}
          </ol>
        </Card>

        <Card title={`Above ${WORKLOAD_THRESHOLD_HOURS} hours this week`} subtitle="Teachers whose allocated Workload exceeds the threshold">
          {over.length ? (
            <ul className="rank-list">
              {over.map((r) => (
                <li key={r.teacher.id} className="rank-item rank-warn">
                  <span className="rank-num rank-num-warn" aria-hidden="true">!</span>
                  <span className="rank-name">
                    {r.teacher.name}
                    <span className="small"><WorkloadBadge over /></span>
                  </span>
                  <span className="rank-hours tabular">{fmtHours(r.hours)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon="checkCircle" title={`No Teacher is above ${WORKLOAD_THRESHOLD_HOURS} hours this week`} />
          )}
        </Card>
      </div>

      <Card title="Weekly Workload by Teacher" subtitle={fmtWeek(CURRENT_WEEK_START)} className="mt-4">
        <div className="table-wrap">
          <table className="table rtable">
            <thead>
              <tr>
                <th scope="col">Teacher</th>
                <th scope="col">Instruments</th>
                <th scope="col" className="num">Jobs</th>
                <th scope="col" className="num">Allocated hours</th>
                <th scope="col" className="col-meter">Workload</th>
                <th scope="col">Status</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.teacher.id} className={r.overThreshold ? 'row-warn' : ''}>
                  <th scope="row" data-label="Teacher">{r.teacher.name}</th>
                  <td data-label="Instruments">{r.teacher.profile.instruments.join(', ') || '—'}</td>
                  <td data-label="Jobs" className="num tabular">{r.jobCount}</td>
                  <td data-label="Allocated hours" className="num tabular"><strong>{fmtHours(r.hours)}</strong></td>
                  <td data-label="Workload" className="col-meter">
                    <Meter value={r.hours} max={maxHours} tone={r.overThreshold ? 'danger' : 'primary'} label={`${r.teacher.name}: ${fmtHours(r.hours)}`} />
                  </td>
                  <td data-label="Status"><WorkloadBadge over={r.overThreshold} /></td>
                  <td data-label="Actions" className="actions-cell">
                    <ButtonLink to={`/manager/availability?teacher=${r.teacher.id}`} size="sm" variant="ghost" icon="calendar">Availability</ButtonLink>
                    <ButtonLink to={`/manager/profiles?teacher=${r.teacher.id}`} size="sm" variant="ghost" icon="user">Profile</ButtonLink>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
