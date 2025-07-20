// Load .env into process.env
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const axios = require('axios');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
});

// Health-check endpoint
app.get('/', (req, res) => {
  res.json({ message: 'API is running!' });
});

// Fetch up to 20 trials from local DB
app.get('/trials', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM trials LIMIT 20');
    res.json(result.rows);
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

/**
 * GET /ctgov
 * Proxy to ClinicalTrials.gov API v2 with token-based pagination.
 * Query params:
 *  - condition  (string)
 *  - status     (string, e.g. Recruiting)
 *  - location   (string, city/state/country)
 *  - pageToken  (string, optional)
 */
app.get('/ctgov', async (req, res) => {
  try {
    const { condition, status, location, pageToken } = req.query;

    // Build API parameters
    const params = {
      format: 'json',
      pageSize: 20,
      countTotal: 'true',
    };
    if (condition) params['query.cond'] = condition;
    if (status) params['filter.overallStatus'] = String(status).toUpperCase().replace(/ /g, '_');
    if (location) params['query.locn'] = location;
    if (pageToken) params.pageToken = pageToken;

    // Fetch from ClinicalTrials.gov v2
    const ctUrl = 'https://clinicaltrials.gov/api/v2/studies';
    const response = await axios.get(ctUrl, { params });

    // Map to simplified structure
    const studies = (response.data.studies || []).map(item => {
      const ps = item.protocolSection || {};
      const idMod = ps.identificationModule || {};
      const statusMod = ps.statusModule || {};
      const condMod = ps.conditionsModule || {};
      const locMod = ps.contactsLocationsModule || {};

      return {
        id: idMod.nctId,
        title: idMod.officialTitle || idMod.briefTitle || null,
        status: statusMod.overallStatus,
        conditions: condMod.conditions || [],
        locations:
          (locMod.locations || [])
            .map(l => l.locationFacility || l.locationCity || l.locationCountry)
            .filter(Boolean) || [],
        startDate: statusMod.startDate,
      };
    });

    // Return total and next page token
    res.json({
      totalCount: response.data.totalCount,
      nextPageToken: response.data.nextPageToken || null,
      studies,
    });
  } catch (err) {
    console.error('CT.gov API error:', err.response?.status, err.response?.data || err.message);
    res.status(500).json({
      error: 'Failed to fetch from ClinicalTrials.gov',
      details: err.message,
    });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
