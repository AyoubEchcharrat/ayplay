/* ══════════════════════════════════════════════════════════════
   RiftBoard — Client JS
   ══════════════════════════════════════════════════════════════ */

const socket = io('/rb');

// ── Reconnexion automatique ────────────────────────────────────
socket.on('connect', () => {
  const savedRoom = sessionStorage.getItem('rb_room');
  const savedId   = sessionStorage.getItem('rb_myId');
  const savedName = sessionStorage.getItem('rb_myName');
  // Toujours tenter un rejoin si on a des données sauvegardées (pas de check savedId===socket.id)
  if (savedRoom && (savedId || savedName)) {
    S.myId = socket.id;
    S.roomCode = savedRoom;
    socket.emit('rb:rejoin', { roomCode: savedRoom, previousId: savedId, playerName: savedName });
  }
});
socket.on('reconnect_failed', () => {
  showToast('❌ Reconnexion impossible. Actualisez la page.', 'error');
});
// Reçu UNIQUEMENT par le joueur qui se reconnecte
socket.on('rb:reconnected', ({ team, playerName }) => {
  sessionStorage.setItem('rb_myId', socket.id);
  S.myId = socket.id;
  if (team) { S.myTeam = team; sessionStorage.setItem('rb_myTeam', team); }
  showToast(`✅ Reconnexion réussie (${playerName || ''})`, 'success');
});
// Notification pour l'autre joueur
socket.on('rb:player_reconnected', ({ message }) => showToast(message, 'info'));
socket.on('rb:player_disconnected', ({ message }) => showToast(message, 'warn'));

// ── State ──────────────────────────────────────────────────────
const S = {
  myId: null,
  myTeam: null,
  roomCode: null,
  phase: 'lobby',
  gameState: null,
  selectedChampions: [],
  selectedAction: null,  // 'move'|'attack'|'s1'|'s2'|'ultim'
  activePieceId: null,
  placingChampionId: null,
  hoveredPiece: null,
};

// Champion definitions (mirrored from server for display)
const CHAMPIONS = {
  karek:  { name:'Gavik',  title:'Le Brise-Ligne',         class:'Tank-Guerrier', element:'terre',   emoji:'🪨', spd:2,
    s1:{name:'Charge Tellurique',   desc:'Fonce en ligne droite sur 4 cases, repousse les ennemis sur le côté et les embrase par friction.'},
    s2:{name:'Frappe Sismique',     desc:'Frappe en arc avant, ralentit les ennemis 1 tour.'},
    u:{name:'Pilier de Terre',      desc:'Immobile 2 tours, renvoie 40% des dégâts.'},
    stats:{hp:2800,atk:220,arm:60,rm:30,spd:2,move:2,atkRange:1} },
  lysha:  { name:'Lysha',  title:'La Lame-Fantôme',         class:'Assassin',      element:'vent',    emoji:'🗡️', spd:5,
    s1:{name:'Bond Diagonal',       desc:'Téléporte en diagonale et attaque en arrivant.'},
    s2:{name:'Lacération en X',     desc:'4 diagonales: dégâts + saignement 3 tours.'},
    u:{name:'Lame du Néant',        desc:'Ignore l\'armure. Exécute si cible < 35% PV.'},
    stats:{hp:1300,atk:280,arm:20,rm:25,spd:5,move:3,atkRange:1} },
  sayl:   { name:'Sayl',   title:'Le Tisserand d\'Ombre',   class:'Mage',          element:'ombre',   emoji:'🌑', spd:4,
    s1:{name:'Invocation d\'Ombre', desc:'Invoque une ombre spectrale sur la case ciblée (portée 2). L\'ombre peut se déplacer, attaquer (50% ATK) et utiliser Désincarnation pour se dissoudre.'},
    s2:{name:'Transposition',       desc:'Échange instantanément sa position avec celle de l\'ombre invoquée.'},
    u:{name:'Voile Noir',           desc:'Sayl devient invisible pour l\'adversaire pendant 3 tours (déplacement max 2 cases). L\'invisibilité est brisée si Sayl prend des dégâts.'},
    stats:{hp:1600,atk:240,arm:25,rm:50,spd:4,move:3,atkRange:2} },
  velara: { name:'Vélara', title:'L\'Ensorcelleuse des Marées', class:'Mage-Support', element:'eau',  emoji:'🌊', spd:3,
    s1:{name:'Vague Dévastatrice',  desc:'Lance une vague sur 4 cases (8 sur rivière) dans n\'importe quelle direction. Dégâts + recul ennemis. Recul alliés sans dégâts. Éteint Embrasé.'},
    s2:{name:'Brume Glacée',        desc:'Zone rayon 2 : dégâts magiques + Gelé 2 tours aux ennemis.'},
    u:{name:'Bénédiction des Marées', desc:'+20 ATK flat +5% ATK +1 mouvement à un allié pendant 2 tours.'},
    stats:{hp:1700,atk:200,arm:30,rm:55,spd:3,move:2,atkRange:2} },
  pyrox:  { name:'Richard', title:'Cœur de Dragon',          class:'Mage',          element:'feu',    emoji:'🔥', spd:3,
    s1:{name:'Trait de Feu',        desc:'Tir ligne 6 cases: 350 dégâts + Embrasé.'},
    s2:{name:'Explosion Diagonale', desc:'2 flammes diagonales avant, AoE à l\'impact.'},
    u:{name:'Éruption',             desc:'Explosion rayon 3: 500 dégâts à tous, -200 PV soi.'},
    stats:{hp:1500,atk:260,arm:20,rm:45,spd:3,move:2,atkRange:2} },
  gorath: { name:'Gorath', title:'La Forteresse',            class:'Tank',          element:'terre',  emoji:'🏰', spd:1,
    s1:{name:'Mur de Pierre',       desc:'Érige un mur de 3 cases de large pendant 5 tours.'},
    s2:{name:'Rush de Forteresse',  desc:'+4 déplacement ce tour, -25% ARM/RM jusqu\'au prochain tour.'},
    u:{name:'Bastion Absolu',       desc:'Invulnérable 2 tours, renvoie 50% des dégâts.'},
    stats:{hp:3800,atk:180,arm:90,rm:60,spd:1,move:2,atkRange:1} },
  aelys:  { name:'Aelys',  title:'La Gardienne',             class:'Support',       element:'lumière',emoji:'✨', spd:3,
    s1:{name:'Rayon de Soin',       desc:'Soin ciblé à portée 3 : soigne un allié (350 PV) ou blesse un ennemi (200 PV).'},
    s2:{name:'Croix de Lumière',    desc:'Diagonales: soigne alliés 150 PV, blesse ennemis.'},
    u:{name:'Renaissance',          desc:'Ressuscite un allié éliminé avec 600 PV. (1×/game)'},
    stats:{hp:1400,atk:160,arm:35,rm:65,spd:3,move:2,atkRange:2} },
  rohn:   { name:'Rohn',   title:'Le Traqueur',              class:'Chasseur',      element:'nature', emoji:'🏹', spd:4,
    s1:{name:'Flèche Longue Portée',desc:'Tir ligne 7 cases. ×2 dégâts si cible empoisonnée.'},
    s2:{name:'Piège Diagonal',      desc:'Pose 2 pièges diagonaux: immobilise + 150 dégâts.'},
    u:{name:'Traque Sans Fin',      desc:'Marque une cible 3 tours: +1 move vers elle, poison auto.'},
    stats:{hp:1900,atk:230,arm:40,rm:35,spd:4,move:3,atkRange:3} },
  vek:    { name:'Vek',    title:'La Bête des Profondeurs',  class:'Tank-Bruiser',  element:'bête',   emoji:'🦷', spd:2,
    s1:{name:'Morsure Vorace',      desc:'Morsure adjacente : dégâts + saignement 3 tours + vol de vie (30%, 60% si cible saigne déjà).'},
    s2:{name:'Rugissement',         desc:'3 cases devant: repousse les ennemis d\'1 case.'},
    u:{name:'Rage des Abysses',     desc:'2 tours: attaques frappent aussi 2 diagonales avant.'},
    stats:{hp:2600,atk:250,arm:55,rm:40,spd:2,move:2,atkRange:1} },
  zhen:   { name:'Zhen',   title:'Le Moine de l\'Éclair',   class:'Duelliste',     element:'foudre', emoji:'⚡', spd:4,
    s1:{name:'Chaîne d\'Éclairs',  desc:'Ligne 5 cases, rebondit 2× en diagonale (70%/rebond).'},
    s2:{name:'Dash Électrique',     desc:'Dash diagonal 3 cases, traînée électrique derrière.'},
    u:{name:'Tempête Convergente',  desc:'Éclairs 8 directions, 300 dégâts. Étourdi 1 tour après.'},
    stats:{hp:1800,atk:210,arm:35,rm:45,spd:4,move:3,atkRange:2} },
  sayl_shadow: { name:'Ombre', title:'Projection Spectrale', class:'Mage', element:'ombre', emoji:'👤', spd:4,
    s1:{name:'Désincarnation', desc:'Dissout l\'ombre immédiatement.'},
    s2:{name:'',desc:''}, u:{name:'',desc:''},
    stats:{hp:600,atk:120,arm:0,rm:0,spd:4,move:2,atkRange:1} },
};

