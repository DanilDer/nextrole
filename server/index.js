require('dotenv').config();
require('./config/db');

const express = require('express');
const cors = require('cors');
const app = express();

// ── Middleware ──────────────────────────────────────────────
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ─────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: 'NextRole API is running' });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/analysis', require('./routes/analysis'));

// ── Start Server ────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});