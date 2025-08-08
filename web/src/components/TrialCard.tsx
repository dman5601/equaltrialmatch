// src/components/TrialCard.tsx
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { useState, useEffect } from "react";

export type Trial = {
  nctId: string;
  briefTitle: string;
  locations: { city: string; state: string; country: string }[];
  summary: string;
  badge?: string;  // e.g. "Pivotal Trial (Near Approval)"
  status: string;  // e.g. "Recruiting"
  phase: string[]; // e.g. ["Phase 3"]
  ageRange: { min: string; max: string }; // e.g. { min: "18", max: "65" }
  keyEligibility?: {
    disqualifiers?: string[];    // e.g. ["Bipolar", "Schizophrenia"]
    mustNotBeTaking?: string[];   // e.g. ["Psychotropics"]
  };
  enrollment?: number;            // e.g. 332
  /** ISO date string when this trial was last updated on ct.gov */
  updated: string;
  /** Computed on server when ZIP+radius provided */
  nearestDistanceMi?: number;     // NEW
};

export default function TrialCard({ trial }: { trial: Trial }) {
  const { data: session } = useSession();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!session) return;
    // TODO: optionally pre-load saved state
  }, [session, trial.nctId]);

  const toggleSave = async () => {
    if (!session) return signIn();
    const method = saved ? "DELETE" : "POST";
    await fetch(saved ? `/api/saved-trials/${encodeURIComponent(trial.nctId)}` : "/api/saved-trials", {
      method,
      credentials: "include",
      headers: saved ? undefined : { "Content-Type": "application/json" },
      body: saved ? undefined : JSON.stringify({ nctId: trial.nctId }),
    });
    setSaved(!saved);
  };

  // Primary location
  const primary = trial.locations[0];
  const locationLabel = primary
    ? [primary.city, primary.state].filter(Boolean).join(", ")
    : "Not specified";

  const eligibilityItems: React.ReactNode[] = [];
  if (trial.keyEligibility?.disqualifiers?.length) {
    eligibilityItems.push(
      <li key="disqualifiers">
        <strong>Disqualifiers:</strong> {trial.keyEligibility.disqualifiers.join(", ")}
      </li>
    );
  }
  if (trial.keyEligibility?.mustNotBeTaking?.length) {
    eligibilityItems.push(
      <li key="mustNotBeTaking">
        <strong>Must Not Be Taking:</strong> {trial.keyEligibility.mustNotBeTaking.join(", ")}
      </li>
    );
  }

  return (
    <div className="card flex flex-col justify-between p-6 border rounded-lg shadow h-full">
      {/* HEADER: title + save */}
      <div>
        <div className="flex justify-between items-start">
          <Link
            href={`/trials/${trial.nctId}`}
            className="text-lg font-semibold hover:underline"
          >
            {trial.briefTitle}
          </Link>
          <button onClick={toggleSave} className="btn ml-2">
            {saved ? "★" : "☆"}
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-1">{locationLabel}</p>
      </div>

      {/* SUMMARY */}
      <p className="text-sm text-gray-700 my-4 line-clamp-2">{trial.summary}</p>

      {/* BADGE */}
      {trial.badge && (
        <span className="inline-block text-xs font-medium uppercase bg-indigo-100 px-2 py-1 rounded-full">
          {trial.badge}
        </span>
      )}

      {/* CORE DETAILS */}
      <ul className="mt-4 space-y-1 text-sm text-gray-800">
        <li><strong>Status:</strong> {trial.status}</li>
        <li><strong>Phase:</strong> {trial.phase.join(", ") || "N/A"}</li>
        <li><strong>Age:</strong> {trial.ageRange.min} – {trial.ageRange.max}</li>
        {typeof trial.nearestDistanceMi === "number" && (
          <li><strong>Nearest site:</strong> {trial.nearestDistanceMi.toFixed(1)} mi</li>
        )}
        {eligibilityItems.length > 0 && (
          <li>
            <strong>Key Eligibility:</strong>
            <ul className="list-disc list-inside ml-4">{eligibilityItems}</ul>
          </li>
        )}
        {typeof trial.enrollment === "number" && (
          <li>
            <strong>Participants Needed:</strong> {trial.enrollment.toLocaleString()}
          </li>
        )}
      </ul>

      {/* LAST UPDATED */}
      <div className="mt-4 text-xs text-gray-500">
        Last Updated:{" "}
        {new Date(trial.updated).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
      </div>

      {/* CTA */}
      <div className="mt-6 flex justify-between items-center">
        <Link href={`/trials/${trial.nctId}`} className="text-blue-600 hover:underline font-medium">
          Learn More →
        </Link>
      </div>
    </div>
  );
}
