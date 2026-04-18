/* ═══════════════════════════════════════════
   QUIZNOVA — GAME LOGIC (Modular, Clean)
   Author: QuizNova Engine v2.0
═══════════════════════════════════════════ */

'use strict';

/* ──────────────────────────────────────────
   1. QUESTION DATA BANK
────────────────────────────────────────── */
const QUESTIONS = {
  1: [
    { q: "Ibukota Indonesia?", opts: ["Jakarta","Bandung","Medan","Surabaya"], ans: "Jakarta" },
    { q: "2 + 2 = ?", opts: ["3","4","5","6"], ans: "4" },
    { q: "Warna langit saat cerah?", opts: ["Merah","Biru","Hijau","Kuning"], ans: "Biru" },
    { q: "Jumlah bulan dalam setahun?", opts: ["10","11","12","13"], ans: "12" },
    { q: "Planet terdekat dengan Matahari?", opts: ["Venus","Mars","Merkurius","Jupiter"], ans: "Merkurius" },
    { q: "Berapa jumlah provinsi di Indonesia?", opts: ["34","35","36","37"], ans: "37" },
    { q: "Siapa Presiden pertama Indonesia?", opts: ["Sukarno","Soeharto","Habibie","Gus Dur"], ans: "Sukarno" },
  ],
  2: [
    { q: "Berapa nilai π (pi) hingga 2 desimal?", opts: ["3.14","3.12","3.16","3.18"], ans: "3.14" },
    { q: "Gas apa yang paling banyak di atmosfer Bumi?", opts: ["Oksigen","Karbon dioksida","Nitrogen","Argon"], ans: "Nitrogen" },
    { q: "Negara terbesar di dunia berdasarkan luas?", opts: ["Kanada","Rusia","China","AS"], ans: "Rusia" },
    { q: "Apa nama ibu kota Australia?", opts: ["Sydney","Melbourne","Canberra","Brisbane"], ans: "Canberra" },
    { q: "Siapa yang menemukan telepon?", opts: ["Edison","Bell","Tesla","Newton"], ans: "Bell" },
    { q: "Berapa jumlah sisi pada segi enam?", opts: ["5","6","7","8"], ans: "6" },
    { q: "Bahasa resmi Brazil?", opts: ["Spanyol","Brasil","Portugis","Inggris"], ans: "Portugis" },
  ],
  3: [
    { q: "Apa singkatan dari CPU?", opts: ["Central Processing Unit","Computer Power Unit","Core Processing Unit","Central Power Unit"], ans: "Central Processing Unit" },
    { q: "Struktur data LIFO disebut?", opts: ["Queue","Stack","Tree","Graph"], ans: "Stack" },
    { q: "Bahasa pemrograman yang dikembangkan Google?", opts: ["Swift","Kotlin","Go","Dart"], ans: "Go" },
    { q: "Kompleksitas waktu Binary Search?", opts: ["O(n)","O(log n)","O(n²)","O(1)"], ans: "O(log n)" },
    { q: "Protocol yang digunakan untuk transfer web?", opts: ["FTP","SMTP","HTTP","SSH"], ans: "HTTP" },
    { q: "Apa kepanjangan dari SQL?", opts: ["Strong Query Language","Structured Query Language","Simple Query Language","System Query Language"], ans: "Structured Query Language" },
    { q: "Nilai biner dari desimal 10?", opts: ["1001","1010","1100","0110"], ans: "1010" },
  ],
};

const LEVEL_NAMES = { 1: "Level 1 — Mudah", 2: "Level 2 — Sedang", 3: "Level 3 — Sulit" };
const TIMER_SECONDS = { 1: 12, 2: 10, 3: 8 };

/* ──────────────────────────────────────────
   2. ACHIEVEMENTS CONFIG
────────────────────────────────────────── */
const ACHIEVEMENT_DEFS = [
  { id: "first_win",   icon: "🏅", label: "Pertama!",   desc: "Selesaikan level pertama" },
  { id: "perfect",     icon: "💯", label: "Perfect!",   desc: "Jawab semua benar tanpa salah" },
  { id: "speedster",   icon: "⚡", label: "Speedster",  desc: "Jawab dalam < 3 detik" },
  { id: "combo5",      icon: "🔥", label: "Combo x5",   desc: "Combo 5 jawaban benar berturut" },
  { id: "champion",    icon: "👑", label: "Champion",   desc: "Selesaikan semua level" },
  { id: "highscore",   icon: "🎯", label: "Top Score",  desc: "Cetak skor di atas 150" },
];

