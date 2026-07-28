import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Alert,
  BackendPending,
  EmptyState,
  ErrorState,
  LoadingBlock,
  MockDataBanner,
  Panel,
  PageHeader,
  SkeletonRows,
} from '../components/Ui.jsx';
import { AnalysisResult } from '../components/Resume.jsx';
import { InterviewList } from '../components/Interviews.jsx';
import {
  APPLICATION_STATUSES,
  USE_MOCK_DATA,
  countActive,
  countByStatus,
  listApplications,
  listInterviews,
  readLatestAnalysis,
  splitByTiming,
  withApplicationDetails,
} from '../api.js';
import { EMPTY, pluralise, statusLabel, useCurrentUser, useResource, firstNameOf } from '../utils.js';

/* ── Dashboard pieces ──────────────────────────────────── */

/** A labelled number with optional supporting note. */
export function StatTile({ label, value, note }) {
  return (
    <div className="nr-stat">
      <span className="nr-eyebrow">{label}</span>
      <p className="nr-stat-value">{value}</p>
      {note ? <p className="nr-stat-note">{note}</p> : null}
    </div>
  );
}

/**
 * Every application as one stacked bar, split by status.
 *
 * This leads the dashboard instead of a row of counters because the useful
 * question during a job search isn't "how many did I send" but "where does
 * the pile actually stand" — how much is still live versus closed out. One
 * bar answers that in a glance; four separate numbers make you do the
 * arithmetic yourself.
 *
 * @param {{applied: number, interview: number, offer: number, rejected: number}} counts
 */
