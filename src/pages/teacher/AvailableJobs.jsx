// Prototype extension: View available Jobs -> Select Job -> Indicate Interest.
// Teachers cannot allocate Jobs to themselves (allocation is UC07, Manager only).
// Interest is checked against all eight allocation rules (including the FR-25
// continuous-teaching limit) and then waits for the Manager's approval.

import { useEffect, useRef, useState } from 'react';
import { Alert, Badge, Button, ButtonLink, Card, DataList, EmptyState, Modal, PageHeader, useToast } from '../../components/ui.jsx';
import JobList, { studioLabel } from '../../components/JobList.jsx';
import RuleChecklist from '../../components/RuleChecklist.jsx';
import { useStore } from '../../state/store.jsx';
import { fmtDateLong, fmtDateShort, fmtRange } from '../../lib/time.js';
import { INTEREST_STATUS, checkEligibility, interestFor, openJobs } from '../../lib/interest.js';

const STATUS_BADGE = {
  [INTEREST_STATUS.PENDING]: { tone: 'info', icon: 'clock', text: 'Awaiting Manager approval' },
  [INTEREST_STATUS.APPROVED]: { tone: 'success', icon: undefined, text: 'Approved · allocated to you' },
  [INTEREST_STATUS.DECLINED]: { tone: 'danger', icon: undefined, text: 'Declined by Manager' },
  [INTEREST_STATUS.CLOSED]: { tone: 'neutral', icon: 'ban', text: 'Closed' },
};

export function InterestBadge({ interest }) {
  const b = STATUS_BADGE[interest.status];
  return <Badge tone={b.tone} icon={b.icon}>{interest.status === INTEREST_STATUS.CLOSED && interest.note ? `Closed · ${interest.note}` : b.text}</Badge>;
}