/* ──────────────────────────────────────────
   3. GAME STATE
────────────────────────────────────────── */
const STATE = {
  currentLevel: 1,
  score: 0,
  currentQ: 0,
  lives: 3,
  combo: 0,
  maxCombo: 0,
  correctCount: 0,
  wrongCount: 0,
  timeLeft: 10,
  timerInterval: null,
  shuffledQs: [],
  powerups: { "5050": true, time: true, skip: true },
  muted: false,
};

const SOUND_URLS = {
  correct:    "Assets/Correct.Mp3",   
  wrong:      "Assets/Wrong.mp3",   
  click:      "Assets/click.mp3",   
  levelUp:    "Assets/levelUp.mp3",   
  tick:       "Assets/tick.mp3",   
  powerup:    "Assets/powerup.mp3",   
  bgMusic:    "Assets/Background.mp3",   
};

const AudioEngine = (() => {
  // Cache Audio objects so they load once
  const pool = {};

  function load(key) {
    const url = SOUND_URLS[key];
    if (!url) return null;
    if (!pool[key]) {
      pool[key] = new Audio(url);
      pool[key].preload = 'auto';
    }
    return pool[key];
  }

  function play(key) {
    if (STATE.muted) return;
    const audio = load(key);
    if (!audio) return;
    // Rewind so rapid repeat calls still fire
    try {
      audio.currentTime = 0;
      audio.play().catch(() => {}); // ignore autoplay policy errors
    } catch (e) {}
  }

  // Background music — separate logic (looped, lower volume)
  let bgAudio = null;

  function startBg() {
    const url = SOUND_URLS.bgMusic;
    if (!url || STATE.muted) return;
    if (!bgAudio) {
      bgAudio = new Audio(url);
      bgAudio.loop = true;
      bgAudio.volume = 0.25; // ✏️ Ubah volume BG music (0.0 – 1.0)
    }
    bgAudio.play().catch(() => {});
  }

  function stopBg() {
    if (bgAudio) { bgAudio.pause(); bgAudio.currentTime = 0; }
  }

  function toggleMuteBg(muted) {
    if (!bgAudio) return;
    if (muted) bgAudio.pause();
    else bgAudio.play().catch(() => {});
  }

  return {
    correct()  { play('correct'); },
    wrong()    { play('wrong'); },
    click()    { play('click'); },
    levelUp()  { play('levelUp'); },
    tick()     { play('tick'); },
    powerup()  { play('powerup'); },
    startBg,
    stopBg,
    toggleMuteBg,
  };
})();

