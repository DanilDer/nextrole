/**
 * Shared API configuration.
 *
 * ── Integration contract with Susana's auth pages ──────────────
 * Her login/register screens must write the backend's response into
 * localStorage using exactly these two keys. Everything I built reads
 * the token from here, so if she picks different names, change the two
 * constants below and nothing else in the project has to move.
 *
 *   localStorage.setItem('nextrole_token', data.token)
 *   localStorage.setItem('nextrole_user', JSON.stringify(data.user))
 *
 * If she builds an AuthContext with a useAuth() hook instead, see the
 * note at the top of src/hooks/useCurrentUser.js.
 */

export const TOKEN_KEY = 'nextrole_token';
export const USER_KEY = 'nextrole_user';

/**
 * Default is the relative '/api', which requires the Vite dev proxy
 * (project setup, so Susana's file). Relative paths also keep working
 * in production when the API is served from the same origin.
 *
 * Without the proxy, set VITE_API_BASE_URL=http://localhost:5000/api in
 * client/.env — but note the server has no CORS middleware yet, so
 * cross-origin requests will be blocked by the browser until someone
 * either adds the proxy or adds `cors` to the Express app.
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Mock data switch — OFF, and it should stay off.
 *
 * The applications and interviews endpoints do not exist in the backend
 * yet. With this false, those pages call the real routes and show an
 * honest "endpoint not available" panel listing what the server still
 * needs. Nothing is faked.
 *
 * Flipping this to true swaps in clearly-labelled sample records so the
 * table, filter, and form layouts can be reviewed on screen. It is for
 * looking at the UI only — edits vanish on refresh, and a bright banner
 * appears on every affected page so it can never be mistaken for real
 * data or demoed by accident.
 */
export const USE_MOCK_DATA = false;

/** The only four values the database allows (see database/schema.sql). */
export const APPLICATION_STATUSES = ['applied', 'interview', 'offer', 'rejected'];

/** Suggested by the schema comment on interviews.interview_type. */
export const INTERVIEW_TYPES = ['phone', 'technical', 'onsite', 'final'];

/** Mirrors the multer limit in server/routes/analysis.js. */
export const MAX_RESUME_BYTES = 5 * 1024 * 1024;

/* ============================================================
   HTTP client
   ============================================================ */

/**
 * One error type for every failure, so pages never have to guess what
 * shape they caught. The backend replies with { error: "message" } on
 * 400/401/500, so `message` is lifted straight out of that field.
 */
export class ApiError extends Error {
  constructor(message, { status = 0, kind = 'server', payload = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.kind = kind;
    this.payload = payload;
  }

  /** Session expired or missing — the caller should send the user to log in. */
  get isAuthError() {
    return this.kind === 'auth';
  }

  /** The route isn't implemented on the server yet. */
  get isMissingEndpoint() {
    return this.kind === 'missing-endpoint';
  }

  /** Server unreachable — usually the API isn't running, or CORS blocked it. */
  get isNetworkError() {
    return this.kind === 'network';
  }
}

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    /* storage unavailable (private mode) — nothing to clear */
  }
}

function buildUrl(path) {
  const base = API_BASE_URL.replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * @param {string} path      Route below the API base, e.g. '/analysis'.
 * @param {object} options
 * @param {string} [options.method='GET']
 * @param {object} [options.json]  Sent as a JSON body.
 * @param {FormData} [options.formData]  Sent as-is; Content-Type is left
 *   alone so the browser can add the multipart boundary itself.
 * @param {boolean} [options.auth=true]  Attach the bearer token.
 */
export async function request(path, options = {}) {
  const { method = 'GET', json, formData, auth = true, signal } = options;

  const headers = {};
  const token = auth ? getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  let body;
  if (formData) {
    body = formData;
  } else if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  }

  let response;
  try {
    response = await fetch(buildUrl(path), { method, headers, body, signal });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new ApiError(
      "Can't reach the NextRole API. Check that the server is running on port 5000.",
      { kind: 'network' },
    );
  }

  // 204, or an empty body on a 200.
  const raw = await response.text();
  let payload = null;
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = null;
    }
  }

  if (response.ok) {
    if (raw && payload === null) {
      throw new ApiError('The server sent a response that could not be read.', {
        status: response.status,
        kind: 'malformed',
      });
    }
    return payload;
  }

  // Express replies to an unregistered route with an HTML 404, which is
  // how the not-yet-built applications and interviews routes present.
  if (response.status === 404 && payload === null) {
    throw new ApiError('This endpoint does not exist on the server yet.', {
      status: 404,
      kind: 'missing-endpoint',
    });
  }

  if (response.status === 401) {
    clearSession();
    throw new ApiError(payload?.error || 'Your session has expired. Please log in again.', {
      status: 401,
      kind: 'auth',
      payload,
    });
  }

  throw new ApiError(
    payload?.error || `Request failed with status ${response.status}.`,
    { status: response.status, kind: 'server', payload },
  );
}

