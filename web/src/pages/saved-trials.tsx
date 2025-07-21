// web/src/pages/saved-trials.tsx
import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import TrialCard from "../components/TrialCard";

// matches the props your TrialCard expects
interface TrialData {
  nctId: string;
  briefTitle: string;
  // add any other fields your TrialCard displays…
}

interface SavedEntry {
  id: string;
  userId: string;
  nctId: string;
  createdAt: string;
}

export default function SavedTrialsPage() {
  const { data: session } = useSession();
  const [trials, setTrials] = useState<TrialData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session) return;
    setLoading(true);

    fetch("/api/saved-trials")
      .then((res) => res.json() as Promise<SavedEntry[]>)
      .then((entries) =>
        Promise.all(
          entries.map(async (e) => {
            const r = await fetch(`/api/studies/${e.nctId}`);
            if (!r.ok) throw new Error("Failed to fetch trial " + e.nctId);
            return (await r.json()) as TrialData;
          })
        )
      )
      .then(setTrials)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [session]);

  if (!session) {
    return (
      <div className="p-4">
        <p>
          Please{" "}
          <button onClick={() => signIn()} className="btn">
            log in
          </button>{" "}
          to see your saved trials.
        </p>
      </div>
    );
  }

  if (loading) {
    return <p className="p-4">Loading your saved trials…</p>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl mb-4">Your Saved Trials</h1>
      {trials.length === 0 ? (
        <p>No saved trials yet.</p>
      ) : (
        <div className="grid gap-4">
          {trials.map((trial) => (
            <TrialCard key={trial.nctId} trial={trial} />
          ))}
        </div>
      )}
    </div>
  );
}
