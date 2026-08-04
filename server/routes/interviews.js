const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  listInterviews,
  createInterview,
  updateInterview,
  deleteInterview
} = require('../controllers/interviewsController');

router.use(authMiddleware);

router.get('/', listInterviews);
router.post('/', createInterview);
router.put('/:id', updateInterview);
router.delete('/:id', deleteInterview);

module.exports = router;