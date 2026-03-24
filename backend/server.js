require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { query, validationResult } = require('express-validator');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Cache ──────────────────────────────────────────────────────────────────────
const cache = new Map();
const CACHE_TTL = 7 * 60 * 1000;
function ck(...args) { return args.map(a => String(a||'').toLowerCase().trim()).join('::'); }
function fromCache(key) {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() - e.ts > CACHE_TTL) { cache.delete(key); return null; }
  return e.data;
}
function toCache(key, data) {
  if (cache.size > 300) cache.delete(cache.keys().next().value);
  cache.set(key, { data, ts: Date.now() });
}

// ── Security ───────────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
const ORIGINS = [
  'http://localhost:5500','http://127.0.0.1:5500',
  'http://localhost:5501','http://127.0.0.1:5501',
  'http://localhost:3000','http://127.0.0.1:3000',
  'http://localhost:3001','http://127.0.0.1:3001',
  'http://localhost:8080','http://127.0.0.1:8080','null',
];
// Dev-friendly CORS: allow all localhost/127 origins + null (file://)
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // same-origin or server-to-server
    if (
      ORIGINS.includes(origin) ||
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
    ) return cb(null, true);
    console.warn('[CORS blocked]', origin);
    return cb(null, true); // TEMP: allow all during dev
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  optionsSuccessStatus: 200,
}));
app.use(express.json({ limit:'10kb' }));
app.use('/api', rateLimit({ windowMs:15*60*1000, max:200, standardHeaders:true, legacyHeaders:false }));
const searchLim = rateLimit({ windowMs:60*1000, max:60 });