/** Blank strings become null so empty fields aren't stored as ''. */
function trimOrNull(value) {
  const text = String(value ?? '').trim();
  return text === '' ? null : text;
}

/* ============================================================
   Resume analysis  —  POST /api/analysis  (implemented)
   ============================================================ */

/**
 * POST /api/analysis   (fully implemented on the backend)
 *
 * Sends multipart/form-data with two parts, named to match
 * server/routes/analysis.js and server/controllers/analysisController.js:
 *   resume           the PDF file        (multer: upload.single('resume'))
 *   job_description  the posting text    (required — the route 400s without it)
 *
 * The controller replies { success: true, data: { ats_score,
 * missing_keywords, feedback } }.
 *
 * Note the route currently has no authMiddleware, so the token is not
 * required today. It is sent anyway, so nothing here breaks on the day
 * someone adds the middleware.
 */
export async function analyzeResume({ file, jobDescription, signal }) {
  const formData = new FormData();
  formData.append('resume', file);
  formData.append('job_description', jobDescription);

  const payload = await request('/analysis', {
    method: 'POST',
    formData,
    signal,
  });

  return normalizeAnalysis(payload?.data);
}

/**
 * Gemini is asked for JSON but is not guaranteed to comply, and the
 * controller passes whatever parsed through untouched. So every field is
 * coerced here rather than trusted, and the UI is handed a predictable
 * shape: { score, keywords[], suggestions[], rawFeedback }.
 */
export function normalizeAnalysis(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('The analysis came back empty. Try uploading the resume again.');
  }

  const score = coerceScore(data.ats_score);
  const keywords = coerceKeywords(data.missing_keywords);
  const rawFeedback = typeof data.feedback === 'string' ? data.feedback.trim() : '';
  const suggestions = splitFeedback(rawFeedback);

  if (score === null && keywords.length === 0 && !rawFeedback) {
    throw new Error(
      'The analysis came back without a score, keywords, or feedback. Try again in a moment.',
    );
  }

  return { score, keywords, suggestions, rawFeedback };
}

function coerceScore(value) {
  // Number(null) is 0 and Number('') is 0, so a missing score would otherwise
  // render as a real 0 and read as "weak match" rather than "no score".
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return null;

  const text = typeof value === 'string' ? value.replace(/[^\d.-]/g, '') : value;
  if (text === '') return null;

  const n = Number(text);
  if (!Number.isFinite(n)) return null;

  return Math.max(0, Math.min(100, Math.round(n)));
}

function coerceKeywords(value) {
  const list = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[,;\n]/)
      : [];

  const seen = new Set();
  const out = [];
  for (const item of list) {
    const text = String(item ?? '').trim().replace(/^[-*•\d.)\s]+/, '');
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

/**
 * `feedback` arrives as one string holding 3–5 suggestions, because the
 * prompt asks for prose rather than an array. Numbered lists are the most
 * common shape, then bullets, then plain line breaks; sentence splitting
 * is the last resort so a single-paragraph reply still renders as a list
 * instead of a wall of text.
 */
export function splitFeedback(text) {
  if (!text) return [];

  const numbered = text.split(/(?:^|\n)\s*\d+[.)]\s+/).map((s) => s.trim()).filter(Boolean);
  if (numbered.length > 1) return numbered;

  const bulleted = text.split(/(?:^|\n)\s*[-*•]\s+/).map((s) => s.trim()).filter(Boolean);
  if (bulleted.length > 1) return bulleted;

  const lines = text.split('\n').map((s) => s.trim()).filter(Boolean);
  if (lines.length > 1) return lines;

  const sentences = text.match(/[^.!?]+[.!?]+/g);
  if (sentences && sentences.length > 1) {
    return sentences.map((s) => s.trim()).filter(Boolean);
  }

  return [text];
}