/* ──────────────────────────────────────────
   5. CANVAS BACKGROUND — PARTICLE STARS
────────────────────────────────────────── */
const BgCanvas = (() => {
  const canvas = document.getElementById('bgCanvas');
  const ctx = canvas.getContext('2d');
  let particles = [];
  let animId;

  function resize() {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
  }

  function initParticles() {
    particles = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.3,
      a: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.3 + 0.05,
      opacity: Math.random() * 0.6 + 0.1,
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += Math.cos(p.a) * p.speed;
      p.y += Math.sin(p.a) * p.speed;
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,240,255,${p.opacity})`;
      ctx.fill();
    });
    animId = requestAnimationFrame(draw);
  }

  window.addEventListener('resize', () => { resize(); initParticles(); });
  resize();
  initParticles();
  draw();
})();

/* ──────────────────────────────────────────
   6. SCREEN TRANSITIONS
────────────────────────────────────────── */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

/* ──────────────────────────────────────────
   7. PERSISTENCE (localStorage)
────────────────────────────────────────── */
const Store = {
  get(key, fallback = null) {
    try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  },
  set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} },
};

/* ──────────────────────────────────────────
   8. LEADERBOARD
────────────────────────────────────────── */
const Leaderboard = {
  add(level, score) {
    const key = `lb_l${level}`;
    const list = Store.get(key, []);
    list.push({ name: `L${level} Game`, score, date: Date.now() });
    list.sort((a, b) => b.score - a.score);
    Store.set(key, list.slice(0, 5));
  },

  renderAll() {
    // aggregate all levels
    const all = [1,2,3].flatMap(l => Store.get(`lb_l${l}`, []).map(e => ({ ...e, level: l })));
    all.sort((a, b) => b.score - a.score);
    const top5 = all.slice(0, 5);

    const el = document.getElementById('leaderboard-list');
    if (!top5.length) { el.innerHTML = '<li class="lb-empty">Belum ada skor. Ayo main!</li>'; return; }

    el.innerHTML = top5.map((e, i) => `
      <li class="lb-entry">
        <span class="lb-rank">#${i+1}</span>
        <span class="lb-name">Level ${e.level}</span>
        <span class="lb-score">${e.score}</span>
      </li>
    `).join('');
  }
};

/* ──────────────────────────────────────────
   9. ACHIEVEMENTS
────────────────────────────────────────── */
const Achievements = {
  unlocked() { return Store.get('achievements', []); },

  unlock(id) {
    const list = this.unlocked();
    if (list.includes(id)) return false;
    list.push(id);
    Store.set('achievements', list);
    const def = ACHIEVEMENT_DEFS.find(a => a.id === id);
    if (def) showToast(`${def.icon} Achievement: ${def.label}!`);
    return true;
  },

  render() {
    const unlocked = this.unlocked();
    const row = document.getElementById('achievements-row');
    row.innerHTML = ACHIEVEMENT_DEFS.map(a => `
      <div class="ach-badge ${unlocked.includes(a.id) ? 'unlocked' : 'locked'}" title="${a.desc}">
        ${a.icon} ${a.label}
      </div>
    `).join('');
  },

  check() {
    const s = STATE;
    if (s.currentLevel === 1 && s.wrongCount === 0) this.unlock('first_win');
    if (s.wrongCount === 0 && s.lives === 3) this.unlock('perfect');
    if (s.combo >= 5) this.unlock('combo5');
    if (s.score > 150) this.unlock('highscore');
    const unlocked = Store.get('levelUnlocked', 1);
    if (unlocked >= 4) this.unlock('champion');
  }
};

/* ──────────────────────────────────────────
   10. STARS RATING
────────────────────────────────────────── */
function calcStars(score, totalQs) {
  const pct = score / (totalQs * 10);
  if (pct >= 0.9) return 3;
  if (pct >= 0.6) return 2;
  if (pct > 0) return 1;
  return 0;
}

function starsDisplay(n) {
  return '★'.repeat(n) + '☆'.repeat(3 - n);
}

/* ──────────────────────────────────────────
   11. TOAST
────────────────────────────────────────── */
let toastTimeout;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => t.classList.remove('show'), 2800);
}

/* ──────────────────────────────────────────
   12. FLASH OVERLAY
────────────────────────────────────────── */
function flashScreen(type) {
  const el = document.getElementById('flashOverlay');
  el.className = `flash-overlay ${type}`;
  setTimeout(() => el.className = 'flash-overlay', 300);
}

/* ──────────────────────────────────────────
   13. FLOATING SCORE POPUP
────────────────────────────────────────── */
function showScorePopup(text, isWrong = false) {
  const el = document.getElementById('scorePopup');
  el.textContent = text;
  el.className = `score-popup ${isWrong ? 'wrong' : ''} show`;
  el.addEventListener('animationend', () => el.className = 'score-popup', { once: true });
}

/* ──────────────────────────────────────────
   14. TIMER
────────────────────────────────────────── */
function startTimer() {
  clearInterval(STATE.timerInterval);
  STATE.timeLeft = TIMER_SECONDS[STATE.currentLevel] || 10;
  updateTimerUI();

  STATE.timerInterval = setInterval(() => {
    STATE.timeLeft--;
    updateTimerUI();
    if (STATE.timeLeft <= 3 && STATE.timeLeft > 0) AudioEngine.tick();
    if (STATE.timeLeft <= 0) {
      clearInterval(STATE.timerInterval);
      onTimeout();
    }
  }, 1000);
}

function updateTimerUI() {
  const total = TIMER_SECONDS[STATE.currentLevel] || 10;
  const t = STATE.timeLeft;
  const arc = document.getElementById('timerArc');
  const num = document.getElementById('timer');

  num.textContent = t;
  const dashLen = 113.1; // 2π * 18
  const offset = dashLen * (1 - t / total);
  arc.style.strokeDashoffset = offset;

  arc.className = 'timer-arc';
  if (t <= 3) arc.classList.add('danger');
  else if (t <= 5) arc.classList.add('warning');
}

function onTimeout() {
  STATE.combo = 0;
  updateComboUI();
  loseLife('⏰ Waktu habis!');
}

/* ──────────────────────────────────────────
   15. LIVES
────────────────────────────────────────── */
function updateLivesUI() {
  const el = document.getElementById('livesDisplay');
  el.textContent = '❤️'.repeat(STATE.lives) + '🖤'.repeat(Math.max(0, 3 - STATE.lives));
}

function loseLife(reason = '') {
  STATE.lives--;
  STATE.wrongCount++;
  STATE.combo = 0;
  AudioEngine.wrong();
  flashScreen('wrong');
  updateLivesUI();
  updateComboUI();
  if (reason) showToast(reason);

  if (STATE.lives <= 0) {
    clearInterval(STATE.timerInterval);
    setTimeout(gameOver, 500);
    return;
  }
  STATE.currentQ++;
  updateProgress();
  setTimeout(loadQuestion, 600);
}

/* ──────────────────────────────────────────
   16. COMBO
────────────────────────────────────────── */
function updateComboUI() {
  const badge = document.getElementById('comboBadge');
  badge.textContent = `x${STATE.combo}`;
  if (STATE.combo > 0) {
    badge.classList.remove('pop');
    void badge.offsetWidth; // reflow trick
    badge.classList.add('pop');
  }
}

/* ──────────────────────────────────────────
   17. SCORE
────────────────────────────────────────── */
function addScore(base) {
  const bonus = STATE.combo > 1 ? Math.floor(base * (STATE.combo - 1) * 0.5) : 0;
  const total = base + bonus;
  STATE.score += total;

  const el = document.getElementById('score');
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
  el.textContent = STATE.score;

  const popText = bonus > 0 ? `+${total} (x${STATE.combo})` : `+${total}`;
  showScorePopup(popText);
}

/* ──────────────────────────────────────────
   18. PROGRESS
────────────────────────────────────────── */
function updateProgress() {
  const total = STATE.shuffledQs.length;
  const pct = (STATE.currentQ / total) * 100;
  document.getElementById('progressBar').style.width = pct + '%';
  document.getElementById('progressLabel').textContent = `${STATE.currentQ}/${total}`;
}

/* ──────────────────────────────────────────
   19. LOAD QUESTION
────────────────────────────────────────── */
function loadQuestion() {
  if (STATE.currentQ >= STATE.shuffledQs.length) {
    clearInterval(STATE.timerInterval);
    setTimeout(endLevel, 400);
    return;
  }

  const qObj = STATE.shuffledQs[STATE.currentQ];
  const qEl = document.getElementById('question');
  qEl.style.opacity = '0';
  qEl.style.transform = 'translateY(8px)';

  setTimeout(() => {
    qEl.textContent = qObj.q;
    qEl.style.transition = 'opacity 0.3s, transform 0.3s';
    qEl.style.opacity = '1';
    qEl.style.transform = 'translateY(0)';
  }, 100);

  // Render answer buttons
  const answersDiv = document.getElementById('answers');
  answersDiv.innerHTML = '';

  const shuffledOpts = [...qObj.opts].sort(() => Math.random() - 0.5);

  shuffledOpts.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'ans-btn';
    btn.textContent = opt;
    btn.style.animationDelay = `${i * 60}ms`;
    btn.style.animation = 'slideIn 0.3s ease both';
    btn.onclick = () => checkAnswer(opt, btn, qObj.ans);
    answersDiv.appendChild(btn);
  });

  // Reset powerups UI (not state)
  updatePowerupsUI();
  updateProgress();
  startTimer();
  updateLivesUI();
}

/* ──────────────────────────────────────────
   20. CHECK ANSWER
────────────────────────────────────────── */
function checkAnswer(selected, btn, correct) {
  clearInterval(STATE.timerInterval);

  // Lock all buttons
  const allBtns = document.querySelectorAll('.ans-btn');
  allBtns.forEach(b => b.disabled = true);

  if (selected === correct) {
    btn.classList.add('correct');
    STATE.combo++;
    STATE.correctCount++;
    STATE.maxCombo = Math.max(STATE.maxCombo, STATE.combo);
    AudioEngine.correct();
    flashScreen('correct');
    addScore(10);
    updateComboUI();

    // Speed bonus
    if (STATE.timeLeft >= TIMER_SECONDS[STATE.currentLevel] - 2) Achievements.unlock('speedster');
  } else {
    btn.classList.add('wrong');
    // Highlight correct answer
    allBtns.forEach(b => { if (b.textContent === correct) b.classList.add('correct'); });

    STATE.combo = 0;
    STATE.wrongCount++;
    STATE.lives--;
    AudioEngine.wrong();
    flashScreen('wrong');
    showScorePopup('❌', true);
    updateLivesUI();
    updateComboUI();

    if (STATE.lives <= 0) {
      setTimeout(gameOver, 800);
      return;
    }
  }

  STATE.currentQ++;
  updateProgress();
  setTimeout(loadQuestion, 700);
}

/* ──────────────────────────────────────────
   21. POWERUPS
────────────────────────────────────────── */
function updatePowerupsUI() {
  Object.keys(STATE.powerups).forEach(key => {
    const btn = document.getElementById(`pw-${key}`);
    if (btn) btn.disabled = !STATE.powerups[key];
  });
}

function usePowerup(type) {
  if (!STATE.powerups[type]) return;
  STATE.powerups[type] = false;
  updatePowerupsUI();
  AudioEngine.powerup();

  if (type === '5050') {
    const qObj = STATE.shuffledQs[STATE.currentQ];
    const correct = qObj.ans;
    const allBtns = [...document.querySelectorAll('.ans-btn')];
    let removed = 0;
    for (const btn of allBtns) {
      if (btn.textContent !== correct && removed < 2) {
        btn.classList.add('eliminated');
        btn.disabled = true;
        removed++;
      }
    }
    showToast('⚡ 50:50 digunakan!');
  } else if (type === 'time') {
    STATE.timeLeft = Math.min(STATE.timeLeft + 5, TIMER_SECONDS[STATE.currentLevel]);
    updateTimerUI();
    showToast('⏳ +5 detik!');
  } else if (type === 'skip') {
    clearInterval(STATE.timerInterval);
    STATE.currentQ++;
    updateProgress();
    showToast('⏭ Soal dilewati!');
    setTimeout(loadQuestion, 300);
  }
}

/* ──────────────────────────────────────────
   22. GAME OVER
────────────────────────────────────────── */
function gameOver() {
  clearInterval(STATE.timerInterval);
  showResultScreen(false);
}

/* ──────────────────────────────────────────
   23. END LEVEL (success)
────────────────────────────────────────── */
function endLevel() {
  AudioEngine.levelUp();
  Achievements.check();

  // Unlock next level
  const unlocked = Store.get('levelUnlocked', 1);
  const nextLevel = STATE.currentLevel + 1;
  if (nextLevel > unlocked) Store.set('levelUnlocked', nextLevel);

  // Save best score per level
  const bestKey = `best_l${STATE.currentLevel}`;
  const prev = Store.get(bestKey, 0);
  if (STATE.score > prev) Store.set(bestKey, STATE.score);

  // Save stars
  const stars = calcStars(STATE.score, STATE.shuffledQs.length);
  const starKey = `stars_l${STATE.currentLevel}`;
  const prevStars = Store.get(starKey, 0);
  if (stars > prevStars) Store.set(starKey, stars);

  // Leaderboard
  Leaderboard.add(STATE.currentLevel, STATE.score);

  // Stats
  const played = Store.get('stat_played', 0) + 1;
  Store.set('stat_played', played);
  const streak = Store.get('stat_streak', 0) + 1;
  Store.set('stat_streak', streak);
  const hs = Store.get('stat_highscore', 0);
  if (STATE.score > hs) Store.set('stat_highscore', STATE.score);

  showResultScreen(true);
}

/* ──────────────────────────────────────────
   24. RESULT SCREEN
────────────────────────────────────────── */
function showResultScreen(success) {
  const stars = calcStars(STATE.score, STATE.shuffledQs.length);
  const nextLevelBtn = document.getElementById('nextLevelBtn');
  const hasNext = STATE.currentLevel < 3;

  document.getElementById('result-emoji').textContent = success ? (stars === 3 ? '🏆' : '🎉') : '😢';
  document.getElementById('result-title').textContent = success ? 'Level Selesai!' : 'Game Over!';
  document.getElementById('result-score').textContent = STATE.score;
  document.getElementById('result-stars').textContent = starsDisplay(stars);
  document.getElementById('result-breakdown').innerHTML = `
    <div class="breakdown-item">
      <span class="breakdown-val">${STATE.correctCount}</span>
      <span class="breakdown-lbl">✅ Benar</span>
    </div>
    <div class="breakdown-item">
      <span class="breakdown-val">${STATE.wrongCount}</span>
      <span class="breakdown-lbl">❌ Salah</span>
    </div>
    <div class="breakdown-item">
      <span class="breakdown-val">${STATE.maxCombo}x</span>
      <span class="breakdown-lbl">🔥 Max Combo</span>
    </div>
  `;

  nextLevelBtn.disabled = !success || !hasNext;
  nextLevelBtn.style.opacity = (!success || !hasNext) ? '0.4' : '1';
  nextLevelBtn.textContent = hasNext ? 'Lanjut ▶' : '✅ Selesai';

  showScreen('screen-result');
}

/* ──────────────────────────────────────────
   25. START LEVEL
────────────────────────────────────────── */
function startLevel(level) {
  // Check if locked
  const unlocked = Store.get('levelUnlocked', 1);
  if (level > unlocked) { showToast('🔒 Level belum terbuka!'); return; }

  // Reset state
  Object.assign(STATE, {
    currentLevel: level,
    score: 0,
    currentQ: 0,
    lives: 3,
    combo: 0,
    maxCombo: 0,
    correctCount: 0,
    wrongCount: 0,
    shuffledQs: [...QUESTIONS[level]].sort(() => Math.random() - 0.5),
    powerups: { "5050": true, time: true, skip: true },
  });

  document.getElementById('levelTitle').textContent = LEVEL_NAMES[level];
  document.getElementById('score').textContent = '0';
  document.getElementById('comboBadge').textContent = 'x0';

  AudioEngine.click();
  AudioEngine.startBg();
  showScreen('screen-game');
  setTimeout(loadQuestion, 300);
}

/* ──────────────────────────────────────────
   26. NAVIGATION
────────────────────────────────────────── */
function nextLevel() {
  const next = STATE.currentLevel + 1;
  if (next <= 3) startLevel(next);
  else backToMenu();
}

function confirmBack() {
  clearInterval(STATE.timerInterval);
  if (confirm('Keluar ke menu? Progress level ini akan hilang.')) backToMenu();
  else startTimer(); // resume
}

function backToMenu() {
  clearInterval(STATE.timerInterval);
  AudioEngine.stopBg();
  loadMenuData();
  showScreen('screen-menu');
}

/* ──────────────────────────────────────────
   27. MENU DATA LOADER
────────────────────────────────────────── */
function loadMenuData() {
  const unlocked = Store.get('levelUnlocked', 1);

  // Level buttons
  [2, 3].forEach(l => {
    const btn = document.getElementById(`level${l}`);
    if (btn) {
      const isUnlocked = unlocked >= l;
      btn.disabled = !isUnlocked;
      btn.classList.toggle('locked', !isUnlocked);
      btn.querySelector('.lock-icon') && (btn.querySelector('.lock-icon').style.display = isUnlocked ? 'none' : '');
    }
  });

  // Stars per level
  [1, 2, 3].forEach(l => {
    const el = document.getElementById(`stars-${l}`);
    if (el) {
      const s = Store.get(`stars_l${l}`, 0);
      el.textContent = starsDisplay(s);
    }
  });

  // Stats
  document.getElementById('stat-highscore').textContent = Store.get('stat_highscore', 0);
  document.getElementById('stat-streak').textContent = Store.get('stat_streak', 0);
  document.getElementById('stat-played').textContent = Store.get('stat_played', 0);

  Leaderboard.renderAll();
  Achievements.render();
}

/* ──────────────────────────────────────────
   28. MUTE TOGGLE
────────────────────────────────────────── */
document.getElementById('muteBtn').addEventListener('click', () => {
  STATE.muted = !STATE.muted;
  document.getElementById('muteBtn').textContent = STATE.muted ? '🔇' : '🔊';
  AudioEngine.toggleMuteBg(STATE.muted);
  showToast(STATE.muted ? '🔇 Suara dimatikan' : '🔊 Suara dinyalakan');
});

/* ──────────────────────────────────────────
   29. INIT
────────────────────────────────────────── */
(function init() {
  loadMenuData();
  showScreen('screen-menu');

  // Button click sound
  document.addEventListener('click', (e) => {
    if (e.target.matches('.level-btn:not(.locked), .result-btn, .icon-btn, .power-btn')) {
      AudioEngine.click();
    }
  });
})();