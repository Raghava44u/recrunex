const UI = (() => {
  function esc(s) {
    if (s == null) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function toast(msg, type = 'info', duration = 3000) {
    const c = document.getElementById('toastContainer');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    const icons = { success:'✅', error:'❌', info:'ℹ️' };
    el.innerHTML = `<span>${icons[type]||'ℹ️'}</span> ${msg}`;
    c.appendChild(el);
    setTimeout(() => { el.classList.add('fadeout'); el.addEventListener('animationend', () => el.remove(), {once:true}); }, duration);
  }

  function renderSkeletons(container, count = 6) {
    container.innerHTML = Array.from({length:count}, (_,i) => `
      <div class="skeleton-card" style="animation-delay:${i*60}ms">
        <div class="sk-header">
          <div class="skeleton sk-logo"></div>
          <div class="sk-header-meta">
            <div class="skeleton sk-line" style="width:50%"></div>
            <div class="skeleton sk-title" style="width:78%"></div>
          </div>
        </div>
        <div class="sk-info">
          <div class="skeleton sk-info-item" style="width:75px"></div>
          <div class="skeleton sk-info-item" style="width:55px"></div>
        </div>
        <div class="sk-tags">
          <div class="skeleton sk-tag" style="width:62px"></div>
          <div class="skeleton sk-tag" style="width:48px"></div>
        </div>
        <div class="skeleton sk-footer"></div>
      </div>
    `).join('');
  }

  function srcClass(source) {
    if (!source) return '';
    if (/muse/i.test(source))     return 'muse';
    if (/remotive/i.test(source)) return 'remotive';
    if (/adzuna/i.test(source))   return 'adzuna';
    if (/jooble/i.test(source))   return 'jooble';
    return '';
  }

  function initials(company) {
    return (company||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  }

  function renderJobCard(job, index = 0) {
    const isSaved = Storage.isJobSaved(job.id);
    const ini = initials(job.company);
    const sc = srcClass(job.source);
    const freshClass = job.isRecent ? 'is-fresh' : '';

    return `
      <article class="job-card ${freshClass}" data-job-id="${esc(String(job.id))}"
        style="animation-delay:${index*45}ms" role="button" tabindex="0">

        <span class="card-source-badge ${sc}">${esc(job.source)}</span>

        <div class="job-card-header">
          <div class="company-logo-wrap">
            ${job.companyLogo
              ? `<img src="${esc(job.companyLogo)}" alt="${esc(job.company)}" loading="lazy" onerror="this.parentNode.innerHTML='${ini}'" />`
              : ini}
          </div>
          <div class="card-header-meta">
            <div class="card-company">${esc(job.company)}</div>
            <h3 class="card-title">${esc(job.title)}</h3>
          </div>
        </div>

        <div class="job-card-body">
          <div class="card-info">
            <span class="card-info-item"><i class="fa-solid fa-location-dot"></i>${esc(job.primaryLocation)}</span>
            ${job.type && job.type !== 'Unknown' ? `<span class="card-info-item"><i class="fa-solid fa-briefcase"></i>${esc(job.type)}</span>` : ''}
            ${job.levels?.length ? `<span class="card-info-item"><i class="fa-solid fa-chart-line"></i>${esc(job.levels[0])}</span>` : ''}
          </div>
          ${job.salary ? `<div class="card-salary"><i class="fa-solid fa-indian-rupee-sign"></i>${esc(job.salary)}</div>` : ''}
          ${job.snippet ? `<p class="job-snippet">${esc(job.snippet)}</p>` : ''}
          ${job.tags?.length ? `<div class="job-tags">${job.tags.slice(0,3).map(t=>`<span class="job-tag">${esc(t)}</span>`).join('')}</div>` : ''}
        </div>

        <div class="job-card-footer">
          <div class="card-time-wrap">
            <span class="card-time"><i class="fa-regular fa-clock"></i>${esc(job.postedAgo)}</span>
            ${job.isRecent ? '<span class="card-fresh-tag">🔥 New</span>' : ''}
          </div>
          <div class="card-actions">
            <button class="save-btn ${isSaved?'saved':''}" data-job-id="${esc(String(job.id))}" title="${isSaved?'Remove':'Save'}">
              <i class="fa-${isSaved?'solid':'regular'} fa-bookmark"></i>
            </button>
            <a href="${esc(job.applyUrl)}" target="_blank" rel="noopener noreferrer" class="apply-btn" onclick="event.stopPropagation()">
              Apply <i class="fa-solid fa-arrow-up-right-from-square"></i>
            </a>
          </div>
        </div>
      </article>
    `;
  }

  function renderSavedJobCard(job) {
    const ini = initials(job.company);
    return `
      <div class="saved-job-card" data-job-id="${esc(String(job.id))}">
        <div class="saved-job-logo">
          ${job.companyLogo ? `<img src="${esc(job.companyLogo)}" alt="${esc(job.company)}" onerror="this.parentNode.innerHTML='${ini}'" />` : ini}
        </div>
        <div class="saved-job-meta">
          <div class="saved-job-title">${esc(job.title)}</div>
          <div class="saved-job-company">${esc(job.company)} · ${esc(job.primaryLocation)}</div>
        </div>
        <button class="unsave-btn" data-job-id="${esc(String(job.id))}" title="Remove"><i class="fa-solid fa-xmark"></i></button>
      </div>
    `;
  }

  function renderJobModal(job) {
    const isSaved = Storage.isJobSaved(job.id);
    const ini = initials(job.company);
    const sc = srcClass(job.source);
    const tags = [...(job.categories||[]), ...(job.levels||[])].filter(Boolean);
    const desc = (job.fullDescription || job.snippet || '').replace(/\n{3,}/g, '\n\n').trim();

    return `
      <div class="modal-job-hero">
        <div class="modal-job-top">
          <div class="modal-logo">
            ${job.companyLogo ? `<img src="${esc(job.companyLogo)}" alt="${esc(job.company)}" onerror="this.parentNode.innerHTML='${ini}'" />` : ini}
          </div>
          <div style="flex:1;min-width:0">
            <h2 class="modal-job-title">${esc(job.title)}</h2>
            <p class="modal-job-company">${esc(job.company)}</p>
            <div class="modal-badges">
              ${job.isRecent ? '<span class="modal-badge fresh">🔥 Posted today</span>' : ''}
              <span class="modal-badge src-${sc}">${esc(job.source)}</span>
              ${job.remote ? '<span class="modal-badge">🌍 Remote</span>' : ''}
            </div>
          </div>
        </div>
        <div class="modal-meta-grid">
          <div class="modal-meta-item"><span class="modal-meta-label">📍 Location</span><span class="modal-meta-value">${esc(job.primaryLocation)}</span></div>
          <div class="modal-meta-item"><span class="modal-meta-label">🕐 Posted</span><span class="modal-meta-value">${esc(job.postedAgo)}</span></div>
          ${job.type && job.type!=='Unknown' ? `<div class="modal-meta-item"><span class="modal-meta-label">💼 Type</span><span class="modal-meta-value">${esc(job.type)}</span></div>` : ''}
          ${job.levels?.length ? `<div class="modal-meta-item"><span class="modal-meta-label">📊 Level</span><span class="modal-meta-value">${esc(job.levels.join(', '))}</span></div>` : ''}
          ${job.salary ? `<div class="modal-meta-item"><span class="modal-meta-label">💰 Salary</span><span class="modal-meta-value salary">${esc(job.salary)}</span></div>` : ''}
        </div>
      </div>

      <div class="modal-actions">
        <a href="${esc(job.applyUrl)}" target="_blank" rel="noopener noreferrer" class="modal-apply-btn">
          <i class="fa-solid fa-paper-plane"></i> Apply Now
        </a>
        <button class="modal-save-btn ${isSaved?'saved':''}" id="modalSaveBtn" data-job-id="${esc(String(job.id))}">
          <i class="fa-${isSaved?'solid':'regular'} fa-bookmark"></i> ${isSaved?'Saved':'Save'}
        </button>
      </div>

      ${tags.length ? `<div class="modal-section"><p class="modal-section-title"><i class="fa-solid fa-tags"></i> Tags</p><div class="modal-tags">${tags.map(t=>`<span class="modal-tag">${esc(t)}</span>`).join('')}</div></div>` : ''}

      <div class="modal-section">
        <p class="modal-section-title"><i class="fa-solid fa-file-lines"></i> Job Description</p>
        ${desc
          ? `<div class="modal-description">${esc(desc)}</div>`
          : `<p style="color:var(--text-muted);font-size:0.84rem;">Full description available on the company site. Click <strong>Apply Now</strong> to view it.</p>`}
      </div>
    `;
  }

  function renderEmptyState(query, location, container) {
    const sub = query
      ? `No results for "${query}"${location ? ` in ${location}` : ''}.`
      : 'No jobs found. Try a different search.';
    const el = document.getElementById('emptySub');
    if (el) el.textContent = sub;
    if (container) {
      container.innerHTML = EMPTY_SUGGESTIONS.map(s =>
        `<button class="suggestion-chip" data-suggestion="${esc(s.label)}">${s.icon} ${esc(s.label)}</button>`
      ).join('');
    }
  }

  return { toast, renderSkeletons, renderJobCard, renderSavedJobCard, renderJobModal, renderEmptyState };
})();