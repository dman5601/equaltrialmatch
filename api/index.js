// Load .env into process.env
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL connection pool
const pool = new Pool({
  host:     process.env.PGHOST,
  port:     Number(process.env.PGPORT),
  user:     process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
});

// Health-check endpoint
app.get('/', (req, res) => {
  res.json({ message: 'API is running!' });
});

// Fetch up to 20 trials
app.get('/trials', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM trials LIMIT 20');
    res.json(result.rows);
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
