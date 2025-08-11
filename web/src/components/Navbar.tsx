import Link from "next/link";
import { LogIn, Search, LogOut } from "lucide-react";
import { useSession, signIn, signOut } from "next-auth/react";

export default function Navbar() {
  const { status } = useSession();

  return (
    <header className="sticky top-0 z-40 border-b border-black/5 backdrop-blur bg-white/70 dark:bg-black/30">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <Link href="/" className="font-extrabold tracking-tight text-xl">
          Equal<span className="text-[color:var(--color-brand)]">Trial</span>Match
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link href="/search" className="hover:underline">Search</Link>
          <Link href="/faq" className="hover:underline">FAQ</Link>
          <Link href="/about" className="hover:underline">About</Link>
        </nav>

        <div className="flex items-center gap-2">
          {status === "authenticated" ? (
            <>
              <Link href="/search" className="btn btn-ghost btn-sm">
                <Search className="w-4 h-4" /> Search
              </Link>
              <button onClick={() => signOut()} className="btn btn-primary btn-sm">
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </>
          ) : (
            <>
              <button onClick={() => signIn()} className="btn btn-primary btn-sm">
                <LogIn className="w-4 h-4" /> Sign In
              </button>
              <Link href="/signup" className="btn btn-ghost btn-sm">Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
