// UC03 View Weekly Jobs and Workload - FR-05, FR-06.

import { Alert, ButtonLink, Card, EmptyState, MetricCard, PageHeader } from '../../components/ui.jsx';
import JobList, { studioLabel } from '../../components/JobList.jsx';
import { useStore } from '../../state/store.jsx';
import { CURRENT_WEEK_START, DEMO_NOW_MINUTES, DEMO_TODAY } from '../../config.js';
import { fmtDateShort, fmtHours, fmtTime, fmtWeek, monthKey, monthLabel } from '../../lib/time.js';
import { JOB_STATUS, jobsToHours, monthlyHours, teacherJobsInWeek } from '../../lib/workload.js';
import { INTEREST_STATUS, openJobs } from '../../lib/interest.js';
import { MyRequests } from './AvailableJobs.jsx';

export default function TeacherDashboard() {
  const { data, session } = useStore();
  const { teacherId } = session; // only ever the logged-in Teacher's own data (NFR-10)
  const weekJobs = teacherJobsInWeek(data.jobs, teacherId, CURRENT_WEEK_START);
  const month = monthKey(DEMO_TODAY);
  const monthHours = monthlyHours(data.jobs, teacherId, month);
  const next = weekJobs.find((j) => j.date > DEMO_TODAY || (j.date === DEMO_TODAY && j.start >= DEMO_NOW_MINUTES));
  const firstName = session.name.split(' ')[0];
  const hasAnyJobs = data.jobs.some((j) => j.teacherId === teacherId && j.status === JOB_STATUS.ALLOCATED);
  const pending = (data.interests || []).filter((i) => i.teacherId === teacherId && i.status === INTEREST_STATUS.PENDING);
  const hasRequests = (data.interests || []).some((i) => i.teacherId === teacherId);
  const openCount = openJobs(data).length;

  return (
    <>
      <PageHeader
        title={`Welcome, ${firstName}`}
        description={`Your allocated Jobs for the current week (${fmtWeek(CURRENT_WEEK_START)}) and your Workload.`}
        actions={
          <>
            <ButtonLink to="/teacher/available" icon="hand">Available Jobs</ButtonLink>
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

      {!hasAnyJobs && (
        <Alert tone="info" title="No jobs allocated yet" className="mb-3">
          You do not have any allocated Jobs. There {openCount === 1 ? 'is' : 'are'} <strong>{openCount}</strong> available Job{openCount === 1 ? '' : 's'} you can
          browse. Indicate interest in one and your Manager will review it.
        </Alert>
      )}

      {hasRequests && (
        <Card
          title="My Job requests"
          subtitle={pending.length ? `${pending.length} awaiting Manager approval` : 'No requests awaiting approval'}
          actions={<ButtonLink to="/teacher/available" size="sm" icon="hand">Available Jobs</ButtonLink>}
          className="mb-3"
        >
          <MyRequests data={data} teacherId={teacherId} limit={5} />
        </Card>
      )}

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
            showBreaks
            renderAction={(j) => <ButtonLink to={`/teacher/jobs?job=${j.id}`} size="sm" variant="ghost" icon="arrowRight">Details</ButtonLink>}
          />
        ) : (
          <EmptyState
            icon="calendar"
            title="No jobs allocated yet"
            action={<ButtonLink to="/teacher/available" variant="primary" icon="hand">View available Jobs</ButtonLink>}
          >
            Your schedule for this week is empty. Jobs your Manager allocates to you, including approved requests, will appear here.
          </EmptyState>
        )}
      </Card>
    </>
  );
}
