const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  listApplications,
  createApplication,
  updateApplication,
  deleteApplication,
} = require('../controllers/applicationsController');

router.use(authMiddleware);

router.get('/', listApplications);
router.post('/', createApplication);
router.put('/:id', updateApplication);
router.delete('/:id', deleteApplication);

module.exports = router;