export function PipelineBar({ counts, total }) {
  const sum = total ?? APPLICATION_STATUSES.reduce((acc, key) => acc + (counts[key] ?? 0), 0);

  if (sum === 0) return null;

  const live = (counts.applied ?? 0) + (counts.interview ?? 0);

  return (
    <div>
      <div
        className="nr-pipeline-track"
        role="img"
        aria-label={APPLICATION_STATUSES.filter((key) => counts[key] > 0)
          .map((key) => `${counts[key]} ${statusLabel(key).toLowerCase()}`)
          .join(', ')}
      >
        {APPLICATION_STATUSES.map((key) =>
          counts[key] > 0 ? (
            <span
              className="nr-pipeline-seg"
              data-status={key}
              key={key}
              style={{ flexGrow: counts[key] }}
            />
          ) : null,
        )}
      </div>

      <ul className="nr-pipeline-key">
        {APPLICATION_STATUSES.map((key) => (
          <li key={key}>
            <span className="nr-pipeline-dot" data-status={key} aria-hidden="true" />
            <span>
              <span className="nr-pipeline-count">{counts[key] ?? 0}</span> {statusLabel(key)}
            </span>
          </li>
        ))}
      </ul>

      <p className="nr-stat-note" style={{ marginTop: 14 }}>
        {live} of {sum} {pluralise(sum, 'application')} {pluralise(live, 'is', 'are')} still live.
      </p>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────── */


const APPLICATION_ROUTES = [
  'GET /api/applications',
  'POST /api/applications',
  'PUT /api/applications/:id',
  'DELETE /api/applications/:id',
];

/**
 * The central overview.
 *
 * Each section loads and fails on its own rather than the page failing as a
 * whole. That matters here: the analysis endpoint works today while the
 * applications and interviews routes don't exist yet, so a single shared
 * error state would hide the one part that does work.
 */
export function DashboardPage() {
  const user = useCurrentUser();
  const firstName = firstNameOf(user);

  const applicationsQuery = useResource(({ signal }) => listApplications({ signal }));
  const interviewsQuery = useResource(({ signal }) => listInterviews({ signal }));

  // Session-only, from the analysis just run in this tab. There is no
  // GET /api/analysis, so no saved history exists to load.
  const latestAnalysis = useMemo(() => readLatestAnalysis(), []);

  const applications = applicationsQuery.data ?? EMPTY;
  const interviews = interviewsQuery.data ?? EMPTY;

  const counts = useMemo(() => countByStatus(applications), [applications]);
  const activeCount = useMemo(() => countActive(applications), [applications]);

  const upcoming = useMemo(() => {
    if (applications.length === 0 && interviews.length === 0) return [];
    return splitByTiming(withApplicationDetails(interviews, applications)).upcoming;
  }, [interviews, applications]);

  const applicationsMissing = applicationsQuery.error?.isMissingEndpoint;
  const interviewsMissing = interviewsQuery.error?.isMissingEndpoint;
  const sessionExpired =
    applicationsQuery.error?.isAuthError || interviewsQuery.error?.isAuthError;

  const hasNothingAtAll =
    !applicationsQuery.isLoading &&
    !applicationsQuery.error &&
    applications.length === 0 &&
    !latestAnalysis;

  return (
    <div className="nr-page">
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}` : 'Your job search'}
        subtitle="Everything you're tracking, in one view."
        actions={
          <>
            <Link className="nr-btn nr-btn--outline" to="/resume">
              Analyse a resume
            </Link>
            <Link className="nr-btn nr-btn--primary" to="/applications">
              Add an application
            </Link>
          </>
        }
      />

      <div className="nr-stack">
        {USE_MOCK_DATA ? <MockDataBanner /> : null}

        {sessionExpired ? (
          <Alert tone="error" title="Your session has expired">
            Log in again to load your applications and interviews.
          </Alert>
        ) : null}

        {hasNothingAtAll ? (
          <Panel>
            <EmptyState
              title="Nothing tracked yet"
              actions={
                <>
                  <Link className="nr-btn nr-btn--primary" to="/resume">
                    Analyse your first resume
                  </Link>
                  <Link className="nr-btn nr-btn--outline" to="/applications">
                    Add your first application
                  </Link>
                </>
              }
            >
              Start with a resume check to see how it scores against a posting, or log an application
              you've already sent. Both feed this dashboard.
            </EmptyState>
          </Panel>
        ) : null}

        {/* ── Applications ───────────────────────────────────── */}
        {applicationsMissing ? (
          <Panel title="Applications">
            <BackendPending feature="Job applications" routes={APPLICATION_ROUTES} />
          </Panel>
        ) : applicationsQuery.error && !sessionExpired ? (
          <Panel title="Applications">
            <ErrorState error={applicationsQuery.error} onRetry={applicationsQuery.reload} />
          </Panel>
        ) : applicationsQuery.isLoading ? (
          <Panel title="Applications">
            <LoadingBlock label="Loading your applications…" />
          </Panel>
        ) : applications.length > 0 ? (
          <>
            <Panel
              title="Where things stand"
              action={
                <Link className="nr-btn nr-btn--quiet nr-btn--sm" to="/applications">
                  View all
                </Link>
              }
            >
              <PipelineBar counts={counts} total={applications.length} />
            </Panel>

            <div className="nr-grid nr-grid--stats">
              <StatTile
                label="Applications"
                value={applications.length}
                note={`${activeCount} still live`}
              />
              <StatTile
                label="Interviewing"
                value={counts.interview}
                note={
                  counts.interview > 0
                    ? `${counts.interview} ${pluralise(counts.interview, 'company')} in progress`
                    : 'None at this stage'
                }
              />
              <StatTile
                label="Offers"
                value={counts.offer}
                note={counts.offer > 0 ? 'Worth replying to soon' : 'None yet'}
              />
              <StatTile
                label="Upcoming interviews"
                value={interviewsMissing ? '—' : upcoming.length}
                note={
                  interviewsMissing
                    ? 'Needs the interviews route'
                    : upcoming.length > 0
                      ? 'Scheduled ahead'
                      : 'Nothing scheduled'
                }
              />
            </div>
          </>
        ) : null}

        <div className="nr-grid nr-grid--split">
          {/* ── Latest analysis ──────────────────────────────── */}
          <Panel
            title="Latest resume analysis"
            action={
              <Link className="nr-btn nr-btn--quiet nr-btn--sm" to="/resume">
                {latestAnalysis ? 'Run another' : 'Start'}
              </Link>
            }
          >
            {latestAnalysis ? (
              <>
                <AnalysisResult
                  analysis={latestAnalysis}
                  fileName={latestAnalysis.fileName ?? undefined}
                  compact
                />
                <p className="nr-stat-note" style={{ marginTop: 16 }}>
                  From this session only. The backend doesn't save analyses yet, so this clears when
                  you close the tab.
                </p>
              </>
            ) : (
              <EmptyState
                title="No analysis yet"
                actions={
                  <Link className="nr-btn nr-btn--primary" to="/resume">
                    Upload a resume
                  </Link>
                }
              >
                Upload a PDF with the posting you're targeting and you'll get an ATS score, the
                keywords you're missing, and specific fixes.
              </EmptyState>
            )}
          </Panel>

          {/* ── Upcoming interviews ──────────────────────────── */}
          <Panel
            title="Upcoming interviews"
            action={
              !interviewsMissing ? (
                <Link className="nr-btn nr-btn--quiet nr-btn--sm" to="/interviews">
                  View all
                </Link>
              ) : null
            }
            flush={upcoming.length > 0}
          >
            {interviewsMissing ? (
              <BackendPending
                feature="Interviews"
                routes={['GET /api/interviews', 'POST /api/interviews']}
              />
            ) : interviewsQuery.isLoading ? (
              <SkeletonRows rows={2} />
            ) : interviewsQuery.error && !sessionExpired ? (
              <ErrorState error={interviewsQuery.error} onRetry={interviewsQuery.reload} />
            ) : upcoming.length > 0 ? (
              <InterviewList interviews={upcoming.slice(0, 4)} readOnly />
            ) : (
              <EmptyState
                title="Nothing scheduled"
                actions={
                  <Link className="nr-btn nr-btn--outline" to="/interviews">
                    Record an interview
                  </Link>
                }
              >
                Interviews you add against an application show up here with the soonest first.
              </EmptyState>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
