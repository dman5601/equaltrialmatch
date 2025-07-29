// web/src/pages/profile.tsx
import { useSession, signIn } from "next-auth/react";
import { useState, useEffect, FormEvent } from "react";

type ProfileData = {
  zip?: string;
  radius?: number;
  age?: number;
  gender?: string;
  phase?: string;
};

export default function ProfilePage() {
  const { status } = useSession();
  const [profile, setProfile] = useState<ProfileData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") signIn();
  }, [status]);

  // Fetch existing profile
  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/profile")
        .then((r) => r.json())
        .then((data) => {
          if (data) setProfile(data);
        })
        .finally(() => setLoading(false));
    }
  }, [status]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    setSaving(false);
  };

  if (loading) return <p>Loading…</p>;

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">Your Search Preferences</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label>ZIP Code</label>
          <input
            type="text"
            value={profile.zip || ""}
            onChange={(e) => setProfile({ ...profile, zip: e.target.value })}
            className="input w-full"
          />
        </div>
        <div>
          <label>Search Radius (miles)</label>
          <input
            type="number"
            value={profile.radius ?? ""}
            onChange={(e) => setProfile({ ...profile, radius: parseInt(e.target.value) })}
            className="input w-full"
          />
        </div>
        <div>
          <label>Age</label>
          <input
            type="number"
            value={profile.age ?? ""}
            onChange={(e) => setProfile({ ...profile, age: parseInt(e.target.value) })}
            className="input w-full"
          />
        </div>
        <div>
          <label>Gender</label>
          <select
            value={profile.gender || ""}
            onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
            className="input w-full"
          >
            <option value="">Any</option>
            <option>Male</option>
            <option>Female</option>
          </select>
        </div>
        <div>
          <label>Trial Phase</label>
          <select
            value={profile.phase || ""}
            onChange={(e) => setProfile({ ...profile, phase: e.target.value })}
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
        <button type="submit" disabled={saving} className="btn w-full">
          {saving ? "Saving…" : "Save Preferences"}
        </button>
      </form>
    </div>
  );
}
