// ── Storage Module ─────────────────────────────────────────────────────────
// Handles all localStorage operations safely

const Storage = (() => {
  const KEYS = {
    SAVED_JOBS: 'jobpulse_saved_jobs',
    RECENT_SEARCHES: 'jobpulse_recent_searches',
    THEME: 'jobpulse_theme',
    VIEW_MODE: 'jobpulse_view_mode',
  };

  function safeGet(key) {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : null;
    } catch {
      return null;
    }
  }

  function safeSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  // ── Saved Jobs ────────────────────────────────
  function getSavedJobs() {
    return safeGet(KEYS.SAVED_JOBS) || [];
  }

  function saveJob(job) {
    const saved = getSavedJobs();
    const exists = saved.find(j => j.id === job.id);
    if (exists) return false;
    const trimmed = saved.slice(0, CONFIG.MAX_SAVED_JOBS - 1);
    safeSet(KEYS.SAVED_JOBS, [job, ...trimmed]);
    return true;
  }

  function unsaveJob(jobId) {
    const saved = getSavedJobs();
    const updated = saved.filter(j => j.id !== jobId);
    safeSet(KEYS.SAVED_JOBS, updated);
  }

  function isJobSaved(jobId) {
    const saved = getSavedJobs();
    return saved.some(j => j.id === jobId);
  }

  function clearAllSaved() {
    safeSet(KEYS.SAVED_JOBS, []);
  }

  // ── Recent Searches ───────────────────────────
  function getRecentSearches() {
    return safeGet(KEYS.RECENT_SEARCHES) || [];
  }

  function addRecentSearch(query, location) {
    if (!query && !location) return;
    const recent = getRecentSearches();
    const entry = { query: query || '', location: location || '', timestamp: Date.now() };
    // Deduplicate
    const filtered = recent.filter(
      r => !(r.query === entry.query && r.location === entry.location)
    );
    const updated = [entry, ...filtered].slice(0, CONFIG.MAX_RECENT_SEARCHES);
    safeSet(KEYS.RECENT_SEARCHES, updated);
  }

  function clearRecentSearches() {
    safeSet(KEYS.RECENT_SEARCHES, []);
  }

  // ── Theme ─────────────────────────────────────
  function getTheme() {
    return safeGet(KEYS.THEME) || 'dark';
  }

  function setTheme(theme) {
    safeSet(KEYS.THEME, theme);
  }

  // ── View Mode ─────────────────────────────────
  function getViewMode() {
    return safeGet(KEYS.VIEW_MODE) || 'grid';
  }

  function setViewMode(mode) {
    safeSet(KEYS.VIEW_MODE, mode);
  }

  return {
    getSavedJobs,
    saveJob,
    unsaveJob,
    isJobSaved,
    clearAllSaved,
    getRecentSearches,
    addRecentSearch,
    clearRecentSearches,
    getTheme,
    setTheme,
    getViewMode,
    setViewMode,
  };
})();
