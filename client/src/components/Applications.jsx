import { useId, useState } from 'react';
import { APPLICATION_STATUSES } from '../api.js';
import {
  formatDate,
  formatRelative,
  statusKey,
  statusLabel,
  toDateInputValue,
  todayInputValue,
} from '../utils.js';
import { Alert, Spinner } from './Ui.jsx';

/**
 * The four statuses come from database/schema.sql, which comments the
 * status column as "applied, interview, offer, rejected" and defaults to
 * 'applied'. The wider set in the original project brief — interested,
 * withdrawn — has no column to live in, so it isn't offered anywhere in
 * the UI. Adding those would mean widening the CHECK/comment on the
 * column first.
 */
export function StatusBadge({ status }) {
  return (
    <span className="nr-badge" data-status={statusKey(status)}>
      {statusLabel(status)}
    </span>
  );
}

/* ============================================================
   Add / edit form
   ============================================================ */

/**
 * Create or edit a job application.
 *
 * Only the six writable columns on job_applications appear here. The
 * project brief also listed job URL, location, salary and follow-up date —
 * none of those columns exist, so they are not on the form. Adding them
 * means a migration first, not a frontend change.
 *
 * @param {object|null} application  Existing record when editing.
 * @param {(values: object) => void} onSubmit
 * @param {() => void} onCancel
 */