export function validateResumeFile(file) {
  if (!file) return 'Choose a PDF resume to analyse.';

  const isPdf =
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!isPdf) return 'Only PDF files can be analysed. Export your resume as a PDF and try again.';

  if (file.size > MAX_RESUME_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return `That file is ${mb} MB. The limit is 5 MB — try exporting the PDF at a smaller size.`;
  }

  if (file.size === 0) return 'That file is empty. Choose a different PDF.';

  return null;
}

/* ── Session-only cache ────────────────────────────────────────
   The backend never saves an analysis: the controller returns the
   Gemini result and forgets it, and nothing writes to the resumes or
   ai_analysis tables. So there is no history to fetch.

   To let the dashboard show the result you just generated, the latest
   one is kept in sessionStorage. This is a display cache, not storage:
   it is scoped to the tab, it disappears when the tab closes, and the
   dashboard labels it "from this session" so it is never mistaken for
   saved history. Delete this whole block once GET /api/analysis exists.
   ------------------------------------------------------------ */

const SESSION_KEY = 'nextrole_last_analysis';

export function cacheLatestAnalysis(analysis, meta = {}) {
  try {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ ...analysis, fileName: meta.fileName ?? null, analyzedAt: Date.now() }),
    );
  } catch {
    /* storage unavailable — the dashboard just shows its empty state */
  }
}

export function readLatestAnalysis() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function clearLatestAnalysis() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* nothing to clear */
  }
}

/* ============================================================
   Job applications  —  routes not built yet
   ============================================================ */

/**
 * Job applications API.
 *
 * ⚠ None of these routes exist on the server yet. server/index.js mounts
 * only /api/auth and /api/analysis, so every call here returns a 404 and
 * the pages render a panel naming the missing route. Nothing is faked.
 *
 * The field names below are taken from the job_applications table in
 * database/schema.sql and are not invented:
 *
 *   application_id   serial, primary key
 *   user_id          set by the server from req.user.user_id, never sent
 *   company_name     varchar(255)  NOT NULL
 *   position_title   varchar(255)  NOT NULL
 *   job_description  text          the field the AI analysis compares against
 *   status           varchar(50)   'applied' | 'interview' | 'offer' | 'rejected'
 *   applied_date     date          defaults to CURRENT_DATE
 *   notes            text
 *
 * Routes the backend needs, all behind authMiddleware and all scoped by
 * `WHERE user_id = $1` so one account cannot read another's rows:
 *
 *   GET    /api/applications       list, newest first
 *   POST   /api/applications       create
 *   PUT    /api/applications/:id   update
 *   DELETE /api/applications/:id   delete
 *
 * The list is read from `payload.data` when present, matching the
 * { success, data } envelope the analysis controller already uses. A bare
 * array is also accepted so whoever writes the routes isn't boxed in.
 */

export async function listApplications({ signal } = {}) {
  if (USE_MOCK_DATA) return mockApplications();
  const payload = await request('/applications', { signal });
  return unwrapList(payload);
}

export async function createApplication(values, { signal } = {}) {
  if (USE_MOCK_DATA) throw new Error('Mock mode is read-only. Turn it off to save real records.');
  const payload = await request('/applications', {
    method: 'POST',
    json: applicationBody(values),
    signal,
  });
  return payload?.data ?? payload;
}

export async function updateApplication(id, values, { signal } = {}) {
  if (USE_MOCK_DATA) throw new Error('Mock mode is read-only. Turn it off to save real records.');
  const payload = await request(`/applications/${id}`, {
    method: 'PUT',
    json: applicationBody(values),
    signal,
  });
  return payload?.data ?? payload;
}

export async function deleteApplication(id, { signal } = {}) {
  if (USE_MOCK_DATA) throw new Error('Mock mode is read-only. Turn it off to delete real records.');
  await request(`/applications/${id}`, { method: 'DELETE', signal });
}

/** Only columns that exist are sent, and blanks go as null rather than "". */
function applicationBody(values) {
  return {
    company_name: trimOrNull(values.company_name),
    position_title: trimOrNull(values.position_title),
    job_description: trimOrNull(values.job_description),
    status: values.status || 'applied',
    applied_date: values.applied_date || null,
    notes: trimOrNull(values.notes),
  };
}



