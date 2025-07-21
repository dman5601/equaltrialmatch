import { useSession, signIn } from "next-auth/react";
import { useState, useEffect } from "react";

type Trial = {
  nctId: string;
  briefTitle: string;
  // …other fields
};

export default function TrialCard({ trial }: { trial: Trial }) {
  const { data: session } = useSession();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!session) return;
    // optional: fetch saved list once and setSaved accordingly
  }, [session, trial.nctId]);

  const toggleSave = async () => {
    if (!session) return signIn();
    const method = saved ? "DELETE" : "POST";
    await fetch("/api/saved-trials", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nctId: trial.nctId }),
    });
    setSaved(!saved);
  };

  return (
    <div className="card">
      <h2>{trial.briefTitle}</h2>
      {/* …other fields… */}
      <button onClick={toggleSave} className="btn">
        {saved ? "★ Saved" : "☆ Save"}
      </button>
    </div>
  );
}