export function ApplicationForm({
  application = null,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitError = null,
}) {
  const ids = useId();
  const isEditing = Boolean(application);

  const [values, setValues] = useState({
    company_name: application?.company_name ?? '',
    position_title: application?.position_title ?? '',
    status: application?.status ?? 'applied',
    applied_date: application?.applied_date
      ? toDateInputValue(application.applied_date)
      : todayInputValue(),
    job_description: application?.job_description ?? '',
    notes: application?.notes ?? '',
  });
  const [errors, setErrors] = useState({});

  function set(field, value) {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;

    const nextErrors = {};

    // Both are NOT NULL in the schema, so blocking here avoids a round trip.
    if (!values.company_name.trim()) nextErrors.company_name = 'Enter the company name.';
    else if (values.company_name.trim().length > 255)
      nextErrors.company_name = 'Keep this under 255 characters.';

    if (!values.position_title.trim()) nextErrors.position_title = 'Enter the job title.';
    else if (values.position_title.trim().length > 255)
      nextErrors.position_title = 'Keep this under 255 characters.';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="nr-stack">
      <div className="nr-field-row">
        <div className="nr-field">
          <label className="nr-label" htmlFor={`${ids}-company`}>
            Company <span className="nr-req" aria-hidden="true">*</span>
          </label>
          <input
            id={`${ids}-company`}
            className="nr-input"
            value={values.company_name}
            onChange={(event) => set('company_name', event.target.value)}
            maxLength={255}
            autoComplete="organization"
            aria-invalid={errors.company_name ? 'true' : undefined}
            aria-describedby={errors.company_name ? `${ids}-company-error` : undefined}
            disabled={isSubmitting}
          />
          {errors.company_name ? (
            <p className="nr-error" id={`${ids}-company-error`} role="alert">
              {errors.company_name}
            </p>
          ) : null}
        </div>

        <div className="nr-field">
          <label className="nr-label" htmlFor={`${ids}-title`}>
            Job title <span className="nr-req" aria-hidden="true">*</span>
          </label>
          <input
            id={`${ids}-title`}
            className="nr-input"
            value={values.position_title}
            onChange={(event) => set('position_title', event.target.value)}
            maxLength={255}
            aria-invalid={errors.position_title ? 'true' : undefined}
            aria-describedby={errors.position_title ? `${ids}-title-error` : undefined}
            disabled={isSubmitting}
          />
          {errors.position_title ? (
            <p className="nr-error" id={`${ids}-title-error`} role="alert">
              {errors.position_title}
            </p>
          ) : null}
        </div>
      </div>

      <div className="nr-field-row">
        <div className="nr-field">
          <label className="nr-label" htmlFor={`${ids}-status`}>
            Status
          </label>
          <select
            id={`${ids}-status`}
            className="nr-select"
            value={values.status}
            onChange={(event) => set('status', event.target.value)}
            disabled={isSubmitting}
          >
            {APPLICATION_STATUSES.map((status) => (
              <option value={status} key={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>
        </div>

        <div className="nr-field">
          <label className="nr-label" htmlFor={`${ids}-date`}>
            Date applied
          </label>
          <input
            id={`${ids}-date`}
            type="date"
            className="nr-input"
            value={values.applied_date}
            onChange={(event) => set('applied_date', event.target.value)}
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="nr-field">
        <label className="nr-label" htmlFor={`${ids}-jd`}>
          Job description
        </label>
        <p className="nr-hint" id={`${ids}-jd-hint`}>
          Paste the posting here and you can send it straight to the resume analyser later, instead
          of finding the advert again.
        </p>
        <textarea
          id={`${ids}-jd`}
          className="nr-textarea"
          value={values.job_description}
          onChange={(event) => set('job_description', event.target.value)}
          aria-describedby={`${ids}-jd-hint`}
          disabled={isSubmitting}
        />
      </div>

      <div className="nr-field">
        <label className="nr-label" htmlFor={`${ids}-notes`}>
          Notes
        </label>
        <textarea
          id={`${ids}-notes`}
          className="nr-textarea"
          style={{ minHeight: 70 }}
          value={values.notes}
          onChange={(event) => set('notes', event.target.value)}
          placeholder="Contacts, referrals, anything to remember"
          disabled={isSubmitting}
        />
      </div>

      {submitError ? <Alert tone="error" title="Could not save">{submitError}</Alert> : null}

      <div className="nr-form-actions">
        <button
          type="button"
          className="nr-btn nr-btn--quiet"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button type="submit" className="nr-btn nr-btn--primary" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Spinner label="Saving" />
              Saving…
            </>
          ) : isEditing ? (
            'Save changes'
          ) : (
            'Add application'
          )}
        </button>
      </div>
    </form>
  );
}

/* ============================================================
   List
   ============================================================ */

/**
 * List of applications. A row rather than a table: at mobile widths a
 * six-column table has to either scroll sideways or hide columns, and the
 * colour-coded left rail carries the status at a glance more clearly than
 * a cell would.
 *
 * @param {(application: object) => void} onEdit
 * @param {(application: object) => void} onDelete
 * @param {(application: object) => void} [onAnalyse]  Send this posting to
 *   the resume analyser. Only offered when job_description has content.
 * @param {number|null} [busyId]  Row currently mid-request.
 */
export function ApplicationList({ applications, onEdit, onDelete, onAnalyse, busyId = null }) {
  const [confirmingId, setConfirmingId] = useState(null);

  return (
    <ul className="nr-rows" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {applications.map((application) => {
        const id = application.application_id;
        const isConfirming = confirmingId === id;
        const isBusy = busyId === id;
        const hasJobDescription = Boolean(String(application.job_description ?? '').trim());

        return (
          <li className="nr-row" data-status={statusKey(application.status)} key={id}>
            <div style={{ minWidth: 0 }}>
              <h3 className="nr-row-title">{application.position_title}</h3>
              <p className="nr-row-sub">{application.company_name}</p>

              <ul className="nr-row-facts">
                {application.applied_date ? (
                  <li>
                    Applied {formatDate(application.applied_date)}
                    {' · '}
                    {formatRelative(application.applied_date)}
                  </li>
                ) : (
                  <li>No date recorded</li>
                )}
                {hasJobDescription ? <li>Job description saved</li> : null}
              </ul>

              {application.notes ? <p className="nr-row-note">{application.notes}</p> : null}

              {isConfirming ? (
                <div
                  className="nr-alert"
                  data-tone="error"
                  role="alert"
                  style={{ marginTop: 10 }}
                >
                  <strong className="nr-alert-title">
                    Delete this application?
                  </strong>
                  <span>
                    {application.position_title} at {application.company_name}. Any interviews
                    recorded against it are deleted too, and this can't be undone.
                  </span>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button
                      type="button"
                      className="nr-btn nr-btn--outline nr-btn--sm"
                      onClick={() => {
                        setConfirmingId(null);
                        onDelete(application);
                      }}
                      disabled={isBusy}
                    >
                      {isBusy ? 'Deleting…' : 'Yes, delete it'}
                    </button>
                    <button
                      type="button"
                      className="nr-btn nr-btn--quiet nr-btn--sm"
                      onClick={() => setConfirmingId(null)}
                      disabled={isBusy}
                    >
                      Keep it
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="nr-row-side">
              <StatusBadge status={application.status} />

              {hasJobDescription && onAnalyse ? (
                <button
                  type="button"
                  className="nr-btn nr-btn--quiet nr-btn--sm"
                  onClick={() => onAnalyse(application)}
                >
                  Analyse
                </button>
              ) : null}

              <button
                type="button"
                className="nr-btn nr-btn--quiet nr-btn--sm"
                onClick={() => onEdit(application)}
                disabled={isBusy}
              >
                Edit
              </button>

              {!isConfirming ? (
                <button
                  type="button"
                  className="nr-btn nr-btn--danger nr-btn--sm"
                  onClick={() => setConfirmingId(id)}
                  disabled={isBusy}
                >
                  Delete
                </button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
