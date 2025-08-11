import Link from "next/link";
import { Search } from "lucide-react";

export default function LandingHero() {
  return (
    <section className="relative isolate">
      {/* Soft radial glow background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_50%_10%,rgba(37,99,235,0.08),transparent_60%)]"
      />
      <div className="grid gap-10 lg:grid-cols-2 items-center">
        {/* Left: headline & copy */}
        <div>
          <p className="pill mb-4">Clinical trial discovery</p>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.05]">
            Find the right clinical trial{" "}
            <span className="text-[color:var(--color-brand)]">fast</span>.
          </h1>
          <p className="mt-5 text-lg text-slate-600">
            Search live registries with powerful filters for condition, location, age,
            and eligibility—so patients and providers get to relevant studies quickly.
          </p>
        </div>

        {/* Right: prominent search card */}
        <div className="card p-6 lg:p-8">
          <h2 className="section-title">Search clinical trials</h2>

          <form action="/search" className="mt-5 grid gap-4">
            <div className="field">
              <label>Condition</label>
              <input
                className="input"
                name="condition"
                placeholder="e.g. Type 2 Diabetes"
                autoComplete="off"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="field">
                <label>Location</label>
                <input className="input" name="location" placeholder="City or ZIP" />
              </div>
              <div className="field">
                <label>Radius (miles)</label>
                <input className="input" name="radius" placeholder="25" />
              </div>
            </div>

            <button className="btn btn-primary h-12 text-base font-semibold mt-2">
              <Search className="w-5 h-5" />
              <span>Search trials</span>
            </button>
          </form>

          <p className="mt-3 text-sm muted">
            Prefer advanced filters? Use the{" "}
            <Link href="/search" className="underline">full search</Link>.
          </p>
        </div>
      </div>
    </section>
  );
}
