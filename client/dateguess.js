/* ══════════════════════════════════════════════════════════════
   HistoDate — Client JS
   ══════════════════════════════════════════════════════════════ */

const socket = io('/dg');

// ── State ──────────────────────────────────────────────────────
const state = {
  isHost: false,
  roomCode: null,
  myId: null,
  players: [],
  settings: {},
  round: 0,
  totalRounds: 0,
  selectedAvatar: '🦊',
  guessYear: 1969,
  guessMonth: null,
  minYear: 1820,
  maxYear: 2024,
  timeLimit: 30,
  hasGuessed: false,
  timerMaxWidth: 0,
};

const AVATARS = ['🦊','🐺','🦁','🐻','🐼','🦋','🐙','🦈','🦅','🦉','🌙','⭐','🔥','💎','🎭','🎯','🚀','⚡','🌊','🎪'];
const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

// ── Screen management ──────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ── Lobby setup ────────────────────────────────────────────────
function buildAvatarGrid() {
  const grid = document.getElementById('avatar-grid');
  AVATARS.forEach(emoji => {
    const div = document.createElement('div');
    div.className = 'avatar-opt' + (emoji === state.selectedAvatar ? ' selected' : '');
    div.textContent = emoji;
    div.addEventListener('click', () => {
      document.querySelectorAll('.avatar-opt').forEach(a => a.classList.remove('selected'));
      div.classList.add('selected');
      state.selectedAvatar = emoji;
    });
    grid.appendChild(div);
  });
}

