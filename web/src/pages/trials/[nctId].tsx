// web/src/pages/trials/[nctId].tsx
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

// Leaflet components must be dynamically imported (no SSR)
const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer    = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false });
const Marker       = dynamic(() => import("react-leaflet").then(m => m.Marker), { ssr: false });
const Popup        = dynamic(() => import("react-leaflet").then(m => m.Popup), { ssr: false });

// If your markers don't show up, ensure leaflet CSS is included globally (e.g., in _app.tsx):
// import "leaflet/dist/leaflet.css";

type Location = {
  facility: string;
  city: string;
  state: string;
  country: string;
  geoPoint?: { lat: number; lon: number };
};

type Trial = {
  nctId: string;
  briefTitle: string;
  status: string;
  startDate: string;
  lastUpdateSubmitDate: string | null;
  conditions: string[];
  phase: string[];
  ageRange: { min: string; max: string };
  gender: string | null;
  summary: string;
  locations: Location[];
};

type MarkerPoint = { lat: number; lon: number; label: string };

function toSiteMarkers(locations: Location[]): MarkerPoint[] {
  if (!Array.isArray(locations)) return [];
  const markers: MarkerPoint[] = [];
  for (const loc of locations) {
    const gp = loc?.geoPoint;
    if (gp && typeof gp.lat === "number" && typeof gp.lon === "number") {
      const label = [loc.facility, loc.city, loc.state, loc.country].filter(Boolean).join(", ");
      markers.push({ lat: gp.lat, lon: gp.lon, label });
    }
  }
  return markers;
}

export default function TrialDetailPage() {
  const router = useRouter();
  const { nctId } = router.query as { nctId?: string };

  const [trial, setTrial] = useState<Trial | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false); // ensure client-side before rendering map

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // ✅ Narrow nctId to a definite string for the fetch
    if (typeof nctId !== "string" || !nctId) return;
    let cancelled = false;
    const id = nctId;

    async function load(studyId: string) {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/studies/${encodeURIComponent(studyId)}`);
        if (!res.ok) throw new Error(`Failed to fetch study: ${res.status}`);
        const data = (await res.json()) as Trial;
        if (!cancelled) setTrial(data);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        if (!cancelled) setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load(id);
    return () => { cancelled = true; };
  }, [nctId]);

  const markers = useMemo(() => toSiteMarkers(trial?.locations || []), [trial]);
  const defaultCenter: [number, number] = markers.length
    ? [markers[0].lat, markers[0].lon]
    : [39.5, -98.35]; // continental US fallback

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Link href="/search" className="text-blue-600 hover:underline">
        ← Back to Search
      </Link>

      {loading && <p>Loading trial…</p>}
      {error && <p className="text-red-600">Error: {error}</p>}
      {!loading && !error && !trial && <p>No study found.</p>}

      {trial && (
        <>
          <header>
            <h1 className="text-2xl font-bold">{trial.briefTitle}</h1>
            <p className="text-sm text-gray-600 mt-1">
              NCT ID: {trial.nctId} · Status: {trial.status}
            </p>
          </header>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">Summary</h2>
            <p className="text-gray-800 whitespace-pre-wrap">{trial.summary || "No summary provided."}</p>
          </section>

          <section className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Key Details</h3>
              <ul className="text-sm text-gray-800 space-y-1">
                <li><strong>Conditions:</strong> {trial.conditions?.join(", ") || "N/A"}</li>
                <li><strong>Phase:</strong> {trial.phase?.join(", ") || "N/A"}</li>
                <li><strong>Age:</strong> {trial.ageRange.min} – {trial.ageRange.max}</li>
                <li><strong>Gender:</strong> {trial.gender || "All"}</li>
                <li>
                  <strong>Updated:</strong>{" "}
                  {new Date(trial.lastUpdateSubmitDate || trial.startDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Locations</h3>
              {trial.locations?.length ? (
                <ul className="text-sm text-gray-800 space-y-1">
                  {trial.locations.map((l, idx) => (
                    <li key={idx}>
                      {[l.facility, l.city, l.state, l.country].filter(Boolean).join(", ")}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No locations listed.</p>
              )}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold">Map of Study Sites</h3>
            {mounted && markers.length > 0 ? (
              <div className="w-full" style={{ height: 360 }}>
                <MapContainer center={defaultCenter} zoom={6} style={{ height: "100%", width: "100%" }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {markers.map((m, idx) => (
                    <Marker key={idx} position={[m.lat, m.lon]}>
                      <Popup>{m.label || "Study site"}</Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                No mappable site coordinates provided for this study.
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
