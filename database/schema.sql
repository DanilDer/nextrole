-- ============================================================
--  NextRole – AI Resume & Job Tracker Platform
--  Database Schema
--  dialect: PostgreSQL
-- ============================================================

-- ============================================================
--  USERS
--  The root table. Every other table links back to a user.
-- ============================================================
CREATE TABLE users (
    user_id     SERIAL PRIMARY KEY,           -- auto-incrementing unique ID
    name        VARCHAR(100) NOT NULL,         -- user's full name
    email       VARCHAR(255) NOT NULL UNIQUE,  -- must be unique across all users
    password_hash VARCHAR(255) NOT NULL,       -- never store plain passwords
    created_at  TIMESTAMP DEFAULT NOW()        -- automatically set on insert
);

-- ============================================================
--  RESUMES
--  A user can upload many resumes (different versions).
-- ============================================================
CREATE TABLE resumes (
    resume_id   SERIAL PRIMARY KEY,
    user_id     INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    file_url    VARCHAR(500),                  -- path or cloud storage URL
    resume_text TEXT,                          -- extracted plain text (for AI analysis)
    uploaded_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
--  JOB_APPLICATIONS
--  Tracks every job a user has applied to.
-- ============================================================
CREATE TABLE job_applications (
    application_id  SERIAL PRIMARY KEY,
    user_id         INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    company_name    VARCHAR(255) NOT NULL,
    position_title  VARCHAR(255) NOT NULL,
    job_description TEXT,                      -- paste the job posting here (used by AI)
    status          VARCHAR(50) DEFAULT 'applied',  -- applied, interview, offer, rejected
    applied_date    DATE DEFAULT CURRENT_DATE,
    notes           TEXT                       -- freeform user notes
);

-- ============================================================
--  INTERVIEWS
--  One job application can lead to multiple interview rounds.
-- ============================================================
CREATE TABLE interviews (
    interview_id    SERIAL PRIMARY KEY,
    application_id  INT NOT NULL REFERENCES job_applications(application_id) ON DELETE CASCADE,
    interview_date  TIMESTAMP,
    interview_type  VARCHAR(100),              -- phone, technical, onsite, final
    location_or_link VARCHAR(500),             -- zoom link or office address
    notes           TEXT
);

-- ============================================================
--  AI_ANALYSIS
--  Stores the result of running a resume against a job posting.
--  Links a resume + a job application together with a score.
-- ============================================================
CREATE TABLE ai_analysis (
    analysis_id      SERIAL PRIMARY KEY,
    user_id          INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    resume_id        INT NOT NULL REFERENCES resumes(resume_id) ON DELETE CASCADE,
    application_id   INT NOT NULL REFERENCES job_applications(application_id) ON DELETE CASCADE,
    ats_score        NUMERIC(5, 2),            -- e.g. 87.50 out of 100
    missing_keywords TEXT,                     -- comma-separated or JSON array
    feedback         TEXT,                     -- AI-generated improvement suggestions
    created_at       TIMESTAMP DEFAULT NOW()
);

-- ============================================================
--  INDEXES
--  Speed up the most common lookups without you having to think about it.
-- ============================================================
CREATE INDEX idx_resumes_user_id            ON resumes(user_id);
CREATE INDEX idx_job_applications_user_id   ON job_applications(user_id);
CREATE INDEX idx_interviews_application_id  ON interviews(application_id);
CREATE INDEX idx_ai_analysis_user_id        ON ai_analysis(user_id);
CREATE INDEX idx_ai_analysis_resume_id      ON ai_analysis(resume_id);
CREATE INDEX idx_ai_analysis_application_id ON ai_analysis(application_id);

-- ============================================================
--  SAMPLE DATA  (optional — delete before production)
--  Run this to test that everything works.
-- ============================================================

-- Insert a test user
INSERT INTO users (name, email, password_hash)
VALUES ('Alice Johnson', 'alice@example.com', 'hashed_password_here');

-- Insert a resume for that user (user_id = 1)
INSERT INTO resumes (user_id, file_url, resume_text)
VALUES (1, '/uploads/alice_resume_v1.pdf', 'Alice Johnson – Software Engineer – 3 years experience in React and Node.js...');

-- Insert a job application (user_id = 1)
INSERT INTO job_applications (user_id, company_name, position_title, job_description, status)
VALUES (1, 'Google', 'Frontend Engineer', 'We are looking for a React developer with 2+ years experience...', 'applied');

-- Insert an interview for that application (application_id = 1)
INSERT INTO interviews (application_id, interview_date, interview_type, location_or_link)
VALUES (1, '2025-07-15 10:00:00', 'technical', 'https://meet.google.com/abc-defg-hij');

-- Insert an AI analysis (resume_id = 1, application_id = 1)
INSERT INTO ai_analysis (user_id, resume_id, application_id, ats_score, missing_keywords, feedback)
VALUES (1, 1, 1, 78.50, 'TypeScript, GraphQL, CI/CD', 'Consider adding TypeScript experience and mentioning any GraphQL projects.');