function buildMonthRow() {
  const row = document.getElementById('month-row');
  MONTHS.forEach((m, i) => {
    const btn = document.createElement('button');
    btn.className = 'month-btn';
    btn.textContent = m;
    btn.dataset.month = i + 1;
    btn.addEventListener('click', () => {
      const num = parseInt(btn.dataset.month);
      if (state.guessMonth === num) {
        state.guessMonth = null;
        btn.classList.remove('active');
      } else {
        state.guessMonth = num;
        document.querySelectorAll('.month-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      }
      updateMonthLabel();
    });
    row.appendChild(btn);
  });
}

function updateMonthLabel() {
  const el = document.getElementById('month-display-label');
  if (state.guessMonth) {
    el.textContent = MONTHS[state.guessMonth - 1];
    el.style.color = 'var(--gold)';
  } else {
    el.textContent = '';
  }
}

// ── Tab switching ──────────────────────────────────────────────
document.getElementById('tab-join-btn').addEventListener('click', () => {
  document.getElementById('tab-join-btn').classList.add('active');
  document.getElementById('tab-create-btn').classList.remove('active');
  document.getElementById('panel-join').style.display = '';
  document.getElementById('panel-create').style.display = 'none';
});
document.getElementById('tab-create-btn').addEventListener('click', () => {
  document.getElementById('tab-create-btn').classList.add('active');
  document.getElementById('tab-join-btn').classList.remove('active');
  document.getElementById('panel-create').style.display = '';
  document.getElementById('panel-join').style.display = 'none';
});

// ── Join / Create ──────────────────────────────────────────────
document.getElementById('btn-join').addEventListener('click', () => {
  const nick = document.getElementById('input-nickname').value.trim();
  const code = document.getElementById('input-room-code').value.trim().toUpperCase();
  setLobbyError('');
  if (!nick) return setLobbyError('Entre ton pseudo');
  if (!code || code.length < 4) return setLobbyError('Entre le code de la room');
  socket.emit('dg:join', { roomCode: code, nickname: nick, avatar: state.selectedAvatar });
});

document.getElementById('btn-create').addEventListener('click', () => {
  const nick = document.getElementById('input-nickname').value.trim();
  setLobbyError('');
  if (!nick) return setLobbyError('Entre ton pseudo');
  const [minY, maxY] = document.getElementById('set-era').value.split('-').map(Number);
  socket.emit('dg:create', {
    nickname: nick,
    avatar: state.selectedAvatar,
    settings: {
      numRounds: parseInt(document.getElementById('set-rounds').value),
      timePerRound: parseInt(document.getElementById('set-time').value),
      difficulty: document.getElementById('set-difficulty').value,
      maxPlayers: parseInt(document.getElementById('set-maxplayers').value),
      showHints: document.getElementById('set-hints').value === 'true',
      minYear: minY,
      maxYear: maxY,
    },
  });
});

document.getElementById('input-room-code').addEventListener('input', function() {
  this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
});

function setLobbyError(msg) {
  document.getElementById('lobby-error').textContent = msg;
}

// ── Waiting room ───────────────────────────────────────────────
function enterWaiting(roomCode, players, settings, isHost) {
  state.isHost = isHost;
  state.roomCode = roomCode;
  state.players = players;
  state.settings = settings;

  document.getElementById('waiting-code').textContent = roomCode;
  renderWaitingPlayers(players);
  updateSettingsSummary(settings, isHost);

  document.getElementById('host-start-area').style.display = isHost ? '' : 'none';
  document.getElementById('guest-wait-area').style.display = isHost ? 'none' : '';
  document.getElementById('host-settings').style.display = isHost ? '' : 'none';
  document.getElementById('guest-settings').style.display = isHost ? 'none' : '';

  if (isHost) syncHostSettings(settings);

  showScreen('screen-waiting');
}

function renderWaitingPlayers(players) {
  const list = document.getElementById('waiting-players');
  list.innerHTML = '';
  document.getElementById('player-count').textContent = players.length;
  players.forEach(p => {
    const div = document.createElement('div');
    div.className = 'player-item';
    const canKick = state.isHost && p.id !== socket.id;
    div.innerHTML = `
      <span class="player-avatar">${p.avatar}</span>
      <span class="player-name">${esc(p.nickname)}</span>
      ${p.isHost ? '<span class="player-badge">HÔTE</span>' : ''}
      ${p.id === socket.id ? '<span class="player-badge" style="color:var(--blue)">MOI</span>' : ''}
      ${canKick ? `<button class="btn-kick" data-id="${p.id}">Kick</button>` : ''}
    `;
    list.appendChild(div);
  });

  // Enable start button for host if ≥1 player
  const btn = document.getElementById('btn-start');
  if (state.isHost) {
    btn.disabled = players.length < 1;
    document.getElementById('start-hint').textContent =
      players.length < 1 ? 'En attente d\'au moins 1 joueur…' : 'Prêt à lancer !';
  }
}

// Délégation click pour les boutons kick dans la liste
document.getElementById('waiting-players').addEventListener('click', e => {
  const btn = e.target.closest('.btn-kick');
  if (!btn) return;
  const id = btn.dataset.id;
  if (confirm('Kick ce joueur ?')) socket.emit('dg:kick', { playerId: id });
});

function updateSettingsSummary(settings, isHost) {
  if (isHost) return;
  document.getElementById('settings-summary').textContent =
    `${settings.numRounds} rounds · ${settings.timePerRound}s / image · Difficulté : ${
      { all:'Toutes', easy:'Facile', medium:'Moyen', hard:'Difficile' }[settings.difficulty]
    } · ${settings.showHints ? 'Indices activés' : 'Sans indices'}`;
}

function syncHostSettings(settings) {
  document.getElementById('hs-rounds').value = settings.numRounds;
  document.getElementById('hs-time').value = settings.timePerRound;
  document.getElementById('hs-difficulty').value = settings.difficulty;
  document.getElementById('hs-hints').value = String(settings.showHints);
}

// Host settings change listeners
['hs-rounds','hs-time','hs-difficulty','hs-hints'].forEach(id => {
  document.getElementById(id).addEventListener('change', () => {
    socket.emit('dg:settings', {
      numRounds: parseInt(document.getElementById('hs-rounds').value),
      timePerRound: parseInt(document.getElementById('hs-time').value),
      difficulty: document.getElementById('hs-difficulty').value,
      showHints: document.getElementById('hs-hints').value === 'true',
    });
  });
});

document.getElementById('waiting-code').addEventListener('click', () => {
  navigator.clipboard.writeText(state.roomCode).catch(() => {});
  const hint = document.getElementById('copy-hint');
  hint.textContent = '✅ Copié !';
  setTimeout(() => { hint.textContent = '📋 Cliquer pour copier'; }, 2000);
});

document.getElementById('btn-start').addEventListener('click', () => {
  socket.emit('dg:start');
});

// ── Timeline Slider ────────────────────────────────────────────
function buildTimeline(minYear, maxYear) {
  state.minYear = minYear;
  state.maxYear = maxYear;
  state.guessYear = Math.round((minYear + maxYear) / 2);
  state.guessMonth = null;

  // Decade labels
  const labels = document.getElementById('decade-labels');
  labels.innerHTML = '';
  const span = maxYear - minYear;
  const step = span <= 100 ? 10 : span <= 200 ? 20 : 25;
  const startDecade = Math.ceil(minYear / step) * step;
  for (let y = startDecade; y <= maxYear; y += step) {
    const pct = ((y - minYear) / span) * 100;
    const span2 = document.createElement('span');
    span2.style.position = 'absolute';
    span2.style.left = pct + '%';
    span2.style.transform = 'translateX(-50%)';
    span2.textContent = y;
    labels.appendChild(span2);
  }
  labels.style.position = 'relative';
  labels.style.height = '16px';

  // Ticks
  const ticks = document.getElementById('decade-ticks');
  ticks.innerHTML = '';
  for (let y = startDecade; y <= maxYear; y += 10) {
    const pct = ((y - minYear) / (maxYear - minYear)) * 100;
    const tick = document.createElement('div');
    tick.className = 'decade-tick' + (y % step === 0 ? ' major' : '');
    tick.style.left = pct + '%';
    ticks.appendChild(tick);
  }

  // Month row
  document.querySelectorAll('.month-btn').forEach(b => b.classList.remove('active'));
  updateMonthLabel();
  updateThumb();
  updateYearDisplay();
}

function yearToPct(year) {
  return Math.max(0, Math.min(1, (year - state.minYear) / (state.maxYear - state.minYear)));
}
function pctToYear(pct) {
  return Math.round(state.minYear + pct * (state.maxYear - state.minYear));
}

function updateThumb() {
  const pct = yearToPct(state.guessYear) * 100;
  document.getElementById('timeline-thumb').style.left = pct + '%';
  document.getElementById('timeline-fill').style.width = pct + '%';
}
function updateYearDisplay() {
  document.getElementById('year-display').textContent = state.guessYear;
}

function setupSliderEvents() {
  const track = document.getElementById('timeline-track');
  const thumb = document.getElementById('timeline-thumb');
  let dragging = false;

  function setYearFromEvent(e) {
    const rect = track.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    state.guessYear = pctToYear(pct);
    updateThumb();
    updateYearDisplay();
  }

  track.addEventListener('mousedown', e => { dragging = true; setYearFromEvent(e); });
  track.addEventListener('touchstart', e => { dragging = true; setYearFromEvent(e); }, { passive: true });
  document.addEventListener('mousemove', e => { if (dragging) setYearFromEvent(e); });
  document.addEventListener('touchmove', e => { if (dragging) setYearFromEvent(e); }, { passive: true });
  document.addEventListener('mouseup', () => { dragging = false; });
  document.addEventListener('touchend', () => { dragging = false; });

  // Keyboard
  document.getElementById('screen-game').addEventListener('keydown', e => {
    if (state.hasGuessed) return;
    if (e.key === 'ArrowLeft') { state.guessYear = Math.max(state.minYear, state.guessYear - (e.shiftKey ? 10 : 1)); updateThumb(); updateYearDisplay(); }
    if (e.key === 'ArrowRight') { state.guessYear = Math.min(state.maxYear, state.guessYear + (e.shiftKey ? 10 : 1)); updateThumb(); updateYearDisplay(); }
    if (e.key === 'Enter') document.getElementById('btn-guess').click();
  });
}

// ── Game screen ────────────────────────────────────────────────
function startGame(totalRounds) {
  state.totalRounds = totalRounds;
  showScreen('screen-game');
  buildTimeline(state.settings.minYear || 1820, state.settings.maxYear || 2024);
  document.getElementById('btn-stop-game').style.display = state.isHost ? '' : 'none';
}

function showRound(round, totalRounds, image, timeLimit, minYear, maxYear) {
  state.round = round;
  state.totalRounds = totalRounds;
  state.hasGuessed = false;
  state.timeLimit = timeLimit;
  state.timerMaxWidth = 100;

  buildTimeline(minYear, maxYear);
  document.querySelectorAll('.month-btn').forEach(b => b.classList.remove('active'));
  state.guessMonth = null;
  updateMonthLabel();

  document.getElementById('game-image').src = image.url;
  document.getElementById('image-title').textContent = image.title;
  document.getElementById('image-category').textContent = image.category || '';
  document.getElementById('round-indicator').textContent = `Round ${round} / ${totalRounds}`;

  // Timer
  document.getElementById('timer-num').textContent = timeLimit;
  document.getElementById('timer-bar').style.width = '100%';
  document.getElementById('timer-bar').classList.remove('urgent');
  document.getElementById('timer-num').classList.remove('urgent');

  // Submit button
  const btn = document.getElementById('btn-guess');
  btn.disabled = false;
  btn.classList.remove('submitted');
  btn.textContent = 'Valider ma réponse';

  // Hide hint
  document.getElementById('hint-toast').style.display = 'none';

  renderMiniPlayers(state.players);
  updateGuessCount(0);
  showScreen('screen-game');
}

function renderMiniPlayers(players) {
  const row = document.getElementById('players-row');
  row.innerHTML = '';
  players.forEach(p => {
    const div = document.createElement('div');
    div.className = 'mini-player';
    div.id = 'mp-' + p.id;
    div.innerHTML = `
      <div class="mini-avatar${p.hasGuessed ? ' guessed' : ''}">${p.avatar}</div>
      <div class="mini-name">${esc(p.nickname)}</div>
    `;
    row.appendChild(div);
  });
}

function updateGuessCount(count) {
  const total = state.players.filter(p => p.connected !== false).length;
  document.getElementById('guess-count').textContent = `${count}/${total} ont répondu`;
}

// Timer tick
function onTick(remaining) {
  document.getElementById('timer-num').textContent = remaining;
  const pct = (remaining / state.timeLimit) * 100;
  document.getElementById('timer-bar').style.width = pct + '%';
  const urgent = remaining <= 5;
  document.getElementById('timer-bar').classList.toggle('urgent', urgent);
  document.getElementById('timer-num').classList.toggle('urgent', urgent);
}

document.getElementById('btn-guess').addEventListener('click', () => {
  if (state.hasGuessed) return;
  state.hasGuessed = true;
  socket.emit('dg:guess', { year: state.guessYear, month: state.guessMonth });
  const btn = document.getElementById('btn-guess');
  btn.disabled = true;
  btn.classList.add('submitted');
  btn.textContent = '✓ Réponse envoyée';
});

// ── Round result ───────────────────────────────────────────────
function showRoundResult(data) {
  const { correctYear, correctMonth, imageTitle, hint, results, round, totalRounds, isLastRound } = data;

  document.getElementById('rr-title').textContent = imageTitle;
  const dateStr = correctMonth ? `${MONTHS[correctMonth - 1]} ${correctYear}` : String(correctYear);
  document.getElementById('rr-correct-date').textContent = dateStr;
  document.getElementById('rr-hint').textContent = hint || '';
  document.getElementById('rr-progress').textContent = `Round ${round}/${totalRounds}`;

  // Timeline visualization
  buildVizTimeline(results, correctYear);

  // Score rows
  const rows = document.getElementById('score-rows');
  rows.innerHTML = '';
  const sorted = [...results].sort((a, b) => (b.score || 0) - (a.score || 0));
  sorted.forEach((r, i) => {
    setTimeout(() => {
      const div = document.createElement('div');
      div.className = 'score-row';
      const diff = r.yearDiff;
      let diffClass = 'far', diffLabel = '—';
      if (diff !== null) {
        diffLabel = diff === 0 ? '✓ Exact !' : `±${diff} an${diff > 1 ? 's' : ''}`;
        diffClass = diff === 0 ? 'exact' : diff <= 5 ? 'close' : 'far';
      }
      div.innerHTML = `
        <span class="score-avatar">${r.avatar}</span>
        <span class="score-name">${esc(r.nickname)}${r.playerId === socket.id ? ' <small style="color:var(--blue)">(moi)</small>' : ''}</span>
        <span style="text-align:right">
          <span class="score-guess">${r.guessYear !== null ? r.guessYear : '—'}</span><br>
          <span class="score-diff ${diffClass}">${diffLabel}</span>
        </span>
        <span style="text-align:right">
          <span class="score-pts">+${r.score || 0}</span><br>
          <span class="score-total">${r.totalScore} total</span>
        </span>
      `;
      rows.appendChild(div);
    }, i * 120);
  });

  // Next button (host only)
  const btnNext = document.getElementById('btn-next');
  const nextWait = document.getElementById('next-wait');
  const btnStopRound = document.getElementById('btn-stop-round');
  if (state.isHost) {
    btnNext.style.display = '';
    btnStopRound.style.display = '';
    nextWait.style.display = 'none';
    btnNext.textContent = isLastRound ? 'Voir les résultats →' : 'Suivant →';
  } else {
    btnNext.style.display = 'none';
    btnStopRound.style.display = 'none';
    nextWait.style.display = '';
  }

  showScreen('screen-round-result');
}

function buildVizTimeline(results, correctYear) {
  const track = document.getElementById('viz-track');
  // Clear previous guesses
  track.querySelectorAll('.viz-guess').forEach(el => el.remove());

  const allYears = [state.minYear, state.maxYear, correctYear, ...results.map(r => r.guessYear).filter(y => y !== null)];
  const vizMin = Math.max(state.minYear, Math.min(...allYears) - 10);
  const vizMax = Math.min(state.maxYear, Math.max(...allYears) + 10);
  const span = vizMax - vizMin || 1;

  function pct(y) { return ((y - vizMin) / span * 100).toFixed(2) + '%'; }

  // Correct marker
  document.getElementById('viz-correct-label').textContent = String(correctYear);
  document.getElementById('viz-correct').style.left = pct(correctYear);

  // Year labels
  document.getElementById('viz-year-labels').innerHTML = `<span>${vizMin}</span><span>${vizMax}</span>`;

  // Guess markers
  const placed = {};
  results.forEach(r => {
    if (r.guessYear === null) return;
    const div = document.createElement('div');
    div.className = 'viz-guess';
    const key = r.guessYear;
    placed[key] = (placed[key] || 0) + 1;
    const offset = (placed[key] - 1) * 10;
    div.style.left = pct(r.guessYear);
    div.style.bottom = (offset + 4) + 'px';
    div.title = `${r.nickname}: ${r.guessYear}`;
    div.textContent = r.avatar;
    const label = document.createElement('div');
    label.className = 'viz-guess-label';
    label.textContent = r.guessYear;
    div.appendChild(label);
    track.appendChild(div);
  });
}

document.getElementById('btn-next').addEventListener('click', () => {
  socket.emit('dg:next');
});

// ── Final result ───────────────────────────────────────────────
function showFinalResult(ranking) {
  // ranking is worst to best
  const podium = document.getElementById('podium-list');
  podium.innerHTML = '';
  document.getElementById('winner-crown').style.display = 'none';

  const total = ranking.length;
  ranking.forEach((player, i) => {
    const actualRank = total - i; // rank from worst (last) to best (1st)
    const div = document.createElement('div');
    div.className = 'podium-item' + (actualRank === 1 ? ' rank-1' : actualRank === 2 ? ' rank-2' : actualRank === 3 ? ' rank-3' : '');
    div.id = 'podium-' + i;

    let rankLabel = actualRank, rankClass = '';
    if (actualRank === 1) { rankLabel = '🥇'; rankClass = 'gold'; }
    else if (actualRank === 2) { rankLabel = '🥈'; rankClass = 'silver'; }
    else if (actualRank === 3) { rankLabel = '🥉'; rankClass = 'bronze'; }

    div.innerHTML = `
      <span class="podium-rank ${rankClass}">${rankLabel}</span>
      <span class="podium-avatar">${player.avatar}</span>
      <span class="podium-name">${esc(player.nickname)}${player.id === socket.id ? ' <small style="color:var(--blue)">(moi)</small>' : ''}</span>
      <span style="text-align:right">
        <span class="podium-score">${player.score}</span><br>
        <span class="podium-score-sub">pts</span>
      </span>
    `;
    podium.appendChild(div);
  });

  document.getElementById('btn-replay').style.display = state.isHost ? '' : 'none';
  showScreen('screen-final-result');

  // Animate reveal: worst to best (index 0 first = worst)
  ranking.forEach((_, i) => {
    setTimeout(() => {
      document.getElementById('podium-' + i).classList.add('revealed');
      // Winner reveal (last item = rank 1)
      if (i === ranking.length - 1) {
        setTimeout(() => {
          document.getElementById('winner-crown').style.display = '';
          launchConfetti();
        }, 400);
      }
    }, i * 600 + 300);
  });
}

// ── Confetti ───────────────────────────────────────────────────
function launchConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * -canvas.height,
    w: 8 + Math.random() * 8,
    h: 6 + Math.random() * 6,
    color: ['#f0b429','#ffd166','#52c47a','#5283e0','#e05252','#fff'][Math.floor(Math.random() * 6)],
    vx: (Math.random() - 0.5) * 4,
    vy: 2 + Math.random() * 4,
    rot: Math.random() * 360,
    rotV: (Math.random() - 0.5) * 8,
  }));

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot * Math.PI / 180);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, 1 - frame / 180);
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.rotV;
      if (p.y > canvas.height) { p.y = -20; p.x = Math.random() * canvas.width; }
    });
    frame++;
    if (frame < 200) requestAnimationFrame(draw);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  requestAnimationFrame(draw);
}