// ── Helpers ────────────────────────────────────────────────────────────────────
const san = s => s ? String(s).replace(/[<>'"`;]/g,'').trim().slice(0,100) : '';
function timeAgo(d) {
  if (!d) return 'Unknown';
  const diff = Date.now() - new Date(d).getTime();
  const m=Math.floor(diff/60000), h=Math.floor(diff/3600000), dy=Math.floor(diff/86400000);
  if (m<1) return 'Just now';
  if (m<60) return `${m}m ago`;
  if (h<24) return `${h}h ago`;
  if (dy===1) return 'Yesterday';
  return `${dy}d ago`;
}
const within24h = d => !!d && (Date.now()-new Date(d).getTime() < 86400000);
const withinNh  = (d,n) => !!d && (Date.now()-new Date(d).getTime() < n*3600000);
const strip     = h => (h||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const safe      = s => (typeof s === 'string' && s.trim()) ? s.trim() : '';

// Normalise a raw job object — guarantees every field is a safe type
function norm(j) {
  const title   = safe(j.title)   || 'Untitled Position';
  const company = safe(j.company) || 'Unknown Company';
  const source  = safe(j.source)  || 'Unknown';
  const type    = safe(j.type)    || 'Full-time';
  const levels  = Array.isArray(j.levels)     ? j.levels.filter(Boolean)     : [];
  const tags    = Array.isArray(j.tags)       ? j.tags.filter(Boolean)       : [];
  const cats    = Array.isArray(j.categories) ? j.categories.filter(Boolean) : [];
  const locs    = Array.isArray(j.locations)  ? j.locations.filter(Boolean)  : [];
  const pubDate = j.publicationDate || null;
  return {
    id:             String(j.id || Math.random()),
    title,
    company,
    companyLogo:    j.companyLogo  || null,
    primaryLocation:safe(j.primaryLocation) || 'Remote',
    locations:      locs,
    categories:     cats,
    levels,
    type,
    publicationDate:pubDate,
    postedAgo:      timeAgo(pubDate),
    isRecent:       within24h(pubDate),
    isWithin48h:    withinNh(pubDate, 48),
    applyUrl:       safe(j.applyUrl) || '#',
    tags,
    snippet:        safe(j.snippet)         || '',
    fullDescription:safe(j.fullDescription) || '',
    source,
    salary:         j.salary  || null,
    remote:         !!j.remote,
  };
}

// ── API Fetchers ───────────────────────────────────────────────────────────────

async function fetchMuse(q, loc, page, level) {
  try {
    const params = { page, descending: true, api_key: process.env.MUSE_API_KEY };
    if (q)     params.query    = q;
    if (loc)   params.location = loc;
    if (level) params.level    = level;
    const r = await axios.get('https://www.themuse.com/api/public/jobs', { params, timeout: 9000 });
    const jobs = (r.data.results || []).map(j => norm({
      id:              `muse_${j.id}`,
      title:           j.name,
      company:         j.company?.name,
      companyLogo:     j.company?.name ? `https://logo.clearbit.com/${j.company.name.toLowerCase().replace(/[^a-z0-9]/g,'')}.com` : null,
      primaryLocation: j.locations?.[0]?.name,
      locations:       (j.locations||[]).map(l=>l.name),
      categories:      (j.categories||[]).map(c=>c.name),
      levels:          (j.levels||[]).map(l=>l.name),
      type:            j.type,
      publicationDate: j.publication_date,
      applyUrl:        j.refs?.landing_page,
      tags:            [...(j.categories||[]).map(c=>c.name), ...(j.levels||[]).map(l=>l.name)].slice(0,4),
      snippet:         j.contents ? strip(j.contents).slice(0,220) : '',
      fullDescription: j.contents ? strip(j.contents) : '',
      source:          'The Muse',
    }));
    return { jobs, total: r.data.total||0, pageCount: r.data.page_count||1 };
  } catch(e) {
    console.error('[Muse]', e.message);
    return { jobs:[], total:0, pageCount:1 };
  }
}

async function fetchRemotive(q) {
  try {
    const params = { limit: 20 };
    if (q) params.search = q;
    const r = await axios.get('https://remotive.com/api/remote-jobs', { params, timeout: 9000 });
    const jobs = (r.data?.jobs || []).slice(0,20).map(j => norm({
      id:              `remotive_${j.id}`,
      title:           j.title,
      company:         j.company_name,
      companyLogo:     j.company_logo,
      primaryLocation: 'Remote 🌍',
      locations:       ['Remote'],
      categories:      [j.category].filter(Boolean),
      levels:          [],
      type:            j.job_type,
      publicationDate: j.publication_date,
      applyUrl:        j.url,
      tags:            [j.category, j.job_type].filter(Boolean),
      snippet:         strip(j.description||'').slice(0,220),
      fullDescription: strip(j.description||''),
      source:          'Remotive',
      remote:          true,
      salary:          j.salary || null,
    }));
    return { jobs, total: jobs.length, pageCount: 1 };
  } catch(e) {
    console.error('[Remotive]', e.message);
    return { jobs:[], total:0, pageCount:1 };
  }
}

async function fetchAdzuna(q, loc, page) {
  try {
    const appId  = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_APP_KEY;
    if (!appId || !appKey) return { jobs:[], total:0, pageCount:1 };
    const r = await axios.get(`https://api.adzuna.com/v1/api/jobs/in/search/${(page||0)+1}`, {
      params: { app_id:appId, app_key:appKey, results_per_page:10, what:q||'developer', where:loc||'india', sort_by:'date' },
      timeout: 9000,
    });
    const jobs = (r.data?.results||[]).map(j => norm({
      id:              `adzuna_${j.id}`,
      title:           j.title,
      company:         j.company?.display_name,
      primaryLocation: j.location?.display_name || loc || 'India',
      locations:       [j.location?.display_name || 'India'],
      categories:      [j.category?.label].filter(Boolean),
      levels:          [],
      type:            j.contract_time === 'part_time' ? 'Part-time' : 'Full-time',
      publicationDate: j.created,
      applyUrl:        j.redirect_url,
      tags:            [j.category?.label].filter(Boolean),
      snippet:         strip(j.description||'').slice(0,220),
      fullDescription: strip(j.description||''),
      source:          'Adzuna India',
      salary:          j.salary_min ? `₹${Math.round(j.salary_min/100000)}L–₹${Math.round((j.salary_max||j.salary_min*1.3)/100000)}L` : null,
    }));
    const total = r.data?.count || jobs.length;
    return { jobs, total, pageCount: Math.ceil(total/10) };
  } catch(e) {
    console.error('[Adzuna]', e.message);
    return { jobs:[], total:0, pageCount:1 };
  }
}

// ── Jobs Endpoint ──────────────────────────────────────────────────────────────
app.get('/api/jobs', searchLim,
  [
    query('query').optional().isString().isLength({max:100}),
    query('location').optional().isString().isLength({max:100}),
    query('page').optional().isInt({min:0,max:100}).toInt(),
    query('level').optional().isString().isLength({max:50}),
    query('source').optional().isString().isLength({max:30}),
    query('remote').optional().isString(),
  ],
  async (req, res) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error:'Invalid params' });

    const q          = san(req.query.query);
    const loc        = san(req.query.location);
    const page       = parseInt(req.query.page)||0;
    const level      = san(req.query.level);
    const src        = san(req.query.source);   // 'muse' | 'remotive' | 'adzuna' | 'all' | ''
    const remoteOnly = req.query.remote === 'true';

    const cacheKey = ck(q, loc, page, level, src, remoteOnly);
    const hit = fromCache(cacheKey);
    if (hit) return res.json({ ...hit, fromCache: true });

    try {
      // Decide which sources to call based on source filter
      const wantMuse     = !src || src === 'all' || src === 'muse';
      const wantRemotive = !src || src === 'all' || src === 'remotive';
      const isIndia      = /india|delhi|mumbai|bangalore|bengaluru|hyderabad|chennai|pune|kolkata|noida|gurugram|gurgaon/i.test((loc+' '+q).trim());
      const wantAdzuna   = src === 'adzuna' || (!src || src === 'all') && isIndia;

      const fetches = [];
      if (wantMuse)     fetches.push(fetchMuse(q, loc, page, level));
      if (wantRemotive) fetches.push(fetchRemotive(q));
      if (wantAdzuna)   fetches.push(fetchAdzuna(q, loc, page));

      const settled = await Promise.allSettled(fetches);
      let all = [], total = 0, pageCount = 1;
      settled.forEach(r => {
        if (r.status === 'fulfilled') {
          all = all.concat(r.value.jobs || []);
          total += r.value.total || 0;
          pageCount = Math.max(pageCount, r.value.pageCount || 1);
        }
      });

      // Safe source filter (double-check after merge)
      if (src && src !== 'all') {
        all = all.filter(j => j.source && j.source.toLowerCase().includes(src.toLowerCase()));
      }

      // Remote filter
      if (remoteOnly) {
        all = all.filter(j => j.remote || /remote/i.test(j.primaryLocation||''));
      }

      // Sort by date descending (most recent first)
      all.sort((a, b) => {
        const da = a.publicationDate ? new Date(a.publicationDate).getTime() : 0;
        const db = b.publicationDate ? new Date(b.publicationDate).getTime() : 0;
        return db - da;
      });

      // Deduplicate by title+company
      const seen = new Set();
      all = all.filter(j => {
        const k = `${j.title.toLowerCase()}::${j.company.toLowerCase()}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });

      const payload = {
        jobs: all,
        total: total || all.length,
        page,
        pageCount,
        sources: [...new Set(all.map(j => j.source).filter(Boolean))],
        fetchedAt: new Date().toISOString(),
        fromCache: false,
      };
      toCache(cacheKey, payload);
      return res.json(payload);

    } catch(err) {
      console.error('[Jobs Error]', err.message);
      return res.status(500).json({ error: 'Failed to fetch jobs.' });
    }
  }
);


// ══ FEEDBACK — file-based persistence ════════════════════════════════════════
const fs           = require('fs');
const REVIEWS_FILE = path.join(__dirname, 'reviews.json');

function loadReviewsFromFile() {
  try {
    if (fs.existsSync(REVIEWS_FILE)) return JSON.parse(fs.readFileSync(REVIEWS_FILE, 'utf8')) || [];
  } catch(e) { console.error('[Reviews] Load error:', e.message); }
  return [];
}
function saveReviewsToFile(reviews) {
  try { fs.writeFileSync(REVIEWS_FILE, JSON.stringify(reviews, null, 2)); }
  catch(e) { console.error('[Reviews] Save error:', e.message); }
}

const feedbackStore = loadReviewsFromFile();
console.log(`[Reviews] Loaded ${feedbackStore.length} reviews from file`);

const feedbackLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Too many reviews. Please wait before submitting again.' }
});

// GET /api/feedback
app.get('/api/feedback', (req, res) => {
  const sorted = [...feedbackStore].sort((a, b) => b.createdAt - a.createdAt);
  res.json({ reviews: sorted, total: sorted.length });
});

// POST /api/feedback
app.post('/api/feedback', feedbackLimiter,
  [
    require('express-validator').body('name').isString().isLength({ min:2, max:40 }).trim(),
    require('express-validator').body('rating').isInt({ min:1, max:5 }),
    require('express-validator').body('text').isString().isLength({ min:10, max:300 }).trim(),
    require('express-validator').body('role').optional().isString().isLength({ max:50 }).trim(),
  ],
  (req, res) => {
    const errors = require('express-validator').validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid input. Name (2-40 chars), rating (1-5), review (10-300 chars) required.' });
    }
    const bad = ['spam','fake','test123'];
    if (bad.some(w => (req.body.text + req.body.name).toLowerCase().includes(w))) {
      return res.status(400).json({ error: 'Review flagged. Please write a genuine review.' });
    }
    const review = {
      id:        `rev_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      name:      san(req.body.name),
      rating:    parseInt(req.body.rating),
      text:      san(req.body.text),
      role:      req.body.role ? san(req.body.role) : '',
      createdAt: Date.now(),
      date:      new Date().toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }),
      helpful:   0,
    };
    feedbackStore.unshift(review);
    if (feedbackStore.length > 200) feedbackStore.pop();
    saveReviewsToFile(feedbackStore);
    console.log(`[Review] ${review.name} gave ${review.rating}⭐`);
    return res.status(201).json({ success: true, review });
  }
);

