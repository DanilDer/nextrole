const pool = require('../config/db');

// GET /api/interviews  — joined to job_applications for ownership check
const listInterviews = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT i.interview_id, i.application_id, i.interview_date,
              i.interview_type, i.location_or_link, i.notes
       FROM interviews i
       JOIN job_applications a ON a.application_id = i.application_id
       WHERE a.user_id = $1
       ORDER BY i.interview_date DESC NULLS LAST`,
      [req.user.user_id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('listInterviews error:', error);
    res.status(500).json({ error: 'Failed to fetch interviews' });
  }
};

// POST /api/interviews
const createInterview = async (req, res) => {
  try {
    const { application_id, interview_date, interview_type, location_or_link, notes } = req.body;

    if (!application_id) {
      return res.status(400).json({ error: 'application_id is required' });
    }

    // Verify the application belongs to this user
    const ownership = await pool.query(
      'SELECT application_id FROM job_applications WHERE application_id = $1 AND user_id = $2',
      [application_id, req.user.user_id]
    );

    if (ownership.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const result = await pool.query(
      `INSERT INTO interviews (application_id, interview_date, interview_type, location_or_link, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING interview_id, application_id, interview_date, interview_type, location_or_link, notes`,
      [
        application_id,
        interview_date || null,
        interview_type || null,
        location_or_link || null,
        notes || null,
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('createInterview error:', error);
    res.status(500).json({ error: 'Failed to create interview' });
  }
};

// PUT /api/interviews/:id
const updateInterview = async (req, res) => {
  try {
    const { id } = req.params;
    const { interview_date, interview_type, location_or_link, notes } = req.body;

    // Ownership check via join
    const ownership = await pool.query(
      `SELECT i.interview_id FROM interviews i
       JOIN job_applications a ON a.application_id = i.application_id
       WHERE i.interview_id = $1 AND a.user_id = $2`,
      [id, req.user.user_id]
    );

    if (ownership.rows.length === 0) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    const result = await pool.query(
      `UPDATE interviews
       SET interview_date   = $1,
           interview_type   = $2,
           location_or_link = $3,
           notes            = $4
       WHERE interview_id = $5
       RETURNING interview_id, application_id, interview_date, interview_type, location_or_link, notes`,
      [
        interview_date || null,
        interview_type || null,
        location_or_link || null,
        notes || null,
        id,
      ]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('updateInterview error:', error);
    res.status(500).json({ error: 'Failed to update interview' });
  }
};

// DELETE /api/interviews/:id
const deleteInterview = async (req, res) => {
  try {
    const { id } = req.params;

    // Ownership check via join
    const ownership = await pool.query(
      `SELECT i.interview_id FROM interviews i
       JOIN job_applications a ON a.application_id = i.application_id
       WHERE i.interview_id = $1 AND a.user_id = $2`,
      [id, req.user.user_id]
    );

    if (ownership.rows.length === 0) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    await pool.query('DELETE FROM interviews WHERE interview_id = $1', [id]);
    res.status(204).send();
  } catch (error) {
    console.error('deleteInterview error:', error);
    res.status(500).json({ error: 'Failed to delete interview' });
  }
};

module.exports = { listInterviews, createInterview, updateInterview, deleteInterview };
