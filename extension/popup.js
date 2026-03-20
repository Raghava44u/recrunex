// ══ Recrunex Extension Popup ══════════════════════════════════════════════════
const API_BASE = 'http://localhost:3001/api';

// ── State ──────────────────────────────────────────────────────────────────────
const state = {
  jobs: [],
  timeHours: 24,
  isLoading: false,
  query: '',
  location: '',
};

// ── DOM ────────────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const jobList    = $('jobList');
const searchBtn  = $('searchBtn');
const searchInput= $('searchInput');
const locInput   = $('locationInput');
const statusText = $('statusText');
const statusDot  = document.querySelector('.status-dot');
const emptyState = $('emptyState');
const alertPanel = $('alertPanel');
const alertToggle= $('alertToggle');
const bellIcon   = $('bellIcon');

// ── Init ───────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadSavedSearch();
  fetchJobs();
  renderActiveAlerts();
  setupListeners();
  checkAlertStatus();
});

// ── Fetch Jobs ────────────────────────────────────────────────────────────────
async function fetchJobs() {
  if (state.isLoading) return;
  state.isLoading = true;
  searchBtn.disabled = true;
  searchBtn.innerHTML = '<i class="fa-solid fa-spinner" style="animation:spin 0.8s linear infinite"></i> Searching…';

  setStatus('loading', 'Fetching fresh jobs…');
  renderSkeletons();

  try {
    const params = new URLSearchParams();
    if (state.query)    params.set('query', state.query);
    if (state.location) params.set('location', state.location);

    const res  = await fetch(`${API_BASE}/jobs?${params}`, { headers:{'Accept':'application/json'} });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const allJobs = data.jobs || [];

    // Apply time filter client-side
    state.jobs = state.timeHours === 0
      ? allJobs
      : allJobs.filter(j => {
          if (!j.publicationDate) return false;
          return Date.now() - new Date(j.publicationDate).getTime() <= state.timeHours * 3600000;
        });

    renderJobs();
    setStatus('ok', `${state.jobs.length} job${state.jobs.length!==1?'s':''} found · ${getTimeLabel()}`);

    // Save last search
    chrome.storage?.local.set({ lastQuery: state.query, lastLocation: state.location });

  } catch(err) {
    console.error('[Recrunex]', err);
    const isDown = err.message.includes('fetch') || err.message.includes('Failed');
    setStatus('error', isDown ? '⚠️ Backend not running on :3001' : err.message);
    jobList.innerHTML = `
      <div class="loading-wrap" style="gap:10px;flex-direction:column">
        <div style="font-size:1.8rem">${isDown ? '🔌' : '⚡'}</div>
        <div style="text-align:center;color:var(--text-2);font-size:0.8rem">
          ${isDown
            ? 'Backend not running.<br/><code style="font-size:0.72rem;color:var(--accent-light)">cd backend && node server.js</code>'
            : 'Something went wrong.<br/>Check your connection.'
          }
        </div>
        <button onclick="fetchJobs()" style="padding:6px 14px;border-radius:8px;background:var(--accent);color:#fff;font-size:0.75rem;cursor:pointer;border:none">Retry</button>
      </div>`;
    emptyState.setAttribute('hidden','');
  } finally {
    state.isLoading = false;
    searchBtn.disabled = false;
    searchBtn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> Search';
  }
}

