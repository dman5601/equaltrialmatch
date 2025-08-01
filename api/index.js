// api/index.js
require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const { Pool }  = require('pg');
const axios     = require('axios');
const NodeCache = require('node-cache');

// Cache CT.gov JSON payloads for 5 minutes
const ctCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  host:     process.env.PGHOST,
  port:     Number(process.env.PGPORT),
  user:     process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
});

app.get('/', (_req, res) => {
  res.json({ message: 'API is running!' });
});

app.get('/trials', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM trials LIMIT 20');
    res.json(result.rows);
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// —————————————————————————————————————————
// Proxy to ClinicalTrials.gov with proper data-only caching
// —————————————————————————————————————————
app.get('/ctgov', async (req, res) => {
  try {
    const { condition, status, location, pageToken, age, gender, phase } = req.query;

    // Build CT.gov query params
    const params = {
      format:                 'json',
      pageSize:               20,
      countTotal:             'true',
      sort:                   'LastUpdatePostDate:desc',
      'filter.overallStatus': 'RECRUITING,NOT_YET_RECRUITING',
      fields: [
        'protocolSection.identificationModule.nctId',
        'protocolSection.identificationModule.briefTitle',
        'protocolSection.statusModule.overallStatus',
        'protocolSection.conditionsModule.conditions',
        'protocolSection.contactsLocationsModule.locations',
        'protocolSection.statusModule.startDateStruct.date',
        'protocolSection.statusModule.lastUpdatePostDateStruct.date',
        'protocolSection.designModule.phases',
        'protocolSection.eligibilityModule.minimumAge',
        'protocolSection.eligibilityModule.maximumAge',
        'protocolSection.eligibilityModule.sex'
      ].join(',')
    };

    // Override with user filters
    if (condition) params['query.cond']           = condition;
    if (status)    params['filter.overallStatus'] = String(status).toUpperCase().replace(/ /g, '_');
    if (location)  params['query.locn']           = location;
    if (age)       params['filter.minAge']        = age;
    if (gender)    params['filter.gender']        = gender;
    if (phase)     params['filter.phase']         = String(phase).toUpperCase().replace(/ /g, '_');
    if (pageToken) params.pageToken               = pageToken;

    // Cache key based solely on params
    const cacheKey = JSON.stringify(params);
    let data = ctCache.get(cacheKey);

    if (!data) {
      // First time: fetch and cache only the JSON payload
      const resp = await axios.get('https://clinicaltrials.gov/api/v2/studies', { params });
      data = resp.data;
      ctCache.set(cacheKey, data);
      console.log('Fetched CT.gov and cached:', cacheKey);
    } else {
      console.log('Cache hit for /ctgov:', cacheKey);
    }

    // Map the JSON payload to your simplified structure
    const studies = (data.studies || []).map(item => {
      const ps        = item.protocolSection            || {};
      const idMod     = ps.identificationModule         || {};
      const statusMod = ps.statusModule                || {};
      const condMod   = ps.conditionsModule             || {};
      const locMod    = ps.contactsLocationsModule      || {};
      const eligMod   = ps.eligibilityModule            || {};
      const designMod = ps.designModule                 || {};

      return {
        id:                   idMod.nctId,
        title:                idMod.briefTitle || null,
        status:               statusMod.overallStatus,
        conditions:           condMod.conditions || [],
        locations:            (locMod.locations || []).map(l => ({
                                facility: l.facility,
                                city:     l.city,
                                state:    l.state,
                                country:  l.country
                              })),
        startDate:            statusMod.startDateStruct?.date,
        lastUpdateSubmitDate: statusMod.lastUpdatePostDateStruct?.date || null,
        phase:                designMod.phases || [],
        ageRange:             { min: eligMod.minimumAge, max: eligMod.maximumAge },
        gender:               eligMod.sex || null,
      };
    });

    // Return mapped results
    return res.json({
      totalCount:    data.totalCount,
      nextPageToken: data.nextPageToken || null,
      studies,
    });

  } catch (err) {
    console.error('CT.gov API error:', err.response?.status, err.response?.data || err.message);
    return res.status(500).json({
      error:   'Failed to fetch from ClinicalTrials.gov',
      details: err.message
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
