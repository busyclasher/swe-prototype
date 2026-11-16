// UC03 View Weekly Jobs and Workload - FR-05, FR-06.

import { ButtonLink, Card, EmptyState, MetricCard, PageHeader } from '../../components/ui.jsx';
import JobList, { studioLabel } from '../../components/JobList.jsx';
import { useStore } from '../../state/store.jsx';
import { CURRENT_WEEK_START, DEMO_NOW_MINUTES, DEMO_TODAY } from '../../config.js';
import { fmtDateShort, fmtHours, fmtTime, fmtWeek, monthKey, monthLabel } from '../../lib/time.js';
import { jobsToHours, monthlyHours, teacherJobsInWeek } from '../../lib/workload.js';

export default function TeacherDashboard() {
  const { data, session } = useStore();
  const { teacherId } = session; // only ever the logged-in Teacher's own data (NFR-10)
  const weekJobs = teacherJobsInWeek(data.jobs, teacherId, CURRENT_WEEK_START);
  const month = monthKey(DEMO_TODAY);
  const monthHours = monthlyHours(data.jobs, teacherId, month);
  const next = weekJobs.find((j) => j.date > DEMO_TODAY || (j.date === DEMO_TODAY && j.start >= DEMO_NOW_MINUTES));
  const firstName = session.name.split(' ')[0];

  return (
    <>
      <PageHeader
        title={`Welcome, ${firstName}`}
        description={`Your allocated Jobs for the current week (${fmtWeek(CURRENT_WEEK_START)}) and your Workload.`}
        actions={
          <>
            <ButtonLink to="/teacher/availability" icon="calendar">Submit Availability</ButtonLink>
            <ButtonLink to="/teacher/preferences" icon="sliders">Job Preferences</ButtonLink>
          </>
        }
      />

      <div className="metrics">
        <MetricCard label="Jobs this week" value={weekJobs.length} hint={fmtWeek(CURRENT_WEEK_START)} icon="jobs" />
        <MetricCard label="Workload this week" value={fmtHours(jobsToHours(weekJobs.length))} hint="30 minutes per Job" icon="clock" />
        <MetricCard label={`Total Workload – ${monthLabel(month)}`} value={fmtHours(monthHours)} hint="All allocated Jobs this month" icon="gauge" tone="primary" />
        <MetricCard
          label="Next Job"
          value={next ? fmtTime(next.start) : '—'}
          hint={next ? `${fmtDateShort(next.date)} · ${next.instrument} · ${studioLabel(data.studios, next.studioId)}` : 'No upcoming Jobs this week'}
          icon="arrowRight"
        />
      </div>

      <Card
        title="This week's allocated Jobs"
        subtitle={fmtWeek(CURRENT_WEEK_START)}
        actions={<ButtonLink to="/teacher/jobs" size="sm" icon="jobs">Manage Jobs / Reject a Job</ButtonLink>}
      >
        {weekJobs.length ? (
          <JobList
            jobs={weekJobs}
            studios={data.studios}
            compact
            renderAction={(j) => <ButtonLink to={`/teacher/jobs?job=${j.id}`} size="sm" variant="ghost" icon="arrowRight">Details</ButtonLink>}
          />
        ) : (
          <EmptyState icon="calendar" title="No Jobs allocated this week">
            Jobs your Manager allocates to you will appear here. Keep your Availability up to date.
          </EmptyState>
        )}
      </Card>
    </>
  );
}