const CHAMPION_LIST = ['karek','lysha','sayl','velara','pyrox','gorath','aelys','rohn','vek','zhen'];

// ── Champion images ────────────────────────────────────────────
const CHAMPION_IMGS = {
  karek:  "ChatGPT Image Apr 10, 2026, 07_05_01 PM.png",
  lysha:  "Lysha, the Ghostly Assassin.png",
  sayl:   "Le Tisserand d'Ombre in shadowcraft.png",
  velara: "Velara, mage of the tides.png",
  pyrox:  "Le Brasier Vivant_ Pyrox's fiery power.png",
  gorath: "La Forteresse_ guardian of stone and crystals.png",
  aelys:  "La Gardienne, the light's protector.png",
  rohn:   "Le Traqueur and his companions.png",
  vek:    "La Bête des Profondeurs emerges.png",
  zhen:   "The monk of lightning's fury.png",
};

function champImgSrc(championId) {
  const file = CHAMPION_IMGS[championId];
  if (!file) return null;
  return '/assets/pion_imgs/' + encodeURIComponent(file);
}

function champVisual(championId, fallbackEmoji, cssClass) {
  const src = champImgSrc(championId);
  if (src) return `<img src="${src}" class="${cssClass || 'piece-img'}" alt="">`;
  return fallbackEmoji || '❓';
}

const STATUS_ICONS = {
  'embrasé':'🔥','saignement':'🩸','poison':'🟢','ralenti':'🐢','gelé':'❄️',
  'immobilisé':'⛓️','étourdi':'💫','invisible':'👻','provoqué':'😤',
  'pilier':'🪨','bastion':'🛡️','rage':'😡','immunisé_embrasé':'🧯',
};

const TERRAIN_COLORS = {
  lane:'cell-lane', jungle:'cell-jungle', river:'cell-river',
  bridge:'cell-bridge', base:'cell-base', fountain:'cell-fountain',
};

const AVATARS = ['🦊','🐺','🦁','🐻','🐼','🦋','🐙','🦈','🦅','🦉','🌙','⭐','🔥','💎','🎭','🎯','🚀','⚡'];

let selectedAvatar = '🦊';

// ── Utility ────────────────────────────────────────────────────
const el = id => document.getElementById(id);

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  el(id).classList.add('active');
  const hub = el('hub-btn');
  if (hub) hub.style.display = (id === 'screen-lobby') ? '' : 'none';
}

function chebyshev(r1,c1,r2,c2) { return Math.max(Math.abs(r1-r2), Math.abs(c1-c2)); }

function showToast(msg, type = '') {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const t = document.createElement('div');
  t.className = 'toast' + (type ? ' toast-' + type : '');
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3100);
}

function getTeam(playerId) {
  if (!S.gameState) return null;
  const p = S.gameState.players.find(p => p.id === playerId);
  return p ? p.team : null;
}

function isMyPiece(piece) {
  return piece && piece.team === S.myTeam;
}

function getCurrentPiece() {
  if (!S.gameState) return null;
  const id = S.gameState.currentPieceId;
  return S.gameState.pieces.find(p => p.id === id);
}

function isMyTurn() {
  const cp = getCurrentPiece();
  return cp && cp.team === S.myTeam;
}

// ── Lobby ──────────────────────────────────────────────────────
function buildAvatarGrid() {
  const grid = el('avatar-grid');
  AVATARS.forEach(em => {
    const d = document.createElement('div');
    d.className = 'avatar-opt' + (em === selectedAvatar ? ' selected' : '');
    d.textContent = em;
    d.onclick = () => {
      document.querySelectorAll('.avatar-opt').forEach(a => a.classList.remove('selected'));
      d.classList.add('selected');
      selectedAvatar = em;
    };
    grid.appendChild(d);
  });
}
buildAvatarGrid();

el('tab-join').onclick = () => {
  el('tab-join').classList.add('active'); el('tab-create').classList.remove('active');
  el('panel-join').style.display=''; el('panel-create').style.display='none';
};
el('tab-create').onclick = () => {
  el('tab-create').classList.add('active'); el('tab-join').classList.remove('active');
  el('panel-create').style.display=''; el('panel-join').style.display='none';
};

el('btn-join').onclick = () => {
  const name = el('inp-name-join').value.trim();
  const code = el('inp-code').value.trim().toUpperCase();
  if (!name) return setErr('lobby-error','Entre un pseudo');
  if (!code) return setErr('lobby-error','Entre un code de room');
  socket.emit('rb:join', { name, avatar:selectedAvatar, code });
};
el('btn-create').onclick = () => {
  const name = el('inp-name-create').value.trim();
  if (!name) return setErr('lobby-error','Entre un pseudo');
  socket.emit('rb:create', { name, avatar:selectedAvatar });
};
['inp-name-join','inp-code'].forEach(id => el(id).addEventListener('keydown', e => { if(e.key==='Enter') el('btn-join').click(); }));
el('inp-name-create').addEventListener('keydown', e => { if(e.key==='Enter') el('btn-create').click(); });

function setErr(id, msg) { el(id).textContent = msg; }

// ── Waiting room ───────────────────────────────────────────────
function renderWaiting(state) {
  el('waiting-code').textContent = S.roomCode;
  const list = el('waiting-players');
  list.innerHTML = state.players.map(p => `
    <div class="player-row">
      <span class="player-avatar">${p.avatar}</span>
      <span class="player-name">${p.name}</span>
      <span class="player-team-badge ${p.team === 'blue' ? 'team-blue' : 'team-red'}">${p.team === 'blue' ? '🔵 Bleu' : '🔴 Rouge'}</span>
    </div>`).join('');
  const isHost = state.players[0]?.id === S.myId;
  el('btn-start-draft').style.display = (isHost && state.players.length === 2) ? '' : 'none';
  el('waiting-for').style.display = state.players.length < 2 ? '' : 'none';
}

el('btn-start-draft').onclick = () => socket.emit('rb:start_draft');

// ── Draft ──────────────────────────────────────────────────────
function renderDraft() {
  const grid = el('draft-grid');
  grid.innerHTML = '';
  CHAMPION_LIST.forEach(id => {
    const c = CHAMPIONS[id];
    const card = document.createElement('div');
    card.className = 'champ-card';
    card.dataset.id = id;
    card.innerHTML = `
      <div class="champ-card-emoji">${champVisual(id, c.emoji, 'card-img')}</div>
      <div class="champ-card-name">${c.name}</div>
      <div class="champ-card-class">${c.class}</div>
      <div class="champ-card-element el-${c.element}">${c.element}</div>`;
    card.onclick = () => toggleDraftChampion(id);
    card.onmouseenter = () => showChampDetail(id);
    grid.appendChild(card);
  });
  renderDraftSidebar();
}

function toggleDraftChampion(id) {
  const idx = S.selectedChampions.indexOf(id);
  if (idx >= 0) {
    S.selectedChampions.splice(idx, 1);
  } else {
    if (S.selectedChampions.length >= 5) return;
    S.selectedChampions.push(id);
  }
  // Update card states
  document.querySelectorAll('.champ-card').forEach(c => {
    c.classList.toggle('selected', S.selectedChampions.includes(c.dataset.id));
  });
  renderDraftSidebar();
}

function renderDraftSidebar() {
  const list = el('draft-selected-list');
  list.innerHTML = S.selectedChampions.map(id => {
    const c = CHAMPIONS[id];
    return `<div class="selected-chip" onclick="toggleDraftChampion('${id}')">${c.emoji} ${c.name} ×</div>`;
  }).join('');
  el('draft-subtitle').textContent = `Choisissez 5 champions — ${S.selectedChampions.length}/5 sélectionnés`;
  el('btn-confirm-draft').disabled = S.selectedChampions.length !== 5;
}

function showChampDetail(id) {
  const c = CHAMPIONS[id];
  const panel = el('champ-detail');
  panel.style.display = '';
  const cdSrc = champImgSrc(id);
  if (cdSrc) { el('cd-emoji').innerHTML = `<img src="${cdSrc}" style="width:52px;height:52px;object-fit:cover;border-radius:8px;" alt="">`; }
  else { el('cd-emoji').textContent = c.emoji; }
  el('cd-name').textContent = c.name;
  el('cd-title').textContent = c.title;
  el('cd-class').textContent = `${c.class} · ${c.element}`;
  el('cd-stats').innerHTML = `
    <div class="stat-item">❤️ PV: <span>${c.stats.hp}</span></div>
    <div class="stat-item">⚔️ ATK: <span>${c.stats.atk}</span></div>
    <div class="stat-item">🛡️ ARM: <span>${c.stats.arm}</span></div>
    <div class="stat-item">✨ RM: <span>${c.stats.rm}</span></div>
    <div class="stat-item">⚡ SPD: <span>${c.stats.spd}</span></div>
    <div class="stat-item">🚶 MOVE: <span>${c.stats.move}</span></div>`;
  el('cd-spells').innerHTML = `
    <div class="spell-item"><div class="spell-name">Sort 1 — ${c.s1.name}</div><div class="spell-desc">${c.s1.desc}</div></div>
    <div class="spell-item"><div class="spell-name">Sort 2 — ${c.s2.name}</div><div class="spell-desc">${c.s2.desc}</div></div>
    <div class="spell-item"><div class="spell-name">✨ Ultim — ${c.u.name}</div><div class="spell-desc">${c.u.desc}</div></div>`;
}

