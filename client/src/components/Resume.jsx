import { useId, useRef, useState } from 'react';
import { validateResumeFile } from '../api.js';
import { formatFileSize, pluralise, scoreBand } from '../utils.js';
import { Alert, Panel, Spinner } from './Ui.jsx';

/**
 * Upload a PDF and the posting it should be measured against.
 *
 * The job description is required, not optional: the backend controller
 * returns 400 "Job description is required" without it. /api/analysis
 * compares a resume to a specific posting — it is not a general resume
 * review — so the form is built as a two-part comparison from the start.
 *
 * @param {(input: {file: File, jobDescription: string}) => void} onSubmit
 * @param {boolean} isSubmitting
 * @param {string|null} submitError    Message from the failed request.
 * @param {string} [initialJobDescription]  Prefilled when the user picked a
 *   saved application to compare against.
 */
export function ResumeUploadForm({
  onSubmit,
  isSubmitting = false,
  submitError = null,
  initialJobDescription = '',
}) {
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState(initialJobDescription);
  const [errors, setErrors] = useState({});
  const [isDragging, setIsDragging] = useState(false);

  const inputRef = useRef(null);
  const fileFieldId = useId();
  const jdFieldId = useId();

  function pickFile(nextFile) {
    const message = validateResumeFile(nextFile);
    if (message) {
      setFile(null);
      setErrors((prev) => ({ ...prev, file: message }));
      return;
    }
    setFile(nextFile);
    setErrors((prev) => ({ ...prev, file: null }));
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    const dropped = event.dataTransfer?.files?.[0];
    if (dropped) pickFile(dropped);
  }

  function clearFile() {
    setFile(null);
    setErrors((prev) => ({ ...prev, file: null }));
    // Reset the input's value or re-picking the same filename won't fire onChange.
    if (inputRef.current) inputRef.current.value = '';
    inputRef.current?.focus();
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;

    const nextErrors = {};

    const fileMessage = validateResumeFile(file);
    if (fileMessage) nextErrors.file = fileMessage;

    const trimmedJd = jobDescription.trim();
    if (!trimmedJd) {
      nextErrors.jobDescription = 'Paste the job description so the resume can be scored against it.';
    } else if (trimmedJd.length < 40) {
      nextErrors.jobDescription =
        'That looks too short to score well. Paste the full posting for a useful result.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit({ file, jobDescription: trimmedJd });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="nr-stack">
      <div className="nr-field">
        <span className="nr-label" id={`${fileFieldId}-label`}>
          Resume <span className="nr-req" aria-hidden="true">*</span>
        </span>

        {file ? (
          <div className="nr-file">
            <div style={{ minWidth: 0 }}>
              <div className="nr-file-name">{file.name}</div>
              <p className="nr-file-meta">PDF · {formatFileSize(file.size)}</p>
            </div>
            <button
              type="button"
              className="nr-btn nr-btn--quiet nr-btn--sm"
              onClick={clearFile}
              disabled={isSubmitting}
            >
              Replace
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="nr-dropzone"
            data-dragging={isDragging}
            data-invalid={Boolean(errors.file)}
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            aria-describedby={errors.file ? `${fileFieldId}-error` : `${fileFieldId}-hint`}
          >
            <span className="nr-dropzone-lead">Choose a PDF or drop one here</span>
            <span className="nr-hint" id={`${fileFieldId}-hint`}>
              PDF only, up to 5 MB
            </span>
          </button>
        )}

        <input
          ref={inputRef}
          id={fileFieldId}
          type="file"
          accept="application/pdf,.pdf"
          className="nr-sr"
          aria-labelledby={`${fileFieldId}-label`}
          onChange={(event) => {
            const chosen = event.target.files?.[0];
            if (chosen) pickFile(chosen);
          }}
        />

        {errors.file ? (
          <p className="nr-error" id={`${fileFieldId}-error`} role="alert">
            {errors.file}
          </p>
        ) : null}
      </div>

      <div className="nr-field">
        <label className="nr-label" htmlFor={jdFieldId}>
          Job description <span className="nr-req" aria-hidden="true">*</span>
        </label>
        <p className="nr-hint" id={`${jdFieldId}-hint`}>
          Paste the posting you're applying to. The score measures this resume against this specific
          role, so a fuller posting gives a more useful result.
        </p>
        <textarea
          id={jdFieldId}
          className="nr-textarea"
          style={{ minHeight: 150 }}
          value={jobDescription}
          onChange={(event) => setJobDescription(event.target.value)}
          placeholder="Responsibilities, required skills, qualifications…"
          aria-invalid={errors.jobDescription ? 'true' : undefined}
          aria-describedby={
            errors.jobDescription ? `${jdFieldId}-error` : `${jdFieldId}-hint`
          }
          disabled={isSubmitting}
        />
        {errors.jobDescription ? (
          <p className="nr-error" id={`${jdFieldId}-error`} role="alert">
            {errors.jobDescription}
          </p>
        ) : null}
      </div>

      {submitError ? <Alert tone="error" title="Analysis failed">{submitError}</Alert> : null}

      <div className="nr-form-actions">
        <button type="submit" className="nr-btn nr-btn--primary" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Spinner label="Analysing" />
              Analysing…
            </>
          ) : (
            'Analyse resume'
          )}
        </button>
      </div>

      {isSubmitting ? (
        <p className="nr-hint" role="status">
          Extracting the text and sending it to Gemini. This usually takes a few seconds.
        </p>
      ) : null}
    </form>
  );
}

