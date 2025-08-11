import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import LandingHero from "@/components/LandingHero";

export default function HomePage() {
  const { status, data: session } = useSession();

  return (
    <>
      <LandingHero />

      {/* Features */}
      <section>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { title: "Live data", text: "Direct from trusted registries with frequent updates." },
            { title: "Powerful filters", text: "Condition, distance, status, age, gender eligibility, and more." },
            { title: "Save & revisit", text: "Bookmark trials to compare or share with providers." },
          ].map((f) => (
            <div key={f.title} className="card p-6">
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-2 muted">{f.text}</p>
            </div>
          ))}
        </div>

        {/* Auth helpers */}
        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Link href="/search" className="btn btn-primary">Open full search</Link>
          {status !== "authenticated" ? (
            <>
              <button onClick={() => signIn()} className="btn btn-ghost">Sign In</button>
              <Link href="/signup" className="btn btn-ghost">Sign Up</Link>
            </>
          ) : (
            <button onClick={() => signOut()} className="btn btn-ghost">Sign Out</button>
          )}
        </div>

        {status === "authenticated" && (
          <p className="mt-2 text-sm">
            Welcome, <span className="font-semibold">{session?.user?.email}</span>.
          </p>
        )}
      </section>
    </>
  );
}
