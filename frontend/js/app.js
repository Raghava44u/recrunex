// ══ Recrunex App ══════════════════════════════════════════════════════════════
const App = (() => {

  const state = {
    jobs: [], allFetchedJobs: [],
    currentPage: 0, totalPages: 1,
    isLoading: false,
    currentQuery: '', currentLocation: '',
    timeFilterHours: 24,
    hasSearched: false, activeJobId: null, viewMode: 'grid',
    filters: { source: 'all', levels: [], types: [], remote: false },
  };

  const $ = id => document.getElementById(id);

  const els = {
    searchBtn: $('searchBtn'), searchInput: $('searchInput'),
    locationInput: $('locationInput'), clearSearch: $('clearSearch'),
    jobsGrid: $('jobsGrid'), resultsHeader: $('resultsHeader'),
    resultsTitle: $('resultsTitle'), resultsCount: $('resultsCount'),
    sourcePills: $('sourcePills'), loadMoreWrap: $('loadMoreWrap'),
    loadMoreBtn: $('loadMoreBtn'), emptyState: $('emptyState'),
    errorState: $('errorState'), errorMessage: $('errorMessage'),
    retryBtn: $('retryBtn'), emptySuggestions: $('emptySuggestions'),
    savedCount: $('savedCount'), savedNavBtn: $('savedNavBtn'),
    savedPanel: $('savedPanel'), panelOverlay: $('panelOverlay'),
    panelClose: $('panelClose'), savedEmpty: $('savedEmpty'),
    savedList: $('savedList'), modalOverlay: $('modalOverlay'),
    jobModal: $('jobModal'), modalBody: $('modalBody'),
    modalClose: $('modalClose'), modalBack: $('modalBack'),
    themeToggle: $('themeToggle'), themePicker: $('themePicker'),
    themePickerWrap: $('themePickerWrap'),
    gamesBtn: $('gamesBtn'), gamesDropdown: $('gamesDropdown'),
    gamesDropdownWrap: $('gamesDropdownWrap'),
    trendingChips: $('trendingChips'),
    gridViewBtn: $('gridViewBtn'), listViewBtn: $('listViewBtn'),
    clearFiltersBtn: $('clearFiltersBtn'),
    recentSection: $('recentSection'), recentChips: $('recentChips'),
    clearRecent: $('clearRecent'),
    mobileFilterBtn: $('mobileFilterBtn'), filterSidebar: $('filterSidebar'),
    backToTop: $('backToTop'), logoHome: $('logoHome'),
  };

  // ── Theme ──────────────────────────────────────────────────────────────────
  function initTheme() {
    // Always start with dark-space; only change if user has explicitly saved a preference
    const saved = Storage.getTheme();
    // Only apply saved if it's one of our known themes
    const valid = ['dark-space','dark-ocean','dark-forest','light-sky','light-peach','light-mint'];
    const theme = (saved && valid.includes(saved)) ? saved : 'dark-space';
    applyTheme(theme);

    els.themeToggle.addEventListener('click', e => {
      e.stopPropagation();
      const isOpen = !els.themePicker.hasAttribute('hidden');
      if (isOpen) {
        els.themePicker.setAttribute('hidden', '');
      } else {
        els.themePicker.removeAttribute('hidden');
      }
    });

    document.querySelectorAll('.theme-opt').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        applyTheme(btn.dataset.theme);
        Storage.setTheme(btn.dataset.theme);
        els.themePicker.setAttribute('hidden', '');
      });
    });

    // Close dropdowns on outside click
    document.addEventListener('click', e => {
      if (!els.themePickerWrap?.contains(e.target)) {
        els.themePicker?.setAttribute('hidden', '');
      }
      if (!els.gamesDropdownWrap?.contains(e.target)) {
        els.gamesDropdown?.setAttribute('hidden', '');
        els.gamesDropdownWrap?.classList.remove('open');
      }
    });
  }

  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    document.querySelectorAll('.theme-opt').forEach(b => b.classList.toggle('active', b.dataset.theme === t));
  }

  // ── View Mode ──────────────────────────────────────────────────────────────
  function initViewMode() {
    setViewMode(Storage.getViewMode() || 'grid');
    els.gridViewBtn.addEventListener('click', () => setViewMode('grid'));
    els.listViewBtn.addEventListener('click', () => setViewMode('list'));
  }

  function setViewMode(mode) {
    state.viewMode = mode;
    Storage.setViewMode(mode);
    els.jobsGrid.className = `jobs-grid ${mode}-view`;
    els.gridViewBtn.classList.toggle('active', mode === 'grid');
    els.listViewBtn.classList.toggle('active', mode === 'list');
  }

  // ── Trending ───────────────────────────────────────────────────────────────
  async function loadTrending() {
    try {
      const data = await API.getTrending();
      els.trendingChips.innerHTML = (data.trending||[]).slice(0,8).map(t =>
        `<button class="chip" data-query="${t.query}">${t.icon} ${t.query}</button>`
      ).join('');
      els.trendingChips.addEventListener('click', e => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        els.searchInput.value = chip.dataset.query;
        els.clearSearch.removeAttribute('hidden');
        triggerSearch(false);
      });
    } catch {}
  }

  // ── Games ──────────────────────────────────────────────────────────────────
  function initGames() {
    els.gamesBtn.addEventListener('click', e => {
      e.stopPropagation();
      const open = !els.gamesDropdown.hasAttribute('hidden');
      els.gamesDropdown.toggleAttribute('hidden', open);
      els.gamesDropdownWrap.classList.toggle('open', !open);
    });
    document.querySelectorAll('.game-item').forEach(btn => {
      btn.addEventListener('click', () => {
        els.gamesDropdown.setAttribute('hidden', '');
        els.gamesDropdownWrap.classList.remove('open');
        Games.open(btn.dataset.game);
      });
    });
  }

  // ── Filters ────────────────────────────────────────────────────────────────
  function initTimeFilter() {
    document.querySelectorAll('.time-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.timeFilterHours = parseInt(btn.dataset.hours);
        if (state.hasSearched) applyClientFilters();
      });
    });
  }

  function readFilters() {
    const srcEl = document.querySelector('input[name="source"]:checked');
    state.filters.source = srcEl ? srcEl.value : 'all';
    state.filters.levels = Array.from(document.querySelectorAll('#levelFilter input:checked')).map(e => e.value);
    state.filters.types  = Array.from(document.querySelectorAll('#typeFilter input:checked')).map(e => e.value);
    const re = $('remoteFilter');
    state.filters.remote = re ? re.checked : false;
  }

  function initFilters() {
    initTimeFilter();

    // Source radio → new API call with that source
    document.querySelectorAll('input[name="source"]').forEach(r => {
      r.addEventListener('change', () => {
        readFilters();
        if (state.hasSearched) triggerSearch(false);
      });
    });

    // Level/Type/Remote → client filter only
    document.querySelectorAll('#levelFilter input, #typeFilter input').forEach(cb => {
      cb.addEventListener('change', () => { readFilters(); if (state.hasSearched) applyClientFilters(); });
    });
    const re = $('remoteFilter');
    if (re) re.addEventListener('change', () => { readFilters(); if (state.hasSearched) applyClientFilters(); });

    // Clear all
    els.clearFiltersBtn.addEventListener('click', () => {
      const firstSrc = document.querySelector('input[name="source"]');
      if (firstSrc) firstSrc.checked = true;
      document.querySelectorAll('#levelFilter input, #typeFilter input').forEach(c => c.checked = false);
      const r = $('remoteFilter'); if (r) r.checked = false;
      document.querySelectorAll('.time-btn').forEach(b => b.classList.toggle('active', b.dataset.hours === '24'));
      state.timeFilterHours = 24;
      readFilters();
      if (state.hasSearched) triggerSearch(false);
    });

    // Mobile
    if (els.mobileFilterBtn) {
      els.mobileFilterBtn.addEventListener('click', () => {
        els.filterSidebar.classList.toggle('open');
        els.mobileFilterBtn.innerHTML = els.filterSidebar.classList.contains('open')
          ? '<i class="fa-solid fa-xmark"></i> Close'
          : '<i class="fa-solid fa-sliders"></i> Filters';
      });
    }
  }

  function isWithinTime(job) {
    if (state.timeFilterHours === 0) return true;
    if (!job.publicationDate) return false;
    return Date.now() - new Date(job.publicationDate).getTime() <= state.timeFilterHours * 3600000;
  }

  function applyClientFilters() {
    const msg = $('freshEmptyMsg'); if (msg) msg.remove();
    let jobs = [...state.allFetchedJobs];

    if (state.timeFilterHours > 0) jobs = jobs.filter(j => isWithinTime(j));

    if (state.filters.levels.length) {
      jobs = jobs.filter(j =>
        state.filters.levels.some(l =>
          (j.levels||[]).some(jl => jl.toLowerCase().includes(l.toLowerCase())) ||
          (j.tags||[]).some(t  => t.toLowerCase().includes(l.toLowerCase()))
        )
      );
    }
    if (state.filters.types.length) {
      jobs = jobs.filter(j =>
        state.filters.types.some(t => (j.type||'').toLowerCase().includes(t.toLowerCase()))
      );
    }
    if (state.filters.remote) {
      jobs = jobs.filter(j => j.remote || /remote/i.test(j.primaryLocation||''));
    }

    state.jobs = jobs;
    renderJobCards(jobs, false, { total: state.allFetchedJobs.length });
  }

  // ── Search ─────────────────────────────────────────────────────────────────
  async function triggerSearch(append = false) {
    if (state.isLoading) return;

    const query    = els.searchInput.value.trim();
    const location = els.locationInput.value.trim();
    readFilters();

    if (!append) {
      state.currentPage    = 0;
      state.currentQuery   = query;
      state.currentLocation= location;
      state.jobs           = [];
      state.allFetchedJobs = [];
      state.hasSearched    = true;
      const msg = $('freshEmptyMsg'); if (msg) msg.remove();

      if (query || location) {
        Storage.addRecentSearch(query, location);
        renderRecentSearches();
        setTimeout(() => {
          const sect = document.querySelector('.results-section');
          if (sect) {
            const top = sect.getBoundingClientRect().top + window.scrollY - 80;
            window.scrollTo({ top: Math.max(0, top), behavior:'smooth' });
          }
        }, 120);
      }
    }

    setLoading(true, append);

    try {
      const data = await API.searchJobs({
        query:    state.currentQuery,
        location: state.currentLocation,
        page:     state.currentPage,
        source:   state.filters.source !== 'all' ? state.filters.source : '',
        remote:   state.filters.remote,
      });

      const newJobs = data.jobs || [];
      state.allFetchedJobs = append ? [...state.allFetchedJobs, ...newJobs] : newJobs;
      state.totalPages = data.pageCount || 1;
      renderSourcePills(data.sources || []);
      applyClientFilters();

      // 🤖 AI Resume Match — delay so cards are painted in DOM first
      if (typeof AIMatch !== 'undefined') {
        // Pass ALL fetched jobs (not just newJobs) so badges persist on load more
        setTimeout(() => AIMatch.run(state.currentQuery, state.allFetchedJobs), 600);
      }

    } catch(err) {
      console.error('[Search]', err.message);
      showPanel('error');
      els.errorMessage.textContent = err.message || 'Failed to load jobs.';
      els.jobsGrid.innerHTML = '';
    } finally {
      setLoading(false, append);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  function renderJobCards(jobs, append, meta) {
    const msg = $('freshEmptyMsg'); if (msg) msg.remove();

    if (jobs.length === 0 && !append) {
      els.jobsGrid.innerHTML = '';
      els.loadMoreWrap.setAttribute('hidden','');
      const all = state.allFetchedJobs.length;
      showPanel('results');
      updateHeader(0, meta.total);

      if (state.timeFilterHours > 0 && all > 0) {
        const label = state.timeFilterHours===24?'24 hours':state.timeFilterHours===48?'48 hours':'7 days';
        const m = document.createElement('div');
        m.id = 'freshEmptyMsg';
        m.className = 'fresh-empty-state';
        m.innerHTML = `
          <div style="font-size:2.2rem;margin-bottom:10px">⏰</div>
          <h3>No jobs posted in the last ${label}</h3>
          <p>Found <strong>${all}</strong> total jobs — none match your time window.<br/>
          Try a longer window or see all results.</p>
          <button class="show-all-btn" id="showAllBtn">Show All ${all} Jobs →</button>
        `;
        els.jobsGrid.after(m);
        $('showAllBtn').addEventListener('click', () => {
          document.querySelectorAll('.time-btn').forEach(b => b.classList.toggle('active', b.dataset.hours==='0'));
          state.timeFilterHours = 0;
          applyClientFilters();
        });
      } else {
        showPanel('empty');
        UI.renderEmptyState(state.currentQuery, state.currentLocation, els.emptySuggestions);
      }
      return;
    }

    if (jobs.length === 0 && !append) {
      showPanel('empty');
      UI.renderEmptyState(state.currentQuery, state.currentLocation, els.emptySuggestions);
      updateHeader(0, meta.total);
      return;
    }

    showPanel('results');
    updateHeader(jobs.length, meta.total);

    const html = jobs.map((j,i) => UI.renderJobCard(j, i)).join('');
    if (append) {
      const div = document.createElement('div');
      div.innerHTML = html;
      Array.from(div.children).forEach(c => els.jobsGrid.appendChild(c));
    } else {
      els.jobsGrid.innerHTML = html;
    }

    const hasMore = state.currentPage < state.totalPages - 1;
    els.loadMoreWrap.toggleAttribute('hidden', !hasMore);
    if (hasMore) {
      els.loadMoreBtn.innerHTML = '<span>Load More</span> <i class="fa-solid fa-chevron-down"></i>';
      els.loadMoreBtn.classList.remove('loading');
    }
  }

  function renderSourcePills(sources) {
    if (!els.sourcePills) return;
    const map = {'The Muse':'muse','Remotive':'remotive','Adzuna India':'adzuna'};
    els.sourcePills.innerHTML = sources.map(s =>
      `<span class="source-pill ${map[s]||''}">${s}</span>`
    ).join('');
  }

  function updateHeader(showing, total) {
    const q=state.currentQuery, loc=state.currentLocation;
    let title = 'Latest Jobs';
    if (q && loc) title = `"${q}" in ${loc}`;
    else if (q)   title = `"${q}"`;
    else if (loc) title = `Jobs in ${loc}`;
    els.resultsTitle.textContent = title;
    const tLabel = state.timeFilterHours===24?' · 🔥 24h':state.timeFilterHours===48?' · ⚡ 48h':state.timeFilterHours===168?' · 📅 7d':'';
    els.resultsCount.textContent = `${showing.toLocaleString()} jobs${tLabel}`;
    els.resultsHeader.removeAttribute('hidden');
  }

  function showPanel(which) {
    els.emptyState.toggleAttribute('hidden', which !== 'empty');
    els.errorState.toggleAttribute('hidden', which !== 'error');
    if (which === 'error' || which === 'empty') {
      els.jobsGrid.innerHTML = '';
      els.loadMoreWrap.setAttribute('hidden','');
    }
  }

  function setLoading(loading, append=false) {
    state.isLoading = loading;
    els.searchBtn.disabled = loading;
    els.searchBtn.innerHTML = loading
      ? '<span>Searching…</span> <i class="fa-solid fa-spinner" style="animation:spin 1s linear infinite"></i>'
      : '<span>Search</span> <i class="fa-solid fa-arrow-right"></i>';
    if (!append && loading) UI.renderSkeletons(els.jobsGrid, 6);
  }

  // ── Card Click ─────────────────────────────────────────────────────────────
  function handleGridClick(e) {
    const saveBtn = e.target.closest('.save-btn');
    if (saveBtn) { e.stopPropagation(); handleSave(saveBtn.dataset.jobId); return; }
    if (e.target.closest('.apply-btn')) return;
    const card = e.target.closest('.job-card');
    if (card) openModal(getJob(card.dataset.jobId));
  }

  function getJob(id) {
    return state.allFetchedJobs.find(j => String(j.id)===String(id)) ||
           Storage.getSavedJobs().find(j => String(j.id)===String(id));
  }

  function handleSave(jobId) {
    const job = getJob(jobId);
    if (!job) return;
    const wasSaved = Storage.isJobSaved(job.id);
    if (wasSaved) { Storage.unsaveJob(job.id); UI.toast('Removed from saved','info'); }
    else           { Storage.saveJob(job);     UI.toast('Saved! 🔖','success'); }
    updateSavedCount();
    // Sync all matching save buttons
    document.querySelectorAll(`.save-btn[data-job-id="${job.id}"]`).forEach(btn => {
      const now = Storage.isJobSaved(job.id);
      btn.classList.toggle('saved', now);
      btn.querySelector('i').className = `fa-${now?'solid':'regular'} fa-bookmark`;
    });
    // Sync modal save btn
    const msb = $('modalSaveBtn');
    if (msb && String(msb.dataset.jobId)===String(job.id)) {
      const now = Storage.isJobSaved(job.id);
      msb.className = `modal-save-btn${now?' saved':''}`;
      msb.innerHTML = `<i class="fa-${now?'solid':'regular'} fa-bookmark"></i> ${now?'Saved':'Save'}`;
    }
    if (els.savedPanel.classList.contains('open')) renderSavedPanel();
  }

  // ── Modal ──────────────────────────────────────────────────────────────────
  function openModal(job) {
    if (!job) return;
    state.activeJobId = job.id;
    els.modalBody.innerHTML = UI.renderJobModal(job);
    els.modalOverlay.classList.add('visible');
    els.jobModal.removeAttribute('hidden');
    requestAnimationFrame(() => requestAnimationFrame(() => els.jobModal.classList.add('visible')));
    document.body.style.overflow = 'hidden';
    $('modalSaveBtn')?.addEventListener('click', () => handleSave(job.id));
  }

  function closeModal() {
    els.jobModal.classList.remove('visible');
    setTimeout(() => {
      els.modalOverlay.classList.remove('visible');
      els.jobModal.setAttribute('hidden','');
      document.body.style.overflow = '';
      state.activeJobId = null;
    }, 350);
  }

  // ── Saved Panel ────────────────────────────────────────────────────────────
  function openSavedPanel() {
    renderSavedPanel();
    els.savedPanel.classList.add('open');
    els.panelOverlay.classList.add('visible');
    document.body.style.overflow = 'hidden';
  }

  function closeSavedPanel() {
    els.savedPanel.classList.remove('open');
    els.panelOverlay.classList.remove('visible');
    document.body.style.overflow = '';
  }

  function renderSavedPanel() {
    const saved = Storage.getSavedJobs();
    if (!saved.length) { els.savedEmpty.removeAttribute('hidden'); els.savedList.innerHTML=''; return; }
    els.savedEmpty.setAttribute('hidden','');
    els.savedList.innerHTML = saved.map(j => UI.renderSavedJobCard(j)).join('');
    els.savedList.querySelectorAll('.saved-job-card').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('.unsave-btn')) return;
        const job = saved.find(j => String(j.id)===card.dataset.jobId);
        if (job) { closeSavedPanel(); openModal(job); }
      });
    });
    els.savedList.querySelectorAll('.unsave-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        handleSave(btn.dataset.jobId);
        renderSavedPanel();
      });
    });
  }

  function updateSavedCount() {
    const n = Storage.getSavedJobs().length;
    els.savedCount.textContent = n;
    els.savedCount.toggleAttribute('hidden', n===0);
  }

  // ── Recent ─────────────────────────────────────────────────────────────────
  function renderRecentSearches() {
    const recent = Storage.getRecentSearches();
    if (!recent.length) { els.recentSection?.setAttribute('hidden',''); return; }
    els.recentSection?.removeAttribute('hidden');
    if (els.recentChips) {
      els.recentChips.innerHTML = recent.map(r =>
        `<button class="recent-chip" data-query="${r.query||''}" data-location="${r.location||''}">
          ${r.query||r.location}${r.query&&r.location?` · ${r.location}`:''}
        </button>`
      ).join('');
    }
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  function init() {
    initTheme();
    initViewMode();
    initFilters();
    initGames();
    loadTrending();
    renderRecentSearches();
    updateSavedCount();
    Search.init();
    if (typeof Feedback !== "undefined") Feedback.init();

    // Search bar
    els.searchBtn.addEventListener('click', () => triggerSearch(false));
    [els.searchInput, els.locationInput].forEach(inp => {
      inp.addEventListener('keydown', e => { if (e.key==='Enter') triggerSearch(false); });
    });
    els.clearSearch.addEventListener('click', () => {
      els.searchInput.value=''; els.clearSearch.setAttribute('hidden',''); els.searchInput.focus();
    });
    els.searchInput.addEventListener('input', e =>
      els.clearSearch.toggleAttribute('hidden', !e.target.value)
    );

    // Keyboard shortcut: / focuses search
    document.addEventListener('keydown', e => {
      if (e.key === '/' && document.activeElement !== els.searchInput && document.activeElement !== els.locationInput) {
        e.preventDefault();
        els.searchInput.focus();
      }
      if (e.key === 'Escape') {
        if (state.activeJobId) closeModal();
        else if (els.savedPanel.classList.contains('open')) closeSavedPanel();
      }
    });

    // Grid
    els.jobsGrid.addEventListener('click', handleGridClick);

    // Empty suggestions
    els.emptySuggestions.addEventListener('click', e => {
      const chip = e.target.closest('.suggestion-chip');
      if (!chip) return;
      els.searchInput.value = chip.dataset.suggestion;
      els.clearSearch.removeAttribute('hidden');
      triggerSearch(false);
    });

    // Recent chips
    els.recentChips.addEventListener('click', e => {
      const chip = e.target.closest('.recent-chip');
      if (!chip) return;
      els.searchInput.value = chip.dataset.query||'';
      els.locationInput.value = chip.dataset.location||'';
      triggerSearch(false);
    });
    els.clearRecent.addEventListener('click', () => { Storage.clearRecentSearches(); renderRecentSearches(); });

    // Modal
    els.modalClose.addEventListener('click', closeModal);
    els.modalBack.addEventListener('click', closeModal);
    els.modalOverlay.addEventListener('click', closeModal);

    // Saved
    els.savedNavBtn.addEventListener('click', openSavedPanel);
    els.panelClose.addEventListener('click', closeSavedPanel);
    els.panelOverlay.addEventListener('click', closeSavedPanel);

    // Load more
    els.loadMoreBtn.addEventListener('click', () => {
      if (state.isLoading) return;
      state.currentPage++;
      els.loadMoreBtn.classList.add('loading');
      triggerSearch(true);
    });
    els.retryBtn.addEventListener('click', () => triggerSearch(false));
    els.logoHome.addEventListener('click', e => { e.preventDefault(); window.scrollTo({top:0,behavior:'smooth'}); });

    // Back to top
    window.addEventListener('scroll', () => {
      els.backToTop.classList.toggle('visible', window.scrollY > 400);
    }, { passive:true });
    els.backToTop.addEventListener('click', () => window.scrollTo({top:0,behavior:'smooth'}));

    // Infinite scroll sentinel
    const sentinel = document.createElement('div');
    sentinel.style.height = '1px';
    els.loadMoreWrap.after(sentinel);
    // Only trigger infinite scroll AFTER user has done at least one search
    // and only if there's actually more pages — prevents firing on load
    new IntersectionObserver(entries => {
      if (
        entries[0].isIntersecting &&
        !state.isLoading &&
        state.hasSearched &&
        state.currentPage < state.totalPages - 1 &&
        state.totalPages > 1
      ) {
        state.currentPage++;
        triggerSearch(true);
      }
    }, { rootMargin:'100px', threshold: 0.1 }).observe(sentinel);

    // Initial load
    triggerSearch(false);
  }

  return { init, triggerSearch };
})();

document.addEventListener('DOMContentLoaded', App.init);