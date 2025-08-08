// api/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const NodeCache = require('node-cache');
const zipcodes = require('zipcodes');

const app = express();
app.use(cors());
app.use(express.json());

// Cache CT.gov responses for 5 minutes
const cache = new NodeCache({ stdTTL: 300 });

const PORT = process.env.PORT || 5000;

// Haversine distance in miles
function haversineMiles(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 3958.761; // Earth radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.asin(Math.sqrt(a));
  return R * c;
}

// Build the CT.gov request params.
// (We keep your existing fields & sort; add’l filters can be added later.)
function buildCtgovParams() {
  return {
    format: 'json',
    pageSize: 20,
    countTotal: 'true',
    sort: 'LastUpdatePostDate:desc',
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
      'protocolSection.eligibilityModule.sex',
    ].join(','),
  };
}

// Proxy + enrich CT.gov v2 list results
app.get('/ctgov', async (req, res) => {
  try {
    const { condition, location, radius, age, gender } = req.query;

    // Build upstream params (keep existing base)
    const params = buildCtgovParams();

    // NOTE: Your previous server didn’t include a condition filter in the log.
    // If you already support it, keep doing so. Otherwise we can add it later
    // after confirming the exact v2 filter you prefer. For now we leave it as-is.

    // Simple cache key (params + radius/location)
    const cacheKey = JSON.stringify({ params, condition, location, radius, age, gender });

    // Serve from cache if present
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    // Call CT.gov
    const url = 'https://clinicaltrials.gov/api/v2/studies';
    const resp = await axios.get(url, { params });

    // Defensive access
    const raw = resp?.data?.studies || [];

    // If caller provided a ZIP, compute nearest distance per trial
    let origin = null;
    if (location && /^\d{5}$/.test(String(location))) {
      const z = zipcodes.lookup(String(location));
      if (z && typeof z.latitude === 'number' && typeof z.longitude === 'number') {
        origin = { lat: z.latitude, lon: z.longitude };
      }
    }

    // Map CT.gov → your simplified shape (+ optional nearestDistanceMi)
    const mapped = raw.map((s) => {
      const ps = s?.protocolSection || {};

      const idMod = ps.identificationModule || {};
      const statusMod = ps.statusModule || {};
      const condMod = ps.conditionsModule || {};
      const designMod = ps.designModule || {};
      const eligMod = ps.eligibilityModule || {};
      const locMod = ps.contactsLocationsModule || {};

      // Compute nearest distance if we have a valid origin and site coordinates
      let nearestDistanceMi = undefined;
      if (origin && Array.isArray(locMod.locations)) {
        for (const loc of locMod.locations) {
          const gp = loc?.geoPoint || {};
          // Support either {lat, lon} or {latitude, longitude}
          const lat = typeof gp.lat === 'number' ? gp.lat : gp.latitude;
          const lon = typeof gp.lon === 'number' ? gp.lon : gp.longitude;
          if (typeof lat === 'number' && typeof lon === 'number') {
            const d = haversineMiles(origin.lat, origin.lon, lat, lon);
            if (nearestDistanceMi === undefined || d < nearestDistanceMi) {
              nearestDistanceMi = d;
            }
          }
        }
      }

      return {
        id: idMod.nctId || '',
        title: idMod.briefTitle || 'No title',
        status: statusMod.overallStatus || '',
        conditions: condMod.conditions || [],
        locations: (locMod.locations || []).map((l) => ({
          facility: l?.facility || '',
          city: l?.city || '',
          state: l?.state || '',
          country: l?.country || '',
          // We don’t send geoPoint to the list page yet (detail page already has it)
        })),
        startDate: statusMod.startDateStruct?.date || '',
        lastUpdateSubmitDate: statusMod.lastUpdatePostDateStruct?.date || null,
        phase: designMod.phases || [],
        ageRange: { min: eligMod.minimumAge || '', max: eligMod.maximumAge || '' },
        gender: eligMod.sex || null,
        nearestDistanceMi,
      };
    });

    // If radius (miles) provided, filter/sort by nearestDistanceMi
    let result = mapped;
    const radiusNum = radius ? Number(radius) : NaN;

    if (!Number.isNaN(radiusNum) && radiusNum > 0 && origin) {
      result = mapped
        .filter((t) => typeof t.nearestDistanceMi === 'number' && t.nearestDistanceMi <= radiusNum)
        .sort((a, b) => (a.nearestDistanceMi ?? Infinity) - (b.nearestDistanceMi ?? Infinity));
    }

    const payload = { studies: result };
    cache.set(cacheKey, payload);

    if (cached === undefined) {
      console.log('Fetched CT.gov and cached (with distance):', { ...params, location, radius });
    } else {
      console.log('Cache hit for /ctgov:', { ...params, location, radius });
    }

    return res.status(200).json(payload);
  } catch (err) {
    console.error('CT.gov proxy error:', err?.response?.data || err?.message || err);
    return res.status(500).json({ error: 'Failed to fetch trials' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