function unwrapList(payload) {
  const list = Array.isArray(payload) ? payload : payload?.data;
  return Array.isArray(list) ? list : [];
}

/** Counts per status, used by the dashboard pipeline bar. */
export function countByStatus(applications) {
  const counts = { applied: 0, interview: 0, offer: 0, rejected: 0 };
  for (const app of applications) {
    const status = String(app?.status ?? '').toLowerCase();
    if (status in counts) counts[status] += 1;
  }
  return counts;
}

/** Anything not closed out — the number that answers "how many are live?". */
export function countActive(applications) {
  return applications.filter((app) => {
    const status = String(app?.status ?? '').toLowerCase();
    return status === 'applied' || status === 'interview';
  }).length;
}

/* ============================================================
   Interviews  —  routes not built yet
   ============================================================ */

/**
 * Interviews API.
 *
 * ⚠ None of these routes exist on the server yet — same situation as
 * applications. Calls return 404 and the page explains what's missing.
 *
 * Fields from the interviews table in database/schema.sql:
 *
 *   interview_id      serial, primary key
 *   application_id    int NOT NULL, references job_applications
 *   interview_date    timestamp
 *   interview_type    varchar(100)  'phone' | 'technical' | 'onsite' | 'final'
 *   location_or_link  varchar(500)  zoom link or office address
 *   notes             text
 *
 * Two consequences worth knowing before reading the UI code:
 *
 * 1. There is no `status` column. So "upcoming", "completed" and
 *    "cancelled" cannot be stored. Upcoming vs past is derived from
 *    interview_date against the current time, and cancelling would need
 *    a new column — it is not faked here.
 *
 * 2. There is no company or position on this table. Both live on the
 *    parent application, so every interview must be joined to its
 *    application before it can be displayed. The UI joins client-side
 *    from the applications list, which means a plain SELECT is enough on
 *    the server and no particular join shape is demanded of it.
 *
 * Routes the backend needs, behind authMiddleware. Note that scoping has
 * to go through the parent application, since interviews has no user_id:
 *
 *   GET    /api/interviews       JOIN job_applications ON application_id
 *                                WHERE job_applications.user_id = $1
 *   POST   /api/interviews       verify the application_id belongs to the
 *                                caller before inserting
 *   PUT    /api/interviews/:id   same ownership check
 *   DELETE /api/interviews/:id   same ownership check
 */

export async function listInterviews({ signal } = {}) {
  if (USE_MOCK_DATA) return mockInterviews();
  const payload = await request('/interviews', { signal });
  const list = Array.isArray(payload) ? payload : payload?.data;
  return Array.isArray(list) ? list : [];
}

export async function createInterview(values, { signal } = {}) {
  if (USE_MOCK_DATA) throw new Error('Mock mode is read-only. Turn it off to save real records.');
  const payload = await request('/interviews', {
    method: 'POST',
    json: interviewBody(values),
    signal,
  });
  return payload?.data ?? payload;
}

export async function updateInterview(id, values, { signal } = {}) {
  if (USE_MOCK_DATA) throw new Error('Mock mode is read-only. Turn it off to save real records.');
  const payload = await request(`/interviews/${id}`, {
    method: 'PUT',
    json: interviewBody(values),
    signal,
  });
  return payload?.data ?? payload;
}

export async function deleteInterview(id, { signal } = {}) {
  if (USE_MOCK_DATA) throw new Error('Mock mode is read-only. Turn it off to delete real records.');
  await request(`/interviews/${id}`, { method: 'DELETE', signal });
}

function interviewBody(values) {
  return {
    application_id: values.application_id ? Number(values.application_id) : null,
    // <input type="datetime-local"> gives "2026-08-14T10:30" with no zone.
    // Sent as an ISO string so Postgres reads it unambiguously.
    interview_date: values.interview_date
      ? new Date(values.interview_date).toISOString()
      : null,
    interview_type: values.interview_type || null,
    location_or_link: trimOrNull(values.location_or_link),
    notes: trimOrNull(values.notes),
  };
}



/**
 * Attaches company and position from the parent application, then sorts:
 * upcoming interviews soonest-first (the next one is the one that matters),
 * past interviews most-recent-first, undated last.
 */
