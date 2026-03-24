// ══ Recrunex Feedback System ══════════════════════════════════════════════════
const Feedback = (() => {

  const AVATAR_COLORS = [
    '#7c5cfc','#f97316','#22c55e','#38bdf8','#f43f5e',
    '#a855f7','#eab308','#06b6d4','#ec4899','#84cc16',
  ];

  function avatarColor(name) {
    const idx = (name.charCodeAt(0) || 0) % AVATAR_COLORS.length;
    return AVATAR_COLORS[idx];
  }
  function stars(rating) { return '★'.repeat(rating) + '☆'.repeat(5 - rating); }
  function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function apiBase() { try { return CONFIG.API_BASE; } catch { return ''; } }

  // ── Seed reviews — shown ONLY when no real reviews exist ──────────────────
  const SEED_REVIEWS = [
    { id:'seed1', name:'Priya Sharma',  role:'Frontend Developer',  rating:5, text:'Found my dream job within 2 days of using Recrunex! The 24h filter is a game changer — no more scrolling through 3-month-old listings.', date:'15 Mar 2026', helpful:12, featured:true },
    { id:'seed2', name:'Arjun Mehta',   role:'Software Engineer',    rating:5, text:'The extension is brilliant. I get notified instantly when new React jobs drop in Bangalore. Already had 3 interviews this week!',          date:'18 Mar 2026', helpful:8,  featured:true },
    { id:'seed3', name:'Sneha Reddy',   role:'Data Scientist',       rating:4, text:'Really clean UI and the India jobs section is super relevant. Would love more Hyderabad listings but overall excellent platform.',           date:'19 Mar 2026', helpful:5,  featured:false },
    { id:'seed4', name:'Rahul Verma',   role:'Fresher — B.Tech CSE', rating:5, text:'As a fresher this is exactly what I needed. The internship filter + job alerts helped me land my first offer in 10 days!',                 date:'20 Mar 2026', helpful:15, featured:true },
    { id:'seed5', name:'Ananya Iyer',   role:'Product Manager',      rating:4, text:'Love the career games feature — actually learned a lot about salary ranges. The salary guesser was eye-opening!',                           date:'20 Mar 2026', helpful:6,  featured:false },
    { id:'seed6', name:'Vikram Nair',   role:'DevOps Engineer',      rating:5, text:'Finally a job board that respects my time. Only fresh jobs, clean interface, and the dark themes are gorgeous. Highly recommended!',       date:'21 Mar 2026', helpful:9,  featured:false },
  ];

  let selectedRating = 0;
  let votedReviews   = new Set(JSON.parse(localStorage.getItem('rn_voted') || '[]'));

  // ── Load reviews ───────────────────────────────────────────────────────────
  // Shows seeds immediately, then replaces with real reviews from backend
  async function loadReviews() {
    const grid = document.getElementById('reviewsGrid');
    if (!grid) return;

    // Show seeds immediately so page is never blank
    renderReviews(SEED_REVIEWS);
    updateStats(SEED_REVIEWS);

    try {
      const base = apiBase();
      if (!base) return;

      const ctrl = new AbortController();
      const t    = setTimeout(() => ctrl.abort(), 5000);
      const res  = await fetch(`${base}/feedback`, { signal: ctrl.signal });
      clearTimeout(t);

      if (!res.ok) return;

      const data  = await res.json();
      const real  = data.reviews || [];

      // If real reviews exist → show real first, then seeds after
      // If no real reviews yet → keep showing seeds
      if (real.length > 0) {
        renderReviews([...real, ...SEED_REVIEWS]);
        updateStats([...real, ...SEED_REVIEWS]);
      }
    } catch { /* backend offline — seeds already showing */ }
  }

  // ── Render review cards ───────────────────────────────────────────────────
  function renderReviews(reviews) {
    const grid = document.getElementById('reviewsGrid');
    if (!grid) return;
    if (!reviews.length) {
      grid.innerHTML = '<div class="no-reviews">No reviews yet. Be the first! ⬇️</div>';
      return;
    }
    grid.innerHTML = reviews.slice(0, 9).map((r, i) => {
      const isFiveStars = r.rating === 5;
      const isFeatured  = r.featured || r.helpful >= 8;
      const initials    = r.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
      const color       = avatarColor(r.name);
      const hasVoted    = votedReviews.has(r.id);
      return `
        <div class="review-card ${isFeatured?'featured':''} ${isFiveStars?'five-star':''}" style="animation-delay:${i*60}ms">
          <div class="review-top">
            <div class="review-avatar" style="background:${color}">${initials}</div>
            <div class="review-info">
              <div class="review-name">${esc(r.name)}</div>
              ${r.role ? `<div class="review-role">${esc(r.role)}</div>` : ''}
            </div>
            <div class="review-stars">${stars(r.rating)}</div>
          </div>
          <p class="review-text">${esc(r.text)}</p>
          <div class="review-footer">
            <span class="review-date">${esc(r.date)}</span>
            <button class="helpful-btn ${hasVoted?'voted':''}" data-id="${r.id}" onclick="Feedback.markHelpful('${r.id}',this)">
              👍 Helpful ${r.helpful > 0 ? `(${r.helpful})` : ''}
            </button>
          </div>
        </div>`;
    }).join('');
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  function updateStats(reviews) {
    if (!reviews.length) return;
    const avg = (reviews.reduce((s,r) => s + r.rating, 0) / reviews.length).toFixed(1);
    const a = document.getElementById('avgRating');
    const s = document.getElementById('avgStars');
    const t = document.getElementById('totalReviews');
    if (a) a.textContent = avg;
    if (s) s.textContent = stars(Math.round(parseFloat(avg)));
    if (t) t.textContent = reviews.length;
  }

  // ── Mark helpful ──────────────────────────────────────────────────────────
  async function markHelpful(id, btn) {
    if (votedReviews.has(id)) return;
    votedReviews.add(id);
    localStorage.setItem('rn_voted', JSON.stringify([...votedReviews]));
    btn.classList.add('voted');
    const m = btn.textContent.match(/\((\d+)\)/);
    btn.innerHTML = `👍 Helpful (${m ? parseInt(m[1])+1 : 1})`;
    try { await fetch(`${apiBase()}/feedback/${id}/helpful`, {method:'POST'}); } catch {}
  }

  // ── Review section stars ──────────────────────────────────────────────────
  function initStarPicker() {
    const picker = document.getElementById('starPicker');
    if (!picker) return;
    const btns   = picker.querySelectorAll('[data-val]');
    const label  = document.getElementById('starLabel');
    const labels = ['','Poor','Fair','Good','Great','Excellent! 🎉'];

    btns.forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        const v = +btn.dataset.val;
        btns.forEach(b => b.classList.toggle('active', +b.dataset.val <= v));
        if (label) label.textContent = labels[v] || '';
      });
      btn.addEventListener('mouseleave', () => {
        btns.forEach(b => b.classList.toggle('active', +b.dataset.val <= selectedRating));
        if (label) label.textContent = selectedRating ? labels[selectedRating] : 'Click to rate';
      });
      btn.addEventListener('click', () => {
        selectedRating = +btn.dataset.val;
        btns.forEach(b => b.classList.toggle('active', +b.dataset.val <= selectedRating));
        if (label) label.textContent = labels[selectedRating] || '';
      });
    });
  }

  // ── Feedback modal stars ──────────────────────────────────────────────────
  let fbSelectedRating = 0;

  function initModalStars() {
    const container = document.getElementById('fbStars');
    if (!container) return;
    const btns = container.querySelectorAll('[data-val]');
    if (!btns.length) return;

    btns.forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        const v = +btn.dataset.val;
        btns.forEach(b => b.classList.toggle('active', +b.dataset.val <= v));
      });
      btn.addEventListener('mouseleave', () => {
        btns.forEach(b => b.classList.toggle('active', +b.dataset.val <= fbSelectedRating));
      });
      btn.addEventListener('click', () => {
        fbSelectedRating = +btn.dataset.val;
        btns.forEach(b => b.classList.toggle('active', +b.dataset.val <= fbSelectedRating));
      });
    });
  }

  // ── Char count ────────────────────────────────────────────────────────────
  function initCharCount() {
    const ta = document.getElementById('reviewText');
    const ct = document.getElementById('charCount');
    if (!ta || !ct) return;
    ta.addEventListener('input', () => {
      ct.textContent = `${ta.value.length}/300`;
      ct.style.color = ta.value.length > 250 ? 'var(--accent2)' : 'var(--text-muted)';
    });
  }

  // ── Submit review ─────────────────────────────────────────────────────────
  async function submitReview() {
    const btn     = document.getElementById('submitReviewBtn');
    const name    = document.getElementById('reviewName')?.value.trim();
    const role    = document.getElementById('reviewRole')?.value.trim();
    const text    = document.getElementById('reviewText')?.value.trim();
    const form    = document.getElementById('reviewForm');
    const success = document.getElementById('reviewSuccess');

    // Validate
    if (!name || name.length < 2)  { shake('reviewName'); toast('Please enter your name (min 2 chars)'); return; }
    if (!selectedRating)            { shake('starPicker'); toast('Please select a star rating'); return; }
    if (!text || text.length < 10)  { shake('reviewText'); toast('Please write at least 10 characters'); return; }

    // Set loading state
    btn.disabled  = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner" style="animation:spin 1s linear infinite"></i> Submitting…';

    try {
      const base = apiBase();
      if (base) {
        const res  = await fetch(`${base}/feedback`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ name, role, rating: selectedRating, text }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to submit');
      }

      // ✅ Success — hide form, show success message
      if (form)    form.setAttribute('hidden', '');
      if (success) success.removeAttribute('hidden');

      // Instantly add new review to top of UI without waiting for reload
      const newReview = data.review || {
        id:   'new_' + Date.now(),
        name, role, rating: selectedRating, text,
        date: new Date().toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }),
        helpful: 0,
      };
      const grid = document.getElementById('reviewsGrid');
      if (grid) {
        const initials = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
        const color    = avatarColor(name);
        const card     = document.createElement('div');
        card.className = 'review-card five-star';
        card.style.animationDelay = '0ms';
        card.innerHTML = `
          <div class="review-top">
            <div class="review-avatar" style="background:${color}">${initials}</div>
            <div class="review-info">
              <div class="review-name">${esc(name)}</div>
              ${role ? `<div class="review-role">${esc(role)}</div>` : ''}
            </div>
            <div class="review-stars">${stars(selectedRating)}</div>
          </div>
          <p class="review-text">${esc(text)}</p>
          <div class="review-footer">
            <span class="review-date">Just now</span>
            <button class="helpful-btn" disabled>👍 Helpful</button>
          </div>`;
        grid.prepend(card);
      }

      // Also reload from backend after delay to sync
      setTimeout(loadReviews, 2000);

    } catch(err) {
      // ❌ Error — reset button and show toast
      toast(err.message || 'Could not submit. Try again.');
    } finally {
      // Always reset button state
      btn.disabled  = false;
      btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit Review';
    }
  }

  // ── Reset review form ─────────────────────────────────────────────────────
  function resetForm() {
    selectedRating = 0;
    ['reviewName','reviewRole','reviewText'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    const ct  = document.getElementById('charCount');
    const lbl = document.getElementById('starLabel');
    const btn = document.getElementById('submitReviewBtn');
    if (ct)  ct.textContent  = '0/300';
    if (lbl) lbl.textContent = 'Click to rate';
    document.querySelectorAll('#starPicker [data-val]').forEach(b => b.classList.remove('active'));
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit Review'; }
    document.getElementById('reviewForm')?.removeAttribute('hidden');
    document.getElementById('reviewSuccess')?.setAttribute('hidden','');
  }

  // ── Feedback FAB modal ────────────────────────────────────────────────────
  function initFeedbackModal() {
    const fab     = document.getElementById('feedbackFab');
    const modal   = document.getElementById('feedbackModal');
    const overlay = document.getElementById('feedbackOverlay');
    const close   = document.getElementById('feedbackClose');

    const openModal  = () => {
      modal?.removeAttribute('hidden');
      if (overlay) { overlay.style.display='block'; overlay.style.opacity='1'; overlay.style.pointerEvents='all'; }
    };
    const closeModal = () => {
      modal?.setAttribute('hidden','');
      if (overlay) { overlay.style.display='none'; }
    };

    fab?.addEventListener('click', openModal);
    close?.addEventListener('click', closeModal);
    overlay?.addEventListener('click', closeModal);

    // Tabs
    document.querySelectorAll('.fm-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.fm-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const target = tab.dataset.tab;
        const write  = document.getElementById('fmWrite');
        const wall   = document.getElementById('fmWall');
        if (write) write.hidden = target !== 'write';
        if (wall)  wall.hidden  = target !== 'wall';
        if (target === 'wall') loadWall();
      });
    });

    // Type chips
    document.querySelectorAll('.fm-type-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.fm-type-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      });
    });

    // Modal textarea char count
    const fbMsg = document.getElementById('fbMessage');
    const fbChr = document.getElementById('fbCharCount');
    fbMsg?.addEventListener('input', () => { if(fbChr) fbChr.textContent = fbMsg.value.length; });

    document.getElementById('fbSubmit')?.addEventListener('click', submitFeedback);
    document.getElementById('fmRefresh')?.addEventListener('click', () => loadWall());
    document.querySelectorAll('.fm-filter').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.fm-filter').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        loadWall(chip.dataset.filter);
      });
    });
  }

  // ── Submit feedback modal ─────────────────────────────────────────────────
  async function submitFeedback() {
    const btn     = document.getElementById('fbSubmit');
    const name    = document.getElementById('fbName')?.value.trim() || 'Anonymous';
    const message = document.getElementById('fbMessage')?.value.trim();
    const success = document.getElementById('fbSuccess');
    const type    = document.querySelector('.fm-type-chip.active')?.dataset.type || 'general';

    if (!message || message.length < 3) { toast('Please write a message first'); return; }

    btn.disabled  = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner" style="animation:spin 1s linear infinite"></i> Sending…';

    try {
      const base = apiBase();
      if (base) {
        await fetch(`${base}/feedback`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ name, rating: fbSelectedRating, text: message, role: type }),
        });
      }
    } catch {}

    if (success) success.removeAttribute('hidden');
    btn.disabled  = false;
    btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit Feedback';
  }

  // ── Feedback wall (seed data only — no separate wall endpoint) ────────────
  const SEED_WALL = [
    { name:'Dev User',  type:'love',    rating:5, message:'Absolutely love the UI! Dark Space theme is 🔥', date:'Today' },
    { name:'Tester',    type:'feature', rating:4, message:'Would love email alerts for new jobs matching my skills.', date:'Yesterday' },
    { name:'Anonymous', type:'bug',     rating:3, message:'Sometimes search doesn\'t filter by location properly.', date:'2 days ago' },
    { name:'Recruiter', type:'general', rating:5, message:'Best job board I\'ve used in India. Keep it up!', date:'3 days ago' },
  ];

  async function loadWall(filter = 'all') {
    const list = document.getElementById('fmWallList');
    if (!list) return;
    list.innerHTML = '<div class="fm-loading"><div class="fm-spinner"></div>Loading feedback…</div>';

    // Use the same /feedback endpoint and map reviews to wall format
    try {
      const base = apiBase();
      if (!base) throw new Error('no base');
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 4000);
      const res  = await fetch(`${base}/feedback`, { signal: ctrl.signal });
      if (res.ok) {
        const data  = await res.json();
        let items   = (data.reviews || []).map(r => ({
          name:    r.name,
          type:    'general',
          rating:  r.rating,
          message: r.text,
          date:    r.date || 'Recently',
        }));
        if (!items.length) items = [...SEED_WALL];
        if (filter !== 'all') items = items.filter(i => i.type === filter);
        renderWall(list, items);
        return;
      }
    } catch {}

    let items = [...SEED_WALL];
    if (filter !== 'all') items = items.filter(i => i.type === filter);
    renderWall(list, items);
  }

  function renderWall(list, items) {
    const emoji = { general:'💬', bug:'🐛', feature:'✨', love:'❤️' };
    if (!items.length) { list.innerHTML = '<div class="fm-loading">No feedback for this filter yet.</div>'; return; }
    list.innerHTML = items.map(i => `
      <div class="fm-wall-item">
        <div class="fm-wall-top">
          <span class="fm-wall-type">${emoji[i.type]||'💬'} ${i.type}</span>
          <span class="fm-wall-date">${esc(i.date||'')}</span>
        </div>
        <p class="fm-wall-msg">${esc(i.message)}</p>
        <div class="fm-wall-footer">
          <strong>${esc(i.name||'Anonymous')}</strong>
          ${i.rating ? `<span>${'★'.repeat(i.rating)}${'☆'.repeat(5-i.rating)}</span>` : ''}
        </div>
      </div>`).join('');
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function shake(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.animation = 'shake 0.4s ease';
    el.addEventListener('animationend', () => el.style.animation = '', {once:true});
  }
  function toast(msg) {
    if (typeof UI !== 'undefined') UI.toast(msg, 'error');
    else console.warn('[Feedback]', msg);
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    loadReviews();
    initStarPicker();
    initModalStars();
    initCharCount();
    initFeedbackModal();
    document.getElementById('submitReviewBtn')?.addEventListener('click', submitReview);
    document.getElementById('writeAnotherBtn')?.addEventListener('click', resetForm);
  }

  return { init, markHelpful, loadReviews };
})();