// POST /api/feedback/:id/helpful
app.post('/api/feedback/:id/helpful', (req, res) => {
  const review = feedbackStore.find(r => r.id === req.params.id);
  if (!review) return res.status(404).json({ error: 'Review not found' });
  review.helpful = (review.helpful || 0) + 1;
  saveReviewsToFile(feedbackStore);
  res.json({ success: true, helpful: review.helpful });
});

// ── Trending & Health ─────────────────────────────────────────────────────────
app.get('/api/trending', (req, res) => res.json({ trending:[
  { query:'Software Engineer',    icon:'💻', hot:true  },
  { query:'Product Manager',      icon:'🎯', hot:true  },
  { query:'Data Scientist',       icon:'📊', hot:false },
  { query:'UX Designer',          icon:'🎨', hot:false },
  { query:'DevOps Engineer',      icon:'⚙️', hot:true  },
  { query:'Frontend Developer',   icon:'🖥️', hot:true  },
  { query:'Full Stack Developer', icon:'🚀', hot:true  },
  { query:'Machine Learning',     icon:'🤖', hot:false },
]}));

app.get('/api/health', (req, res) => res.json({ status:'ok', uptime:process.uptime(), cacheSize:cache.size }));

app.use(express.static(path.join(__dirname,'../frontend')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname,'../frontend/index.html')));
app.use((err, req, res, next) => res.status(500).json({ error:'Server error' }));

app.listen(PORT, () => console.log(`◈ Recrunex API :${PORT} | Muse + Remotive + Adzuna`));