/* ============================================================
   Score arc
   ============================================================ */

/**
 * The ATS score as a three-quarter arc rather than a full ring, so the gap
 * reads as "distance still to cover" instead of an abstract donut.
 *
 * Colour comes from the same status palette the tracker uses, so a strong
 * score is the same green as an offer and a weak one the same muted rose as
 * a rejection — one colour language across the whole product.
 */
export function ScoreArc({ score, band, size = 132 }) {
  const stroke = 11;
  const radius = (size - stroke) / 2;
  const center = size / 2;

  // 270° sweep starting at the lower left (135°) and ending lower right.
  const sweep = 0.75;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * sweep;

  const hasScore = typeof score === 'number' && Number.isFinite(score);
  const fraction = hasScore ? Math.max(0, Math.min(100, score)) / 100 : 0;

  const colorVar =
    band?.key === 'offer'
      ? 'var(--nr-offer)'
      : band?.key === 'interview'
        ? 'var(--nr-interview)'
        : band?.key === 'rejected'
          ? 'var(--nr-rejected)'
          : 'var(--nr-ink-3)';

  return (
    <svg
      className="nr-score-arc"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={hasScore ? `ATS score ${score} out of 100` : 'No ATS score returned'}
    >
      <circle
        className="nr-score-arc-track"
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${arcLength} ${circumference}`}
        transform={`rotate(135 ${center} ${center})`}
      />
      <circle
        className="nr-score-arc-fill"
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={colorVar}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${arcLength} ${circumference}`}
        strokeDashoffset={arcLength * (1 - fraction)}
        transform={`rotate(135 ${center} ${center})`}
      />
      <text
        className="nr-score-arc-value"
        x={center}
        y={center + 2}
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {hasScore ? score : '—'}
      </text>
      {hasScore ? (
        <text
          className="nr-score-arc-unit"
          x={center}
          y={center + 24}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          / 100
        </text>
      ) : null}
    </svg>
  );
}

/* ============================================================
   Analysis results
   ============================================================ */

/**
 * Renders one analysis result across three sections — score, missing
 * keywords, suggestions — instead of dumping the response as text.
 *
 * Each of the three fields is treated as independently optional, because
 * the backend passes Gemini's JSON straight through and a reply can arrive
 * with a score but no keywords, or feedback but no score. Any section with
 * nothing in it explains what is missing rather than rendering blank.
 *
 * @param {{score: number|null, keywords: string[], suggestions: string[], rawFeedback: string}} analysis
 * @param {string} [fileName]     Shown so the reader knows which upload this is.
 * @param {boolean} [compact]     Score only — the dashboard summary view.
 * @param {React.ReactNode} [footer]
 */
export function AnalysisResult({ analysis, fileName, compact = false, footer }) {
  if (!analysis) return null;

  const { score, keywords = [], suggestions = [] } = analysis;
  const band = scoreBand(score);

  const scoreSection = (
    <div className="nr-score">
      <ScoreArc score={score} band={band} size={compact ? 108 : 132} />
      <div className="nr-score-copy">
        <span className="nr-eyebrow">ATS match</span>
        <p className="nr-score-band">{band.label}</p>
        <p className="nr-score-band-note">{band.note}</p>
        {fileName ? (
          <p className="nr-file-meta" style={{ marginTop: 10 }}>
            {fileName}
          </p>
        ) : null}
      </div>
    </div>
  );

  if (compact) {
    return (
      <div className="nr-stack">
        {scoreSection}
        {footer}
      </div>
    );
  }

  return (
    <div className="nr-stack">
      <Panel>{scoreSection}</Panel>

      <div className="nr-grid nr-grid--halves">
        <Panel
          title="Missing keywords"
          action={
            keywords.length > 0 ? (
              <span className="nr-eyebrow">
                {keywords.length} {pluralise(keywords.length, 'term')}
              </span>
            ) : null
          }
        >
          {keywords.length > 0 ? (
            <>
              <p className="nr-hint" style={{ marginBottom: 12 }}>
                Terms the posting asks for that this resume doesn't cover. Add the ones you can
                honestly back up with experience.
              </p>
              <ul className="nr-chips">
                {keywords.map((keyword) => (
                  <li className="nr-chip" key={keyword}>
                    {keyword}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="nr-hint">
              No missing keywords were returned. Either the resume already covers the posting's
              terms, or the model left this field out.
            </p>
          )}
        </Panel>

        <Panel
          title="Suggested improvements"
          action={
            suggestions.length > 0 ? (
              <span className="nr-eyebrow">
                {suggestions.length} {pluralise(suggestions.length, 'item')}
              </span>
            ) : null
          }
        >
          {suggestions.length > 0 ? (
            <ol className="nr-suggestions">
              {suggestions.map((suggestion, index) => (
                <li key={`${index}-${suggestion.slice(0, 24)}`}>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="nr-hint">No written feedback came back with this analysis.</p>
          )}
        </Panel>
      </div>

      {score === null ? (
        <Alert tone="info" title="No score in this reply">
          The model returned feedback without a numeric score. The rest of the analysis is still
          usable — run it again if you need the number.
        </Alert>
      ) : null}

      {footer}
    </div>
  );
}
