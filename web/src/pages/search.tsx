// web/src/pages/search.tsx
import { useSession, signIn } from "next-auth/react";
import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import TrialCard, { Trial as CardTrial } from "../components/TrialCard";

// Raw API response shape
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
  nearestDistanceMi?: number; // NEW
}

// Your Profile shape (partial)
interface Profile {
  zip?: string;
  radius?: number;
  age?: number;
  gender?: string;
}

export default function SearchPage() {
  const { status } = useSession();

  // ——————————————————————————
  // 1. Load user profile (age/gender/zip/radius)
  // ——————————————————————————
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

  // ——————————————————————————
  // 2. Search state
  // ——————————————————————————
  const [trials, setTrials] = useState<(CardTrial & { updated: string })[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [condition, setCondition] = useState("");
  const [zip, setZip] = useState("");
  const [radius, setRadius] = useState<string>(""); // NEW

  // Pre-fill from profile
  useEffect(() => {
    if (profile?.zip) setZip(profile.zip);
    if (typeof profile?.radius === "number" && profile.radius > 0) {
      setRadius(String(profile.radius));
    }
  }, [profile]);

  // ——————————————————————————
  // 3. Fetch trials (includes age & gender & radius)
  // ——————————————————————————
  async function fetchTrials() {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (condition) params.append("condition", condition);
    if (zip)       params.append("location", zip);
    if (radius)    params.append("radius", radius); // NEW

    if (profile?.age !== undefined) params.append("age", String(profile.age));
    if (profile?.gender)            params.append("gender", profile.gender);

    try {
      const res = await fetch(`/api/ctgov?${params.toString()}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      const raw: RawTrial[] = data.studies || [];

      // Sort: by distance if radius provided, else by recency
      if (radius) {
        raw.sort(
          (a, b) =>
            (a.nearestDistanceMi ?? Number.POSITIVE_INFINITY) -
            (b.nearestDistanceMi ?? Number.POSITIVE_INFINITY)
        );
      } else {
        raw.sort((a, b) => {
          const aTime = new Date(a.lastUpdateSubmitDate || a.startDate).getTime();
          const bTime = new Date(b.lastUpdateSubmitDate || b.startDate).getTime();
          return bTime - aTime;
        });
      }

      const mapped = raw.map((t) => ({
        nctId:       t.id,
        briefTitle:  t.title,
        locations:   t.locations.map(({ city, state, country }) => ({ city, state, country })),
        summary:     t.conditions.join(", "),
        badge:       undefined,
        status:      t.status,
        phase:       t.phase,
        ageRange:    t.ageRange,
        keyEligibility: {},
        enrollment:  undefined,
        nearestDistanceMi: t.nearestDistanceMi, // NEW
        updated:     t.lastUpdateSubmitDate || t.startDate,
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

  // ——————————————————————————
  // 4. Handle form submit
  // ——————————————————————————
  const handleFilters = async (e: FormEvent) => {
    e.preventDefault();
    fetchTrials();
  };

  // Require login
  if (status === "unauthenticated") {
    return (
      <div className="p-8 text-center space-y-4">
        <p>Please sign in to search trials.</p>
        <button className="btn" onClick={() => signIn()}>
          Sign In
        </button>
      </div>
    );
  }

  // ——————————————————————————
  // 5. Render
  // ——————————————————————————
  return (
    <div className="max-w-4xl mx-auto p-6">
      <Link href="/" className="text-blue-500 mb-4 block">
        ← Back to Home
      </Link>
      <h1 className="text-2xl font-bold mb-4">Search Clinical Trials</h1>

      {/* Search bar */}
      <form onSubmit={handleFilters} className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1 min-w-[220px]">
          <label htmlFor="condition" className="sr-only">
            Condition
          </label>
          <input
            id="condition"
            type="text"
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="input w-full"
            placeholder="Condition (e.g. Diabetes)"
          />
        </div>
        <div>
          <label htmlFor="zip" className="sr-only">
            ZIP Code
          </label>
          <input
            id="zip"
            type="text"
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            className="input w-32"
            placeholder="ZIP code"
          />
        </div>
        <div>
          <label htmlFor="radius" className="sr-only">
            Radius (miles)
          </label>
          <input
            id="radius"
            type="number"
            min={1}
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            className="input w-36"
            placeholder="Radius (mi)"
          />
        </div>
        <button type="submit" className="btn px-6">
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {/* Error */}
      {error && <p className="text-red-500 mb-4">Error: {error}</p>}

      {/* Results */}
      <div className="space-y-6">
        {trials.map((trial) => (
          <TrialCard key={trial.nctId} trial={trial} />
        ))}
      </div>
    </div>
  );
}
