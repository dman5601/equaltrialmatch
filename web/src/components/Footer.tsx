import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-black/5">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-10 text-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="muted">© {new Date().getFullYear()} EqualTrialMatch</p>
        <nav className="flex gap-6">
          <Link className="hover:underline" href="/disclosure">Disclosure</Link>
          <Link className="hover:underline" href="/profile">Profile</Link>
          <Link className="hover:underline" href="/contact">Contact</Link>
        </nav>
      </div>
    </footer>
  );
}
