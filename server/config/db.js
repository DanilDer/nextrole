const { Pool } = require('pg');

// Create a connectioin pool using credentials from .env
const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: String(process.env.DB_PASSWORD),
});

// Test the connection when the server starts
pool.connect((err, client, release) => {
    if (err) {
        console.error('Database connection failed:', err.message);
    } else {
        console.log('Connected to PostgreSQL database');
        release();
    }
});

module.exports = pool;