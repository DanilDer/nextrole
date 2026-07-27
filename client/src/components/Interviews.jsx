import { useId, useState } from 'react';
import { INTERVIEW_TYPES } from '../api.js';
import {
  formatDateTime,
  formatRelative,
  interviewTypeLabel,
  statusKey,
  toDateTimeInputValue,
} from '../utils.js';
import { Alert, Spinner } from './Ui.jsx';

/**
 * Create or edit an interview.
 *
 * application_id is required because it is NOT NULL in the schema with a
 * foreign key to job_applications — an interview cannot exist on its own.
 * That is why the form takes the applications list: you pick the parent
 * rather than retyping the company, and company/position are read from
 * that parent everywhere they appear.
 *
 * There is no interviewer, stage, or status field because there are no
 * such columns. Cancelling an interview in particular has nowhere to be
 * stored, so it isn't offered.
 *
 * @param {object[]} applications  Parents to choose from.
 */
export function InterviewForm({
  interview = null,
  applications = [],
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitError = null,
}) {
  const ids = useId();
  const isEditing = Boolean(interview);

  const [values, setValues] = useState({
    application_id: interview?.application_id ? String(interview.application_id) : '',
    interview_date: interview?.interview_date
      ? toDateTimeInputValue(interview.interview_date)
      : '',
    interview_type: interview?.interview_type ?? 'phone',
    location_or_link: interview?.location_or_link ?? '',
    notes: interview?.notes ?? '',
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
    if (!values.application_id) {
      nextErrors.application_id = 'Choose which application this interview is for.';
    }
    if (!values.interview_date) {
      nextErrors.interview_date = 'Set the date and time so this appears in your upcoming list.';
    }
    if (values.location_or_link.trim().length > 500) {
      nextErrors.location_or_link = 'Keep this under 500 characters.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit(values);
  }

  if (applications.length === 0) {
    return (
      <div className="nr-stack">
        <Alert tone="info" title="Add an application first">
          Every interview attaches to a job application, so there needs to be at least one to choose
          from.
        </Alert>
        <div className="nr-form-actions">
          <button type="button" className="nr-btn nr-btn--outline" onClick={onCancel}>
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="nr-stack">
      <div className="nr-field">
        <label className="nr-label" htmlFor={`${ids}-app`}>
          Application <span className="nr-req" aria-hidden="true">*</span>
        </label>
        <select
          id={`${ids}-app`}
          className="nr-select"
          value={values.application_id}
          onChange={(event) => set('application_id', event.target.value)}
          aria-invalid={errors.application_id ? 'true' : undefined}
          aria-describedby={errors.application_id ? `${ids}-app-error` : undefined}
          disabled={isSubmitting}
        >
          <option value="">Choose an application…</option>
          {applications.map((application) => (
            <option value={application.application_id} key={application.application_id}>
              {application.position_title} — {application.company_name}
            </option>
          ))}
        </select>
        {errors.application_id ? (
          <p className="nr-error" id={`${ids}-app-error`} role="alert">
            {errors.application_id}
          </p>
        ) : null}
      </div>

      <div className="nr-field-row">
        <div className="nr-field">
          <label className="nr-label" htmlFor={`${ids}-date`}>
            Date and time <span className="nr-req" aria-hidden="true">*</span>
          </label>
          <input
            id={`${ids}-date`}
            type="datetime-local"
            className="nr-input"
            value={values.interview_date}
            onChange={(event) => set('interview_date', event.target.value)}
            aria-invalid={errors.interview_date ? 'true' : undefined}
            aria-describedby={errors.interview_date ? `${ids}-date-error` : undefined}
            disabled={isSubmitting}
          />
          {errors.interview_date ? (
            <p className="nr-error" id={`${ids}-date-error`} role="alert">
              {errors.interview_date}
            </p>
          ) : null}
        </div>

        <div className="nr-field">
          <label className="nr-label" htmlFor={`${ids}-type`}>
            Type
          </label>
          <select
            id={`${ids}-type`}
            className="nr-select"
            value={values.interview_type}
            onChange={(event) => set('interview_type', event.target.value)}
            disabled={isSubmitting}
          >
            {INTERVIEW_TYPES.map((type) => (
              <option value={type} key={type}>
                {interviewTypeLabel(type)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="nr-field">
        <label className="nr-label" htmlFor={`${ids}-where`}>
          Meeting link or location
        </label>
        <input
          id={`${ids}-where`}
          className="nr-input"
          value={values.location_or_link}
          onChange={(event) => set('location_or_link', event.target.value)}
          placeholder="https://… or an office address"
          maxLength={500}
          aria-invalid={errors.location_or_link ? 'true' : undefined}
          aria-describedby={errors.location_or_link ? `${ids}-where-error` : undefined}
          disabled={isSubmitting}
        />
        {errors.location_or_link ? (
          <p className="nr-error" id={`${ids}-where-error`} role="alert">
            {errors.location_or_link}
          </p>
        ) : null}
      </div>

      <div className="nr-field">
        <label className="nr-label" htmlFor={`${ids}-notes`}>
          Notes
        </label>
        <p className="nr-hint" id={`${ids}-notes-hint`}>
          Preparation before, and what was asked afterwards. There's one notes field on this table,
          so both go here.
        </p>
        <textarea
          id={`${ids}-notes`}
          className="nr-textarea"
          value={values.notes}
          onChange={(event) => set('notes', event.target.value)}
          aria-describedby={`${ids}-notes-hint`}
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
            'Add interview'
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
 * Interview rows.
 *
 * `readOnly` drops the Edit and Delete controls — used by the dashboard,
 * which shows the next few interviews as a summary rather than an editor.
 *
 * Upcoming interviews get the amber "interviewing" rail and a relative
 * countdown; past ones are dimmed to neutral so the next thing to prepare
 * for stands out. That distinction is computed from interview_date rather
 * than stored, because the interviews table has no status column.
 */
export function InterviewList({
  interviews,
  onEdit = () => {},
  onDelete = () => {},
  busyId = null,
  dimPast = false,
  readOnly = false,
}) {
  const [confirmingId, setConfirmingId] = useState(null);

  return (
    <ul className="nr-rows" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {interviews.map((interview) => {
        const id = interview.interview_id;
        const isConfirming = confirmingId === id;
        const isBusy = busyId === id;

        // Upcoming borrows the interviewing amber; past falls back to the
        // parent application's status so a rejection still reads as closed.
        const railStatus = interview.isUpcoming
          ? 'interview'
          : statusKey(interview.application_status);

        return (
          <li
            className="nr-row"
            data-status={railStatus}
            key={id}
            style={dimPast && !interview.isUpcoming ? { opacity: 0.72 } : undefined}
          >
            <div style={{ minWidth: 0 }}>
              <h3 className="nr-row-title">
                {interviewTypeLabel(interview.interview_type)}
                {interview.company_name ? ` · ${interview.company_name}` : ''}
              </h3>
              <p className="nr-row-sub">
                {interview.position_title ?? 'Application not found'}
              </p>

              <ul className="nr-row-facts">
                <li>{formatDateTime(interview.interview_date)}</li>
                {interview.interview_date ? (
                  <li>{formatRelative(interview.interview_date)}</li>
                ) : null}
              </ul>

              {interview.location_or_link ? (
                <p style={{ margin: '7px 0 0' }}>
                  {/^https?:\/\//i.test(interview.location_or_link) ? (
                    <a
                      className="nr-row-link"
                      href={interview.location_or_link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {interview.location_or_link}
                    </a>
                  ) : (
                    <span className="nr-hint">{interview.location_or_link}</span>
                  )}
                </p>
              ) : null}

              {interview.notes ? <p className="nr-row-note">{interview.notes}</p> : null}

              {isConfirming ? (
                <div
                  className="nr-alert"
                  data-tone="error"
                  role="alert"
                  style={{ marginTop: 10 }}
                >
                  <strong className="nr-alert-title">Delete this interview?</strong>
                  <span>This removes the record and its notes. It can't be undone.</span>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button
                      type="button"
                      className="nr-btn nr-btn--outline nr-btn--sm"
                      onClick={() => {
                        setConfirmingId(null);
                        onDelete(interview);
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
              {interview.isUpcoming ? (
                <span className="nr-badge" data-status="interview">
                  Upcoming
                </span>
              ) : null}

              {!readOnly ? (
                <>
                  <button
                    type="button"
                    className="nr-btn nr-btn--quiet nr-btn--sm"
                    onClick={() => onEdit(interview)}
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
                </>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
