// web/src/pages/index.tsx
import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";

export default function HomePage() {
  const { status, data: session } = useSession();

  // Unauthenticated: offer Sign In / Sign Up
  if (status === "unauthenticated") {
    return (
      <div className="p-8 text-center space-y-4">
        <p>Please sign in or sign up to view and search trials.</p>
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

  // Loading state
  if (status === "loading") {
    return (
      <div className="p-8 text-center">
        <p>Loading…</p>
      </div>
    );
  }

  // Authenticated: show greeting, Sign Out, and link to Search
  return (
    <div className="p-8 text-center space-y-4">
      <h1 className="text-2xl font-bold">Welcome, {session?.user?.email}!</h1>
      <div className="flex justify-center space-x-4">
        <Link href="/search" className="btn">
          Search Clinical Trials
        </Link>
        <button className="btn-outline" onClick={() => signOut()}>
          Sign Out
        </button>
      </div>
    </div>
  );
}
