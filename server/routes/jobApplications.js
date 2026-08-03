const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');

const {
  createApplication,
  getApplications,
  getApplicationById,
  updateApplication,
  deleteApplication
} = require('../controllers/jobApplicationController');

// Every route below requires a valid JWT token
router.use(authMiddleware);

// POST /api/applications
router.post('/', createApplication);

// GET /api/applications
router.get('/', getApplications);

// GET /api/applications/:id
router.get('/:id', getApplicationById);

// PUT /api/applications/:id
router.put('/:id', updateApplication);

// DELETE /api/applications/:id
router.delete('/:id', deleteApplication);

module.exports = router;