export function withApplicationDetails(interviews, applications) {
  const byId = new Map(applications.map((app) => [String(app.application_id), app]));
  const now = Date.now();

  return interviews
    .map((interview) => {
      const parent = byId.get(String(interview.application_id)) ?? null;
      const time = interview.interview_date ? new Date(interview.interview_date).getTime() : NaN;
      const hasDate = Number.isFinite(time);

      return {
        ...interview,
        company_name: parent?.company_name ?? null,
        position_title: parent?.position_title ?? null,
        application_status: parent?.status ?? null,
        _time: hasDate ? time : null,
        isUpcoming: hasDate && time >= now,
      };
    })
    .sort((a, b) => {
      if (a._time === null) return 1;
      if (b._time === null) return -1;
      if (a.isUpcoming && b.isUpcoming) return a._time - b._time;
      if (!a.isUpcoming && !b.isUpcoming) return b._time - a._time;
      return a.isUpcoming ? -1 : 1;
    });
}

export function splitByTiming(interviews) {
  return {
    upcoming: interviews.filter((i) => i.isUpcoming),
    past: interviews.filter((i) => !i.isUpcoming && i._time !== null),
    undated: interviews.filter((i) => i._time === null),
  };
}

/* ============================================================
   MOCK DATA — NOT REAL, NOT SAVED ANYWHERE
   ------------------------------------------------------------
   Unused while USE_MOCK_DATA is false in src/api/config.js, which
   is the shipped setting. Turn it on only to look at the table,
   filter, and form layouts before the backend routes exist.

   While it is on, every affected page shows an orange banner
   saying the data is fake, create and edit are refused rather
   than pretended, and nothing is written anywhere.

   Delete this file once /api/applications and /api/interviews
   are live.
   ============================================================ */

function daysFromNow(days, hour = 10, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function isoDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function mockApplications() {
  return [
    {
      application_id: 1,
      company_name: 'Sample Company A',
      position_title: 'Frontend Developer',
      status: 'interview',
      applied_date: isoDate(-12),
      job_description:
        'SAMPLE DATA. Looking for a React developer comfortable with hooks, component design, and REST APIs. Experience with TypeScript and testing preferred.',
      notes: 'SAMPLE DATA — referred by a classmate. Recruiter call went well.',
    },
    {
      application_id: 2,
      company_name: 'Sample Company B',
      position_title: 'Junior Software Engineer',
      status: 'applied',
      applied_date: isoDate(-5),
      job_description:
        'SAMPLE DATA. Graduate role on a Node.js and PostgreSQL team. Some exposure to cloud deployment expected.',
      notes: null,
    },
    {
      application_id: 3,
      company_name: 'Sample Company C',
      position_title: 'Full Stack Intern',
      status: 'offer',
      applied_date: isoDate(-28),
      job_description: 'SAMPLE DATA. Summer internship across the Express API and React client.',
      notes: 'SAMPLE DATA — offer received, need to reply by the end of the month.',
    },
    {
      application_id: 4,
      company_name: 'Sample Company D',
      position_title: 'Graduate Web Developer',
      status: 'rejected',
      applied_date: isoDate(-34),
      job_description: 'SAMPLE DATA. Agency role building client sites in React.',
      notes: 'SAMPLE DATA — no interview, form rejection after two weeks.',
    },
  ];
}

export function mockInterviews() {
  return [
    {
      interview_id: 1,
      application_id: 1,
      interview_date: daysFromNow(3, 14, 30),
      interview_type: 'technical',
      location_or_link: 'https://example.com/sample-meeting-link',
      notes: 'SAMPLE DATA — one hour, pair programming. Revise array methods and time complexity.',
    },
    {
      interview_id: 2,
      application_id: 1,
      interview_date: daysFromNow(-9, 11, 0),
      interview_type: 'phone',
      location_or_link: 'Phone screen',
      notes: 'SAMPLE DATA — thirty minutes with the recruiter, mostly background questions.',
    },
    {
      interview_id: 3,
      application_id: 3,
      interview_date: daysFromNow(-16, 9, 30),
      interview_type: 'final',
      location_or_link: 'Sample office, meeting room 2',
      notes: 'SAMPLE DATA — met the team, discussed start dates.',
    },
  ];
}