/** The Teacher's own requests (used here and on the Dashboard). */
export function MyRequests({ data, teacherId, onWithdraw, limit }) {
  const mine = (data.interests || []).filter((i) => i.teacherId === teacherId).slice().reverse();
  if (!mine.length) return <p className="muted small">You have not indicated interest in any Jobs yet.</p>;
  return (
    <ul className="request-list">
      {mine.slice(0, limit ?? mine.length).map((i) => {
        const j = data.jobs.find((x) => x.id === i.jobId);
        return (
          <li key={i.id} className="request-item">
            <span className="request-info">
              <strong>{j ? `${j.instrument} · ${fmtDateShort(j.date)} · ${fmtRange(j.start, j.end)}` : i.jobId}</strong>
              <span className="muted tabular">{i.jobId}{j ? ` · ${studioLabel(data.studios, j.studioId)}` : ''}</span>
            </span>
            <span className="request-actions">
              <InterestBadge interest={i} />
              {onWithdraw && i.status === INTEREST_STATUS.PENDING && (
                <Button size="sm" variant="ghost" icon="x" onClick={() => onWithdraw(i)}>Withdraw</Button>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default function AvailableJobs({ query }) {
  const { data, session, indicateInterest, withdrawInterest } = useStore();
  const toast = useToast();
  const { teacherId } = session;
  const [selectedId, setSelectedId] = useState(query.job || null);
  const [confirming, setConfirming] = useState(false);
  const detailRef = useRef(null);

  useEffect(() => {
    if (query.job) setSelectedId(query.job);
  }, [query.job]);

  const jobs = openJobs(data);
  const eligibility = new Map(jobs.map((j) => [j.id, checkEligibility(data, j.id, teacherId).result]));
  const selected = jobs.find((j) => j.id === selectedId) || null;
  const selResult = selected ? eligibility.get(selected.id) : null;
  const selInterest = selected ? interestFor(data, selected.id, teacherId) : null;
  const isPending = selInterest?.status === INTEREST_STATUS.PENDING;
  const eligibleCount = [...eligibility.values()].filter((r) => r.ok).length;

  const select = (id) => {
    setSelectedId(id);
    if (window.matchMedia('(max-width: 1023px)').matches) {
      requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  };

  const confirm = () => {
    const res = indicateInterest(selected.id);
    setConfirming(false);
    if (res.ok) toast('success', `Interest sent for Job ${selected.id}. Your Manager will review it.`);
    else toast('danger', res.error);
  };

  const withdraw = (interest) => {
    const res = withdrawInterest(interest.id);
    toast(res.ok ? 'info' : 'danger', res.ok ? `Request for Job ${interest.jobId} withdrawn.` : res.error);
  };

  const rowBadge = (j) => {
    const it = interestFor(data, j.id, teacherId);
    if (it?.status === INTEREST_STATUS.PENDING) return <Badge tone="info" icon="clock">Requested</Badge>;
    return eligibility.get(j.id).ok ? <Badge tone="success">Eligible</Badge> : <Badge tone="danger">Not eligible</Badge>;
  };

  return (
    <>
      <PageHeader
        title="Available Jobs"
        description="Unallocated Jobs you can request. Select a Job to check whether you are eligible, then indicate interest. Your Manager makes the final allocation."
        actions={<ButtonLink to="/teacher/jobs" icon="jobs">My Jobs</ButtonLink>}
      />

      <Alert tone="info" title="How requesting a Job works" className="mb-3">
        1. Select an available Job · 2. Check the eight allocation rules · 3. <strong>Indicate Interest</strong> · 4. Your Manager approves
        or declines. An approved Job appears under My Jobs and counts toward your Workload.
      </Alert>

      <div className="split">
        <Card
          title="Unallocated Jobs"
          subtitle={jobs.length ? `${jobs.length} available · ${eligibleCount} you are eligible for` : 'Nothing available right now'}
        >
          {jobs.length ? (
            <JobList jobs={jobs} studios={data.studios} selectedId={selectedId} onSelect={select} renderAction={rowBadge} hideStatus compact />
          ) : (
            <EmptyState icon="checkCircle" title="No available Jobs">Every upcoming Job has been allocated. Check again later.</EmptyState>
          )}
        </Card>

        <div ref={detailRef} className="split-side">
          <Card title="Job details" className="sticky-card">
            {!selected && <EmptyState icon="info" title="No Job selected">Select a Job from the list to check your eligibility.</EmptyState>}
            {selected && (
              <>
                <DataList
                  items={[
                    ['Job', <span className="tabular">{selected.id}</span>],
                    ['Date', fmtDateLong(selected.date)],
                    ['Time', <span className="tabular">{fmtRange(selected.start, selected.end)}</span>],
                    ['Instrument', selected.instrument],
                    ['Studio', studioLabel(data.studios, selected.studioId)],
                  ]}
                />
                {isPending && (
                  <Alert tone="info" title="Interest sent — awaiting Manager approval" className="mt-3">
                    The Job is not yours yet. It will appear under My Jobs once your Manager approves it.
                  </Alert>
                )}
                {!isPending && selResult.ok && (
                  <Alert tone="success" title="You are eligible for this Job" className="mt-3">
                    All eight allocation rules pass with your current schedule and pending requests.
                  </Alert>
                )}
                {!isPending && !selResult.ok && (
                  <Alert tone="danger" title={`You cannot request this Job — ${selResult.failures.length} rule${selResult.failures.length === 1 ? '' : 's'} broken`} className="mt-3">
                    <ul className="fail-list">
                      {selResult.failures.map((f) => (
                        <li key={f.id}><strong>{f.fr} · {f.label}:</strong> {f.message}</li>
                      ))}
                    </ul>
                  </Alert>
                )}
                <div className="btn-row mt-3">
                  {isPending ? (
                    <Button variant="secondary" icon="x" onClick={() => withdraw(selInterest)}>Withdraw interest</Button>
                  ) : (
                    <Button icon="hand" disabled={!selResult.ok} onClick={() => setConfirming(true)}>Indicate Interest</Button>
                  )}
                </div>
                <details className="mt-3">
                  <summary className="summary">All eight rule checks</summary>
                  <RuleChecklist checks={selResult.checks} />
                </details>
              </>
            )}
          </Card>
        </div>
      </div>

      <Card title="My requests" subtitle="Jobs you have indicated interest in" className="mt-4">
        <MyRequests data={data} teacherId={teacherId} onWithdraw={withdraw} />
      </Card>

      <Modal
        open={confirming && Boolean(selected)}
        title="Indicate interest in this Job?"
        onClose={() => setConfirming(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirming(false)} data-autofocus>Cancel</Button>
            <Button icon="hand" onClick={confirm}>Confirm interest</Button>
          </>
        }
      >
        {selected && (
          <>
            <p>
              <strong>{selected.instrument}</strong> · {fmtDateLong(selected.date)} · <span className="tabular">{fmtRange(selected.start, selected.end)}</span> ·{' '}
              {studioLabel(data.studios, selected.studioId)} <span className="muted tabular">({selected.id})</span>
            </p>
            <p className="muted mt-2">
              Your Manager will review your request. The rules are checked again when the Manager approves, and the Job is only
              added to My Jobs after approval.
            </p>
          </>
        )}
      </Modal>
    </>
  );
}
