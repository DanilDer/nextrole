// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const app = express();

// ── Middleware ──────────────────────────────────────────────
// Allows the server to read JSON from incoming requests
app.use(express.json());

// Allows the server to read from data
app.use(express.urlencoded({ extended: true}));

// ── Routes ─────────────────────────────────────────────────
// Health check - visit http://localhost:5000 to confirm server is running
app.get('/', (req, res) => {
    res.json({ message: 'NextRole API is running' });
});

// AI Analysis route - your feature
app.use('/api/analysis', require('./routes/analysis'));

// ── Start Server ────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});