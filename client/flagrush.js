/* ══════════════════════════════════════════════════════════════
   FlagRush — Client JS
   ══════════════════════════════════════════════════════════════ */

const socket = io('/fg');

// ── State ──────────────────────────────────────────────────────
const state = {
  isHost: false,
  roomCode: null,
  myId: null,
  players: [],
  settings: {},
  selectedAvatar: '🦊',
  mode: 'marathon',
  currentQuestion: null,
  myScore: 0,
  hasAnswered: false,
  timerMax: 10,
  timerRemaining: 10,
  speedrunRemaining: 0,
  aliveIds: [],
};

const AVATARS = ['🦊','🐺','🦁','🐻','🐼','🦋','🐙','🦈','🦅','🦉','🌙','⭐','🔥','💎','🎭','🎯','🚀','⚡','🌊','🎪'];

function flagUrl(code) { return `https://flagcdn.com/w160/${code}.png`; }

// ── Screen management ──────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  const hub = document.getElementById('hub-btn');
  if (hub) hub.style.display = (id === 'screen-lobby') ? '' : 'none';
}

// ── Avatar grid ────────────────────────────────────────────────
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
buildAvatarGrid();

// ── Lobby tabs ─────────────────────────────────────────────────
document.getElementById('tab-join').addEventListener('click', () => {
  document.getElementById('tab-join').classList.add('active');
  document.getElementById('tab-create').classList.remove('active');
  document.getElementById('panel-join').style.display = '';
  document.getElementById('panel-create').style.display = 'none';
});
document.getElementById('tab-create').addEventListener('click', () => {
  document.getElementById('tab-create').classList.add('active');
  document.getElementById('tab-join').classList.remove('active');
  document.getElementById('panel-create').style.display = '';
  document.getElementById('panel-join').style.display = 'none';
});

function lobbyError(msg) { document.getElementById('lobby-error').textContent = msg; }

document.getElementById('btn-join').addEventListener('click', () => {
  const name = document.getElementById('input-name-join').value.trim();
  const code = document.getElementById('input-code').value.trim().toUpperCase();
  if (!name) return lobbyError('Entre un pseudo');
  if (!code) return lobbyError('Entre un code de room');
  socket.emit('fg:join', { name, avatar: state.selectedAvatar, code });
});

document.getElementById('btn-create').addEventListener('click', () => {
  const name = document.getElementById('input-name-create').value.trim();
  if (!name) return lobbyError('Entre un pseudo');
  socket.emit('fg:create', { name, avatar: state.selectedAvatar });
});

['input-name-join','input-code'].forEach(id => {
  document.getElementById(id).addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('btn-join').click();
  });
});
document.getElementById('input-name-create').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('btn-create').click();
});

// ── Waiting room ───────────────────────────────────────────────
function enterWaiting(roomCode, players, settings, isHost) {
  state.roomCode = roomCode;
  state.isHost   = isHost;
  state.settings = settings;
  state.mode     = settings.mode || 'marathon';

  document.getElementById('waiting-code').textContent = roomCode;
  document.getElementById('btn-start').style.display  = isHost ? '' : 'none';
  document.getElementById('settings-card').style.display = isHost ? '' : 'none';

  renderWaitingPlayers(players);
  applySettingsUI(settings);
  showScreen('screen-waiting');
}

function renderWaitingPlayers(players) {
  state.players = players;
  const el = document.getElementById('waiting-players');
  el.innerHTML = players.map(p => {
    const canKick = state.isHost && p.id !== state.myId;
    return `
      <div class="player-row">
        <span class="player-avatar">${p.avatar}</span>
        <span class="player-name">${p.name}</span>
        ${p.isHost ? '<span class="player-host-badge">Hôte</span>' : ''}
        ${canKick ? `<button class="btn-kick" data-id="${p.id}">Kick</button>` : ''}
      </div>`;
  }).join('');
}

el('waiting-players').addEventListener('click', e => {
  const btn = e.target.closest('.btn-kick');
  if (!btn) return;
  if (confirm('Kick ce joueur ?')) socket.emit('fg:kick', { playerId: btn.dataset.id });
});

function el(id) { return document.getElementById(id); }