el('btn-confirm-draft').onclick = () => {
  if (S.selectedChampions.length === 5) socket.emit('rb:draft', { championIds: S.selectedChampions });
};

// ── Placement ──────────────────────────────────────────────────
function renderPlacementScreen(state) {
  el('placement-subtitle').textContent = 'Placez vos 5 champions dans votre base';
  buildBoard('board-placement', state, 'placement');
  renderPlacementQueue(state);
}

function renderPlacementQueue(state) {
  const queue = el('placement-queue');
  if (!state) { queue.innerHTML=''; return; }
  const me = state.players.find(p => p.id === S.myId);
  if (!me) return;
  const placed = state.pieces.filter(p => p.team === S.myTeam).map(p => p.championId);
  queue.innerHTML = me.chosenChampions.map(id => {
    const c = CHAMPIONS[id];
    const isPlaced = placed.includes(id);
    const isActive = S.placingChampionId === id;
    return `<div class="pq-item ${isActive?'active-place':''} ${isPlaced?'placed':''}" onclick="selectForPlacement('${id}')">
      <span class="pq-emoji">${champVisual(id, c.emoji, 'pq-img')}</span>
      <span class="pq-name">${c.name}</span>
      ${isPlaced?'<span style="font-size:0.65rem;color:var(--green)">✓</span>':''}
    </div>`;
  }).join('');
}

function selectForPlacement(id) {
  if (!S.gameState) return;
  const placed = S.gameState.pieces.filter(p => p.team === S.myTeam).map(p => p.championId);
  if (placed.includes(id)) return;
  S.placingChampionId = id;
  renderPlacementScreen(S.gameState);
  buildBoard('board-placement', S.gameState, 'placement');
}

// ── Board rendering ────────────────────────────────────────────
function buildBoard(boardId, state, mode = 'game') {
  const board = el(boardId);
  board.innerHTML = '';

  const ROWS = state.terrain ? state.terrain.length : 13, COLS = 13;
  const terrain = state.terrain;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('div');
      const t = getCellTerrain(state, r, c);
      cell.className = `cell ${TERRAIN_COLORS[t] || 'cell-lane'}`;
      cell.dataset.row = r; cell.dataset.col = c;

      // Terrain emoji accent
      if (t === 'river') cell.innerHTML = '<span class="river-wave" style="opacity:0.15">〰</span>';
      if (t === 'jungle') cell.innerHTML = '<span style="font-size:0.5rem;opacity:0.2;position:absolute;bottom:1px;right:1px">🌿</span>';

      // Wall overlay
      const wall = state.walls?.find(w => w.r === r && w.c === c);
      if (wall) {
        cell.classList.add('cell-wall');
        cell.innerHTML = '<div class="wall-obj">🧱</div>';
      }

      // Trail overlay
      const trail = state.trails?.find(tr => tr.r === r && tr.c === c);
      if (trail) {
        cell.style.boxShadow = 'inset 0 0 8px rgba(200,200,0,0.3)';
      }

      // Fountain
      const fountain = getFountainAt(state, r, c);
      if (fountain) {
        const pct = fountain.maxHp > 0 ? (fountain.hp / fountain.maxHp) * 100 : 0;
        const fillClass = pct > 60 ? 'high' : pct > 25 ? 'medium' : 'low';
        const dead = fountain.hp <= 0;
        cell.innerHTML = `
          <div class="fountain-obj fountain-${fountain.team} ${dead?'fountain-destroyed':''}">
            <span>${fountain.team==='blue'?'🏰':'⚔️'}</span>
            <div class="fountain-hp-bar"><div class="fountain-hp-fill ${fillClass}" style="width:${pct}%"></div></div>
          </div>`;
      }

      // Trap (only show own traps)
      const trap = state.traps?.find(tr => tr.r === r && tr.c === c && tr.team === S.myTeam);
      if (trap) {
        const trapEl = document.createElement('div');
        trapEl.className = 'trap-obj';
        trapEl.style.cssText = 'position:absolute;inset:30%';
        cell.appendChild(trapEl);
      }

      // Piece
      const piece = state.pieces.find(p => p.row === r && p.col === c);
      if (piece) {
        const champDef = CHAMPIONS[piece.championId] || {};
        const pct = piece.maxHp > 0 ? (piece.hp / piece.maxHp) * 100 : 0;
        const fillClass = pct > 60 ? 'full' : pct > 25 ? 'medium' : 'low';
        const isCurrent = state.currentPieceId === piece.id;
        const isActive = S.activePieceId === piece.id;
        const isShadow = piece.championId === 'sayl_shadow';

        const pieceEl = document.createElement('div');
        pieceEl.className = `piece piece-${piece.team} ${isCurrent&&isMyTurn()?'piece-active':''} ${!piece.alive?'piece-dead':''} ${isShadow?'piece-shadow':''}`;
        pieceEl.dataset.pieceId = piece.id;

        const statuses = piece.statuses || [];
        const statusIcons = statuses.slice(0,4).map(s => `<span class="status-icon">${STATUS_ICONS[s.name]||'?'}</span>`).join('');

        const shortName = (champDef.name || piece.championId).slice(0,5).toUpperCase();
        pieceEl.innerHTML = `
          <div class="piece-statuses">${statusIcons}</div>
          <div class="piece-emoji">${isShadow ? (champDef.emoji || '👤') : champVisual(piece.championId, champDef.emoji, 'piece-img')}</div>
          <div class="piece-name-mini">${isShadow ? 'OMB' : shortName}</div>
          <div class="piece-hp-bar"><div class="piece-hp-fill ${fillClass}" style="width:${pct}%"></div></div>`;

        pieceEl.addEventListener('click', (e) => { e.stopPropagation(); onPieceClick(piece, cell, r, c, mode); });
        pieceEl.addEventListener('mouseenter', () => showHoveredPiece(piece));
        pieceEl.addEventListener('mouseleave', () => hideHoveredPiece());
        cell.appendChild(pieceEl);
      }

      // Click handler for board
      cell.addEventListener('click', () => onCellClick(r, c, mode));

      board.appendChild(cell);
    }
  }

  // Highlight valid placement zones during placement phase
  if (mode === 'placement') {
    const validRows = S.myTeam === 'blue' ? [11, 12] : [0, 1];
    for (let r = 0; r < (state.terrain?.length || 13); r++) {
      for (let c = 0; c < 13; c++) {
        if (validRows.includes(r)) {
          const idx = r * 13 + c;
          const cell = board.children[idx];
          if (cell && !cell.querySelector('.piece') && !cell.querySelector('.fountain-obj')) {
            cell.classList.add('highlight-place');
          }
        }
      }
    }
  }
}

function getCellTerrain(state, r, c) {
  // Check fountain cells first
  const allFountains = [...(state.fountains||[])];
  if (allFountains.find(f => f.row===r && f.col===c)) return 'fountain';
  return state.terrain?.[r]?.[c] || 'lane';
}

function getFountainAt(state, r, c) {
  return (state.fountains||[]).find(f => f.row===r && f.col===c);
}

function getCellEl(boardId, r, c) {
  const board = el(boardId);
  const idx = r * 13 + c;
  return board.children[idx];
}

// ── Highlights ──────────────────────────────────────────────────
function clearHighlights(boardId) {
  document.querySelectorAll(`#${boardId} .cell`).forEach(c => {
    c.classList.remove('highlight-move','highlight-attack','highlight-attack-range','highlight-spell','highlight-place','selected-cell');
  });
}

function highlightCells(boardId, cells, type) {
  cells.forEach(([r,c]) => {
    const cellEl = getCellEl(boardId, r, c);
    if (cellEl) cellEl.classList.add(`highlight-${type}`);
  });
}

// ── Piece interaction ──────────────────────────────────────────
function onPieceClick(piece, cellEl, r, c, mode) {
  if (mode === 'placement') {
    if (S.placingChampionId) onCellClick(r, c, mode);
    return;
  }
  if (mode !== 'game') return;

  // Clic sans action : ouvrir modal champion
  if (!S.selectedAction) {
    openChampModal(piece);
    return;
  }

  if (!isMyTurn()) return;

  const cp = getCurrentPiece();
  if (!cp) return;

  // If it's not my active piece being clicked, check if it's an attack target
  if (piece.id === cp.id) {
    if (S.selectedAction && ['s1','s2','ultim'].includes(S.selectedAction)) {
      const targeting = getSpellTargeting(cp.championId, S.selectedAction);
      if (targeting === 'self' || targeting === 'aoe_self') {
        triggerSpellAnim(cp.championId, S.selectedAction, cp, r, c);
        socket.emit('rb:spell', { pieceId: cp.id, spellKey: S.selectedAction, targetRow: r, targetCol: c });
        S.selectedAction = null;
        clearHighlights('board-game');
        return;
      }
    }
    // Select my active piece again → show actions
    S.activePieceId = piece.id;
    renderActionPanel(cp);
    clearHighlights('board-game');
    S.selectedAction = null;
    return;
  }

  // If we have an action selected (attack/spell), this is the target
  if (S.selectedAction === 'attack' && piece.team !== S.myTeam && piece.alive) {
    triggerAttackAnim(cp.id, r, c);
    socket.emit('rb:attack', { pieceId: cp.id, targetRow: r, targetCol: c });
    S.selectedAction = null;
    clearHighlights('board-game');
    return;
  }
  if (['s1','s2','ultim'].includes(S.selectedAction) && piece.alive) {
    triggerSpellAnim(cp.championId, S.selectedAction, cp, r, c);
    socket.emit('rb:spell', { pieceId: cp.id, spellKey: S.selectedAction, targetRow: r, targetCol: c });
    S.selectedAction = null;
    clearHighlights('board-game');
    return;
  }
  if (S.selectedAction === 'ultim' && !piece.alive && piece.team === S.myTeam) {
    // Aelys resurrection targets dead ally
    triggerSpellAnim(cp.championId, 'ultim', cp, r, c);
    socket.emit('rb:spell', { pieceId: cp.id, spellKey: 'ultim', targetRow: r, targetCol: c });
    S.selectedAction = null;
    clearHighlights('board-game');
    return;
  }
}

