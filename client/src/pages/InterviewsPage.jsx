import { useMemo, useState } from 'react';
import { PageHeader, Panel, Modal } from '../components/Ui.jsx';
import {
  Alert,
  BackendPending,
  EmptyState,
  ErrorState,
  MockDataBanner,
  SkeletonRows,
} from '../components/Ui.jsx';
import { InterviewList } from '../components/Interviews.jsx';
import { InterviewForm } from '../components/Interviews.jsx';
import { useResource, EMPTY } from '../utils.js';
import {
  listInterviews,
  createInterview,
  updateInterview,
  deleteInterview,
  withApplicationDetails,
  splitByTiming,
} from '../api.js';
import { listApplications } from '../api.js';
import { USE_MOCK_DATA } from '../api.js';
import { pluralise } from '../utils.js';

const ROUTES = [
  'GET /api/interviews',
  'POST /api/interviews',
  'PUT /api/interviews/:id',
  'DELETE /api/interviews/:id',
];

/**
 * The interview tracker.
 *
 * Two things to know about how this works, both dictated by the schema:
 *
 * 1. Company and position aren't on the interviews table — they belong to
 *    the parent application. So this page loads both lists and joins them
 *    client-side, which keeps the server free to return a plain SELECT.
 *
 * 2. There's no status column, so upcoming vs past is computed from
 *    interview_date rather than stored. "Cancelled" and "completed" would
 *    each need a new column; neither is faked here.
 */
