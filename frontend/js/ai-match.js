// ════════════════════════════════════════════════════════
//  frontend/js/ai-match.js — REPLACE existing file
//  Semantic Resume Match — title+tags focused scoring
//  Fixes: snippet pollution, wrong high scores
// ════════════════════════════════════════════════════════

const AIMatch = (() => {

  let userProfile  = null;
  let useModel     = null;
  let modelLoading = false;
  let modelReady   = false;

  // ── Load TF.js + USE model (lazy) ────────────────────────────────────────
  async function loadModel() {
    if (modelReady)   return true;
    if (modelLoading) {
      while (modelLoading) await sleep(200);
      return modelReady;
    }
    modelLoading = true;
    setStatus('⏳ Loading AI model (first time ~5s)...', 'info');
    try {
      await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.10.0/dist/tf.min.js');
      await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/universal-sentence-encoder@1.3.3/dist/universal-sentence-encoder.min.js');
      setStatus('⏳ Initialising semantic model...', 'info');
      useModel     = await use.load();
      modelReady   = true;
      modelLoading = false;
      return true;
    } catch (err) {
      modelLoading = false;
      console.warn('[AIMatch] Model failed, using keywords:', err.message);
      return false;
    }
  }

  function loadScript(src) {
    return new Promise((res, rej) => {
      if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
      const s = document.createElement('script');
      s.src = src; s.onload = res;
      s.onerror = () => rej(new Error(`Failed: ${src}`));
      document.head.appendChild(s);
    });
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // ── Build job text: title + tags + level ONLY (no snippet!) ──────────────
  // This prevents "Backend Engineer" from scoring high just because
  // its description mentions "machine learning tools" somewhere
  function jobToText(job) {
    const parts = [
      job.title || '',                              // most important
      job.title || '',                              // doubled for weight
      (job.tags        || []).join(' '),
      (job.categories  || []).join(' '),
      (job.levels      || []).join(' '),
      job.type || '',
    ];
    return parts.filter(Boolean).join('. ').toLowerCase();
  }

  // ── Build resume summary: extract ONLY skills + role titles ──────────────
  // We don't embed the full resume (addresses, dates, "worked at X company"
  // all add noise). We extract a focused skills+role summary.
  const SKILL_LIST = [
    'python','javascript','typescript','java','c++','c#','golang','go','rust','php','ruby','swift','kotlin','scala','r',
    'react','vue','angular','nextjs','svelte','html','css','tailwind','bootstrap','redux','graphql','webpack',
    'node','nodejs','express','django','flask','fastapi','spring','laravel','nestjs',
    'android','ios','flutter','react native',
    'sql','mysql','postgresql','mongodb','redis','firebase','dynamodb','elasticsearch',
    'aws','azure','gcp','docker','kubernetes','terraform','jenkins','git','linux','ci/cd',
    'machine learning','deep learning','neural network','tensorflow','pytorch','keras','scikit-learn',
    'pandas','numpy','scipy','matplotlib','nlp','computer vision','llm','generative ai','reinforcement learning',
    'data science','data analysis','data engineering','etl','spark','hadoop','tableau','power bi',
    'figma','rest api','microservices','agile','scrum','system design','algorithms','data structures',
    'selenium','cypress','jest','junit','testing','qa','automation',
    'blockchain','web3','solidity',
    // Role titles
    'software engineer','software developer','frontend developer','backend developer',
    'full stack developer','fullstack developer','full stack engineer',
    'data scientist','data engineer','data analyst','ml engineer','machine learning engineer',
    'ai engineer','devops engineer','cloud engineer','mobile developer',
    'product manager','ui designer','ux designer','tech lead','engineering manager',
    'android developer','ios developer','security engineer','qa engineer',
  ];

  function buildResumeSummary(rawText) {
    const lower = rawText.toLowerCase();
    // Extract matched skills and titles
    const found = SKILL_LIST.filter(s => lower.includes(s));
    if (found.length === 0) {
      // Fallback: use first 300 chars (user pasted just a brief summary)
      return rawText.slice(0, 300);
    }
    // Build a focused summary: "Skills: X, Y, Z. Role: A, B"
    const skills = found.filter(s => !s.includes(' engineer') && !s.includes(' developer') && !s.includes(' manager') && !s.includes(' designer') && !s.includes(' analyst') && !s.includes(' scientist') && !s.includes(' lead'));
    const roles  = found.filter(s => !skills.includes(s));
    let summary  = '';
    if (roles.length)  summary += `Role: ${roles.slice(0,5).join(', ')}. `;
    if (skills.length) summary += `Skills: ${skills.slice(0,20).join(', ')}.`;
    return summary || rawText.slice(0, 300);
  }

  // ── Cosine similarity ─────────────────────────────────────────────────────
  function cosineSim(a, b) {
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot  += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    if (!magA || !magB) return 0;
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
  }

  // ── Semantic scoring ──────────────────────────────────────────────────────
  async function semanticScore(resumeSummary, jobs) {
    const jobTexts   = jobs.map(j => jobToText(j));
    const allTexts   = [resumeSummary, ...jobTexts];
    const embeddings = await useModel.embed(allTexts);
    const matrix     = await embeddings.array();
    embeddings.dispose();

    const resumeVec = matrix[0];
    const scores    = {};

    jobs.forEach((job, i) => {
      const sim    = cosineSim(resumeVec, matrix[i + 1]); // 0 to 1
      // sim for unrelated jobs is typically 0.2-0.4, good matches 0.6-0.85
      // Rescale: treat 0.3 as 0%, 0.9 as 100%
      const rescaled = Math.max(0, (sim - 0.30) / (0.90 - 0.30));
      let score = Math.round(rescaled * 100);
      // Freshness bonus
      if (job.isRecent)        score += 4;
      else if (job.isWithin48h) score += 2;
      scores[job.id] = Math.min(99, Math.max(3, score));
    });

    return scores;
  }

  // ── Keyword fallback ──────────────────────────────────────────────────────
  function keywordScore(resumeText, job) {
    const lower   = resumeText.toLowerCase();
    const jText   = jobToText(job); // title+tags only, no snippet
    const matched = SKILL_LIST.filter(s => lower.includes(s));
    let score = 0, max = 0, hits = 0;
    matched.forEach(s => {
      max += 40;
      if (jText.includes(s)) { score += 40; hits++; }
    });
    if (hits >= 3) score += 20;
    if (job.isRecent) score += 6;
    if (max === 0) return 30;
    return Math.min(99, Math.max(3, Math.round((score / max) * 95)));
  }

  // ── Badge injection ───────────────────────────────────────────────────────
  function getTier(s) {
    if (s >= 75) return 'match-excellent';
    if (s >= 55) return 'match-good';
    if (s >= 35) return 'match-ok';
    return 'match-low';
  }

  function getLabel(s) {
    if (s >= 75) return 'Strong semantic match';
    if (s >= 55) return 'Good fit';
    if (s >= 35) return 'Partial match';
    return 'Low relevance';
  }

  function injectBadges(scores) {
    Object.entries(scores).forEach(([id, score]) => {
      const card = document.querySelector(`.job-card[data-job-id="${id}"]`);
      if (!card) return;
      card.querySelector('.ai-match-badge')?.remove();
      const b = document.createElement('div');
      b.className = `ai-match-badge ${getTier(score)}`;
      b.title     = `${score}% — ${getLabel(score)}`;
      b.innerHTML = `<span class="ai-match-icon">✦</span><span class="ai-match-score">${score}%</span><span class="ai-match-label">fit</span>`;
      const src = card.querySelector('.card-source-badge');
      if (src) src.after(b); else card.prepend(b);
      card.classList.toggle('ai-top-match', score >= 75);
    });
  }

  function clearBadges() {
    document.querySelectorAll('.ai-match-badge').forEach(b => b.remove());
    document.querySelectorAll('.ai-top-match').forEach(c => c.classList.remove('ai-top-match'));
  }

  // ── Status helpers ────────────────────────────────────────────────────────
  function setStatus(msg, type) {
    const el = document.getElementById('resumeStatusMain');
    if (!el) return;
    el.textContent = msg;
    el.className   = `resume-status-main resume-status-${type}`;
    el.removeAttribute('hidden');
  }

  function setLoadedBar(label, detail) {
    document.getElementById('resumeLoadedBar')?.removeAttribute('hidden');
    const info = document.getElementById('resumeLoadedInfo');
    if (info) info.textContent = `✅ ${label} · ${detail}`;
    document.getElementById('resumeLoadedDot')?.removeAttribute('hidden');
  }

  function clearLoaded() {
    document.getElementById('resumeLoadedBar')?.setAttribute('hidden','');
    document.getElementById('resumeLoadedDot')?.setAttribute('hidden','');
    const pa = document.getElementById('resumePasteInput');
    if (pa) pa.value = '';
    document.getElementById('resumeStatusMain')?.setAttribute('hidden','');
    userProfile = null;
    clearBadges();
  }

  // ── Analyse resume ────────────────────────────────────────────────────────
  async function analyse(text, fileName) {
    const btn = document.getElementById('resumeAnalyseBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner" style="animation:spin 1s linear infinite"></i> Loading AI...'; }

    const semantic      = await loadModel();
    const resumeSummary = buildResumeSummary(text);

    if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner" style="animation:spin 1s linear infinite"></i> Scoring...';

    userProfile = { text, summary: resumeSummary };

    const jobs   = window._recrunexJobs || [];
    let scores   = {};
    let method   = 'keyword';

    if (semantic && jobs.length > 0) {
      try {
        setStatus('🧠 Running semantic analysis...', 'info');
        scores = await semanticScore(resumeSummary, jobs);
        method = 'semantic';
      } catch (err) {
        console.warn('[AIMatch] Semantic failed:', err.message);
        jobs.forEach(j => { scores[j.id] = keywordScore(text, j); });
      }
    } else if (jobs.length > 0) {
      jobs.forEach(j => { scores[j.id] = keywordScore(text, j); });
    }

    injectBadges(scores);

    const great = Object.values(scores).filter(s => s >= 75).length;
    const good  = Object.values(scores).filter(s => s >= 55 && s < 75).length;
    const total = Object.keys(scores).length;
    const modeLabel = method === 'semantic' ? '🧠 Semantic AI' : '🔤 Keyword';

    const skillCount = SKILL_LIST.filter(s => text.toLowerCase().includes(s)).length;
    setLoadedBar(fileName, `${skillCount} skills · ${modeLabel}`);

    if (total > 0) {
      setStatus(`${modeLabel} · ✦ ${great} strong · ${good} good fits of ${total} jobs`, 'success');
    } else {
      setStatus('✅ Resume loaded! Search for jobs to see scores.', 'success');
    }

    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Re-analyse'; }
    document.getElementById('resumeClearBtn')?.removeAttribute('hidden');

    setTimeout(closeModal, 1400);
  }

  // ── File reading ──────────────────────────────────────────────────────────
  function readFile(file) {
    return new Promise((resolve, reject) => {
      const ext = file.name.split('.').pop().toLowerCase();
      if (ext === 'txt') {
        const r = new FileReader();
        r.onload = e => resolve(e.target.result);
        r.onerror = () => reject(new Error('Could not read file'));
        r.readAsText(file); return;
      }
      if (ext === 'pdf') {
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js').then(() => {
          pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          const r = new FileReader();
          r.onload = async e => {
            try {
              const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(e.target.result) }).promise;
              let text = '';
              for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const c    = await page.getTextContent();
                text += c.items.map(it => it.str).join(' ') + '\n';
              }
              resolve(text);
            } catch (err) { reject(err); }
          };
          r.readAsArrayBuffer(file);
        }).catch(reject); return;
      }
      if (ext === 'doc' || ext === 'docx') {
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js').then(() => {
          const r = new FileReader();
          r.onload = async e => {
            try {
              const result = await mammoth.extractRawText({ arrayBuffer: e.target.result });
              resolve(result.value);
            } catch (err) { reject(err); }
          };
          r.readAsArrayBuffer(file);
        }).catch(reject); return;
      }
      reject(new Error('Unsupported file. Use PDF, DOCX or TXT.'));
    });
  }

  // ── Modal ─────────────────────────────────────────────────────────────────
  function openModal() {
    const overlay = document.getElementById('resumeModalOverlay');
    const modal   = document.getElementById('resumeModal');
    if (!modal) { console.error('[AIMatch] resumeModal not found'); return; }
    overlay?.classList.add('visible');
    modal.removeAttribute('hidden');
    requestAnimationFrame(() => requestAnimationFrame(() => modal.classList.add('visible')));
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    const modal = document.getElementById('resumeModal');
    if (!modal) return;
    modal.classList.remove('visible');
    setTimeout(() => {
      document.getElementById('resumeModalOverlay')?.classList.remove('visible');
      modal.setAttribute('hidden', '');
      document.body.style.overflow = '';
    }, 320);
  }

  // ── Events ────────────────────────────────────────────────────────────────
  function initEvents() {
    document.getElementById('resumeNavBtn')?.addEventListener('click', openModal);
    document.getElementById('resumeModalClose')?.addEventListener('click', closeModal);
    document.getElementById('resumeModalOverlay')?.addEventListener('click', closeModal);

    document.getElementById('resumeUploadBtn')?.addEventListener('click', () =>
      document.getElementById('resumeFileInput')?.click()
    );
    document.getElementById('resumeFileInput')?.addEventListener('change', e => {
      if (e.target.files[0]) handleFile(e.target.files[0]);
    });

    const zone = document.getElementById('resumeUploadZone');
    if (zone) {
      zone.addEventListener('dragover',  e => { e.preventDefault(); zone.classList.add('drag-over'); });
      zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
      zone.addEventListener('drop', e => {
        e.preventDefault(); zone.classList.remove('drag-over');
        if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
      });
    }

    document.getElementById('resumeAnalyseBtn')?.addEventListener('click', () => {
      const text = document.getElementById('resumePasteInput')?.value.trim();
      if (!text || text.length < 30) { setStatus('⚠️ Paste more resume content first.', 'warn'); return; }
      analyse(text, 'Pasted Resume');
    });

    document.getElementById('resumeRemoveBtn')?.addEventListener('click', () => {
      clearLoaded(); closeModal();
      if (typeof UI !== 'undefined') UI.toast('Resume removed', 'info');
    });
  }

  async function handleFile(file) {
    if (file.size > 5 * 1024 * 1024) { setStatus('⚠️ File too large (max 5MB)', 'warn'); return; }
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf','doc','docx','txt'].includes(ext)) {
      setStatus('⚠️ Only PDF, DOCX or TXT supported', 'warn'); return;
    }
    setStatus(`📂 Reading ${file.name}...`, 'info');
    const t = document.querySelector('.upload-zone-title');
    if (t) t.textContent = `📄 ${file.name}`;
    try {
      const text = await readFile(file);
      if (!text || text.trim().length < 20) {
        setStatus('⚠️ Could not extract text. Try pasting instead.', 'warn'); return;
      }
      const pa = document.getElementById('resumePasteInput');
      if (pa) pa.value = text.slice(0, 3000);
      await analyse(text, file.name);
    } catch (err) {
      setStatus(`⚠️ ${err.message}. Try pasting instead.`, 'warn');
    }
  }

  // ── Called from app.js after search ──────────────────────────────────────
  async function run(query, jobs) {
    window._recrunexJobs = jobs;
    if (!userProfile) { clearBadges(); return; }

    let scores = {};
    if (modelReady && jobs.length > 0) {
      try {
        scores = await semanticScore(userProfile.summary, jobs);
      } catch {
        jobs.forEach(j => { scores[j.id] = keywordScore(userProfile.text, j); });
      }
    } else {
      jobs.forEach(j => { scores[j.id] = keywordScore(userProfile.text, j); });
    }
    injectBadges(scores);
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEvents);
  } else {
    initEvents();
  }

  return { run };
})();