function onCellClick(r, c, mode) {
  if (mode === 'placement') {
    if (!S.placingChampionId) return;
    if (!S.gameState) return;
    socket.emit('rb:place', { championId: S.placingChampionId, row: r, col: c });
    return;
  }

  if (mode !== 'game') return;
  if (!isMyTurn()) return;

  const cp = getCurrentPiece();
  if (!cp) return;

  const cellEl = getCellEl('board-game', r, c);

  if (S.selectedAction === 'move' && cellEl?.classList.contains('highlight-move')) {
    socket.emit('rb:move', { pieceId: cp.id, row: r, col: c });
    S.selectedAction = null;
    clearHighlights('board-game');
    return;
  }

  if (S.selectedAction === 'attack' && cellEl?.classList.contains('highlight-attack')) {
    // Could be a fountain or empty cell (for AoE spells)
    const fountain = getFountainAt(S.gameState, r, c);
    if (fountain && fountain.team !== S.myTeam) {
      triggerAttackAnim(cp.id, r, c);
      socket.emit('rb:attack', { pieceId: cp.id, targetRow: r, targetCol: c });
      S.selectedAction = null;
      clearHighlights('board-game');
    }
    return;
  }

  if (['s1','s2','ultim'].includes(S.selectedAction) && cellEl?.classList.contains('highlight-spell')) {
    triggerSpellAnim(cp.championId, S.selectedAction, cp, r, c);
    socket.emit('rb:spell', { pieceId: cp.id, spellKey: S.selectedAction, targetRow: r, targetCol: c });
    S.selectedAction = null;
    clearHighlights('board-game');
    return;
  }

  // Click elsewhere → deselect action
  if (S.selectedAction) {
    S.selectedAction = null;
    clearHighlights('board-game');
  } else {
    // Afficher info terrain si case vide
    const piece = S.gameState?.pieces?.find(p => p.row === r && p.col === c && p.alive);
    if (!piece) {
      const t = getCellTerrain(S.gameState, r, c);
      showTerrainToast(t);
    }
  }
}

// ── Action panel ───────────────────────────────────────────────
function renderActionPanel(piece) {
  if (!piece) { el('active-piece-panel').style.display='none'; return; }
  el('active-piece-panel').style.display = '';

  const champDef = CHAMPIONS[piece.championId] || {};
  const pct = piece.maxHp > 0 ? (piece.hp/piece.maxHp*100) : 0;
  const fillClass = pct > 60 ? 'full' : pct > 25 ? 'medium' : 'low';
  const colorMap = {'full':'var(--green)','medium':'#ffa502','low':'var(--red2)'};

  const statuses = (piece.statuses||[]).map(s =>
    `<span class="status-badge status-${s.name}">${STATUS_ICONS[s.name]||'?'} ${s.name} (${s.duration}t)</span>`
  ).join('');

  el('active-piece-info').innerHTML = `
    <div class="active-piece-card">
      <div class="apc-header">
        <span class="apc-emoji">${champVisual(piece.championId, champDef.emoji||'?', 'apc-img')}</span>
        <div>
          <div class="apc-name">${champDef.name||piece.championId}</div>
          <div class="apc-class">${champDef.class||''} · ${champDef.element||''}</div>
        </div>
      </div>
      <div class="apc-hp-bar"><div class="apc-hp-fill ${fillClass}" style="width:${pct}%;background:${colorMap[fillClass]}"></div></div>
      <div class="apc-stats-row">
        <span>❤️ ${piece.hp}/${piece.maxHp}</span>
        <span>⚔️ ${piece.atk}</span>
        <span>🛡️ ${piece.arm}</span>
        <span>✨ ${piece.rm}</span>
      </div>
      <div class="apc-statuses">${statuses}</div>
    </div>`;

  // Action buttons
  const acted = piece.actedThisTurn || {};
  const cds = piece.spellCooldowns || {};
  const isStunned = (piece.statuses||[]).some(s => s.name === 'étourdi');
  const isAnchor = piece.isAnchor;

  const effectiveMoveLeft = getEffectiveMove(piece, S.gameState);
  el('act-move').className = `act-btn ${(effectiveMoveLeft <= 0)||isAnchor||isStunned?'done':''}`;
  el('act-attack').className = `act-btn ${acted.attacked||isStunned?'done':''}`;
  el('act-end').className = 'act-btn btn-end-turn';

  // Spell buttons
  const spells = [
    { key:'s1', def:champDef.s1, cd:cds.s1||0 },
    { key:'s2', def:champDef.s2, cd:cds.s2||0 },
    { key:'ultim', def:champDef.u, cd:cds.ultim||0 },
  ];
  spells.forEach(sp => {
    const btn = el(`act-${sp.key==='ultim'?'ultim':sp.key}`);
    if (!btn) return;
    const onCd = sp.cd > 0;
    const done = acted.spelled || isStunned;
    btn.className = `act-btn ${done||onCd?'done':''}`;
    const spellIcon = sp.key==='ultim' ? '✨' : sp.key==='s1' ? '🔮' : '💫';
    const spellLabel = sp.key==='ultim' ? 'Ultim' : sp.key==='s1' ? 'Sort 1' : 'Sort 2';
    const shortDesc = (sp.def?.desc || '').slice(0, 42) + ((sp.def?.desc||'').length > 42 ? '…' : '');
    btn.innerHTML = `${spellIcon} ${spellLabel}<span class="spell-label">${sp.def?.name||''}</span><span class="spell-desc-mini">${shortDesc}</span>${onCd ? `<span class="spell-cd-badge">(${sp.cd} tours)</span>` : ''}`;
    // Tooltip on hover
    btn.addEventListener('mouseenter', () => showSpellTooltip(btn, sp.def, sp.cd));
    btn.addEventListener('mouseleave', hideSpellTooltip);
  });
}

// ── Hovered piece info ─────────────────────────────────────────
function showHoveredPiece(piece) {
  const champDef = CHAMPIONS[piece.championId] || {};
  el('hovered-piece-panel').style.display = '';
  const pct = piece.maxHp > 0 ? (piece.hp / piece.maxHp * 100) : 0;
  const barColor = pct > 60 ? 'var(--green)' : pct > 25 ? '#ffa502' : 'var(--red2)';
  el('hovered-piece-info').innerHTML = `
    <div class="hover-piece-card">
      <div class="hpc-header">
        <span class="hpc-emoji">${champVisual(piece.championId, champDef.emoji||'?', 'hpc-img')}</span>
        <div style="flex:1">
          <div class="hpc-name">${champDef.name||piece.championId}</div>
          <div class="hpc-hp">❤️ ${piece.hp}/${piece.maxHp}</div>
          <div style="height:5px;background:rgba(255,255,255,0.1);border-radius:3px;margin-top:3px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${barColor};border-radius:3px;transition:width 0.3s"></div>
          </div>
        </div>
      </div>
      <div class="hpc-stats">
        <div class="hpc-stat">⚔️ <span>${piece.atk}</span></div>
        <div class="hpc-stat">🛡️ <span>${piece.arm}</span></div>
        <div class="hpc-stat">✨ <span>${piece.rm}</span></div>
        <div class="hpc-stat">⚡ <span>${piece.spd}</span></div>
        <div class="hpc-stat">🚶 <span>${piece.move}</span></div>
      </div>
    </div>`;
}
function hideHoveredPiece() {
  el('hovered-piece-panel').style.display = 'none';
}

// ── Spell tooltip ───────────────────────────────────────────────
let _spellTip = null;
function showSpellTooltip(btn, spellDef, cd) {
  if (!spellDef) return;
  hideSpellTooltip();
  const tip = document.createElement('div');
  tip.className = 'spell-tooltip-popup';
  const cdText = cd > 0 ? `<div class="stp-stats">⏳ Recharge: <span class="stp-key">${cd} tours</span></div>` : '';
  tip.innerHTML = `<div class="stp-title">${spellDef.name || ''}</div><div class="stp-desc">${spellDef.desc || ''}</div>${cdText}`;
  document.body.appendChild(tip);
  _spellTip = tip;
  // Position above button
  const r = btn.getBoundingClientRect();
  tip.style.left = Math.max(4, r.left - 10) + 'px';
  tip.style.top  = Math.max(4, r.top - tip.offsetHeight - 8) + 'px';
}
function hideSpellTooltip() {
  if (_spellTip) { _spellTip.remove(); _spellTip = null; }
}

