// web/src/pages/trials/[nctId].tsx
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// ——— Dynamic imports for React-Leaflet (client only) ———
const MapContainer = dynamic(
  () => import('react-leaflet').then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((m) => m.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((m) => m.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((m) => m.Popup),
  { ssr: false }
);

// ——— Helper to format dates ———
function formatDate(dateStr: string) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    year:  'numeric',
    month: 'short',
    day:   'numeric',
  });
}

// ——— Location + Trial types ———
interface Location {
  facility: string;
  city:     string;
  state:    string;
  country:  string;
  geoPoint: { lat: number; lon: number };
}

interface DetailTrial {
  nctId:               string;
  briefTitle:          string;
  status:              string;
  conditions:          string[];
  interventions:       string[];
  eligibilityCriteria: string[];
  locations:           Location[];
  startDate:           string;
  updated:             string;
  phase:               string[];
  ageRange:            { min: string; max: string };
  gender:              string | null;
  outcomes:            { title: string; description: string }[];
  documents:           { type: string; url: string; category: string }[];
}

// ——— Component ———
export default function TrialDetailPage() {
  const router = useRouter();
  const { nctId } = router.query as { nctId?: string };

  const [trial,   setTrial]   = useState<DetailTrial | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch trial detail
  useEffect(() => {
    if (!nctId) return;
    setLoading(true);
    setError(null);

    fetch(`/api/studies/${nctId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Status ${res.status}: ${await res.text()}`);
        return (await res.json()) as DetailTrial;
      })
      .then((data) => setTrial(data))
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [nctId]);

  // Client‐only: configure Leaflet icon URLs
  useEffect(() => {
    if (typeof window === 'undefined') return;
    import('leaflet').then((mod) => {
      const L = mod.default;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: '/marker-icon-2x.png',
        iconUrl:       '/marker-icon.png',
        shadowUrl:     '/marker-shadow.png',
      });
    });
  }, []);

  // ——— Loading & error states ———
  if (!nctId)    return <p className="p-6">Invalid trial ID.</p>;
  if (loading)   return <p className="p-6">Loading trial details…</p>;
  if (error)     return <p className="p-6 text-red-600">Error: {error}</p>;
  if (!trial)    return <p className="p-6">No trial found.</p>;

  // Map center at first site (or [0,0])
  const center: [number, number] = trial.locations.length
    ? [trial.locations[0].geoPoint.lat, trial.locations[0].geoPoint.lon]
    : [0, 0];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* — Overview — */}
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">{trial.briefTitle}</h1>
        <p className="text-gray-600">NCT ID: {trial.nctId}</p>
        <div className="flex items-center space-x-4">
          <span className="px-3 py-1 rounded-full bg-green-100 text-green-800">
            {trial.status}
          </span>
          <span className="text-sm text-gray-500">
            Last updated: {formatDate(trial.updated)}
          </span>
        </div>
      </header>

      {/* — Key Facts — */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Key Facts</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 border rounded">
            <h3 className="font-medium">Phase</h3>
            <p>{trial.phase.join(', ') || 'N/A'}</p>
          </div>
          <div className="p-4 border rounded">
            <h3 className="font-medium">Start Date</h3>
            <p>{formatDate(trial.startDate)}</p>
          </div>
          <div className="p-4 border rounded">
            <h3 className="font-medium">Age Range</h3>
            <p>{trial.ageRange.min} – {trial.ageRange.max}</p>
          </div>
          <div className="p-4 border rounded">
            <h3 className="font-medium">Gender</h3>
            <p>{trial.gender || 'All'}</p>
          </div>
        </div>
      </section>

      {/* — Conditions — */}
      <section>
        <h2 className="text-2xl font-semibold mb-2">Conditions</h2>
        <ul className="list-disc list-inside text-gray-700">
          {trial.conditions.map((c, i) => <li key={i}>{c}</li>)}
        </ul>
      </section>

      {/* — Interventions — */}
      <section>
        <h2 className="text-2xl font-semibold mb-2">Interventions</h2>
        {trial.interventions.length > 0
          ? <ul className="list-disc list-inside text-gray-700">
              {trial.interventions.map((iv, idx) => <li key={idx}>{iv}</li>)}
            </ul>
          : <p className="text-gray-600">No interventions listed.</p>}
      </section>

      {/* — Eligibility Criteria — */}
      <section>
        <h2 className="text-2xl font-semibold mb-2">Eligibility Criteria</h2>
        {trial.eligibilityCriteria.length > 0
          ? <ul className="list-disc list-inside text-gray-700">
              {trial.eligibilityCriteria.map((crit, idx) => <li key={idx}>{crit}</li>)}
            </ul>
          : <p className="text-gray-600">No criteria available.</p>}
      </section>

      {/* — Outcomes — */}
      <section>
        <h2 className="text-2xl font-semibold mb-2">Outcomes</h2>
        {trial.outcomes.length > 0
          ? <ul className="list-disc list-inside text-gray-700">
              {trial.outcomes.map((o, idx) =>
                <li key={idx}><strong>{o.title}</strong>: {o.description}</li>
              )}
            </ul>
          : <p className="text-gray-600">No outcomes recorded.</p>}
      </section>

      {/* — Documents — */}
      <section>
        <h2 className="text-2xl font-semibold mb-2">Documents</h2>
        {trial.documents.length > 0
          ? <ul className="list-disc list-inside text-gray-700">
              {trial.documents.map((doc, idx) =>
                <li key={idx}>
                  <a
                    href={doc.url}
                    className="text-blue-600"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {doc.type || doc.category}
                  </a>
                </li>
              )}
            </ul>
          : <p className="text-gray-600">No documents available.</p>}
      </section>

      {/* — Study Sites — */}
      <section>
        <h2 className="text-2xl font-semibold mb-2">Study Sites</h2>
        <p className="mb-2 text-gray-700">{trial.locations.length} site(s) enrolled</p>
        <ul className="list-disc list-inside text-gray-700 space-y-1">
          {trial.locations.map((loc, i) =>
            <li key={i}>{loc.city}, {loc.state}, {loc.country}</li>
          )}
        </ul>
      </section>

      {/* — Interactive Map — */}
      <section>
        <h2 className="text-2xl font-semibold mb-2">Location Map</h2>
        <MapContainer
          center={center}
          zoom={10}
          scrollWheelZoom={false}
          style={{ height: '400px', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {trial.locations.map((loc, idx) => (
            <Marker
              key={idx}
              position={[loc.geoPoint.lat, loc.geoPoint.lon]}
            >
              <Popup>
                <strong>{loc.facility}</strong><br />
                {loc.city}, {loc.state}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </section>
    </div>
  );
}
