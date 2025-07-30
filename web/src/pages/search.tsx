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
}

export default function SearchPage() {
  const { status } = useSession();
  const [trials, setTrials] = useState<(CardTrial & { updated: string })[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search fields: only Condition and ZIP code
  const [condition, setCondition] = useState("");
  const [zip, setZip] = useState("");

  // Load saved profile on mount (ZIP only)
  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/profile")
        .then(res => res.json())
        .then(profile => {
          if (profile) {
            setZip(profile.zip || "");
          }
        });
    }
  }, [status]);

  // Fetch trials with sorting and mapping
  async function fetchTrials() {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (condition) params.append("condition", condition);
    if (zip) params.append("location", zip);

    try {
      const res = await fetch(`/api/ctgov?${params.toString()}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      // Sort by most recent update first
      const raw: RawTrial[] = data.studies || [];
      raw.sort((a, b) => {
        const aTime = new Date(a.lastUpdateSubmitDate || a.startDate).getTime();
        const bTime = new Date(b.lastUpdateSubmitDate || b.startDate).getTime();
        return bTime - aTime;
      });

      // Normalize to CardTrial shape
      const mapped = raw.map(t => ({
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
        updated: t.lastUpdateSubmitDate || t.startDate,
      })) as (CardTrial & { updated: string })[];

      setTrials(mapped);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error(msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  // Handle search form submit
  const handleFilters = async (e: FormEvent) => {
    e.preventDefault();
    if (status === "authenticated") {
      await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zip }),
      });
    }
    fetchTrials();
  };

  // Require login for access
  if (status === "unauthenticated") {
    return (
      <div className="p-8 text-center space-y-4">
        <p>Please sign in to search trials.</p>
        <button className="btn" onClick={() => signIn()}>Sign In</button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Link href="/" className="text-blue-500 mb-4 block">← Back to Home</Link>
      <h1 className="text-2xl font-bold mb-4">Search Clinical Trials</h1>

      {/* Search bar: Condition + ZIP */}
      <form onSubmit={handleFilters} className="flex gap-4 mb-6">
        <div className="flex-1">
          <label htmlFor="condition" className="sr-only">Condition</label>
          <input
            id="condition"
            type="text"
            value={condition}
            onChange={e => setCondition(e.target.value)}
            className="input w-full"
            placeholder="Condition (e.g. Diabetes)"
          />
        </div>
        <div>
          <label htmlFor="zip" className="sr-only">ZIP Code</label>
          <input
            id="zip"
            type="text"
            value={zip}
            onChange={e => setZip(e.target.value)}
            className="input w-32"
            placeholder="ZIP code"
          />
        </div>
        <button type="submit" className="btn px-6">{loading ? "Searching…" : "Search"}</button>
      </form>

      {/* Error message */}
      {error && <p className="text-red-500 mb-4">Error: {error}</p>}

      {/* Display results */}
      <div className="space-y-6">
        {trials.map(trial => (
          <TrialCard key={trial.nctId} trial={trial} />
        ))}
      </div>
    </div>
  );
}
