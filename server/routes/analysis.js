const express = require('express');
const router = express.Router();
const multer = require('multer');
const { analyzeResume } = require('../controllers/analysisController');

// ── Multer setup ────────────────────────────────────────────
// memory storage means the file is held in memory as a buffer
// instead of being saved to disk — perfect for passing to pdf-parse
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, //5MB max file size
    fileFilter: (req, file, cb) => {
        // Only accept PDF files
        if (file.mimetype === 'application/pdf'){
            cb(null, true);
        } else{
            cb(new Error('Only PDF files are allowed'), false);
        }
    }
});

// ── Routes ──────────────────────────────────────────────────

// POST /api/analysis
// Accepts a PDF file and a job description, returns AI analysis
router.post('/', upload.single('resume'), analyzeResume);

module.exports = router;