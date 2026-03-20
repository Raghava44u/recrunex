// ── API Module ────────────────────────────────────────────────────────────────
const API = (() => {
  const clientCache = new Map();
  const CACHE_TTL = 5 * 60 * 1000; // 5 min client cache

  function cacheKey(endpoint, params) {
    return endpoint + '?' + new URLSearchParams(
      Object.entries(params).filter(([,v]) => v !== undefined && v !== null && v !== '' && v !== false)
    ).toString();
  }

  function fromCache(key) {
    const e = clientCache.get(key);
    if (!e) return null;
    if (Date.now() - e.ts > CACHE_TTL) { clientCache.delete(key); return null; }
    return e.data;
  }

  function toCache(key, data) {
    if (clientCache.size > 100) clientCache.delete(clientCache.keys().next().value);
    clientCache.set(key, { data, ts: Date.now() });
  }

  async function fetchJSON(endpoint, params = {}) {
    const key = cacheKey(endpoint, params);
    const hit = fromCache(key);
    if (hit) return { ...hit, clientCached: true };

    // Build URL
    const base = (typeof CONFIG !== 'undefined' ? CONFIG.API_BASE : 'http://localhost:3001/api');
    const url = new URL(`${base}${endpoint}`);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '' && v !== false) {
        url.searchParams.set(k, String(v));
      }
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);

    try {
      const res = await fetch(url.toString(), {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });
      clearTimeout(timer);

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Server error (HTTP ${res.status})`);
      }

      const data = await res.json();
      toCache(key, data);
      return data;

    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        throw new Error('Request timed out. Is the backend running?');
      }
      // "Failed to fetch" = backend not reachable
      if (err.message === 'Failed to fetch' || err.message.includes('fetch')) {
        throw new Error('Cannot reach backend. Run: cd backend && node server.js');
      }
      throw err;
    }
  }

  // ── Public methods ────────────────────────────────────────────────────────
  function searchJobs({ query='', location='', page=0, source='', remote=false } = {}) {
    return fetchJSON('/jobs', { query, location, page, source, remote: remote || undefined });
  }

  function getTrending() {
    return fetchJSON('/trending');
  }

  function checkHealth() {
    return fetchJSON('/health');
  }

  function clearCache() {
    clientCache.clear();
  }

  return { searchJobs, getTrending, checkHealth, clearCache };
})();