// ── Render Jobs ────────────────────────────────────────────────────────────────
function renderJobs() {
  emptyState.setAttribute('hidden','');

  if (!state.jobs.length) {
    jobList.innerHTML = '';
    emptyState.removeAttribute('hidden');
    return;
  }

  jobList.innerHTML = state.jobs.slice(0, 30).map(job => {
    const ini = (job.company||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    const srcClass = /muse/i.test(job.source)?'muse':/remotive/i.test(job.source)?'remotive':'adzuna';
    return `
      <div class="job-card ${job.isRecent?'fresh':''}">
        <div class="job-card-top">
          <div class="job-logo">
            ${job.companyLogo
              ? `<img src="${job.companyLogo}" onerror="this.parentNode.innerHTML='${ini}'" alt="${job.company}" />`
              : ini}
          </div>
          <div class="job-meta">
            <div class="job-company">${esc(job.company)}</div>
            <div class="job-title">${esc(job.title)}</div>
          </div>
        </div>
        <div class="job-card-bottom">
          <div class="job-tags">
            ${job.isRecent ? '<span class="fresh-tag">🔥 New</span>' : ''}
            <span class="job-tag">${esc(job.primaryLocation)}</span>
            ${job.levels?.[0] ? `<span class="job-tag">${esc(job.levels[0])}</span>` : ''}
            <span class="job-src">${esc(job.source)}</span>
          </div>
          <span class="job-time">${esc(job.postedAgo)}</span>
          <a href="${job.applyUrl}" target="_blank" class="apply-link" rel="noopener">Apply →</a>
        </div>
      </div>`;
  }).join('');
}

// ── Skeletons ──────────────────────────────────────────────────────────────────
function renderSkeletons() {
  emptyState.setAttribute('hidden','');
  jobList.innerHTML = Array.from({length:4},(_,i)=>`
    <div class="skel-card" style="animation-delay:${i*80}ms">
      <div class="skel-row">
        <div class="skel" style="width:28px;height:28px;border-radius:6px;flex-shrink:0"></div>
        <div style="flex:1;display:flex;flex-direction:column;gap:5px">
          <div class="skel" style="width:45%;height:8px"></div>
          <div class="skel" style="width:75%;height:11px"></div>
        </div>
      </div>
      <div style="display:flex;gap:5px">
        <div class="skel" style="width:50px;height:16px;border-radius:10px"></div>
        <div class="skel" style="width:40px;height:16px;border-radius:10px"></div>
      </div>
    </div>`).join('');
}

// ── Status ─────────────────────────────────────────────────────────────────────
function setStatus(type, text) {
  statusText.textContent = text;
  statusDot.className = 'status-dot' + (type==='error'?' error':type==='loading'?' loading':'');
}

function getTimeLabel() {
  if (state.timeHours===24)  return '🔥 last 24h';
  if (state.timeHours===48)  return '⚡ last 48h';
  if (state.timeHours===168) return '📅 last 7 days';
  return 'all time';
}

// ── Alert System ───────────────────────────────────────────────────────────────
function checkAlertStatus() {
  chrome.storage?.local.get(['alerts'], data => {
    const alerts = data.alerts || [];
    if (alerts.length > 0) {
      alertToggle.classList.add('active');
      bellIcon.className = 'fa-solid fa-bell';
    }
  });
}

function renderActiveAlerts() {
  const container = $('activeAlerts');
  chrome.storage?.local.get(['alerts'], data => {
    const alerts = data.alerts || [];
    if (!alerts.length) {
      container.innerHTML = '<p style="font-size:0.72rem;color:var(--text-3);text-align:center;padding:10px 0">No active alerts</p>';
      $('saveAlert').textContent = '🔔 Enable Alerts';
      $('saveAlert').classList.remove('on');
      return;
    }
    container.innerHTML = `
      <div style="font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-3);margin-bottom:3px">Active Alerts (${alerts.length})</div>
      ${alerts.map((a,i) => `
        <div class="active-alert">
          <div class="active-alert-text">
            <div class="active-alert-kw">🔔 ${esc(a.keyword)}</div>
            <div class="active-alert-meta">${a.location?'📍 '+esc(a.location)+' · ':''} Every ${a.freqMinutes<60?a.freqMinutes+'m':a.freqMinutes/60+'h'}</div>
          </div>
          <button class="alert-del" data-idx="${i}" title="Delete alert">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>`
      ).join('')}
    `;
    container.querySelectorAll('.alert-del').forEach(btn => {
      btn.addEventListener('click', () => deleteAlert(parseInt(btn.dataset.idx)));
    });
    alertToggle.classList.add('active');
  });
}

function deleteAlert(idx) {
  chrome.storage?.local.get(['alerts'], data => {
    const alerts = data.alerts || [];
    alerts.splice(idx, 1);
    chrome.storage?.local.set({ alerts }, () => {
      renderActiveAlerts();
      if (!alerts.length) {
        alertToggle.classList.remove('active');
        chrome.alarms?.clearAll();
      }
      toast('Alert removed');
    });
  });
}

// ── Save Search ────────────────────────────────────────────────────────────────
function loadSavedSearch() {
  chrome.storage?.local.get(['lastQuery','lastLocation'], data => {
    if (data.lastQuery)    { searchInput.value = data.lastQuery;    state.query    = data.lastQuery; }
    if (data.lastLocation) { locInput.value    = data.lastLocation; state.location = data.lastLocation; }
  });
}

// ── Event Listeners ────────────────────────────────────────────────────────────
function setupListeners() {
  // Search
  searchBtn.addEventListener('click', doSearch);
  searchInput.addEventListener('keydown', e => { if(e.key==='Enter') doSearch(); });
  locInput.addEventListener('keydown',    e => { if(e.key==='Enter') doSearch(); });

  // Time tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.timeHours = parseInt(tab.dataset.hours);
      // Re-filter without new API call if we have data
      if (state.jobs.length || jobList.querySelectorAll('.job-card').length) {
        fetchJobs();
      }
    });
  });

  // Alert toggle
  alertToggle.addEventListener('click', () => {
    alertPanel.removeAttribute('hidden');
    renderActiveAlerts();
  });
  $('closeAlert').addEventListener('click', () => alertPanel.setAttribute('hidden',''));

  // Save alert
  $('saveAlert').addEventListener('click', saveAlert);

  // Open full app
  $('openApp').addEventListener('click', () => chrome.tabs?.create({ url:'http://127.0.0.1:5500/frontend/' }));
  $('openFull').addEventListener('click', () => chrome.tabs?.create({ url:'http://127.0.0.1:5500/frontend/' }));
}

function doSearch() {
  state.query    = searchInput.value.trim();
  state.location = locInput.value.trim();
  fetchJobs();
}

function saveAlert() {
  const keyword  = $('alertKeyword').value.trim();
  const location = $('alertLocation').value.trim();
  const freq     = parseInt($('alertFreq').value);
  if (!keyword) { toast('Enter a keyword first'); return; }

  chrome.storage?.local.get(['alerts'], data => {
    const alerts = data.alerts || [];
    alerts.push({ keyword, location, freqMinutes: freq, createdAt: Date.now() });
    chrome.storage?.local.set({ alerts }, () => {
      // Set alarm
      chrome.alarms?.create(`job_alert_${Date.now()}`, { periodInMinutes: freq });
      $('alertKeyword').value = '';
      $('alertLocation').value = '';
      renderActiveAlerts();
      toast('🔔 Alert enabled!');
    });
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function toast(msg, duration=2200) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    el.addEventListener('animationend', () => el.remove(), {once:true});
  }, duration);
}