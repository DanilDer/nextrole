const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');

// ── Auth Routes ─────────────────────────────────────────────

// POST /api/auth/register
// Public route — no token needed
router.post('/register', register);

// POST /api/auth/login
// Public route — no token needed
router.post('/login', login);

module.exports = router;