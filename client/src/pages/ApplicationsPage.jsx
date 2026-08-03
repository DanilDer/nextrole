import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, Panel, Modal } from '../components/Ui.jsx';
import {
  Alert,
  BackendPending,
  EmptyState,
  ErrorState,
  MockDataBanner,
  SkeletonRows,
} from '../components/Ui.jsx';
import { ApplicationList } from '../components/Applications.jsx';
import { ApplicationForm } from '../components/Applications.jsx';
import { useResource, EMPTY } from '../utils.js';
import {
  listApplications,
  createApplication,
  updateApplication,
  deleteApplication,
  countByStatus,
} from '../api.js';
import { APPLICATION_STATUSES, USE_MOCK_DATA } from '../api.js';
import { statusLabel, pluralise } from '../utils.js';

const ROUTES = [
  'GET /api/applications',
  'POST /api/applications',
  'PUT /api/applications/:id',
  'DELETE /api/applications/:id',
];

/**
 * The job application tracker.
 *
 * The list, filter, search and form are complete. The four routes above do
 * not exist on the server yet, so a fresh load shows the panel naming them
 * instead of a broken table. When the routes land, this page works with no
 * changes — src/api/applications.js already points at the right paths and
 * field names.
 */
export function ApplicationsPage() {
  const navigate = useNavigate();
  const { data, error, isLoading, reload, setData } = useResource(({ signal }) =>
    listApplications({ signal }),
  );

  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null); // application | 'new' | null
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState(null);

  const applications = data ?? EMPTY;
  const counts = useMemo(() => countByStatus(applications), [applications]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return applications.filter((application) => {
      if (statusFilter !== 'all' && String(application.status).toLowerCase() !== statusFilter) {
        return false;
      }
      if (!query) return true;
      return (
        String(application.company_name ?? '').toLowerCase().includes(query) ||
        String(application.position_title ?? '').toLowerCase().includes(query)
      );
    });
  }, [applications, statusFilter, search]);

  async function handleSave(values) {
    setIsSaving(true);
    setSaveError(null);

    try {
      if (editing === 'new') {
        const created = await createApplication(values);
        // Prepend rather than refetch — the list is already correct.
        setData([created, ...applications]);
      } else {
        const updated = await updateApplication(editing.application_id, values);
        setData(
          applications.map((application) =>
            application.application_id === editing.application_id
              ? { ...application, ...updated }
              : application,
          ),
        );
      }
      setEditing(null);
    } catch (caught) {
      setSaveError(
        caught?.isMissingEndpoint
          ? 'The server has no route to save this yet. POST /api/applications needs to be built first.'
          : (caught?.message ?? 'Could not save. Try again.'),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(application) {
    setBusyId(application.application_id);
    setActionError(null);

    try {
      await deleteApplication(application.application_id);
      setData(
        applications.filter((item) => item.application_id !== application.application_id),
      );
    } catch (caught) {
      setActionError(
        caught?.isMissingEndpoint
          ? 'The server has no route to delete this yet. DELETE /api/applications/:id needs to be built first.'
          : (caught?.message ?? 'Could not delete. Try again.'),
      );
    } finally {
      setBusyId(null);
    }
  }

  function handleAnalyse(application) {
    navigate('/resume', {
      state: {
        jobDescription: application.job_description ?? '',
        applicationLabel: `${application.position_title} at ${application.company_name}`,
      },
    });
  }

  const isMissing = error?.isMissingEndpoint;

  return (
    <div className="nr-page">
      <PageHeader
        title="Applications"
        subtitle={
          applications.length > 0
            ? `${applications.length} ${pluralise(applications.length, 'application')} tracked`
            : 'Every role you\u2019ve applied to, in one place.'
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
              Add application
            </button>
          ) : null
        }
      />

      <div className="nr-stack">
        {USE_MOCK_DATA ? <MockDataBanner /> : null}
        {actionError ? <Alert tone="error">{actionError}</Alert> : null}

        {isMissing ? (
          <BackendPending feature="Job applications" routes={ROUTES}>
            The tracker below is finished — list, search, status filter, and the add and edit forms
            are all built against the job_applications table. The server just doesn&rsquo;t expose
            these four routes yet. Each one needs authMiddleware and a WHERE user_id = $1 clause so
            accounts can&rsquo;t read each other&rsquo;s rows.
          </BackendPending>
        ) : error ? (
          <Panel>
            <ErrorState error={error} onRetry={reload} />
          </Panel>
        ) : (
          <Panel flush>
            <div className="nr-toolbar">
              <div className="nr-toolbar-search">
                <label className="nr-sr" htmlFor="nr-app-search">
                  Search applications
                </label>
                <input
                  id="nr-app-search"
                  type="search"
                  className="nr-input"
                  placeholder="Search company or title"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>

              <div className="nr-tabs" role="group" aria-label="Filter by status">
                <button
                  type="button"
                  className="nr-tab"
                  aria-pressed={statusFilter === 'all'}
                  onClick={() => setStatusFilter('all')}
                >
                  All <span className="nr-tab-count">{applications.length}</span>
                </button>
                {APPLICATION_STATUSES.map((status) => (
                  <button
                    type="button"
                    className="nr-tab"
                    key={status}
                    aria-pressed={statusFilter === status}
                    onClick={() => setStatusFilter(status)}
                  >
                    {statusLabel(status)} <span className="nr-tab-count">{counts[status]}</span>
                  </button>
                ))}
              </div>
            </div>

            {isLoading ? (
              <SkeletonRows rows={4} />
            ) : applications.length === 0 ? (
              <EmptyState
                title="No applications yet"
                actions={
                  <button
                    type="button"
                    className="nr-btn nr-btn--primary"
                    onClick={() => setEditing('new')}
                  >
                    Add your first application
                  </button>
                }
              >
                Track a role and it shows up on your dashboard pipeline. Paste the job description in
                too and you can score a resume against it in one click.
              </EmptyState>
            ) : visible.length === 0 ? (
              <EmptyState
                title="Nothing matches those filters"
                actions={
                  <button
                    type="button"
                    className="nr-btn nr-btn--outline"
                    onClick={() => {
                      setSearch('');
                      setStatusFilter('all');
                    }}
                  >
                    Clear filters
                  </button>
                }
              >
                {search
                  ? `No applications match “${search}”.`
                  : `Nothing at the ${statusLabel(statusFilter).toLowerCase()} stage right now.`}
              </EmptyState>
            ) : (
              <ApplicationList
                applications={visible}
                onEdit={(application) => {
                  setSaveError(null);
                  setEditing(application);
                }}
                onDelete={handleDelete}
                onAnalyse={handleAnalyse}
                busyId={busyId}
              />
            )}
          </Panel>
        )}
      </div>

      {editing ? (
        <Modal
          title={editing === 'new' ? 'Add application' : 'Edit application'}
          onClose={() => {
            if (!isSaving) setEditing(null);
          }}
        >
          <ApplicationForm
            application={editing === 'new' ? null : editing}
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

export default ApplicationsPage;