// ── Turn order bar ─────────────────────────────────────────────
function renderTurnOrderBar(state) {
  const bar = el('turn-order-bar');
  if (!bar || !state.turnOrder) return;
  bar.innerHTML = state.turnOrder.map(id => {
    const p = state.pieces.find(p => p.id === id);
    if (!p) return '';
    const champDef = CHAMPIONS[p.championId] || {};
    const isCurrent = id === state.currentPieceId;
    const chipVis = champVisual(p.championId, champDef.emoji||'?', 'chip-img');
    return `<div class="turn-chip ${p.team}-piece ${isCurrent?'active-turn':''} ${!p.alive?'dead-piece':''}" title="${champDef.name||id}">${chipVis}</div>`;
  }).join('');
}

// ── Fountain status panel ──────────────────────────────────────
function renderFountainPanel(state) {
  const panel = el('fountain-status');
  if (!panel || !state.fountains) return;
  panel.innerHTML = state.fountains.map(f => {
    const pct = f.maxHp > 0 ? (f.hp/f.maxHp*100) : 0;
    const fillColor = pct > 60 ? 'var(--green)' : pct > 25 ? '#ffa502' : 'var(--red2)';
    const dead = f.hp <= 0;
    const label = f.id.includes('center') ? 'Centre' : f.id.includes('left') ? 'Gauche' : 'Droite';
    return `<div class="fountain-row ${dead?'fountain-dead':''}">
      <span class="fountain-icon">${f.team==='blue'?'🔵':'🔴'}</span>
      <span style="font-size:0.7rem;min-width:50px">${label}</span>
      <div class="fountain-bar-wrap"><div class="fountain-bar-fill" style="width:${pct}%;background:${fillColor}"></div></div>
      <span class="fountain-hp-text">${dead?'💥':f.hp}</span>
    </div>`;
  }).join('');
}

// ── Log ───────────────────────────────────────────────────────
function renderLog(state) {
  const log = el('game-log');
  if (!log || !state.log) return;
  log.innerHTML = [...state.log].reverse().map(entry => {
    let cls = 'log-entry';
    if (entry.includes('dégâts') || entry.includes('touche')) cls += ' log-damage';
    else if (entry.includes('soigné') || entry.includes('PV')) cls += ' log-heal';
    else if (entry.includes('éliminé') || entry.includes('détruit')) cls += ' log-death';
    else if (entry.includes('Tour ') || entry.includes('round')) cls += ' log-turn';
    else if (entry.includes('Sort') || entry.includes('Ultim') || entry.includes('lance')) cls += ' log-spell';
    else if (entry.includes('déplace') || entry.includes('vers')) cls += ' log-move';
    return `<div class="${cls}">${entry}</div>`;
  }).join('');
}

// ── Action button handlers ─────────────────────────────────────
function setupActionButtons() {
  el('act-move').onclick = () => {
    const cp = getCurrentPiece();
    if (!cp || getEffectiveMove(cp, S.gameState) <= 0 || isAnchorOrStunned(cp)) return;
    S.selectedAction = S.selectedAction === 'move' ? null : 'move';
    if (S.selectedAction === 'move') {
      clearHighlights('board-game');
      showMoveHighlights(cp);
    } else {
      clearHighlights('board-game');
    }
    updateActionBtnStates();
  };

  el('act-attack').onclick = () => {
    const cp = getCurrentPiece();
    if (!cp || cp.actedThisTurn?.attacked || isStunned(cp)) return;
    S.selectedAction = S.selectedAction === 'attack' ? null : 'attack';
    if (S.selectedAction === 'attack') {
      clearHighlights('board-game');
      showAttackHighlights(cp);
    } else {
      clearHighlights('board-game');
    }
    updateActionBtnStates();
  };

  ['s1','s2','ultim'].forEach(key => {
    const btnId = key === 'ultim' ? 'act-ultim' : `act-${key}`;
    el(btnId).onclick = () => {
      const cp = getCurrentPiece();
      if (!cp || cp.actedThisTurn?.spelled || isStunned(cp)) return;
      const cd = cp.spellCooldowns?.[key] || 0;
      if (cd > 0) return;
      S.selectedAction = S.selectedAction === key ? null : key;
      if (S.selectedAction === key) {
        clearHighlights('board-game');
        showSpellHighlights(cp, key);
      } else {
        clearHighlights('board-game');
      }
      updateActionBtnStates();
    };
  });

  el('act-end').onclick = () => {
    const cp = getCurrentPiece();
    if (!cp) return;
    S.selectedAction = null;
    clearHighlights('board-game');
    socket.emit('rb:end_turn', { pieceId: cp.id });
  };
}
setupActionButtons();

function isAnchorOrStunned(piece) {
  return piece.isAnchor || isStunned(piece);
}
function isStunned(piece) {
  return (piece.statuses||[]).some(s => s.name === 'étourdi');
}

function updateActionBtnStates() {
  ['move','attack','s1','s2','ultim'].forEach(a => {
    const btnId = a === 'ultim' ? 'act-ultim' : `act-${a}`;
    const btn = el(btnId);
    if (!btn) return;
    btn.classList.toggle('active', S.selectedAction === a);
  });
}

// ── Move highlights ────────────────────────────────────────────
function showMoveHighlights(piece) {
  if (!S.gameState) return;
  // Simple: Chebyshev distance up to moveRange, not on obstacle/piece/river
  const cells = getClientReachable(piece, S.gameState);
  highlightCells('board-game', cells, 'move');
}

function getClientReachable(piece, state) {
  const move = getEffectiveMove(piece, state);
  const occupied = new Set(state.pieces.filter(p => p.alive && p.id !== piece.id).map(p => `${p.row},${p.col}`));
  const fountainCells = new Set((state.fountains||[]).map(f => `${f.row},${f.col}`));
  const walls = new Set((state.walls||[]).map(w => `${w.r},${w.c}`));
  const ROWS = state.terrain ? state.terrain.length : 13;

  // Dijkstra-style: river costs 2 movement
  const distMap = new Map();
  distMap.set(`${piece.row},${piece.col}`, 0);
  const reachableSet = new Set();
  const queue = [{ r: piece.row, c: piece.col, d: 0 }];

  while (queue.length) {
    const { r, c, d } = queue.shift();
    if ((distMap.get(`${r},${c}`) ?? Infinity) < d) continue;

    for (const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nr=r+dr, nc=c+dc;
      const key=`${nr},${nc}`;
      if (nr<0||nr>=ROWS||nc<0||nc>=13) continue;

      const t = getCellTerrain(state, nr, nc);
      const cost = (t === 'river' || t === 'jungle') ? 2 : 1;
      const nd = d + cost;

      if (nd > move) continue;
      if (distMap.has(key) && distMap.get(key) <= nd) continue;
      if (walls.has(key)) continue;

      const hasEnemy = occupied.has(key) && state.pieces.find(p=>p.row===nr&&p.col===nc&&p.team!==piece.team&&p.alive);
      if (hasEnemy) continue;

      distMap.set(key, nd);
      if (!occupied.has(key) && !fountainCells.has(key) && t !== 'fountain') {
        reachableSet.add(key);
      }
      queue.push({ r: nr, c: nc, d: nd });
    }
  }
  return [...reachableSet].map(k => k.split(',').map(Number));
}

function getEffectiveMove(piece, state) {
  const statuses = piece.statuses || [];
  if (statuses.some(s => s.name === 'immobilisé')) return 0;
  if (statuses.some(s => s.name === 'étourdi')) return 0;
  if (piece.isAnchor) return 0;
  let m = piece.move + (piece.bonusMove || 0);
  if (statuses.some(s => s.name === 'ralenti')) m--;
  if (statuses.some(s => s.name === 'gelé')) m--;
  if (statuses.some(s => s.name === 'invisible')) m = Math.min(m, 2);
  const used = piece.actedThisTurn?.moveUsed || 0;
  return Math.max(0, m - used);
}

// ── Attack highlights ──────────────────────────────────────────
function showAttackHighlights(piece) {
  if (!S.gameState) return;
  const ROWS = S.gameState.terrain ? S.gameState.terrain.length : 13;
  const rangeCells = [];
  const targetCells = [];

  // All cells in attack range (visual indicator)
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < 13; c++) {
      if (chebyshev(piece.row, piece.col, r, c) <= piece.atkRange && (r !== piece.row || c !== piece.col)) {
        rangeCells.push([r, c]);
      }
    }
  }
  highlightCells('board-game', rangeCells, 'attack-range');

  // Actual attackable targets
  S.gameState.pieces.forEach(p => {
    if (!p.alive || p.team === piece.team) return;
    if (chebyshev(piece.row, piece.col, p.row, p.col) <= piece.atkRange) {
      targetCells.push([p.row, p.col]);
    }
  });
  (S.gameState.fountains || []).forEach(f => {
    if (f.team === piece.team || f.hp <= 0) return;
    if (chebyshev(piece.row, piece.col, f.row, f.col) <= piece.atkRange) {
      targetCells.push([f.row, f.col]);
    }
  });
  highlightCells('board-game', targetCells, 'attack');
}