// ── Settings UI ────────────────────────────────────────────────
function applySettingsUI(settings) {
  state.settings = settings;
  state.mode = settings.mode;

  // Mode buttons
  document.querySelectorAll('.mode-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === settings.mode);
  });

  el('sel-numOptions').value = settings.numOptions || 4;
  el('sel-timer').value      = settings.timerPerQuestion || 10;
  el('sel-rounds').value     = settings.numRounds || 20;
  el('sel-speedtime').value  = settings.speedrunTime || 60;

  // Show/hide relevant options
  const isSpeedrun  = settings.mode === 'speedrun';
  const isMarathon  = settings.mode === 'marathon';
  el('opt-timer').style.display      = isSpeedrun ? 'none' : '';
  el('opt-rounds').style.display     = isMarathon ? '' : 'none';
  el('opt-speedtime').style.display  = isSpeedrun ? '' : 'none';
}

// Mode buttons
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (!state.isHost) return;
    socket.emit('fg:settings', { mode: btn.dataset.mode });
  });
});

el('sel-numOptions').addEventListener('change', () => {
  if (state.isHost) socket.emit('fg:settings', { numOptions: +el('sel-numOptions').value });
});
el('sel-timer').addEventListener('change', () => {
  if (state.isHost) socket.emit('fg:settings', { timerPerQuestion: +el('sel-timer').value });
});
el('sel-rounds').addEventListener('change', () => {
  if (state.isHost) socket.emit('fg:settings', { numRounds: +el('sel-rounds').value });
});
el('sel-speedtime').addEventListener('change', () => {
  if (state.isHost) socket.emit('fg:settings', { speedrunTime: +el('sel-speedtime').value });
});

el('btn-start').addEventListener('click', () => socket.emit('fg:start'));
el('btn-leave-waiting').addEventListener('click', () => location.reload());

// ── Question screen ────────────────────────────────────────────
let timerInterval = null;

function showQuestion(data) {
  state.currentQuestion = data;
  state.hasAnswered = false;

  const { countryName, options, round, totalRounds, timeLimit, alivePlayers } = data;

  // Header
  el('q-round').textContent = totalRounds
    ? `Round ${round} / ${totalRounds}`
    : `Question ${round}`;

  const isSpeedrun = state.mode === 'speedrun';
  el('speedrun-timer').style.display = isSpeedrun ? '' : 'none';
  el('q-score').style.display = (isSpeedrun || state.mode === 'marathon') ? '' : 'none';
  el('q-score').textContent = `${state.myScore} pts`;

  // Timer bar
  state.timerMax       = timeLimit;
  state.timerRemaining = timeLimit;
  updateTimerBar(timeLimit, timeLimit);
  clearInterval(timerInterval);
  if (!isSpeedrun) {
    timerInterval = setInterval(() => {
      state.timerRemaining = Math.max(0, state.timerRemaining - 1);
      updateTimerBar(state.timerRemaining, state.timerMax);
    }, 1000);
  }

  // Country name
  el('q-country').textContent = countryName;

  // Flags grid
  const grid = el('flags-grid');
  grid.className = `flags-grid opts-${options.length}`;
  grid.innerHTML = '';
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'flag-btn';
    btn.dataset.code = opt.code;
    btn.innerHTML = `<img src="${flagUrl(opt.code)}" alt="${opt.name}"/>`;
    btn.addEventListener('click', () => onFlagClick(opt.code, btn));
    grid.appendChild(btn);
  });

  // Answered dots (non-speedrun)
  renderAnsweredDots(data.alivePlayers || state.players.map(p => p.id));

  // Alive strip (deathrun)
  renderAliveStrip(alivePlayers);

  // Stop button (host only)
  el('btn-stop-question').style.display = state.isHost ? '' : 'none';

  showScreen('screen-question');
}

function onFlagClick(code, btn) {
  if (state.hasAnswered) return;
  state.hasAnswered = true;
  socket.emit('fg:answer', { code });

  // Instant visual feedback — no need to wait for server
  const correctCode = state.currentQuestion?.correctCode;
  document.querySelectorAll('.flag-btn').forEach(b => {
    if (b.dataset.code === correctCode) b.classList.add('correct');
    else if (b.dataset.code === code)   b.classList.add('wrong');
  });
}

function updateTimerBar(remaining, max) {
  const pct = max > 0 ? (remaining / max) * 100 : 0;
  const bar = el('timer-bar');
  bar.style.width = pct + '%';
  bar.classList.toggle('urgent', remaining <= 5);
}

function renderAnsweredDots(playerIds) {
  if (!playerIds) return;
  const wrap = el('answered-dots');
  wrap.innerHTML = '';
  if (state.mode === 'speedrun') return;
  const playerMap = Object.fromEntries(state.players.map(p => [p.id, p]));
  playerIds.forEach(pid => {
    const p = playerMap[pid];
    if (!p) return;
    const d = document.createElement('div');
    d.className = 'answered-dot';
    d.id = `dot-${pid}`;
    d.title = p.name;
    d.textContent = p.avatar;
    wrap.appendChild(d);
  });
}

