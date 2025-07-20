import { useEffect, useState, useCallback, useRef, ChangeEvent } from 'react';
import { useRouter } from 'next/router';

interface Study {
  id: string;
  title: string | null;
  status: string;
  conditions: string[];
  locations: string[];
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
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [currentCount, setCurrentCount] = useState<number>(0);

  // Ref for infinite scroll sentinel
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Fetch studies from API with optional pageToken
  const fetchStudies = useCallback(
    async (token?: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ condition, status });
        if (token) params.set('pageToken', token);

        const res = await fetch(`${API_URL}/ctgov?${params.toString()}`);
        const text = await res.text();

        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch {
          console.error('Invalid JSON response:', text);
          setStudies([]);
          setNextToken(null);
          setCurrentCount(0);
          return;
        }

        if (typeof parsed === 'object' && parsed !== null) {
          const rec = parsed as ApiRaw;

          if (Array.isArray(rec.studies)) {
            const fetched = rec.studies as Study[];
            // Append or reset studies
            setStudies(token ? prev => [...prev, ...fetched] : fetched);
            // Update nextPageToken for further pages
            setNextToken(
              typeof rec.nextPageToken === 'string' ? rec.nextPageToken : null
            );
            // Only set total count on first load (token undefined)
            if (!token && typeof rec.totalCount === 'number') {
              setTotalCount(rec.totalCount);
            }
            // Update how many loaded so far
            setCurrentCount(prev => (token ? prev + fetched.length : fetched.length));
          } else {
            console.error('Unexpected API response structure:', rec);
            setStudies([]);
            setNextToken(null);
            setCurrentCount(0);
          }
        } else {
          console.error('API did not return an object:', parsed);
          setStudies([]);
          setNextToken(null);
          setCurrentCount(0);
        }
      } catch (err) {
        console.error('Network error', err);
        setStudies([]);
        setNextToken(null);
        setCurrentCount(0);
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

  // Handle user search: reset pagination state then fetch
  const onSearch = () => {
    setNextToken(null);
    setTotalCount(null);
    setCurrentCount(0);
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
        if (entries[0].isIntersecting && !loading) {
          fetchStudies(nextToken);
        }
      },
      {
        rootMargin: '0px 0px 200px 0px',
        threshold: 1,
      }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [nextToken, loading, fetchStudies]);

  return (
    <>
      {/* Fixed counter always visible when studies loaded */}
      {studies.length > 0 && totalCount !== null && (
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
          <button
            onClick={onSearch}
            disabled={loading}
            className="btn p-2 bg-blue-600 text-white rounded"
          >
            {loading ? 'Loading...' : 'Search'}
          </button>
        </div>

        {/* No-results message */}
        {!loading && studies.length === 0 && (
          <div className="py-8 text-center text-gray-500">
            No trials found for your criteria.
          </div>
        )}

        {/* Study List */}
        <ul className="space-y-4">
          {studies.map(s => (
            <li key={s.id} className="border p-4 rounded shadow-sm">
              <h2 className="text-xl font-semibold">{s.title}</h2>
              <p><strong>Status:</strong> {s.status}</p>
              <p><strong>Conditions:</strong> {s.conditions.join(', ')}</p>
              <p><strong>Locations:</strong> {s.locations.join(', ') || 'N/A'}</p>
              <button
                onClick={() => router.push(`/studies/${s.id}`)}
                className="mt-2 p-2 bg-indigo-600 text-white rounded"
              >
                View Details
              </button>
            </li>
          ))}
        </ul>

        {/* Invisible sentinel for infinite scroll */}
        {nextToken && (
          <div
            ref={loadMoreRef}
            className="mt-4 h-1 w-full opacity-0 pointer-events-none"
          />
        )}
      </main>
    </>
  );
}