// ── Spell highlights (simplified) ─────────────────────────────
function showSpellHighlights(piece, spellKey) {
  if (!S.gameState) return;
  const champId = piece.championId;
  const cells = [];

  // Simplified: for each champion/spell, generate target highlights based on targeting type
  const spellTargeting = getSpellTargeting(champId, spellKey);

  if (spellTargeting === 'line' || spellTargeting === 'full_row') {
    const range = getSpellRange(champId, spellKey);
    // Highlight all cells within range in 4 or 8 directions
    const dirs = spellTargeting === 'full_row'
      ? [[0,-1],[0,1]]
      : [[-1,0],[1,0],[0,-1],[0,1]];
    dirs.forEach(([dr,dc]) => {
      for (let i=1; i<=range; i++) {
        const nr=piece.row+dr*i, nc=piece.col+dc*i;
        if (nr<0||nr>=13||nc<0||nc>=13) break;
        cells.push([nr,nc]);
        const hasPiece = S.gameState.pieces.find(p=>p.row===nr&&p.col===nc&&p.alive);
        if (hasPiece) break; // line stops at first target
      }
    });
  } else if (spellTargeting === 'all_diag') {
    const range = getSpellRange(champId, spellKey);
    [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([dr,dc]) => {
      for (let i=1; i<=range; i++) {
        const nr=piece.row+dr*i, nc=piece.col+dc*i;
        if (nr<0||nr>=13||nc<0||nc>=13) break;
        cells.push([nr,nc]);
      }
    });
  } else if (spellTargeting === 'diag_jump') {
    const range = getSpellRange(champId, spellKey);
    const minR = getSpellMinRange(champId, spellKey);
    [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([dr,dc]) => {
      for (let i=(minR||1); i<=range; i++) {
        const nr=piece.row+dr*i, nc=piece.col+dc*i;
        if (nr<0||nr>=13||nc<0||nc>=13) break;
        cells.push([nr,nc]);
      }
    });
  } else if (spellTargeting === 'adjacent' || spellTargeting === 'front_arc') {
    [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([dr,dc]) => {
      const nr=piece.row+dr, nc=piece.col+dc;
      if (nr>=0&&nr<13&&nc>=0&&nc<13) cells.push([nr,nc]);
    });
  } else if (spellTargeting === 'single' || spellTargeting === 'dead_ally') {
    const range = getSpellRange(champId, spellKey);
    const isSummon = (champId === 'sayl' && spellKey === 's1');
    if (isSummon) {
      // Highlight toutes les cases vides à portée
      for (let dr = -range; dr <= range; dr++) {
        for (let dc = -range; dc <= range; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = piece.row + dr, nc = piece.col + dc;
          if (nr < 0 || nr >= 13 || nc < 0 || nc >= 13) continue;
          if (chebyshev(piece.row, piece.col, nr, nc) > range) continue;
          const occupied = S.gameState.pieces.some(p => p.alive && p.row === nr && p.col === nc);
          const isFountainCell = (S.gameState.fountains||[]).some(f => f.row === nr && f.col === nc);
          if (!occupied && !isFountainCell) cells.push([nr, nc]);
        }
      }
    } else {
      S.gameState.pieces.forEach(p => {
        if (!p.alive && spellTargeting==='dead_ally' && p.team===piece.team) cells.push([p.row,p.col]);
        else if (p.alive && spellTargeting==='single' && chebyshev(piece.row,piece.col,p.row,p.col)<=range) cells.push([p.row,p.col]);
      });
    }
  } else if (spellTargeting === 'self' || spellTargeting === 'aoe_self') {
    // Target self — immediate activation
    cells.push([piece.row, piece.col]);
  } else if (spellTargeting === 'shadow') {
    // Sayl swap with shadow
    const shadow = S.gameState.pieces.find(p => p.id.includes('shadow') && p.team === piece.team && p.alive);
    if (shadow) cells.push([shadow.row, shadow.col]);
  } else if (spellTargeting === 'single_ally') {
    const range = getSpellRange(champId, spellKey);
    S.gameState.pieces.forEach(p => {
      if (p.alive && p.team === piece.team && p.id !== piece.id && chebyshev(piece.row,piece.col,p.row,p.col) <= range)
        cells.push([p.row, p.col]);
    });
  } else if (spellTargeting === 'two_diag_place') {
    const range = getSpellRange(champId, spellKey);
    [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([dr,dc]) => {
      for (let i=1; i<=range; i++) {
        const nr=piece.row+dr*i, nc=piece.col+dc*i;
        if (nr>=0&&nr<13&&nc>=0&&nc<13) cells.push([nr,nc]);
      }
    });
  } else {
    // Default: all cells in range
    const range = getSpellRange(champId, spellKey);
    for (let dr=-range; dr<=range; dr++) {
      for (let dc=-range; dc<=range; dc++) {
        if (dr===0&&dc===0) continue;
        const nr=piece.row+dr, nc=piece.col+dc;
        if (nr>=0&&nr<13&&nc>=0&&nc<13) cells.push([nr,nc]);
      }
    }
  }

  highlightCells('board-game', cells, 'spell');
}

function getSpellTargeting(champId, spellKey) {
  const spellMap = {
    karek:  {s1:'line', s2:'front_arc', ultim:'self'},
    lysha:  {s1:'diag_jump', s2:'all_diag', ultim:'adjacent'},
    sayl:   {s1:'single', s2:'shadow', ultim:'self'},
    velara: {s1:'line', s2:'aoe_self', ultim:'single_ally'},
    pyrox:  {s1:'line', s2:'all_diag', ultim:'self'},
    gorath: {s1:'adjacent', s2:'self', ultim:'self'},
    aelys:  {s1:'single', s2:'all_diag', ultim:'dead_ally'},
    rohn:   {s1:'line', s2:'two_diag_place', ultim:'single'},
    vek:    {s1:'adjacent', s2:'front_arc', ultim:'self'},
    zhen:   {s1:'line', s2:'diag_jump', ultim:'self'},
  };
  return spellMap[champId]?.[spellKey] || 'single';
}
function getSpellRange(champId, spellKey) {
  const rangeMap = {
    karek:{s1:4,s2:2,ultim:0}, lysha:{s1:3,s2:2,ultim:1},
    sayl:{s1:2,s2:99,ultim:0}, velara:{s1:4,s2:2,ultim:4},
    pyrox:{s1:6,s2:4,ultim:3}, gorath:{s1:2,s2:2,ultim:0},
    aelys:{s1:3,s2:2,ultim:99}, rohn:{s1:7,s2:3,ultim:99},
    vek:{s1:1,s2:1,ultim:0}, zhen:{s1:5,s2:3,ultim:4},
  };
  return rangeMap[champId]?.[spellKey] || 3;
}
function getSpellMinRange(champId, spellKey) {
  if (champId==='lysha'&&spellKey==='s1') return 2;
  return 1;
}

// ── Full game state render ─────────────────────────────────────
function renderGame(state) {
  if (!state) return;
  S.gameState = state;

  const boardId = state.phase === 'placement' ? 'board-placement' : 'board-game';

  if (state.phase === 'placement') {
    buildBoard('board-placement', state, 'placement');
    renderPlacementQueue(state);
    renderPlacementScreen(state);
    return;
  }

  if (state.phase !== 'playing' && state.phase !== 'finished') return;

  // Snapshot positions avant rebuild
  const posBefore = new Map();
  if (S.gameState?.pieces) {
    S.gameState.pieces.forEach(p => posBefore.set(p.id, { row: p.row, col: p.col }));
  }

  buildBoard('board-game', state, 'game');

  // Animer les pièces déplacées + ghost sur ancienne position
  state.pieces.forEach(p => {
    const prev = posBefore.get(p.id);
    if (!prev || (prev.row === p.row && prev.col === p.col)) return;
    // Ghost sur ancienne position
    const ghostCell = getCellEl('board-game', prev.row, prev.col);
    if (ghostCell) {
      ghostCell.classList.add('cell-prev-pos');
      setTimeout(() => ghostCell.classList.remove('cell-prev-pos'), 500);
    }
    // Slide animation sur nouvelle position
    const pieceEl = document.querySelector(`[data-piece-id="${p.id}"]`);
    if (!pieceEl) return;
    const board = el('board-game');
    const cellSize = board.children[0]?.offsetWidth || 48;
    const dx = (prev.col - p.col) * cellSize;
    const dy = (prev.row - p.row) * cellSize;
    pieceEl.style.setProperty('--move-from-x', `${dx}px`);
    pieceEl.style.setProperty('--move-from-y', `${dy}px`);
    pieceEl.classList.add('piece-moving');
    setTimeout(() => pieceEl.classList.remove('piece-moving'), 280);
  });

  renderTurnOrderBar(state);
  renderLog(state);

  el('game-round').textContent = `Tour ${state.round}`;

  const cp = getCurrentPiece();
  const myTurn = cp && cp.team === S.myTeam;

  if (myTurn && cp.id !== S.activePieceId) {
    S.activePieceId = cp.id;
    S.selectedAction = null;
    clearHighlights('board-game');
  }

  if (myTurn) {
    renderActionPanel(cp);
    el('active-piece-panel').style.display = '';
    el('game-phase-label').textContent = `Votre tour — ${CHAMPIONS[cp?.championId]?.name || ''}`;
    el('game-phase-label').style.color = 'var(--gold)';
  } else {
    el('active-piece-panel').style.display = 'none';
    el('game-phase-label').textContent = `Tour adverse — ${CHAMPIONS[cp?.championId]?.name || ''}`;
    el('game-phase-label').style.color = 'var(--text2)';
  }
}

