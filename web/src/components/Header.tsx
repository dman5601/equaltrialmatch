// web/src/components/Header.tsx
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  const { status } = useSession();

  return (
    <header className="sticky top-0 z-40 border-b border-black/5 dark:border-white/10 bg-[var(--color-surface)]/80 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
        <Link href="/" className="font-bold tracking-tight text-lg">
          <span className="text-[var(--color-text)]">Equal</span>
          <span className="text-[var(--color-brand)]">Trial</span>
          <span className="text-[var(--color-text)]">Match</span>
        </Link>

        <nav className="ml-auto hidden sm:flex items-center gap-2">
          <Link className="btn btn-ghost" href="/search">Search</Link>
          <Link className="btn btn-ghost" href="/profile">Profile</Link>
          <ThemeToggle />
          {status === "authenticated" ? (
            <button className="btn btn-primary" onClick={() => signOut()}>Sign out</button>
          ) : (
            <button className="btn btn-primary" onClick={() => signIn()}>Sign in</button>
          )}
        </nav>
      </div>
    </header>
  );
}
