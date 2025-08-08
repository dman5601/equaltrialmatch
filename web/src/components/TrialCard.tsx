// web/src/components/TrialCard.tsx
import Link from "next/link";

export type Trial = {
  nctId: string;
  briefTitle: string;
  summary?: string;
  status?: string;
  phase?: string[];
  ageRange?: { min: string; max: string };
  keyEligibility?: Record<string, string>;
  locations?: { city?: string; state?: string; country?: string }[];
  nearestDistanceMi?: number;
  badge?: string;
  enrollment?: number;
};

export default function TrialCard({ trial }: { trial: Trial }) {
  const primaryLocation = trial.locations?.[0];
  const place = [primaryLocation?.city, primaryLocation?.state, primaryLocation?.country]
    .filter(Boolean)
    .join(", ");

  return (
    <article className="card p-5">
      <header className="flex flex-wrap items-start gap-2">
        <h3 className="text-lg sm:text-xl font-semibold leading-snug flex-1">
          {trial.briefTitle}
        </h3>
        {trial.status && <span className="pill">{trial.status}</span>}
        {trial.phase?.length ? <span className="pill">Phase {trial.phase.join(", ")}</span> : null}
        {typeof trial.nearestDistanceMi === "number" && (
          <span className="pill">{Math.round(trial.nearestDistanceMi)} mi</span>
        )}
      </header>

      {trial.summary && (
        <p className="mt-3 text-sm muted leading-relaxed">{trial.summary}</p>
      )}

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm muted">
        {place && <div><span className="font-medium">Location: </span>{place}</div>}
        {trial.ageRange && (
          <div><span className="font-medium">Age: </span>{trial.ageRange.min}–{trial.ageRange.max}</div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link href={`/trials/${trial.nctId}`} className="btn btn-primary">View details</Link>
        <Link href={`/trials/${trial.nctId}#locations`} className="btn btn-ghost">Locations</Link>
      </div>
    </article>
  );
}
