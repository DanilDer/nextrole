const pool = require('../config/db');

const allowedStatuses = [
  'applied',
  'interview',
  'offer',
  'rejected'
];

// ── CREATE APPLICATION ──────────────────────────────────────
const createApplication = async (req, res) => {
  try {
    const userId = req.user.user_id;

    const {
      company_name,
      position_title,
      job_description,
      status = 'applied',
      applied_date,
      notes
    } = req.body;

    // Step 1: Validate required fields
    if (!company_name || !position_title) {
      return res.status(400).json({
        error: 'Company name and position title are required'
      });
    }

    // Step 2: Validate the status
    const normalizedStatus = status.toLowerCase();

    if (!allowedStatuses.includes(normalizedStatus)) {
      return res.status(400).json({
        error: 'Status must be applied, interview, offer, or rejected'
      });
    }

    // Step 3: Insert the application
    const result = await pool.query(
      `INSERT INTO job_applications
        (
          user_id,
          company_name,
          position_title,
          job_description,
          status,
          applied_date,
          notes
        )
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, CURRENT_DATE), $7)
       RETURNING *`,
      [
        userId,
        company_name.trim(),
        position_title.trim(),
        job_description || null,
        normalizedStatus,
        applied_date || null,
        notes || null
      ]
    );

    // Step 4: Return the newly created application
    res.status(201).json({
      success: true,
      message: 'Job application created successfully',
      application: result.rows[0]
    });
  } catch (error) {
    console.error('Create application error:', error);

    res.status(500).json({
      error: 'Something went wrong while creating the application'
    });
  }
};

// ── GET ALL APPLICATIONS ────────────────────────────────────
const getApplications = async (req, res) => {
  try {
    const userId = req.user.user_id;

    const result = await pool.query(
      `SELECT *
       FROM job_applications
       WHERE user_id = $1
       ORDER BY applied_date DESC, application_id DESC`,
      [userId]
    );

    res.status(200).json({
      success: true,
      count: result.rows.length,
      applications: result.rows
    });
  } catch (error) {
    console.error('Get applications error:', error);

    res.status(500).json({
      error: 'Something went wrong while retrieving applications'
    });
  }
};

// ── GET ONE APPLICATION ─────────────────────────────────────
const getApplicationById = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const applicationId = Number(req.params.id);

    if (!Number.isInteger(applicationId) || applicationId <= 0) {
      return res.status(400).json({
        error: 'Invalid application ID'
      });
    }

    const result = await pool.query(
      `SELECT *
       FROM job_applications
       WHERE application_id = $1
         AND user_id = $2`,
      [applicationId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Job application not found'
      });
    }

    res.status(200).json({
      success: true,
      application: result.rows[0]
    });
  } catch (error) {
    console.error('Get application error:', error);

    res.status(500).json({
      error: 'Something went wrong while retrieving the application'
    });
  }
};

// ── UPDATE APPLICATION ──────────────────────────────────────
const updateApplication = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const applicationId = Number(req.params.id);

    if (!Number.isInteger(applicationId) || applicationId <= 0) {
      return res.status(400).json({
        error: 'Invalid application ID'
      });
    }

    const {
      company_name,
      position_title,
      job_description,
      status,
      applied_date,
      notes
    } = req.body;

    // Step 1: Check that the application belongs to the user
    const existingApplication = await pool.query(
      `SELECT *
       FROM job_applications
       WHERE application_id = $1
         AND user_id = $2`,
      [applicationId, userId]
    );

    if (existingApplication.rows.length === 0) {
      return res.status(404).json({
        error: 'Job application not found'
      });
    }

    const current = existingApplication.rows[0];

    // Step 2: Use the current value when a field was not provided
    const updatedCompanyName =
      company_name !== undefined
        ? company_name.trim()
        : current.company_name;

    const updatedPositionTitle =
      position_title !== undefined
        ? position_title.trim()
        : current.position_title;

    const updatedDescription =
      job_description !== undefined
        ? job_description
        : current.job_description;

    const updatedStatus =
      status !== undefined
        ? status.toLowerCase()
        : current.status;

    const updatedAppliedDate =
      applied_date !== undefined
        ? applied_date
        : current.applied_date;

    const updatedNotes =
      notes !== undefined
        ? notes
        : current.notes;

    // Step 3: Validate updated values
    if (!updatedCompanyName || !updatedPositionTitle) {
      return res.status(400).json({
        error: 'Company name and position title cannot be empty'
      });
    }

    if (!allowedStatuses.includes(updatedStatus)) {
      return res.status(400).json({
        error: 'Status must be applied, interview, offer, or rejected'
      });
    }

    // Step 4: Update the application
    const result = await pool.query(
      `UPDATE job_applications
       SET company_name = $1,
           position_title = $2,
           job_description = $3,
           status = $4,
           applied_date = $5,
           notes = $6
       WHERE application_id = $7
         AND user_id = $8
       RETURNING *`,
      [
        updatedCompanyName,
        updatedPositionTitle,
        updatedDescription,
        updatedStatus,
        updatedAppliedDate,
        updatedNotes,
        applicationId,
        userId
      ]
    );

    res.status(200).json({
      success: true,
      message: 'Job application updated successfully',
      application: result.rows[0]
    });
  } catch (error) {
    console.error('Update application error:', error);

    res.status(500).json({
      error: 'Something went wrong while updating the application'
    });
  }
};

// ── DELETE APPLICATION ──────────────────────────────────────
const deleteApplication = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const applicationId = Number(req.params.id);

    if (!Number.isInteger(applicationId) || applicationId <= 0) {
      return res.status(400).json({
        error: 'Invalid application ID'
      });
    }

    const result = await pool.query(
      `DELETE FROM job_applications
       WHERE application_id = $1
         AND user_id = $2
       RETURNING application_id`,
      [applicationId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Job application not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Job application deleted successfully'
    });
  } catch (error) {
    console.error('Delete application error:', error);

    res.status(500).json({
      error: 'Something went wrong while deleting the application'
    });
  }
};

module.exports = {
  createApplication,
  getApplications,
  getApplicationById,
  updateApplication,
  deleteApplication
};