function renderAliveStrip(aliveIds) {
  const strip = el('alive-strip');
  strip.innerHTML = '';
  if (state.mode !== 'deathrun' || !aliveIds) return;
  state.players.forEach(p => {
    const alive = aliveIds.includes(p.id);
    const chip = document.createElement('div');
    chip.className = 'alive-chip' + (alive ? '' : ' eliminated');
    chip.id = `chip-${p.id}`;
    chip.innerHTML = `<span class="chip-avatar">${p.avatar}</span><span>${p.name}</span>`;
    strip.appendChild(chip);
  });
}

// ── Round result ───────────────────────────────────────────────
function showRoundResult(data) {
  clearInterval(timerInterval);
  const { correctCode, answers, eliminated, alive, players } = data;

  // Update score (marathon: score vient du serveur via publicPlayers)
  // Pour deathrun le score est déjà mis à jour côté serveur

  // Mettre à jour le score local depuis les données joueur
  const me = players.find(p => p.id === state.myId);
  if (me) state.myScore = me.score;

  el('res-country').textContent = state.currentQuestion?.countryName || '';
  el('res-flag').src = flagUrl(correctCode);
  el('res-flag').alt = correctCode;

  // Player rows
  const rows = el('res-players');
  rows.innerHTML = '';
  players.forEach(p => {
    const ans = answers[p.id];
    const isCorrect = ans?.correct;
    const isElim = eliminated.includes(p.id);
    let cls = 'result-player-row';
    if (isCorrect)       cls += ' correct-ans';
    else if (ans?.code)  cls += ' wrong-ans';
    else                 cls += ' no-ans';
    rows.innerHTML += `
      <div class="${cls}">
        <span style="font-size:1.3rem">${p.avatar}</span>
        <span style="flex:1;font-weight:700">${p.name}</span>
        <span>${isCorrect ? '✅' : (ans?.code ? '❌' : '⏱️')}</span>
        ${state.mode === 'marathon' ? `<span style="color:var(--cyan);font-weight:800;margin-left:8px">${p.score} pts</span>` : ''}
        ${isElim ? '<span class="result-elim-badge">Éliminé</span>' : ''}
      </div>`;
  });

  el('btn-next').style.display        = state.isHost ? '' : 'none';
  el('btn-stop-result').style.display = state.isHost ? '' : 'none';
  el('res-wait').style.display        = state.isHost ? 'none' : '';

  showScreen('screen-result');
}

el('btn-next').addEventListener('click', () => socket.emit('fg:next'));
el('btn-stop-result').addEventListener('click', () => {
  if (confirm('Stopper la partie ?')) socket.emit('fg:stop');
});

// ── Final screen ───────────────────────────────────────────────
function showFinal(ranking, mode) {
  clearInterval(timerInterval);

  const modeLabels = { marathon: 'Marathon', deathrun: 'Deathrun', speedrun: 'Speedrun' };
  el('final-subtitle').textContent = `Mode ${modeLabels[mode] || mode} — Résultats finaux`;

  const podium = el('final-podium');
  podium.innerHTML = '';

  const medals = ['🥇','🥈','🥉'];
  const rankClasses = ['rank-1','rank-2','rank-3'];
  const rankColors  = ['gold','silver','bronze'];

  ranking.forEach((p, i) => {
    const item = document.createElement('div');
    item.className = `podium-item ${rankClasses[i] || ''}`;
    item.innerHTML = `
      <div class="podium-rank ${rankColors[i] || ''}">${medals[i] || (i+1)}</div>
      <div class="podium-avatar">${p.avatar}</div>
      <div class="podium-name">${p.name}</div>
      <div>
        <div class="podium-score">${p.score}</div>
        <div class="podium-score-sub">points</div>
      </div>`;
    podium.appendChild(item);
    item.classList.add('revealed');
  });

  el('btn-replay').style.display = state.isHost ? '' : 'none';
  showScreen('screen-final');
}

el('btn-replay').addEventListener('click', () => socket.emit('fg:replay'));
// Retour au lobby (ne quitte pas la room, tout le monde revient dans le salon)
el('btn-lobby').addEventListener('click', () => socket.emit('fg:stop'));
// Bouton stop pendant la question (hôte seulement)
el('btn-stop-question').addEventListener('click', () => {
  if (confirm('Stopper la partie et retourner au lobby ?')) socket.emit('fg:stop');
});

