import { useEffect, useState, useCallback, ChangeEvent } from 'react';
import { useRouter } from 'next/router';

interface Study {
  id: string;
  title: string | null;
  status: string;
  conditions: string[];
  locations: string[];
}

export default function HomePage() {
  const router = useRouter();
  const { query, pathname, isReady } = router;

  // Base API URL (fallback to localhost if env var missing)
  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

  // Initialize filter state from URL or defaults
  const [condition, setCondition] = useState<string>(
    typeof query.condition === 'string' ? query.condition : 'Diabetes'
  );
  const [status, setStatus] = useState<string>(
    typeof query.status === 'string' ? query.status : 'RECRUITING'
  );
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextToken, setNextToken] = useState<string | null>(null);

  // Fetch trials from API
  const fetchStudies = useCallback(async (token?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ condition, status });
      if (token) params.set('pageToken', token);

      const res = await fetch(`${API_URL}/ctgov?${params.toString()}`);
            // Read raw text and attempt JSON.parse
      const text = await res.text();
      let data: { studies: Study[]; nextPageToken?: string };
      const parsed: unknown = JSON.parse(text);
      // Validate parsed structure
      if (typeof parsed === 'object' && parsed !== null && 'studies' in parsed) {
        const rec = parsed as Record<string, unknown>;
        const studiesField = rec['studies'];
        if (Array.isArray(studiesField)) {
          const nextPageField = rec['nextPageToken'];
          data = {
            studies: studiesField as Study[],
            nextPageToken: typeof nextPageField === 'string' ? nextPageField : undefined
          };
        } else {
          console.error('Invalid JSON structure, studies is not array:', text);
          setStudies([]);
          setNextToken(null);
          return;
        }
      } else {
        console.error('Invalid JSON response:', text);
        setStudies([]);
        setNextToken(null);
        return;
      }
      try {
        data = JSON.parse(text);
      } catch {
        console.error('Invalid JSON response:', text);
        setStudies([]);
        setNextToken(null);
        return;
      }

      // If we got HTML or error structure, bail
      if (!res.ok || !Array.isArray(data.studies)) {
        console.error('API error', data);
        setStudies([]);
        setNextToken(null);
      } else {
        setStudies(token ? prev => [...prev, ...data.studies] : data.studies);
        setNextToken(data.nextPageToken || null);
      }
    } catch (err) {
      console.error('Network error', err);
      setStudies([]);
      setNextToken(null);
    } finally {
      setLoading(false);
    }
  }, [API_URL, condition, status]);

  // Initial load: fetch once when router ready
  useEffect(() => {
    if (!isReady) return;
    fetchStudies();
  }, [isReady, fetchStudies]);

  // User triggers search: update URL and fetch
  const onSearch = () => {
    router.replace(
      { pathname, query: { condition, status } },
      undefined,
      { shallow: true }
    );
    fetchStudies();
  };

  return (
    <main className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">EqualTrialMatch Clinical Trials</h1>
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

      {nextToken && (
        <button
          onClick={() => fetchStudies(nextToken)}
          disabled={loading}
          className="mt-4 btn p-2 bg-green-600 text-white rounded"
        >
          Load More
        </button>
      )}
    </main>
  );
}
