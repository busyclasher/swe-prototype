// UC04 Reject Job - FR-28, FR-29, FR-30.
// Steps: open allocated Jobs -> select a Job -> Reject Job -> warning to discuss
// with Manager -> Confirm or Cancel -> Job becomes Unallocated.

import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, DataList, EmptyState, Modal, PageHeader, useToast } from '../../components/ui.jsx';
import JobList, { JobStatusBadge, studioLabel } from '../../components/JobList.jsx';
import { useStore } from '../../state/store.jsx';
import { DEMO_NOW_MINUTES, DEMO_TODAY } from '../../config.js';
import { fmtDateLong, fmtRange } from '../../lib/time.js';
import { byDateTime, isAllocated } from '../../lib/workload.js';

export default function TeacherJobs({ query }) {
  const { data, session, rejectJob } = useStore();
  const toast = useToast();
  const [selectedId, setSelectedId] = useState(query.job || null);
  const [confirming, setConfirming] = useState(false);
  const [rejected, setRejected] = useState(null); // snapshot of the Job just rejected
  const detailRef = useRef(null);

  // Own Jobs only (NFR-10). Upcoming = not yet started at the demo time.
  const myJobs = data.jobs
    .filter((j) => isAllocated(j) && j.teacherId === session.teacherId)
    .filter((j) => j.date > DEMO_TODAY || (j.date === DEMO_TODAY && j.start >= DEMO_NOW_MINUTES))
    .sort(byDateTime);
  const selected = myJobs.find((j) => j.id === selectedId) || null;

  const select = (id) => {
    setSelectedId(id);
    setRejected(null);
    if (window.matchMedia('(max-width: 1023px)').matches) {
      requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  };

  useEffect(() => {
    if (query.job) setSelectedId(query.job);
  }, [query.job]);

  const cancel = () => {
    setConfirming(false);
    toast('info', 'Rejection cancelled. The Job is still allocated to you.');
  };

  const confirm = () => {
    const res = rejectJob(selected.id);
    setConfirming(false);
    if (res.ok) {
      setRejected(res.job);
      setSelectedId(null);
      toast('success', `Job ${res.job.id} rejected. It is now Unallocated.`);
    } else toast('danger', res.error);
  };

  const shown = rejected || selected;

  return (
    <>
      <PageHeader title="My Jobs" description="Select one of your upcoming allocated Jobs to see its details or reject it." />
      <div className="split">
        <Card title="Upcoming allocated Jobs" subtitle={`${myJobs.length} Job${myJobs.length === 1 ? '' : 's'} from ${fmtDateLong(DEMO_TODAY)}`}>
          {myJobs.length ? (
            <JobList jobs={myJobs} studios={data.studios} selectedId={selectedId} onSelect={select} />
          ) : (
            <EmptyState icon="jobs" title="No upcoming Jobs">You have no allocated Jobs from today onwards.</EmptyState>
          )}
        </Card>

        <div ref={detailRef} className="split-side">
          <Card title="Job details" className="sticky-card">
            {!shown && (
              <EmptyState icon="info" title="No Job selected">Select a Job from the list to view it and, if needed, reject it.</EmptyState>
            )}
            {shown && (
              <>
                {rejected && (
                  <Alert tone="success" title="Job rejected">
                    This Job is now <strong>Unallocated</strong>. It has been removed from your schedule and no longer counts
                    toward your Workload. Your Manager will see it as Unallocated on the Job Allocation page.
                  </Alert>
                )}
                <DataList
                  items={[
                    ['Job', <span className="tabular">{shown.id}</span>],
                    ['Date', fmtDateLong(shown.date)],
                    ['Time', <span className="tabular">{fmtRange(shown.start, shown.end)}</span>],
                    ['Instrument', shown.instrument],
                    ['Studio', studioLabel(data.studios, shown.studioId)],
                    ['Status', <JobStatusBadge status={shown.status} />],
                  ]}
                />
                {!rejected && (
                  <div className="mt-4">
                    <Button variant="danger" icon="ban" onClick={() => setConfirming(true)}>Reject Job</Button>
                  </div>
                )}
              </>
            )}
          </Card>
        </div>
      </div>

      <Modal
        open={confirming && Boolean(selected)}
        title="Reject this Job?"
        tone="danger"
        onClose={cancel}
        footer={
          <>
            <Button variant="secondary" onClick={cancel} data-autofocus>Cancel</Button>
            <Button variant="danger" icon="ban" onClick={confirm}>Confirm rejection</Button>
          </>
        }
      >
        {selected && (
          <>
            <Alert tone="warning" title="Discuss with your Manager first">
              Please discuss this Job with your Manager before confirming the rejection.
            </Alert>
            <p className="mt-3">
              <strong>{selected.instrument}</strong> · {fmtDateLong(selected.date)} · <span className="tabular">{fmtRange(selected.start, selected.end)}</span> ·{' '}
              {studioLabel(data.studios, selected.studioId)} <span className="muted tabular">({selected.id})</span>
            </p>
            <p className="muted">If you confirm, this Job will be removed from your schedule and marked Unallocated.</p>
          </>
        )}
      </Modal>
    </>
  );
}
