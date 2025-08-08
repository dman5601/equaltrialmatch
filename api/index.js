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

// -------------------------------
// Helpers
// -------------------------------
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

// Rank phases for sorting (higher is better)
function phaseRank(phases) {
  // phases is an array like ["Phase 3"] or ["Phase 1/Phase 2"]
  const p = Array.isArray(phases) ? phases.join(' / ') : '';
  if (/phase\s*4/i.test(p)) return 4;
  if (/phase\s*3/i.test(p)) return 3;
  if (/phase\s*2/i.test(p)) return 2;
  if (/early\s*phase\s*1/i.test(p)) return 0.5;
  if (/phase\s*1/i.test(p)) return 1;
  return 0;
}

// Base CT.gov v2 params (your existing fields/sort)
function buildCtgovParams() {
  return {
    format: 'json',
    pageSize: 20, // bump to 50 later if you want more recall
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

// -------------------------------
// Routes
// -------------------------------
app.get('/ctgov', async (req, res) => {
  try {
    const { condition, location, radius, age, gender, sort: sortModeRaw } = req.query;
    const sortMode = typeof sortModeRaw === 'string' && sortModeRaw ? sortModeRaw : 'recent';

    // Build upstream params
    const params = buildCtgovParams();

    // Ask CT.gov to pre-filter by condition
    if (typeof condition === 'string' && condition.trim()) {
      const q = condition.trim();
      params['query.cond'] = q; // condition-specific
      params['query.term'] = q; // broader text fallback (harmless if redundant)
    }

    // Include sort mode in cache key (since it changes output order)
    const cacheKey = JSON.stringify({ params, location, radius, age, gender, sortMode });

    const cached = cache.get(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    // Call CT.gov
    const url = 'https://clinicaltrials.gov/api/v2/studies';
    const resp = await axios.get(url, { params });
    const raw = resp?.data?.studies || [];

    // If ZIP provided, compute origin for distance
    let origin = null;
    if (location && /^\d{5}$/.test(String(location))) {
      const z = zipcodes.lookup(String(location));
      if (z && typeof z.latitude === 'number' && typeof z.longitude === 'number') {
        origin = { lat: z.latitude, lon: z.longitude };
      }
    }

    // Map CT.gov → simplified shape
    const mapped = raw.map((s) => {
      const ps = s?.protocolSection || {};
      const idMod = ps.identificationModule || {};
      const statusMod = ps.statusModule || {};
      const condMod = ps.conditionsModule || {};
      const designMod = ps.designModule || {};
      const eligMod = ps.eligibilityModule || {};
      const locMod = ps.contactsLocationsModule || {};

      // Compute nearest distance if we have a valid origin
      let nearestDistanceMi = undefined;
      if (origin && Array.isArray(locMod.locations)) {
        for (const loc of locMod.locations) {
          const gp = loc?.geoPoint || {};
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
        })),
        startDate: statusMod.startDateStruct?.date || '',
        lastUpdateSubmitDate: statusMod.lastUpdatePostDateStruct?.date || null,
        phase: designMod.phases || [],
        ageRange: { min: eligMod.minimumAge || '', max: eligMod.maximumAge || '' },
        gender: eligMod.sex || null,
        nearestDistanceMi, // added by our server
      };
    });

    // Local fallback condition filter if CT.gov returns unrelated data (rare)
    let result = mapped;
    if (typeof condition === 'string' && condition.trim()) {
      const needle = condition.trim().toLowerCase();
      const anyMatch = mapped.some(
        (t) => Array.isArray(t.conditions) && t.conditions.some((c) => (c || '').toLowerCase().includes(needle))
      );
      if (!anyMatch) {
        result = mapped.filter(
          (t) => Array.isArray(t.conditions) && t.conditions.some((c) => (c || '').toLowerCase().includes(needle))
        );
      }
    }

    // Radius filtering (if numeric radius + origin)
    const radiusNum = radius ? Number(radius) : NaN;
    if (!Number.isNaN(radiusNum) && radiusNum > 0 && origin) {
      result = result.filter(
        (t) => typeof t.nearestDistanceMi === 'number' && t.nearestDistanceMi <= radiusNum
      );
    }

    // Sorting
    if (sortMode === 'distance' && origin) {
      result.sort(
        (a, b) => (a.nearestDistanceMi ?? Infinity) - (b.nearestDistanceMi ?? Infinity)
      );
    } else if (sortMode === 'phase') {
      result.sort((a, b) => {
        const pa = phaseRank(a.phase);
        const pb = phaseRank(b.phase);
        if (pb !== pa) return pb - pa; // higher phase first
        // tie-breakers: recent first, then title
        const aTime = new Date(a.lastUpdateSubmitDate || a.startDate).getTime();
        const bTime = new Date(b.lastUpdateSubmitDate || b.startDate).getTime();
        if (bTime !== aTime) return bTime - aTime;
        return (a.title || '').localeCompare(b.title || '');
      });
    } else {
      // default: recent first
      result.sort((a, b) => {
        const aTime = new Date(a.lastUpdateSubmitDate || a.startDate).getTime();
        const bTime = new Date(b.lastUpdateSubmitDate || b.startDate).getTime();
        return bTime - aTime;
      });
    }

    const payload = { studies: result };
    cache.set(cacheKey, payload);

    console.log('Fetched CT.gov and cached (cond + distance + sort):', {
      ...params,
      location,
      radius,
      sortMode,
    });

    return res.status(200).json(payload);
  } catch (err) {
    console.error('CT.gov proxy error:', err?.response?.data || err?.message || err);
    return res.status(500).json({ error: 'Failed to fetch trials' });
  }
});

// -------------------------------
// Start
// -------------------------------
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
