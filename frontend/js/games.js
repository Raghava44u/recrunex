// ══ Recrunex Career Games ══
const Games = (() => {

  // ── Shared modal helpers ──
  function openGameModal(title, bodyHtml) {
    const overlay = document.getElementById('gameModalOverlay');
    const modal = document.getElementById('gameModal');
    const titleEl = document.getElementById('gameModalTitle');
    const body = document.getElementById('gameModalBody');
    titleEl.textContent = title;
    body.innerHTML = bodyHtml;
    overlay.classList.add('visible');
    modal.removeAttribute('hidden');
    requestAnimationFrame(() => requestAnimationFrame(() => modal.classList.add('visible')));
    document.body.style.overflow = 'hidden';
  }

  function closeGameModal() {
    const modal = document.getElementById('gameModal');
    const overlay = document.getElementById('gameModalOverlay');
    modal.classList.remove('visible');
    setTimeout(() => {
      overlay.classList.remove('visible');
      modal.setAttribute('hidden', '');
      document.body.style.overflow = '';
    }, 350);
  }

  document.getElementById('gameModalClose')?.addEventListener('click', closeGameModal);
  document.getElementById('gameModalOverlay')?.addEventListener('click', closeGameModal);

  // ── GAME 1: Career Quiz ──
  const quizQuestions = [
    { q: "You enjoy building things people can see and click. You are a...", opts: ["Backend Engineer", "Frontend Developer", "Data Analyst", "HR Manager"], ans: 1 },
    { q: "You love patterns, numbers and predictive models. You are a...", opts: ["Product Manager", "UX Designer", "Data Scientist", "DevOps Engineer"], ans: 2 },
    { q: "You ensure code ships smoothly and infrastructure never crashes. You are a...", opts: ["DevOps Engineer", "Sales Manager", "Content Writer", "Frontend Dev"], ans: 0 },
    { q: "You talk to users, define roadmaps, and bridge tech & business. You are a...", opts: ["Data Engineer", "Product Manager", "Security Analyst", "QA Tester"], ans: 1 },
    { q: "You obsess over user flows, wireframes and pixel-perfect designs. You are a...", opts: ["Backend Dev", "UX Designer", "Cloud Architect", "ML Engineer"], ans: 1 },
    { q: "You write code for APIs, databases and microservices. You are a...", opts: ["Backend Engineer", "Marketing Manager", "Scrum Master", "UX Writer"], ans: 0 },
    { q: "You protect systems from hackers and security breaches. You are a...", opts: ["Full Stack Dev", "Cybersecurity Engineer", "Product Designer", "Data Analyst"], ans: 1 },
    { q: "You train neural networks and build AI models. You are a...", opts: ["Sales Engineer", "DevOps", "ML Engineer", "Business Analyst"], ans: 2 },
  ];

  function startQuiz() {
    let current = 0, score = 0;
    function render() {
      if (current >= quizQuestions.length) {
        const pct = Math.round((score / quizQuestions.length) * 100);
        const msg = pct >= 80 ? "🏆 Career Genius!" : pct >= 50 ? "🎯 Good instincts!" : "📚 Keep learning!";
        document.getElementById('gameModalBody').innerHTML = `
          <div class="game-container">
            <div class="game-result">
              <div class="game-result-score">${score}/${quizQuestions.length}</div>
              <h3>${msg}</h3>
              <p>You scored ${pct}% on the Career Role Quiz.</p>
              <button class="game-play-again" id="quizRestart">Play Again 🔄</button>
            </div>
          </div>`;
        document.getElementById('quizRestart').addEventListener('click', () => { current = 0; score = 0; render(); });
        return;
      }
      const q = quizQuestions[current];
      document.getElementById('gameModalBody').innerHTML = `
        <div class="game-container">
          <div class="game-score"><span class="game-score-label">Score</span><span class="game-score-val">${score}</span></div>
          <div class="game-progress"><div class="game-progress-bar" style="width:${(current/quizQuestions.length)*100}%"></div></div>
          <div class="game-question">Q${current+1}. ${q.q}</div>
          <div class="game-options">
            ${q.opts.map((o, i) => `<button class="game-option" data-idx="${i}">${o}</button>`).join('')}
          </div>
        </div>`;
      document.querySelectorAll('.game-option').forEach(btn => {
        btn.addEventListener('click', () => {
          const chosen = parseInt(btn.dataset.idx);
          document.querySelectorAll('.game-option').forEach(b => b.disabled = true);
          btn.classList.add(chosen === q.ans ? 'correct' : 'wrong');
          if (chosen === q.ans) { score++; document.querySelectorAll('.game-option')[q.ans].classList.add('correct'); }
          else document.querySelectorAll('.game-option')[q.ans].classList.add('correct');
          setTimeout(() => { current++; render(); }, 900);
        });
      });
    }
    render();
  }

  // ── GAME 2: Salary Guesser ──
  const salaryData = [
    { role: "Junior Frontend Developer", company: "Startup (India)", ans: "₹6L–₹10L", opts: ["₹3L–₹5L", "₹6L–₹10L", "₹20L–₹30L", "₹50L+"] },
    { role: "Senior Software Engineer", company: "FAANG (India)", ans: "₹40L–₹80L", opts: ["₹10L–₹15L", "₹20L–₹30L", "₹40L–₹80L", "₹1Cr+"] },
    { role: "Product Manager", company: "Mid-size SaaS (Remote)", ans: "$80K–$120K", opts: ["$30K–$50K", "$80K–$120K", "$200K+", "$10K–$20K"] },
    { role: "Data Scientist", company: "US Tech Company", ans: "$100K–$150K", opts: ["$50K–$70K", "$100K–$150K", "$200K+", "$30K–$40K"] },
    { role: "UX Designer", company: "Agency (Bangalore)", ans: "₹8L–₹15L", opts: ["₹2L–₹4L", "₹8L–₹15L", "₹30L+", "₹5L–₹6L"] },
    { role: "DevOps Engineer", company: "Global MNC (Hyderabad)", ans: "₹15L–₹25L", opts: ["₹5L–₹8L", "₹15L–₹25L", "₹40L+", "₹10L–₹12L"] },
  ];

  function startSalary() {
    let current = 0, score = 0;
    function render() {
      if (current >= salaryData.length) {
        const pct = Math.round((score / salaryData.length) * 100);
        document.getElementById('gameModalBody').innerHTML = `
          <div class="game-container">
            <div class="game-result">
              <div class="game-result-score">${score}/${salaryData.length}</div>
              <h3>${pct >= 70 ? '💰 Market Expert!' : '📊 Keep researching!'}</h3>
              <p>You guessed ${score} salary ranges correctly!</p>
              <button class="game-play-again" id="salRestart">Play Again 🔄</button>
            </div>
          </div>`;
        document.getElementById('salRestart').addEventListener('click', () => { current = 0; score = 0; render(); });
        return;
      }
      const d = salaryData[current];
      document.getElementById('gameModalBody').innerHTML = `
        <div class="game-container">
          <div class="game-score"><span class="game-score-label">Score</span><span class="game-score-val">${score}</span></div>
          <div class="game-progress"><div class="game-progress-bar" style="width:${(current/salaryData.length)*100}%"></div></div>
          <div class="game-question">💼 <strong>${d.role}</strong><br/><small style="color:var(--text-muted)">${d.company}</small><br/><br/>What's the typical salary range?</div>
          <div class="game-options">
            ${d.opts.map(o => `<button class="game-option" data-val="${o}">${o}</button>`).join('')}
          </div>
        </div>`;
      document.querySelectorAll('.game-option').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.game-option').forEach(b => { b.disabled = true; if (b.dataset.val === d.ans) b.classList.add('correct'); });
          if (btn.dataset.val === d.ans) score++; else btn.classList.add('wrong');
          setTimeout(() => { current++; render(); }, 900);
        });
      });
    }
    render();
  }

  // ── GAME 3: Resume Roast ──
  const resumeProblems = [
    { bad: '"Responsible for doing many tasks in the team."', fix: 'Too vague. Use: "Led 3 cross-functional projects delivering $200K revenue increase."', issue: "No numbers, no impact" },
    { bad: '"I am a hardworking, passionate team player who loves to learn."', fix: 'Generic filler. Remove completely or replace with specific skills.', issue: "Cliché objective statement" },
    { bad: '"Proficient in MS Word, MS Excel and internet browsing."', fix: 'Basic skills assumed. List actual tech stack: React, Python, AWS, Docker etc.', issue: "Too basic to list" },
    { bad: '"Worked at XYZ for 2 years. Did many things."', fix: '"Built REST APIs in Node.js serving 50K daily users. Reduced latency by 40%."', issue: "No specifics, no verbs" },
    { bad: 'Resume is 5 pages long with no summary.', fix: 'Keep to 1 page (fresher) or 2 pages max. Add a 3-line summary at top.', issue: "Too long, no summary" },
  ];

  function startResume() {
    let idx = Math.floor(Math.random() * resumeProblems.length);
    let revealed = false;
    function render() {
      const p = resumeProblems[idx];
      document.getElementById('gameModalBody').innerHTML = `
        <div class="game-container">
          <div class="game-question">🔥 Spot the issue:<br/><br/><em style="color:var(--error);font-size:1rem">${p.bad}</em></div>
          ${revealed ? `
            <div style="background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.3);border-radius:12px;padding:16px;margin-bottom:16px;">
              <p style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin-bottom:6px">⚠️ Issue</p>
              <p style="color:var(--error);font-weight:600;margin-bottom:10px">${p.issue}</p>
              <p style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin-bottom:6px">✅ Better</p>
              <p style="color:var(--success);font-size:0.88rem">${p.fix}</p>
            </div>
            <button class="game-play-again" id="resumeNext">Next Problem →</button>
          ` : `
            <button class="game-option" id="revealBtn" style="margin-top:8px">🔍 Reveal the Problem</button>
          `}
        </div>`;
      if (!revealed) {
        document.getElementById('revealBtn').addEventListener('click', () => { revealed = true; render(); });
      } else {
        document.getElementById('resumeNext').addEventListener('click', () => {
          idx = (idx + 1) % resumeProblems.length;
          revealed = false; render();
        });
      }
    }
    render();
  }

  // ── GAME 4: Interview Blitz ──
  const interviewQs = [
    { q: "Tell me about yourself in one sentence?", hint: "Name + role + top skill + goal" },
    { q: "What is your greatest weakness?", hint: "Real weakness + steps you're taking to improve it" },
    { q: "Why do you want to work here?", hint: "Company mission/product + how it aligns with your goals" },
    { q: "Where do you see yourself in 5 years?", hint: "Growth in this domain + contribution to company" },
    { q: "Explain a project you built from scratch.", hint: "Problem → Solution → Tech Stack → Impact" },
    { q: "Why should we hire you over others?", hint: "Unique skill + proven result + cultural fit" },
    { q: "What is your salary expectation?", hint: "Research market rate → give a range → be flexible" },
    { q: "Describe a time you failed and what you learnt.", hint: "STAR: Situation, Task, Action, Result" },
  ];

  function startInterview() {
    let idx = 0, timerVal = 10, timerInterval = null;
    function render() {
      if (idx >= interviewQs.length) {
        document.getElementById('gameModalBody').innerHTML = `
          <div class="game-container">
            <div class="game-result">
              <div style="font-size:3rem;margin-bottom:12px">🎯</div>
              <h3>Blitz Complete!</h3>
              <p>You practised ${interviewQs.length} common interview questions. Keep rehearsing!</p>
              <button class="game-play-again" id="ivRestart">Go Again 🔄</button>
            </div>
          </div>`;
        document.getElementById('ivRestart').addEventListener('click', () => { idx = 0; render(); });
        return;
      }
      timerVal = 10;
      clearInterval(timerInterval);
      const q = interviewQs[idx];
      document.getElementById('gameModalBody').innerHTML = `
        <div class="game-container">
          <div class="game-progress"><div class="game-progress-bar" id="ivBar" style="width:${(idx/interviewQs.length)*100}%"></div></div>
          <p style="font-size:0.72rem;color:var(--text-muted);margin-bottom:10px">Question ${idx+1} of ${interviewQs.length}</p>
          <div class="game-timer" id="ivTimer">${timerVal}s</div>
          <div class="game-question">${q.q}</div>
          <div id="ivHint" style="display:none;background:var(--accent-glow);border:1px solid var(--border-accent);border-radius:12px;padding:14px;margin-bottom:14px;font-size:0.85rem;color:var(--accent-light)">
            💡 Tip: ${q.hint}
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="game-option" id="ivHintBtn" style="flex:1">💡 Show Hint</button>
            <button class="game-option" id="ivNextBtn" style="flex:1">Next →</button>
          </div>
        </div>`;
      const timerEl = document.getElementById('ivTimer');
      timerInterval = setInterval(() => {
        timerVal--;
        if (timerEl) { timerEl.textContent = timerVal + 's'; if (timerVal <= 3) timerEl.classList.add('urgent'); else timerEl.classList.remove('urgent'); }
        if (timerVal <= 0) { clearInterval(timerInterval); if (timerEl) timerEl.textContent = '⏰'; }
      }, 1000);
      document.getElementById('ivHintBtn').addEventListener('click', () => {
        document.getElementById('ivHint').style.display = 'block';
      });
      document.getElementById('ivNextBtn').addEventListener('click', () => {
        clearInterval(timerInterval); idx++; render();
      });
    }
    render();
  }

  function open(game) {
    const titles = { quiz:'🧠 Career Role Quiz', salary:'💰 Salary Guesser', resume:'📄 Resume Roast', interview:'🎯 Interview Blitz' };
    openGameModal(titles[game] || 'Game', '<div style="text-align:center;padding:40px;color:var(--text-muted)">Loading...</div>');
    if (game === 'quiz') startQuiz();
    else if (game === 'salary') startSalary();
    else if (game === 'resume') startResume();
    else if (game === 'interview') startInterview();
  }

  return { open };
})();