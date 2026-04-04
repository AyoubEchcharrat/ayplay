// ── État global ────────────────────────────────────────────────────
let sessionId  = null;
let gameState  = null;   // { player, world, choices, ... }
let isLoading  = false;

// ── Messages de chargement ─────────────────────────────────────────
const LOADING_MSGS = [
  'Tissage de l\'univers en cours…',
  'Génération des personnages…',
  'Création du monde…',
  'Calibration de la narration…',
  'Invocation de l\'ambiance…',
  'Architecture du destin…',
  'Consultation des oracles…',
];
const LOADING_SUBS = [
  'Claude Opus pense à ton histoire…',
  'Chaque partie est unique.',
  'L\'univers se met en place…',
  'La magie opère…',
];

let loadingTimer = null;

function startLoadingCycle() {
  let i = 0, j = 0;
  document.getElementById('loading-msg').textContent = LOADING_MSGS[0];
  document.getElementById('loading-sub').textContent = LOADING_SUBS[0];
  loadingTimer = setInterval(() => {
    i = (i + 1) % LOADING_MSGS.length;
    j = (j + 1) % LOADING_SUBS.length;
    document.getElementById('loading-msg').textContent = LOADING_MSGS[i];
    document.getElementById('loading-sub').textContent = LOADING_SUBS[j];
  }, 2200);
}

function stopLoadingCycle() {
  if (loadingTimer) { clearInterval(loadingTimer); loadingTimer = null; }
}

// ── Navigation entre écrans ────────────────────────────────────────
function showScreen(name) {
  document.getElementById('screen-start').classList.add('hidden');
  document.getElementById('screen-loading').classList.add('hidden');
  document.getElementById('screen-game').classList.add('hidden');
  document.getElementById(`screen-${name}`).classList.remove('hidden');
}

// ── Démarrer une partie ────────────────────────────────────────────
async function startGame() {
  const premise = document.getElementById('premise-input').value.trim();
  if (!premise) {
    alert('Décris d\'abord ton univers !');
    return;
  }

  showScreen('loading');
  startLoadingCycle();

  try {
    const res  = await fetch('/api/rpg/start', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ premise }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur serveur');

    sessionId = data.sessionId;
    gameState = {
      player:    data.player,
      world:     data.world,
      choices:   data.choices,
      narrative: data.narrative,
    };

    applyTheme(data.theme);
    stopLoadingCycle();
    showScreen('game');
    renderGame(data.narrative, data.choices, true);
  } catch (err) {
    stopLoadingCycle();
    showScreen('start');
    alert('Erreur : ' + err.message);
  }
}

// ── Appliquer le thème dynamique ───────────────────────────────────
function applyTheme(theme) {
  const root = document.documentElement;
  root.style.setProperty('--bg',      theme.bg);
  root.style.setProperty('--surface', theme.surface);
  root.style.setProperty('--primary', theme.primary);
  root.style.setProperty('--text',    theme.text);
  root.style.setProperty('--muted',   theme.muted);
  root.style.setProperty('--border',  theme.border);
  root.style.setProperty('--font-t',  `'${theme.fontTitle}', serif`);
  root.style.setProperty('--font-b',  `'${theme.fontBody}', sans-serif`);

  // Charger les Google Fonts dynamiquement
  const fontNames  = [theme.fontTitle, theme.fontBody];
  const fontQuery  = fontNames.map(f => f.replace(/ /g, '+')).join('&family=');
  const link       = document.getElementById('font-link');
  link.href        = `https://fonts.googleapis.com/css2?family=${fontQuery}&display=swap`;
}

// ── Rendu complet du jeu ───────────────────────────────────────────
function renderGame(narrative, choices, isNew = false) {
  // Player header
  const p = gameState.player;
  document.getElementById('player-avatar').textContent = p.avatar;
  document.getElementById('player-name').textContent   = p.name;
  document.getElementById('player-desc').textContent   = p.description;

  // World header
  const w = gameState.world;
  document.getElementById('world-location').textContent   = w.location;
  document.getElementById('world-time').textContent        = w.time;
  document.getElementById('world-atmosphere').textContent  = w.atmosphere;

  // Stats
  renderStats(p.stats);

  // Inventaire
  renderInventory(p.inventory);

  // Narrative avec typewriter
  renderNarrative(narrative, isNew);

  // Choix
  renderChoices(choices);
}

function renderStats(stats) {
  const el = document.getElementById('stats-list');
  el.innerHTML = '';
  stats.forEach(stat => {
    const pct = Math.round((stat.value / stat.max) * 100);
    const div = document.createElement('div');
    div.className = 'stat-item';
    div.innerHTML = `
      <div class="stat-header">
        <span class="stat-name">${stat.icon} ${stat.name}</span>
        <span class="stat-val">${stat.value}/${stat.max}</span>
      </div>
      <div class="stat-bar">
        <div class="stat-fill" style="width:${pct}%;background:${stat.color}"></div>
      </div>`;
    el.appendChild(div);
  });
}