// ── Speedrun ───────────────────────────────────────────────────
function showSpeedrunQuestion(q) {
  state.currentQuestion = q;
  state.hasAnswered = false;

  el('q-round').textContent    = `Q${q.qIndex}`;
  el('q-country').textContent  = q.countryName;
  el('speedrun-timer').style.display = '';
  el('q-score').style.display  = '';
  el('q-score').textContent    = `${state.myScore} pts`;
  updateTimerBar(0, 1); // pas de barre par question en speedrun
  clearInterval(timerInterval);

  el('btn-stop-question').style.display = state.isHost ? '' : 'none';

  const grid = el('flags-grid');
  grid.className = `flags-grid opts-${q.options.length}`;
  grid.innerHTML = '';
  q.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'flag-btn';
    btn.dataset.code = opt.code;
    btn.innerHTML = `<img src="${flagUrl(opt.code)}" alt="${opt.name}"/>`;
    btn.addEventListener('click', () => onFlagClick(opt.code, btn));
    grid.appendChild(btn);
  });

  el('answered-dots').innerHTML = '';
  el('alive-strip').innerHTML   = '';
  showScreen('screen-question');
}

// ── Socket events ──────────────────────────────────────────────

socket.on('fg:created', ({ roomCode, players, settings, isHost }) => {
  state.myId  = socket.id;
  enterWaiting(roomCode, players, settings, isHost);
});

socket.on('fg:joined', ({ roomCode, players, settings, isHost }) => {
  state.myId  = socket.id;
  enterWaiting(roomCode, players, settings, isHost);
});

socket.on('fg:player_joined', ({ players }) => {
  renderWaitingPlayers(players);
});

socket.on('fg:player_left', ({ playerId, players }) => {
  renderWaitingPlayers(players);
  if (players.find(p => p.id === state.myId && p.isHost)) {
    state.isHost = true;
    el('btn-start').style.display  = '';
    el('settings-card').style.display = '';
  }
});

socket.on('fg:settings_updated', ({ settings }) => {
  applySettingsUI(settings);
});

socket.on('fg:game_started', ({ mode, settings }) => {
  state.mode     = mode;
  state.settings = settings;
  state.myScore  = 0;
});

socket.on('fg:question', (data) => {
  showQuestion(data);
});

socket.on('fg:tick', ({ remaining }) => {
  state.timerRemaining = remaining;
  updateTimerBar(remaining, state.timerMax);
});

socket.on('fg:player_answered', ({ playerId }) => {
  const dot = document.getElementById(`dot-${playerId}`);
  if (dot) dot.classList.add('done');
});

socket.on('fg:round_end', (data) => {
  // Deathrun: si tout le monde est éliminé, fg:game_end suit immédiatement
  if (data.allOut) {
    clearInterval(timerInterval);
    return; // fg:game_end arrive juste après
  }
  showRoundResult(data);
});

socket.on('fg:speedrun_tick', ({ remaining }) => {
  state.speedrunRemaining = remaining;
  el('speedrun-timer').textContent = remaining;
  el('speedrun-timer').classList.toggle('urgent', remaining <= 10);
});

// Réception de la prochaine question speedrun (et reveal de la précédente)
socket.on('fg:speedrun_next', ({ reveal, question, score }) => {
  state.myScore = score;
  if (!reveal) {
    // Première question : afficher immédiatement
    showSpeedrunQuestion(question);
  } else {
    // L'utilisateur vient de cliquer — le feedback visuel est déjà affiché par onFlagClick.
    // On attend 250ms (flash visible) puis on passe à la question suivante.
    setTimeout(() => showSpeedrunQuestion(question), 250);
  }
});

socket.on('fg:scores', ({ scores }) => {
  const s = scores[state.myId];
  if (s !== undefined) {
    state.myScore = s;
    el('q-score').textContent = `${s} pts`;
  }
});

socket.on('fg:game_end', ({ ranking, mode }) => {
  showFinal(ranking, mode);
});

socket.on('fg:lobby', ({ players, settings }) => {
  state.myScore = 0;
  renderWaitingPlayers(players);
  applySettingsUI(settings);
  showScreen('screen-waiting');
});

socket.on('fg:kicked', ({ message }) => {
  alert(message || 'Tu as été exclu de la room.');
  location.reload();
});

socket.on('fg:error', ({ message }) => {
  const active = document.querySelector('.screen.active');
  if (active?.id === 'screen-lobby') {
    lobbyError(message);
  } else {
    document.getElementById('waiting-error').textContent = message;
  }
});

socket.on('disconnect', () => {
  const active = document.querySelector('.screen.active');
  if (active && active.id !== 'screen-lobby') {
    alert('Connexion perdue. Rafraîchis la page.');
  }
});