// ── Finished screen ────────────────────────────────────────────
function renderFinished(state) {
  const myTeamWon = state.winner === S.myTeam;
  el('fin-title').textContent = myTeamWon ? '🏆 Victoire !' : '💀 Défaite';
  el('fin-title').style.color = myTeamWon ? 'var(--gold)' : 'var(--red2)';
  el('fin-sub').textContent = `L'équipe ${state.winner === 'blue' ? 'bleue' : 'rouge'} a remporté la partie !`;
  el('btn-quit-fin').onclick = () => location.reload();
  showScreen('screen-finished');
}

// ── Surrender ──────────────────────────────────────────────────
el('btn-surrender')?.addEventListener('click', () => {
  socket.emit('rb:surrender');
});

// ── Animation state ────────────────────────────────────────────
let prevCurrentPieceId = null;

function showTurnBanner(champId, name, isMyTurn) {
  const b = document.getElementById('turn-banner');
  if (!b) return;
  b.className = 'turn-banner' + (isMyTurn ? '' : ' enemy-turn');
  const visual = champVisual(champId, CHAMPIONS[champId]?.emoji || '⚔️', 'tb-img');
  b.innerHTML = `<span class="tb-emoji">${visual}</span><div><div class="tb-name">${name}</div><div class="tb-label">${isMyTurn ? '⚔️ Votre tour !' : '🛡️ Tour adverse'}</div></div>`;
  b.classList.add('show');
  setTimeout(() => { b.classList.remove('show'); }, 2100);
}

let prevPieceHPs = new Map(); // pieceId → hp  (for hit detection)
let pendingAttackAnim = null; // { attackerId, targetRow, targetCol }
let prevPiecePositions = new Map(); // pieceId → {row, col}

function triggerAttackAnim(attackerId, targetRow, targetCol) {
  const attackerEl = document.querySelector(`[data-piece-id="${attackerId}"]`);
  const targetEl = getCellEl('board-game', targetRow, targetCol);
  if (!attackerEl || !targetEl) return;
  const ar = attackerEl.getBoundingClientRect();
  const tr = targetEl.getBoundingClientRect();
  const dx = (tr.left + tr.width/2) - (ar.left + ar.width/2);
  const dy = (tr.top + tr.height/2) - (ar.top + ar.height/2);
  const dist = Math.sqrt(dx*dx + dy*dy) || 1;
  const maxPx = Math.min(dist * 0.55, 36);
  attackerEl.style.setProperty('--adx', `${(dx/dist)*maxPx}px`);
  attackerEl.style.setProperty('--ady', `${(dy/dist)*maxPx}px`);
  attackerEl.classList.add('anim-attack');
  setTimeout(() => attackerEl.classList.remove('anim-attack'), 350);
}

function triggerHitAnim(piece, dmg) {
  const cellEl = getCellEl('board-game', piece.row, piece.col);
  if (!cellEl) return;
  const pEl = cellEl.querySelector('.piece');
  if (pEl) {
    pEl.classList.add('anim-hit');
    setTimeout(() => pEl.classList.remove('anim-hit'), 400);
  }
  // Floating damage number
  const f = document.createElement('div');
  const isCrit = dmg > 350;
  f.className = `dmg-float dmg-damage${isCrit ? ' dmg-crit' : ''}`;
  f.textContent = `-${dmg}`;
  cellEl.style.position = 'relative';
  cellEl.appendChild(f);
  setTimeout(() => f.remove(), 950);
}

// ── Terrain toast ──────────────────────────────────────────────
function showTerrainToast(terrain) {
  const info = {
    lane:    { e:'🟫', n:'Terrain neutre',   d:'Aucun bonus ni malus.' },
    jungle:  { e:'🌿', n:'Jungle',           d:'Assassins : +10% ATK. Traversable normalement.' },
    river:   { e:'🌊', n:'Rivière',          d:'Coûte 2 pts de déplacement. Éléments Feu : -20% RM.' },
    bridge:  { e:'🌉', n:'Pont',             d:'Traverse la rivière sans malus.' },
    base:    { e:'🏰', n:'Base',             d:'Zone de départ des champions.' },
    fountain:{ e:'⛲', n:'Fontaine',         d:'Détruisez les 3 fontaines adverses pour gagner !' },
  };
  const t = info[terrain] || { e:'?', n:terrain, d:'' };
  showToast(`${t.e} ${t.n} — ${t.d}`, '');
}

// ── Spell animations ───────────────────────────────────────────
function flashCells(cells, cssClass, durationMs = 500) {
  cells.forEach(([r,c]) => {
    const cell = getCellEl('board-game', r, c);
    if (!cell) return;
    cell.classList.add(cssClass);
    setTimeout(() => cell.classList.remove(cssClass), durationMs);
  });
}

function triggerSpellAnim(champId, spellKey, piece, targetRow, targetCol) {
  const targeting = getSpellTargeting(champId, spellKey);
  const range = getSpellRange(champId, spellKey);
  const cells = [];

  if (targeting === 'line') {
    const dr = Math.sign(targetRow - piece.row);
    const dc = Math.sign(targetCol - piece.col);
    for (let i = 1; i <= range; i++) {
      const nr = piece.row + dr*i, nc = piece.col + dc*i;
      if (nr < 0 || nr >= 13 || nc < 0 || nc >= 13) break;
      cells.push([nr, nc]);
      const hasPiece = S.gameState?.pieces.find(p => p.row===nr && p.col===nc && p.alive);
      if (hasPiece) break;
    }
    const animClass = (champId === 'pyrox' || champId === 'karek') ? 'anim-fire-line' : (champId === 'zhen' || champId === 'rohn') ? 'anim-elec-line' : 'anim-spell-line';
    cells.forEach(([r,c], i) => {
      setTimeout(() => {
        const cell = getCellEl('board-game', r, c);
        if (cell) { cell.classList.add(animClass); setTimeout(() => cell.classList.remove(animClass), 350); }
      }, i * 60);
    });
    return;
  }
  if (targeting === 'full_row') {
    for (let c = 0; c < 13; c++) cells.push([piece.row, c]);
    flashCells(cells, 'anim-wave', 600);
    return;
  }
  if (targeting === 'aoe_self' || targeting === 'self') {
    for (let dr = -range; dr <= range; dr++) {
      for (let dc = -range; dc <= range; dc++) {
        const nr = piece.row+dr, nc = piece.col+dc;
        if (nr>=0 && nr<13 && nc>=0 && nc<13) cells.push([nr,nc]);
      }
    }
    flashCells(cells, 'anim-aoe', 500);
    return;
  }
  if (targeting === 'all_diag') {
    [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([dr,dc]) => {
      for (let i = 1; i <= range; i++) {
        const nr = piece.row+dr*i, nc = piece.col+dc*i;
        if (nr>=0 && nr<13 && nc>=0 && nc<13) cells.push([nr,nc]);
      }
    });
    flashCells(cells, 'anim-diag', 450);
    return;
  }
  // Default: single target flash
  if (typeof targetRow === 'number') flashCells([[targetRow, targetCol]], 'anim-spell-hit', 400);
}

