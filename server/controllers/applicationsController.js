const pool = require('../config/db');

// GET /api/applications
const listApplications = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT application_id, company_name, position_title, job_description,
              status, applied_date, notes
       FROM job_applications
       WHERE user_id = $1
       ORDER BY applied_date DESC, application_id DESC`,
      [req.user.user_id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('listApplications error:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
};

// POST /api/applications
const createApplication = async (req, res) => {
  try {
    const { company_name, position_title, job_description, status, applied_date, notes } = req.body;

    if (!company_name || !position_title) {
      return res.status(400).json({ error: 'Company name and position title are required' });
    }

    const result = await pool.query(
      `INSERT INTO job_applications
         (user_id, company_name, position_title, job_description, status, applied_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING application_id, company_name, position_title, job_description,
                 status, applied_date, notes`,
      [
        req.user.user_id,
        company_name,
        position_title,
        job_description || null,
        status || 'applied',
        applied_date || null,
        notes || null,
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('createApplication error:', error);
    res.status(500).json({ error: 'Failed to create application' });
  }
};

// PUT /api/applications/:id
const updateApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_name, position_title, job_description, status, applied_date, notes } = req.body;

    const result = await pool.query(
      `UPDATE job_applications
       SET company_name    = COALESCE($1, company_name),
           position_title  = COALESCE($2, position_title),
           job_description = $3,
           status          = COALESCE($4, status),
           applied_date    = $5,
           notes           = $6
       WHERE application_id = $7 AND user_id = $8
       RETURNING application_id, company_name, position_title, job_description,
                 status, applied_date, notes`,
      [
        company_name || null,
        position_title || null,
        job_description || null,
        status || null,
        applied_date || null,
        notes || null,
        id,
        req.user.user_id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('updateApplication error:', error);
    res.status(500).json({ error: 'Failed to update application' });
  }
};

// DELETE /api/applications/:id
const deleteApplication = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM job_applications WHERE application_id = $1 AND user_id = $2 RETURNING application_id',
      [id, req.user.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('deleteApplication error:', error);
    res.status(500).json({ error: 'Failed to delete application' });
  }
};

module.exports = { listApplications, createApplication, updateApplication, deleteApplication };
