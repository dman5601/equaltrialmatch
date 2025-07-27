import { useEffect, useState, useCallback, useRef, ChangeEvent, useMemo } from 'react';
import { useRouter } from 'next/router';

interface Study {
  id: string;
  title: string | null;
  status: string;
  conditions: string[];
  locations: string[];
  lastUpdateSubmitDate: string | null;   // ← we pulled this in from the API
}

// Raw API response shape for type narrowing
type ApiRaw = {
  studies?: unknown;
  nextPageToken?: unknown;
  totalCount?: unknown;
};

export default function HomePage() {
  const router = useRouter();
  const { query, pathname, isReady } = router;

  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

  // State hooks
  const [condition, setCondition] = useState<string>(
    typeof query.condition === 'string' ? query.condition : 'Diabetes'
  );
  const [status, setStatus] = useState<string>(
    typeof query.status === 'string' ? query.status : 'RECRUITING'
  );
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [currentCount, setCurrentCount] = useState<number>(0);

  // ### NEW: sort studies by lastUpdateSubmitDate desc
  const sortedStudies = useMemo(() => {
    return [...studies].sort((a, b) => {
      const aTime = a.lastUpdateSubmitDate
        ? new Date(a.lastUpdateSubmitDate).getTime()
        : 0;
      const bTime = b.lastUpdateSubmitDate
        ? new Date(b.lastUpdateSubmitDate).getTime()
        : 0;
      return bTime - aTime;
    });
  }, [studies]);

  // Ref for infinite scroll sentinel
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Fetch studies from API with optional pageToken
  const fetchStudies = useCallback(
    async (token?: string) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ condition, status });
        if (token) params.set('pageToken', token);

        const res = await fetch(`${API_URL}/ctgov?${params.toString()}`);
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const text = await res.text();

        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch {
          throw new Error('Invalid JSON response');
        }

        if (typeof parsed === 'object' && parsed !== null) {
          const rec = parsed as ApiRaw;
          if (Array.isArray(rec.studies)) {
            const fetched = rec.studies as Study[];
            setStudies(token ? prev => [...prev, ...fetched] : fetched);
            setNextToken(
              typeof rec.nextPageToken === 'string' ? rec.nextPageToken : null
            );
            if (!token && typeof rec.totalCount === 'number') {
              setTotalCount(rec.totalCount);
            }
            setCurrentCount(prev => (token ? prev + fetched.length : fetched.length));
          } else {
            throw new Error('Unexpected API response structure');
          }
        } else {
          throw new Error('API did not return an object');
        }
      } catch (err: unknown) {
        console.error(err);
        const message = err instanceof Error ? err.message : 'Network error';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [API_URL, condition, status]
  );

  // Initial load
  useEffect(() => {
    if (!isReady) return;
    fetchStudies();
  }, [isReady, fetchStudies]);

  // Handle user search: reset state then fetch
  const onSearch = () => {
    setNextToken(null);
    setTotalCount(null);
    setCurrentCount(0);
    setError(null);
    setStudies([]);
    router.replace(
      { pathname, query: { condition, status } },
      undefined,
      { shallow: true }
    );
    fetchStudies();
  };

  // Infinite scroll observer on invisible sentinel
  useEffect(() => {
    if (!nextToken || !loadMoreRef.current) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !loading && !error) {
          fetchStudies(nextToken);
        }
      },
      { rootMargin: '0px 0px 200px 0px', threshold: 1 }
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [nextToken, loading, error, fetchStudies]);

  return (
    <>
      {/* Fixed counter */}
      {sortedStudies.length > 0 && totalCount !== null && (
        <div className="fixed top-0 left-0 w-full bg-white z-20 border-b">
          <div className="container mx-auto px-6 py-2 text-sm text-gray-600">
            Showing 1–{currentCount} of {totalCount} results
          </div>
        </div>
      )}

      <main className="container mx-auto p-6 pt-16">
        <h1 className="text-3xl font-bold mb-4">EqualTrialMatch Clinical Trials</h1>

        {/* Search Bar */}
        <div className="mb-4 flex space-x-2">
          <input
            type="text"
            value={condition}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setCondition(e.target.value)}
            placeholder="Condition"
            className="border p-2 rounded flex-grow"
          />
          <select
            value={status}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setStatus(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="RECRUITING">Recruiting</option>
            <option value="ACTIVE_NOT_RECRUITING">Active Not Recruiting</option>
            <option value="COMPLETED">Completed</option>
          </select>
          <button onClick={onSearch} disabled={loading} className="btn p-2 bg-blue-600 text-white rounded">
            {loading ? 'Loading...' : 'Search'}
          </button>
        </div>

        {/* Error state */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-300 rounded text-red-800 text-center">
            <p>{error}</p>
            <button onClick={() => fetchStudies()} className="mt-2 px-4 py-2 bg-red-600 text-white rounded">
              Retry
            </button>
          </div>
        )}

        {/* No-results message */}
        {!loading && !error && sortedStudies.length === 0 && (
          <div className="py-8 text-center text-gray-500">
            No trials found for your criteria.
          </div>
        )}

        {/* Study List or skeletons */}
        <ul className="space-y-4">
          {loading && sortedStudies.length === 0
            ? // Skeleton placeholders
              Array.from({ length: 5 }).map((_, i) => (
                <li key={i} className="animate-pulse border p-4 rounded shadow-sm bg-gray-100">
                  <div className="h-6 bg-gray-300 rounded w-3/4 mb-2" />
                  <div className="space-y-1">
                    <div className="h-4 bg-gray-300 rounded w-1/3" />
                    <div className="h-4 bg-gray-300 rounded w-1/2" />
                  </div>
                </li>
              ))
            : sortedStudies.map(s => (
                <li key={s.id} className="border p-4 rounded shadow-sm">
                  <h2 className="text-xl font-semibold">{s.title}</h2>
                  <p><strong>Status:</strong> {s.status}</p>
                  <p><strong>Conditions:</strong> {s.conditions.join(', ')}</p>
                  <p><strong>Locations:</strong> {s.locations.join(', ') || 'N/A'}</p>

                  {/* last‐updated */}
                  {s.lastUpdateSubmitDate && (
                    <p className="mt-2 text-xs text-gray-500">
                      Last updated:{' '}
                      {new Date(s.lastUpdateSubmitDate).toLocaleDateString('en-US', {
                        year:  'numeric',
                        month: 'short',
                        day:   'numeric',
                      })}
                    </p>
                  )}

                  <button
                    onClick={() => router.push(`/studies/${s.id}`)}
                    className="mt-2 p-2 bg-indigo-600 text-white rounded"
                  >
                    View Details
                  </button>
                </li>
              ))}
        </ul>

        {/* Invisible sentinel */}
        {!error && nextToken && (
          <div ref={loadMoreRef} className="mt-4 h-1 w-full opacity-0 pointer-events-none" />
        )}
      </main>
    </>
  );
}
