import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { PageHeader, Panel } from '../components/Ui.jsx';
import { Alert } from '../components/Ui.jsx';
import { ResumeUploadForm } from '../components/Resume.jsx';
import { AnalysisResult } from '../components/Resume.jsx';
import { analyzeResume, cacheLatestAnalysis } from '../api.js';

/**
 * Resume upload and AI analysis.
 *
 * This is the one feature wired end to end against real data: it posts to
 * POST /api/analysis, which extracts the PDF text and returns Gemini's
 * scoring. Nothing on this page is mocked.
 *
 * Arriving from the applications tracker with
 * navigate('/resume', { state: { jobDescription, applicationLabel } })
 * prefills the posting, so you don't have to find the advert again.
 */
export function ResumeAnalysisPage() {
  const location = useLocation();
  const prefill = location.state ?? {};

  const [analysis, setAnalysis] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit({ file, jobDescription }) {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await analyzeResume({ file, jobDescription });
      setAnalysis(result);
      setFileName(file.name);
      // Lets the dashboard show this result for the rest of the session.
      cacheLatestAnalysis(result, { fileName: file.name });
    } catch (caught) {
      setError(messageFor(caught));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="nr-page">
      <PageHeader
        title="Resume analysis"
        subtitle="Score a resume against a specific job posting and see what's missing."
        actions={
          analysis ? (
            <button
              type="button"
              className="nr-btn nr-btn--outline"
              onClick={() => {
                setAnalysis(null);
                setFileName(null);
                setError(null);
              }}
            >
              Analyse another
            </button>
          ) : null
        }
      />

      <div className="nr-stack">
        {prefill.applicationLabel && !analysis ? (
          <Alert tone="info" title="Job description filled in">
            Using the posting saved on {prefill.applicationLabel}. Edit it below if you need to.
          </Alert>
        ) : null}

        {analysis ? (
          <>
            <AnalysisResult analysis={analysis} fileName={fileName ?? undefined} />
            <Alert tone="info" title="This result isn't saved">
              The backend returns the analysis without storing it, so it will be gone once you close
              the tab. Saving needs an INSERT into the resumes and ai_analysis tables, plus a
              GET /api/analysis route to read history back.
            </Alert>
          </>
        ) : (
          <Panel title="Upload a resume">
            <ResumeUploadForm
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              submitError={error}
              initialJobDescription={prefill.jobDescription ?? ''}
            />
          </Panel>
        )}
      </div>
    </div>
  );
}

/**
 * The controller returns a bare 500 "Something went wrong during analysis"
 * for every internal failure, so the cause has to be inferred. Right now
 * that 500 is almost always the pdf-parse call in analysisController.js:
 * pdf-parse v2 exports an object rather than a function, so `pdfParse(buffer)`
 * throws TypeError and the catch block turns it into this generic message.
 * Pointing at it here saves the next person a long debugging session.
 */
function messageFor(error) {
  if (error?.isNetworkError) {
    return "Can't reach the API. Check the server is running on port 5000, and that the Vite proxy or CORS is set up.";
  }

  if (error?.isAuthError) {
    return 'Your session has expired. Log in again and retry the upload.';
  }

  if (error?.status === 400) {
    return error.message;
  }

  if (error?.status === 500) {
    return 'The server could not finish the analysis. Two likely causes: the pdf-parse call in analysisController.js needs updating for v2, or the Gemini API key is missing or rate limited. Check the server console for the real error.';
  }

  return error?.message ?? 'Something went wrong. Try again in a moment.';
}

export default ResumeAnalysisPage;