export function InterviewsPage() {
  const interviewsQuery = useResource(({ signal }) => listInterviews({ signal }));
  const applicationsQuery = useResource(({ signal }) => listApplications({ signal }));

  const [view, setView] = useState('upcoming');
  const [editing, setEditing] = useState(null); // interview | 'new' | null
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState(null);

  const interviews = interviewsQuery.data ?? EMPTY;
  const applications = applicationsQuery.data ?? EMPTY;

  const joined = useMemo(
    () => withApplicationDetails(interviews, applications),
    [interviews, applications],
  );
  const groups = useMemo(() => splitByTiming(joined), [joined]);

  const visible =
    view === 'upcoming'
      ? [...groups.upcoming, ...groups.undated]
      : view === 'past'
        ? groups.past
        : joined;

  async function handleSave(values) {
    setIsSaving(true);
    setSaveError(null);

    try {
      if (editing === 'new') {
        const created = await createInterview(values);
        interviewsQuery.setData([...interviews, created]);
      } else {
        const updated = await updateInterview(editing.interview_id, values);
        interviewsQuery.setData(
          interviews.map((item) =>
            item.interview_id === editing.interview_id ? { ...item, ...updated } : item,
          ),
        );
      }
      setEditing(null);
    } catch (caught) {
      setSaveError(
        caught?.isMissingEndpoint
          ? 'The server has no route to save this yet. POST /api/interviews needs to be built first.'
          : (caught?.message ?? 'Could not save. Try again.'),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(interview) {
    setBusyId(interview.interview_id);
    setActionError(null);

    try {
      await deleteInterview(interview.interview_id);
      interviewsQuery.setData(
        interviews.filter((item) => item.interview_id !== interview.interview_id),
      );
    } catch (caught) {
      setActionError(
        caught?.isMissingEndpoint
          ? 'The server has no route to delete this yet. DELETE /api/interviews/:id needs to be built first.'
          : (caught?.message ?? 'Could not delete. Try again.'),
      );
    } finally {
      setBusyId(null);
    }
  }

  const isMissing =
    interviewsQuery.error?.isMissingEndpoint || applicationsQuery.error?.isMissingEndpoint;
  const isLoading = interviewsQuery.isLoading || applicationsQuery.isLoading;
  const otherError = !isMissing ? (interviewsQuery.error ?? applicationsQuery.error) : null;

  const nextUp = groups.upcoming[0];

  return (
    <div className="nr-page">
      <PageHeader
        title="Interviews"
        subtitle={
          groups.upcoming.length > 0
            ? `${groups.upcoming.length} ${pluralise(groups.upcoming.length, 'interview')} coming up`
            : 'Every round, linked to the application it belongs to.'
        }
        actions={
          !isMissing ? (
            <button
              type="button"
              className="nr-btn nr-btn--primary"
              onClick={() => {
                setSaveError(null);
                setEditing('new');
              }}
            >
              Add interview
            </button>
          ) : null
        }
      />

      <div className="nr-stack">
        {USE_MOCK_DATA ? <MockDataBanner /> : null}
        {actionError ? <Alert tone="error">{actionError}</Alert> : null}

        {isMissing ? (
          <BackendPending feature="Interviews" routes={ROUTES}>
            The tracker below is built against the interviews table, but the server doesn&rsquo;t
            expose these routes yet. Note that scoping has to go through the parent application:
            interviews has no user_id column, so ownership checks need a JOIN on job_applications
            with WHERE job_applications.user_id = $1.
          </BackendPending>
        ) : otherError ? (
          <Panel>
            <ErrorState
              error={otherError}
              onRetry={() => {
                interviewsQuery.reload();
                applicationsQuery.reload();
              }}
            />
          </Panel>
        ) : (
          <>
            {nextUp ? (
              <Alert tone="info" title="Next up">
                {nextUp.company_name ? `${nextUp.company_name} — ` : ''}
                {nextUp.position_title ?? 'interview'}. Check your notes before the day.
              </Alert>
            ) : null}

            <Panel flush>
              <div className="nr-toolbar">
                <div className="nr-tabs" role="group" aria-label="Filter interviews">
                  <button
                    type="button"
                    className="nr-tab"
                    aria-pressed={view === 'upcoming'}
                    onClick={() => setView('upcoming')}
                  >
                    Upcoming{' '}
                    <span className="nr-tab-count">
                      {groups.upcoming.length + groups.undated.length}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="nr-tab"
                    aria-pressed={view === 'past'}
                    onClick={() => setView('past')}
                  >
                    Past <span className="nr-tab-count">{groups.past.length}</span>
                  </button>
                  <button
                    type="button"
                    className="nr-tab"
                    aria-pressed={view === 'all'}
                    onClick={() => setView('all')}
                  >
                    All <span className="nr-tab-count">{joined.length}</span>
                  </button>
                </div>
              </div>

              {isLoading ? (
                <SkeletonRows rows={3} />
              ) : joined.length === 0 ? (
                <EmptyState
                  title="No interviews recorded"
                  actions={
                    <button
                      type="button"
                      className="nr-btn nr-btn--primary"
                      onClick={() => setEditing('new')}
                    >
                      Add your first interview
                    </button>
                  }
                >
                  Add a round against one of your applications to keep the date, the meeting link,
                  and your preparation notes together.
                </EmptyState>
              ) : visible.length === 0 ? (
                <EmptyState title={view === 'past' ? 'Nothing in the past yet' : 'Nothing coming up'}>
                  {view === 'past'
                    ? 'Interviews move here once their date has passed.'
                    : 'Every interview you\u2019ve recorded has already happened. Switch to Past to see them.'}
                </EmptyState>
              ) : (
                <InterviewList
                  interviews={visible}
                  onEdit={(interview) => {
                    setSaveError(null);
                    setEditing(interview);
                  }}
                  onDelete={handleDelete}
                  busyId={busyId}
                  dimPast={view === 'all'}
                />
              )}
            </Panel>
          </>
        )}
      </div>

      {editing ? (
        <Modal
          title={editing === 'new' ? 'Add interview' : 'Edit interview'}
          onClose={() => {
            if (!isSaving) setEditing(null);
          }}
        >
          <InterviewForm
            interview={editing === 'new' ? null : editing}
            applications={applications}
            onSubmit={handleSave}
            onCancel={() => setEditing(null)}
            isSubmitting={isSaving}
            submitError={saveError}
          />
        </Modal>
      ) : null}
    </div>
  );
}

export default InterviewsPage;