// ── Replay / Lobby ─────────────────────────────────────────────
document.getElementById('btn-replay').addEventListener('click', () => { socket.emit('dg:replay'); });
document.getElementById('btn-lobby').addEventListener('click', () => { location.reload(); });

// ── Stop game buttons (host) ────────────────────────────────────
document.getElementById('btn-stop-game').addEventListener('click', () => {
  if (confirm('Stopper la partie et retourner au lobby ?')) socket.emit('dg:stop');
});
document.getElementById('btn-stop-round').addEventListener('click', () => {
  if (confirm('Stopper la partie et retourner au lobby ?')) socket.emit('dg:stop');
});

// ── Socket events ──────────────────────────────────────────────
socket.on('dg:created', ({ roomCode, players, settings, isHost }) => {
  state.myId = socket.id;
  state.settings = settings;
  enterWaiting(roomCode, players, settings, isHost);
});

socket.on('dg:joined', ({ roomCode, players, settings, isHost }) => {
  state.myId = socket.id;
  state.settings = settings;
  enterWaiting(roomCode, players, settings, isHost);
});

socket.on('dg:player_joined', ({ players }) => {
  state.players = players;
  renderWaitingPlayers(players);
});

socket.on('dg:player_left', ({ playerId, players, newHostId }) => {
  state.players = players;
  if (newHostId === socket.id) {
    state.isHost = true;
    document.getElementById('host-start-area').style.display = '';
    document.getElementById('guest-wait-area').style.display = 'none';
    document.getElementById('host-settings').style.display = '';
    document.getElementById('guest-settings').style.display = 'none';
  }
  renderWaitingPlayers(players);
});

