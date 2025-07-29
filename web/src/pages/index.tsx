// web/src/pages/index.tsx
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import { useState, useEffect, FormEvent } from "react";

type Trial = {
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
};

export default function HomePage() {
  const { status } = useSession();
  const [trials, setTrials] = useState<Trial[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter state, pre-populated from profile
  const [condition, setCondition] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [zip, setZip] = useState("");
  const [radius, setRadius] = useState<number | "">("");
  const [age, setAge] = useState<number | "">("");
  const [gender, setGender] = useState("");
  const [phase, setPhase] = useState("");

  // Load profile on mount
  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/profile")
        .then((res) => res.json())
        .then((profile) => {
          if (profile) {
            setZip(profile.zip || "");
            setRadius(profile.radius ?? "");
            setAge(profile.age ?? "");
            setGender(profile.gender || "");
            setPhase(profile.phase || "");
          }
        });
    }
  }, [status]);

  // Fetch trials helper
  async function fetchTrials() {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (condition)     params.append("condition", condition);
    if (statusFilter)  params.append("status", statusFilter);
    if (zip)           params.append("location", zip);
    if (radius !== "") params.append("radius", String(radius));
    if (age !== "")    params.append("age", String(age));
    if (gender)        params.append("gender", gender);
    if (phase)         params.append("phase", phase);

    try {
      const res = await fetch(`/api/ctgov?${params.toString()}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setTrials(data.studies || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error(message);
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  // On filter submit: save profile then run search
  const handleFilters = async (e: FormEvent) => {
    e.preventDefault();
    if (status === "authenticated") {
      await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zip, radius, age, gender, phase }),
      });
    }
    fetchTrials();
  };

  // Show Sign In / Sign Up when not authenticated
  if (status === "unauthenticated") {
    return (
      <div className="p-8 text-center space-y-4">
        <p>Please sign in or sign up to search trials.</p>
        <div className="flex justify-center space-x-4">
          <button className="btn" onClick={() => signIn()}>
            Sign In
          </button>
          <Link href="/auth/signup" className="btn">
            Sign Up
          </Link>
        </div>
      </div>
    );
  }

  // Authenticated view
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Search Clinical Trials</h1>

      <form onSubmit={handleFilters} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Condition */}
        <div>
          <label>Condition</label>
          <input
            type="text"
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="input w-full"
            placeholder="e.g. Diabetes"
          />
        </div>

        {/* Recruitment Status */}
        <div>
          <label>Recruitment Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input w-full"
          >
            <option value="">Any</option>
            <option>Recruiting</option>
            <option>Not yet recruiting</option>
            <option>Active, not recruiting</option>
          </select>
        </div>

        {/* ZIP Code */}
        <div>
          <label>ZIP Code</label>
          <input
            type="text"
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            className="input w-full"
            placeholder="e.g. 32207"
          />
        </div>

        {/* Radius */}
        <div>
          <label>Radius (miles)</label>
          <input
            type="number"
            value={radius}
            onChange={(e) => setRadius(e.target.value === "" ? "" : parseInt(e.target.value))}
            className="input w-full"
          />
        </div>

        {/* Age */}
        <div>
          <label>Age</label>
          <input
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value === "" ? "" : parseInt(e.target.value))}
            className="input w-full"
          />
        </div>

        {/* Gender */}
        <div>
          <label>Gender</label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="input w-full"
          >
            <option value="">Any</option>
            <option>Male</option>
            <option>Female</option>
          </select>
        </div>

        {/* Trial Phase */}
        <div>
          <label>Trial Phase</label>
          <select
            value={phase}
            onChange={(e) => setPhase(e.target.value)}
            className="input w-full"
          >
            <option value="">Any</option>
            <option>Early Phase 1</option>
            <option>Phase 1</option>
            <option>Phase 2</option>
            <option>Phase 3</option>
            <option>Phase 4</option>
            <option>Not Applicable</option>
          </select>
        </div>

        {/* Submit button spans two columns */}
        <div className="md:col-span-2 text-right">
          <button type="submit" className="btn">
            {loading ? "Searching…" : "Search"}
          </button>
        </div>
      </form>

      {/* Error message */}
      {error && <p className="text-red-500 mb-4">Error: {error}</p>}

      {/* Results */}
      <div className="space-y-4">
        {trials.map((trial) => (
          <div key={trial.id} className="p-4 border rounded">
            <h2 className="font-semibold">{trial.title}</h2>
            <p>Status: {trial.status}</p>
            <p>Phase: {trial.phase.join(", ") || "N/A"}</p>
            <p>
              Age: {trial.ageRange.min} – {trial.ageRange.max}
            </p>
            <p>Gender: {trial.gender || "Any"}</p>
            <p>Locations:</p>
            <ul className="list-disc list-inside">
              {trial.locations.map((loc, i) => (
                <li key={i}>
                  {loc.city}, {loc.state}, {loc.country}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
