// web/src/components/ThemeToggle.tsx
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [ready, setReady] = useState(false);
  const [isDark, setIsDark] = useState(false);

  // Sync from DOM on mount (avoids SSR mismatch)
  useEffect(() => {
    const html = document.documentElement;
    const dark = html.classList.contains("dark");
    setIsDark(dark);
    setReady(true);
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    const html = document.documentElement;
    html.classList.toggle("dark", next);
    // Persist preference like Tailwind docs recommend
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  if (!ready) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      className="btn btn-ghost"
      aria-label="Toggle theme"
      title="Toggle light/dark"
    >
      {isDark ? "🌙 Dark" : "☀️ Light"}
    </button>
  );
}