// ── Champion modal ─────────────────────────────────────────────
function openChampModal(piece) {
  const champDef = CHAMPIONS[piece.championId] || {};
  const pct = piece.maxHp > 0 ? (piece.hp / piece.maxHp * 100) : 0;
  const barColor = pct > 60 ? 'var(--green)' : pct > 25 ? '#ffa502' : 'var(--red2)';

  // Header
  const imgSrc = champImgSrc(piece.championId);
  el('cm-img').innerHTML = imgSrc
    ? `<img src="${imgSrc}" class="cm-portrait" alt="">`
    : `<span style="font-size:3rem">${champDef.emoji||'?'}</span>`;
  el('cm-name').textContent = champDef.name || piece.championId;
  el('cm-title-text').textContent = champDef.title || '';
  el('cm-class').textContent = `${champDef.class||''} · ${champDef.element||''}`;
  el('cm-hp-fill').style.cssText = `width:${pct}%;background:${barColor}`;
  el('cm-hp-text').textContent = `${piece.hp} / ${piece.maxHp} PV`;

  // Stats tab
  const statuses = (piece.statuses||[]);
  const statusHtml = statuses.length
    ? statuses.map(s => `<div class="cm-status-row"><span class="cm-status-icon">${STATUS_ICONS[s.name]||'?'}</span><span class="cm-status-name">${s.name}</span><span class="cm-status-dur">(${s.duration} tour${s.duration>1?'s':''})</span></div>`).join('')
    : '<div style="color:var(--text2);font-size:0.75rem">Aucun statut actif</div>';

  el('cm-body-stats').innerHTML = `
    <div class="cm-stats-grid">
      <div class="cm-stat-item"><span class="cm-stat-icon">❤️</span><span class="cm-stat-label">PV</span><span class="cm-stat-val">${piece.hp}/${piece.maxHp}</span></div>
      <div class="cm-stat-item"><span class="cm-stat-icon">⚔️</span><span class="cm-stat-label">ATK</span><span class="cm-stat-val">${piece.atk}</span></div>
      <div class="cm-stat-item"><span class="cm-stat-icon">🛡️</span><span class="cm-stat-label">ARM</span><span class="cm-stat-val">${piece.arm}</span></div>
      <div class="cm-stat-item"><span class="cm-stat-icon">✨</span><span class="cm-stat-label">RM</span><span class="cm-stat-val">${piece.rm}</span></div>
      <div class="cm-stat-item"><span class="cm-stat-icon">⚡</span><span class="cm-stat-label">SPD</span><span class="cm-stat-val">${piece.spd}</span></div>
      <div class="cm-stat-item"><span class="cm-stat-icon">🚶</span><span class="cm-stat-label">MOVE</span><span class="cm-stat-val">${piece.move}${piece.bonusMove?'+'+piece.bonusMove:''}</span></div>
      <div class="cm-stat-item"><span class="cm-stat-icon">🎯</span><span class="cm-stat-label">RANGE ATK</span><span class="cm-stat-val">${piece.atkRange}</span></div>
    </div>
    <div class="cm-statuses-section">
      <div class="cm-section-title">Statuts actifs</div>
      ${statusHtml}
    </div>`;

  // Spells tab
  const cds = piece.spellCooldowns || {};
  const spellDefs = [
    { key:'s1',    label:'Sort 1',    def:champDef.s1 },
    { key:'s2',    label:'Sort 2',    def:champDef.s2 },
    { key:'ultim', label:'Ultime ✨', def:champDef.u },
  ];
  el('cm-body-spells').innerHTML = spellDefs.filter(sp => sp.def?.name).map(sp => {
    const cd = cds[sp.key] || 0;
    const onCd = cd > 0;
    const acted = piece.actedThisTurn?.spelled;
    return `<div class="cm-spell-row ${onCd||acted?'cm-spell-cd':''}">
      <div class="cm-spell-header">
        <span class="cm-spell-label">${sp.label}</span>
        <span class="cm-spell-name">${sp.def.name}</span>
        ${onCd ? `<span class="cm-spell-cd-badge">${cd} tour${cd>1?'s':''}</span>` : ''}
      </div>
      <div class="cm-spell-desc">${sp.def.desc||''}</div>
    </div>`;
  }).join('');

  switchCmTab('stats');
  el('champ-modal-overlay').style.display = 'flex';
}

function closeChampModal() {
  el('champ-modal-overlay').style.display = 'none';
}

function switchCmTab(tab) {
  el('cm-tab-stats').classList.toggle('active', tab==='stats');
  el('cm-tab-spells').classList.toggle('active', tab==='spells');
  el('cm-body-stats').style.display = tab==='stats' ? '' : 'none';
  el('cm-body-spells').style.display = tab==='spells' ? '' : 'none';
}

// ── Hub copy code + random name ────────────────────────────────
el('waiting-code').onclick = () => {
  navigator.clipboard.writeText(S.roomCode || '').then(() => showToast('Code copié !', 'success'));
};

const RANDOM_PREFIXES = ['Ombre','Brise','Éclair','Forge','Lame','Voile','Rune','Brume','Tempête','Abyssal','Foudre','Pierre'];
const RANDOM_SUFFIXES = ['Noire','Ardente','Céleste','Mortelle','Glacée','Vivante','Secrète','Divine','Ancienne','Éternelle'];
function randomName() {
  const p = RANDOM_PREFIXES[Math.floor(Math.random()*RANDOM_PREFIXES.length)];
  const s = RANDOM_SUFFIXES[Math.floor(Math.random()*RANDOM_SUFFIXES.length)];
  return p + s;
}
function applyRandomName(inputId) {
  const name = randomName();
  el(inputId).value = name;
  // Also pick random avatar
  const idx = Math.floor(Math.random() * AVATARS.length);
  selectedAvatar = AVATARS[idx];
  document.querySelectorAll('.avatar-opt').forEach((a,i) => a.classList.toggle('selected', i===idx));
}
el('btn-random-join').onclick   = () => applyRandomName('inp-name-join');
el('btn-random-create').onclick = () => applyRandomName('inp-name-create');

// ── Socket events ──────────────────────────────────────────────
socket.on('rb:created', ({ roomCode, state }) => {
  S.myId = socket.id;
  S.roomCode = roomCode;
  S.myTeam = state.players.find(p => p.id === S.myId)?.team || 'blue';
  const myPlayer = state.players.find(p => p.id === S.myId);
  sessionStorage.setItem('rb_room', roomCode);
  sessionStorage.setItem('rb_myId', socket.id);
  sessionStorage.setItem('rb_myTeam', S.myTeam);
  if (myPlayer?.name) sessionStorage.setItem('rb_myName', myPlayer.name);
  showScreen('screen-waiting');
  renderWaiting(state);
});

socket.on('rb:joined', ({ roomCode, state }) => {
  S.myId = socket.id;
  S.roomCode = roomCode;
  S.myTeam = state.players.find(p => p.id === S.myId)?.team || 'red';
  const myPlayer = state.players.find(p => p.id === S.myId);
  sessionStorage.setItem('rb_room', roomCode);
  sessionStorage.setItem('rb_myId', socket.id);
  sessionStorage.setItem('rb_myTeam', S.myTeam);
  if (myPlayer?.name) sessionStorage.setItem('rb_myName', myPlayer.name);
  showScreen('screen-waiting');
  renderWaiting(state);
});

socket.on('rb:state', (state) => {
  // Restaurer l'identité si on vient d'un rejoin
  if (!S.myId) S.myId = socket.id;
  if (!S.myTeam) S.myTeam = sessionStorage.getItem('rb_myTeam') || null;
  // Detect HP changes for hit animations (before re-render)
  if (prevPieceHPs.size > 0 && state.pieces) {
    state.pieces.forEach(p => {
      const prev = prevPieceHPs.get(p.id);
      if (prev !== undefined && prev > p.hp) {
        const dmg = prev - p.hp;
        setTimeout(() => triggerHitAnim(p, dmg), 120);
      }
    });
  }
  if (state.pieces) {
    prevPieceHPs.clear();
    state.pieces.forEach(p => prevPieceHPs.set(p.id, p.hp));
  }

  S.gameState = state;
  if (state.phase !== 'lobby' && S.roomCode) {
    sessionStorage.setItem('rb_room', S.roomCode);
    sessionStorage.setItem('rb_myId', S.myId);
  }
  S.myTeam = state.players.find(p => p.id === S.myId)?.team || S.myTeam;

  // Turn change banner
  if (state.phase === 'playing' && state.currentPieceId && state.currentPieceId !== prevCurrentPieceId) {
    prevCurrentPieceId = state.currentPieceId;
    const cp = state.pieces?.find(p => p.id === state.currentPieceId);
    const def = CHAMPIONS[cp?.championId] || {};
    const isMyTurn = cp?.team === S.myTeam;
    showTurnBanner(cp?.championId || '', def.name || cp?.championId || '?', isMyTurn);
  }

  if (state.phase === 'lobby' || state.phase === 'draft' && !el('screen-draft').classList.contains('active')) {
    if (state.phase === 'lobby') {
      renderWaiting(state);
      showScreen('screen-waiting');
    }
  }

  if (state.phase === 'draft') {
    if (!el('screen-draft').classList.contains('active')) {
      renderDraft();
      showScreen('screen-draft');
    }
    el('draft-subtitle').textContent = `Choisissez 5 champions — ${S.selectedChampions.length}/5 sélectionnés`;
  }

  if (state.phase === 'placement') {
    if (!el('screen-placement').classList.contains('active')) {
      showScreen('screen-placement');
      const me = state.players.find(p => p.id === S.myId);
      if (me && me.chosenChampions?.length) {
        S.placingChampionId = null;
      }
    }
    renderGame(state);
  }

  if (state.phase === 'playing') {
    if (!el('screen-game').classList.contains('active')) {
      showScreen('screen-game');
    }
    renderGame(state);
  }

  if (state.phase === 'finished') {
    renderFinished(state);
  }
});

socket.on('rb:error', ({ message }) => {
  const screens = ['lobby-error','waiting-error'];
  let shown = false;
  for (const id of screens) {
    const e = el(id);
    if (e && e.closest('.screen.active')) {
      e.textContent = message;
      shown = true;
      break;
    }
  }
  if (!shown) showToast(message, 'error');
});

socket.on('rb:player_left', ({ message }) => {
  showToast(message || 'Un joueur a quitté la partie.', 'warn');
});

socket.on('disconnect', () => {
  if (!el('screen-lobby').classList.contains('active')) {
    showToast('⚡ Connexion perdue — tentative de reconnexion…', 'warn');
  }
});