function renderInventory(inventory) {
  const el = document.getElementById('inventory-grid');
  el.innerHTML = '';
  if (!inventory.length) {
    el.innerHTML = '<span style="font-size:.7rem;color:var(--muted)">Vide</span>';
    return;
  }
  inventory.forEach(item => {
    const div = document.createElement('div');
    div.className = 'inv-item';
    div.innerHTML = `
      <div class="inv-qty">${item.qty > 1 ? item.qty : ''}</div>
      <div class="inv-icon">${item.icon}</div>
      <div class="inv-name">${item.name}</div>
      <div class="inv-tooltip">${item.name}<br><span style="color:var(--muted)">${item.desc}</span></div>`;
    el.appendChild(div);
  });
}

// ── Typewriter ─────────────────────────────────────────────────────
let typewriterTimeout = null;

function renderNarrative(text, animate = false) {
  const el = document.getElementById('narrative-text');
  clearTimeout(typewriterTimeout);

  if (!animate) {
    el.textContent = text;
    el.classList.remove('typing');
    scrollNarrativeBottom();
    return;
  }

  el.textContent = '';
  el.classList.add('typing');

  let i = 0;
  const speed = 14; // ms par caractère

  function type() {
    if (i < text.length) {
      el.textContent += text[i++];
      scrollNarrativeBottom();
      typewriterTimeout = setTimeout(type, speed);
    } else {
      el.classList.remove('typing');
    }
  }
  type();
}

function scrollNarrativeBottom() {
  const box = document.getElementById('narrative-box');
  box.scrollTop = box.scrollTop + 60;
}

// ── Choix ──────────────────────────────────────────────────────────
function renderChoices(choices) {
  const grid = document.getElementById('choices-grid');
  grid.innerHTML = '';
  choices?.forEach(choice => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.innerHTML = `<span class="choice-icon">${choice.icon}</span>${choice.text}`;
    btn.addEventListener('click', () => doAction(choice.text));
    grid.appendChild(btn);
  });
}

// ── Action joueur ──────────────────────────────────────────────────
async function doAction(action) {
  if (isLoading || !sessionId) return;
  isLoading = true;

  // Désactive les boutons
  document.querySelectorAll('.choice-btn').forEach(b => b.disabled = true);
  document.getElementById('btn-custom').disabled = true;
  document.getElementById('custom-input').disabled = true;
  document.getElementById('turn-loading').classList.remove('hidden');
  document.getElementById('turn-loading-msg').textContent = `GENESIS génère la suite…`;

  try {
    const res  = await fetch('/api/rpg/action', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ sessionId, action }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur serveur');

    // Met à jour l'état
    gameState.player  = data.player;
    gameState.world   = data.world;
    gameState.choices = data.choices;

    document.getElementById('turn-loading').classList.add('hidden');
    renderGame(data.narrative, data.choices, true);

    if (data.game_over) {
      setTimeout(() => {
        document.getElementById('overlay-msg').textContent = data.game_over_message || 'Fin de partie';
        document.getElementById('overlay').classList.remove('hidden');
      }, 2000);
    }

  } catch (err) {
    document.getElementById('turn-loading').classList.add('hidden');
    alert('Erreur : ' + err.message);
  } finally {
    isLoading = false;
    document.getElementById('btn-custom').disabled = false;
    document.getElementById('custom-input').disabled = false;
  }
}

function doCustom() {
  const input = document.getElementById('custom-input');
  const val   = input.value.trim();
  if (!val) return;
  input.value = '';
  doAction(val);
}

// ── Nouvelle partie ────────────────────────────────────────────────
function newGame() {
  sessionId = null;
  gameState = null;
  isLoading = false;
  document.getElementById('overlay').classList.add('hidden');

  // Remet les CSS variables par défaut
  const root = document.documentElement;
  root.style.removeProperty('--bg');
  root.style.removeProperty('--surface');
  root.style.removeProperty('--primary');
  root.style.removeProperty('--text');
  root.style.removeProperty('--muted');
  root.style.removeProperty('--border');
  root.style.removeProperty('--font-t');
  root.style.removeProperty('--font-b');

  showScreen('start');
}

// ── Tags d'exemples ────────────────────────────────────────────────
const EXAMPLES = {
  '⚔️ Fantasy sombre':     'RPG fantasy médiéval sombre, ruines elfiques maudites, héros torturé par un passé mystérieux',
  '💕 Visual novel romance': 'Visual novel romance lycée japonais, rencontre sous la pluie, premier amour hésitant et doux',
  '☢️ Survival post-apo':  'Survival post-apocalyptique dans une ville abandonnée, ressources rares, factions rivales hostiles',
  '🌌 Space opera':         'Space opera galactique, pilote rebelle, empire tyrannique, planètes lointaines et aliens mystérieux',
  '🔍 Détective noir':      'Roman noir années 40, détective privé cynique, meurtre d\'une starlet d\'Hollywood, complots sombres',
  '🍵 Slice of life':       'Slice of life apaisant, jeune pâtissier qui reprend la boulangerie de sa grand-mère dans un village',
};

function setEx(el) {
  document.getElementById('premise-input').value = EXAMPLES[el.textContent] || el.textContent;
}

// ── Entrée custom via Enter ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('custom-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') doCustom();
  });
  document.getElementById('premise-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      startGame();
    }
  });
});
