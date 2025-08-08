import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

type SavedTrialsContextValue = {
  ready: boolean;
  isSaved: (nctId: string) => boolean;
  save: (nctId: string) => Promise<void>;
  unsave: (nctId: string) => Promise<void>;
  toggle: (nctId: string) => Promise<void>;
  all: Set<string>;
};

const SavedTrialsContext = createContext<SavedTrialsContextValue | null>(null);

export function SavedTrialsProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState<Set<string>>(new Set());

  // Load once when authenticated
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (status !== "authenticated") {
        setSaved(new Set());
        setReady(true);
        return;
      }
      try {
        const res = await fetch("/api/saved-trials");
        if (!res.ok) throw new Error(await res.text());
        const entries: { nctId: string }[] = await res.json();
        if (!cancelled) {
          setSaved(new Set(entries.map(e => e.nctId)));
          setReady(true);
        }
      } catch (e) {
        console.error("Failed to load saved trials:", e);
        if (!cancelled) setReady(true);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [status]);

  const isSaved = useCallback((nctId: string) => saved.has(nctId), [saved]);

  const save = useCallback(async (nctId: string) => {
    if (saved.has(nctId)) return;
    // optimistic add
    setSaved(prev => new Set(prev).add(nctId));
    try {
      const res = await fetch("/api/saved-trials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nctId }),
      });
      if (!res.ok) throw new Error(await res.text());
    } catch (e) {
      console.error("Save failed:", e);
      // rollback
      setSaved(prev => {
        const next = new Set(prev);
        next.delete(nctId);
        return next;
      });
      throw e;
    }
  }, [saved]);

  const unsave = useCallback(async (nctId: string) => {
    if (!saved.has(nctId)) return;
    // optimistic remove
    setSaved(prev => {
      const next = new Set(prev);
      next.delete(nctId);
      return next;
    });
    try {
      const res = await fetch(`/api/saved-trials/${encodeURIComponent(nctId)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
    } catch (e) {
      console.error("Unsave failed:", e);
      // rollback
      setSaved(prev => new Set(prev).add(nctId));
      throw e;
    }
  }, [saved]);

  const toggle = useCallback(async (nctId: string) => {
    if (saved.has(nctId)) return unsave(nctId);
    return save(nctId);
  }, [saved, save, unsave]);

  const value = useMemo<SavedTrialsContextValue>(() => ({
    ready,
    isSaved,
    save,
    unsave,
    toggle,
    all: saved,
  }), [ready, isSaved, save, unsave, toggle, saved]);

  return (
    <SavedTrialsContext.Provider value={value}>
      {children}
    </SavedTrialsContext.Provider>
  );
}

export function useSavedTrials() {
  const ctx = useContext(SavedTrialsContext);
  if (!ctx) throw new Error("useSavedTrials must be used within SavedTrialsProvider");
  return ctx;
}
