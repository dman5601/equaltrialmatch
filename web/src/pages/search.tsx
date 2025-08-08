// web/src/pages/search.tsx
import { useSession, signIn } from "next-auth/react";
import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import TrialCard, { Trial as CardTrial } from "../components/TrialCard";

interface RawTrial {
  id: string;
  title: string;
  status: string;
  conditions: string[];
  locations: { facility: string; city: string; state: string; country: string }[];
  startDate: string;
  lastUpdateSubmitDate: string | null;
  phase: string[];
  ageRange: { min: string; max: string };
  gender: string | null;
  nearestDistanceMi?: number;
}

interface Profile {
  zip?: string;
  radius?: number;
  age?: number;
  gender?: string;
}

type SortMode = "recent" | "distance" | "phase";

export default function SearchPage() {
  const { status } = useSession();

  // 1) Profile preload
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/profile", { credentials: "include" })
        .then((res) => {
          if (!res.ok) throw new Error(`Profile API error: ${res.status}`);
          return res.json();
        })
        .then((data: Profile) => setProfile(data))
        .catch((err) => console.error("Profile load error:", err));
    }
  }, [status]);

  // 2) Search state
  const [trials, setTrials] = useState<(CardTrial & { updated: string })[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [condition, setCondition] = useState("");
  const [zip, setZip] = useState("");
  const [radius, setRadius] = useState<string>("");
  const [sort, setSort] = useState<SortMode>("recent");

  useEffect(() => {
    if (profile?.zip) {
      setZip(profile.zip);
      setSort("distance");
    }
    if (typeof profile?.radius === "number" && profile.radius > 0) {
      setRadius(String(profile.radius));
    }
  }, [profile]);

  // 3) Fetch
  async function fetchTrials() {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (condition) params.append("condition", condition);
    if (zip) params.append("location", zip);
    if (radius) params.append("radius", radius);
    if (sort) params.append("sort", sort);
    if (profile?.age !== undefined) params.append("age", String(profile.age));
    if (profile?.gender) params.append("gender", profile.gender);

    try {
      const res = await fetch(`/api/ctgov?${params.toString()}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const raw: RawTrial[] = data.studies || [];

      const mapped = raw.map((t) => ({
        nctId: t.id,
        briefTitle: t.title,
        locations: t.locations.map(({ city, state, country }) => ({ city, state, country })),
        summary: t.conditions.join(", "),
        badge: undefined,
        status: t.status,
        phase: t.phase,
        ageRange: t.ageRange,
        keyEligibility: {},
        enrollment: undefined,
        nearestDistanceMi: t.nearestDistanceMi,
        updated: t.lastUpdateSubmitDate || t.startDate,
      }));

      setTrials(mapped);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error(msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const handleFilters = async (e: FormEvent) => {
    e.preventDefault();
    fetchTrials();
  };

  const resetFilters = () => {
    setCondition("");
    setZip("");
    setRadius("");
    setSort(profile?.zip ? "distance" : "recent");
    setTrials([]);
    setError(null);
  };

  if (status === "unauthenticated") {
    return (
      <div className="p-8 text-center space-y-4">
        <p>Please sign in to search trials.</p>
        <button className="btn btn-primary" onClick={() => signIn()}>
          Sign In
        </button>
      </div>
    );
  }

  // 4) Render
  const distanceDisabled = !zip;

  return (
    <div className="max-w-4xl mx-auto p-2 sm:p-6">
      <Link href="/" className="mb-4 inline-flex items-center text-sm link">
        ← Back to Home
      </Link>

      <h1 className="section-title mb-2">Search Clinical Trials</h1>
      <p className="muted text-sm mb-4">
        Choose a condition and optionally your ZIP to prioritize nearby trials.
      </p>

      <form onSubmit={handleFilters} className="card p-4 sm:p-6 mb-6">
        {/* Toolbar */}
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <div className="font-medium">Filters</div>
          <div className="flex items-center gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={resetFilters}>
              Reset
            </button>
            <button type="submit" className="btn btn-primary">
              {loading ? "Searching…" : "Search"}
            </button>
          </div>
        </div>

        {/* Fields grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="field sm:col-span-2">
            <label htmlFor="condition">Condition</label>
            <input
              id="condition"
              type="text"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="input"
              placeholder="e.g., Diabetes"
            />
            <div className="hint">Keywords work (e.g., “breast cancer”, “asthma”).</div>
          </div>

          <div className="field">
            <label htmlFor="zip">ZIP code</label>
            <input
              id="zip"
              type="text"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              className="input"
              placeholder="32202"
            />
            <div className="hint">Enables distance sorting.</div>
          </div>

          <div className="field">
            <label htmlFor="radius">Radius (mi)</label>
            <input
              id="radius"
              type="number"
              min={1}
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              className="input"
              placeholder="25"
            />
          </div>

          <div className="field">
            <label htmlFor="sort">Sort by</label>
            <select
              id="sort"
              className="input"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortMode)}
            >
              <option value="recent">Most recent</option>
              <option value="distance" disabled={distanceDisabled}>Nearest</option>
              <option value="phase">Phase (high → low)</option>
            </select>
          </div>
        </div>
      </form>

      {error && <p className="text-red-500 mb-4">Error: {error}</p>}

      {/* Results */}
      <div className="space-y-4">
        {trials.length === 0 && !loading && !error && (
          <div className="card p-6 text-sm text-center muted">
            No results yet. Try a condition like <span className="font-medium text-[var(--color-brand)]">“diabetes”</span> and hit Search.
          </div>
        )}
        {trials.map((trial) => (
          <TrialCard key={trial.nctId} trial={trial} />
        ))}
      </div>
    </div>
  );
}