socket.on('dg:settings_updated', ({ settings }) => {
  state.settings = settings;
  updateSettingsSummary(settings, state.isHost);
  if (state.isHost) syncHostSettings(settings);
});

socket.on('dg:game_started', ({ totalRounds }) => {
  startGame(totalRounds);
});

socket.on('dg:round_start', ({ round, totalRounds, image, timeLimit, minYear, maxYear }) => {
  showRound(round, totalRounds, image, timeLimit, minYear, maxYear);
});

socket.on('dg:tick', ({ remaining }) => {
  onTick(remaining);
});

socket.on('dg:hint', ({ hint, decade }) => {
  const toast = document.getElementById('hint-toast');
  toast.textContent = `💡 Indice : ${hint || 'Décennie : ' + decade + 's'}`;
  toast.style.display = '';
  setTimeout(() => { toast.style.display = 'none'; }, 8000);
});

socket.on('dg:player_guessed', ({ players }) => {
  state.players = players;
  const guessedCount = players.filter(p => p.hasGuessed).length;
  updateGuessCount(guessedCount);
  players.forEach(p => {
    const el = document.querySelector(`#mp-${p.id} .mini-avatar`);
    if (el) el.classList.toggle('guessed', !!p.hasGuessed);
  });
});

socket.on('dg:round_end', (data) => {
  state.players = data.results.map(r => ({
    id: r.playerId, nickname: r.nickname, avatar: r.avatar,
    score: r.totalScore, hasGuessed: false, connected: true,
  }));
  showRoundResult(data);
});

socket.on('dg:game_end', ({ ranking }) => {
  showFinalResult(ranking);
});

socket.on('dg:lobby', ({ players, settings }) => {
  state.players = players;
  state.settings = settings;
  enterWaiting(state.roomCode, players, settings, state.isHost);
});

socket.on('dg:error', ({ message }) => {
  setLobbyError(message);
  // If we're in a waiting or game screen, show alert
  const active = document.querySelector('.screen.active');
  if (active && active.id !== 'screen-lobby') {
    alert('Erreur : ' + message);
  }
});

socket.on('dg:kicked', ({ message }) => {
  alert(message || 'Tu as été exclu de la room par l\'hôte.');
  location.reload();
});

socket.on('disconnect', () => {
  const active = document.querySelector('.screen.active');
  if (active && active.id !== 'screen-lobby') {
    alert('Connexion perdue. Rafraîchis la page.');
  }
});

// ── Utils ──────────────────────────────────────────────────────
function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Init ───────────────────────────────────────────────────────
buildAvatarGrid();
buildMonthRow();
setupSliderEvents();
