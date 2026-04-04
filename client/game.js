const socket = io();

// ── État local ────────────────────────────────────────────────────
let gs = null;               // gameState reçu du serveur
let selHandIndex    = null;  // index de la carte sélectionnée en main
let selAttackerUid  = null;  // instanceId de l'attaquant sélectionné

// ── Refs DOM ──────────────────────────────────────────────────────
const screenLobby  = document.getElementById('screen-lobby');
const screenGame   = document.getElementById('screen-game');
const lobbyStatus  = document.getElementById('lobby-status');
const myBoardZone  = document.getElementById('my-board-zone');
const oppPlayerZone = document.getElementById('opp-player-zone');

// ── Lobby ─────────────────────────────────────────────────────────
document.getElementById('btn-join').addEventListener('click', () => {
  const roomId = document.getElementById('input-room').value.trim();
  if (!roomId) return;
  socket.emit('join_room', { roomId });
  lobbyStatus.textContent = 'Connexion…';
});

document.getElementById('input-room').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('btn-join').click();
});

// ── Socket events ─────────────────────────────────────────────────
socket.on('waiting', ({ message }) => {
  lobbyStatus.textContent = message;
});

socket.on('game_state_update', ({ myGameState }) => {
  gs = myGameState;
  screenLobby.classList.add('hidden');
  screenGame.classList.remove('hidden');
  render();
});

socket.on('action_error', ({ message }) => {
  showHint(message, 'error');
  // Bref flash puis retour à la normale
  setTimeout(() => showHint(''), 2000);
});

socket.on('game_over', ({ winner }) => {
  const won = winner === gs?.myIndex;
  document.getElementById('overlay-msg').textContent = won ? '🏆 Victoire !' : '💀 Défaite';
  document.getElementById('overlay').classList.remove('hidden');
});

socket.on('opponent_left', ({ message }) => {
  showHint(message, 'error');
});

socket.on('error', ({ message }) => {
  lobbyStatus.textContent = 'Erreur : ' + message;
});

// ── Rendu principal ───────────────────────────────────────────────
function render() {
  if (!gs) return;
  const { me, opponent, isMyTurn, turnNumber } = gs;

  // HP & infos
  document.getElementById('my-hp').textContent  = me.hp;
  document.getElementById('opp-hp').textContent = opponent.hp;
  document.getElementById('my-deck').textContent  = me.deckSize;
  document.getElementById('opp-deck').textContent = opponent.deckSize;
  document.getElementById('opp-hand-count').textContent = opponent.handCount;

  // Tour
  const ti = document.getElementById('turn-indicator');
  ti.textContent = isMyTurn ? `Tour ${turnNumber} — Votre tour` : `Tour ${turnNumber} — Tour adverse`;
  ti.className   = isMyTurn ? 'my-turn' : 'opp-turn';

  // Bouton fin de tour
  document.getElementById('btn-end-turn').disabled = !isMyTurn;

  // Terrain / état
  renderModifier('my-terrain',  me.board.terrain, 'Terrain');
  renderModifier('my-state',    me.board.state,   'État');
  renderModifier('opp-terrain', opponent.board.terrain, 'Terrain');
  renderModifier('opp-state',   opponent.board.state,   'État');

  // Boards
  renderAnimals('my-animals',  me.board.animals,       'player');
  renderAnimals('opp-animals', opponent.board.animals, 'opponent');

  // Main
  renderHand(me.hand);

  // Log
  renderLog(gs.log);

  // Zone de dépôt
  const dropReady = selHandIndex !== null &&
    gs.me.hand[selHandIndex]?.type === 'animal';
  myBoardZone.classList.toggle('drop-ready', dropReady);

  // Zone attaque directe
  const directReady = selAttackerUid !== null &&
    opponent.board.animals.length === 0;
  oppPlayerZone.classList.toggle('direct-target', directReady);
}

// ── Modificateurs (terrain / état) ───────────────────────────────
function renderModifier(slotId, card, emptyLabel) {
  const slot = document.getElementById(slotId);
  if (!card) {
    slot.innerHTML = `<div class="empty-slot">${emptyLabel}</div>`;
  } else {
    slot.innerHTML = `
      <div class="active-mini">
        <div class="mini-icon">${getIcon(card.id)}</div>
        <div class="mini-name">${card.name}</div>
      </div>`;
  }
}

// ── Board animals ─────────────────────────────────────────────────
function renderAnimals(containerId, animals, side) {
  const el = document.getElementById(containerId);
  el.innerHTML = '';
  animals.forEach(a => el.appendChild(buildAnimalCard(a, side)));
}

function buildAnimalCard(animal, side) {
  const el = document.createElement('div');
  el.className = 'animal-card';

  const isPlayer   = side === 'player';
  const isOpponent = side === 'opponent';

  const canAttack =
    isPlayer &&
    gs.isMyTurn &&
    animal.canAttack &&
    !animal.hasAttackedThisTurn;

  const isSelAttacker  = animal.instanceId === selAttackerUid;
  const isAttackTarget = isOpponent && selAttackerUid !== null;

  if (canAttack && !isSelAttacker) el.classList.add('can-attack');
  if (isSelAttacker)               el.classList.add('attacker-selected');
  if (isAttackTarget)              el.classList.add('attack-target');
  if (animal.hasAttackedThisTurn)  el.classList.add('exhausted');
  if (!animal.canAttack)           el.classList.add('sick');

  // Affichage de la mod DEF
  const defModHtml = animal.defModifier !== 0
    ? `<span class="def-mod ${animal.defModifier > 0 ? 'pos' : 'neg'}">
         ${animal.defModifier > 0 ? '+' : ''}${animal.defModifier}
       </span>`
    : '';

  el.innerHTML = `
    ${defModHtml}
    <div class="card-icon">${getIcon(animal.id)}</div>
    <div class="card-name">${animal.name}</div>
    <div class="card-stats">
      <span class="atk">${animal.effectiveATK}⚔</span>
      <span class="hp ${animal.currentHP <= 1 ? 'low-hp' : ''}">♥${animal.currentHP}</span>
    </div>`;

  if (isPlayer) {
    el.addEventListener('click', () => onPlayerAnimalClick(animal, canAttack));
  } else {
    el.addEventListener('click', () => onOpponentAnimalClick(animal.instanceId));
  }

  return el;
}

// ── Main ──────────────────────────────────────────────────────────
function renderHand(hand) {
  const el = document.getElementById('hand');
  el.innerHTML = '';
  hand.forEach((card, idx) => el.appendChild(buildHandCard(card, idx)));
}

function buildHandCard(card, idx) {
  const el = document.createElement('div');
  el.className = `hand-card ${card.type}`;

  if (idx === selHandIndex)   el.classList.add('selected');
  if (!gs.isMyTurn)           el.classList.add('disabled');

  const typeBadge = card.type === 'terrain' ? 'T'
                  : card.type === 'state'   ? 'É'
                  : '';

  let bottomHtml;
  if (card.type === 'animal') {
    bottomHtml = `
      <div class="card-stats">
        <span class="atk">${card.baseATK}⚔</span>
        <span class="hp">♥${card.baseDEF}</span>
      </div>`;
  } else {
    bottomHtml = `<div class="card-desc">${card.description || ''}</div>`;
  }

  el.innerHTML = `
    ${typeBadge ? `<div class="type-badge">${typeBadge}</div>` : ''}
    <div class="card-icon">${getIcon(card.id)}</div>
    <div class="card-name">${card.name}</div>
    ${bottomHtml}`;

  el.addEventListener('click', () => onHandCardClick(idx));
  return el;
}

// ── Log ───────────────────────────────────────────────────────────
function renderLog(logs) {
  const el = document.getElementById('log-zone');
  el.innerHTML = logs
    .slice(-5)
    .map(l => `<span class="log-entry">${l}</span>`)
    .join('');
}

// ── Interactions ──────────────────────────────────────────────────

function onHandCardClick(idx) {
  if (!gs.isMyTurn) return showHint('Ce n\'est pas votre tour', 'error');

  const card = gs.me.hand[idx];
  if (!card) return;

  // Désélectionner si même carte
  if (selHandIndex === idx) {
    selHandIndex = null;
    showHint('');
    render();
    return;
  }

  // Terrain / état → jouer immédiatement
  if (card.type === 'terrain') {
    if (gs.me.playedTerrain) return showHint('Terrain déjà joué ce tour', 'error');
    socket.emit('play_card', { cardIndex: idx });
    clearSelection();
    return;
  }
  if (card.type === 'state') {
    if (gs.me.playedState) return showHint('État déjà joué ce tour', 'error');
    socket.emit('play_card', { cardIndex: idx });
    clearSelection();
    return;
  }

  // Animal → sélectionner, puis cliquer sur la zone pour poser
  selHandIndex   = idx;
  selAttackerUid = null;
  showHint(`${card.name} sélectionné — cliquez sur votre zone pour invoquer`);
  render();
}

function onPlayerAnimalClick(animal, canAttack) {
  if (!gs.isMyTurn) return showHint('Ce n\'est pas votre tour', 'error');

  // Si une carte est sélectionnée en main, jouer l'animal d'abord
  if (selHandIndex !== null) return;

  // Désélectionner
  if (selAttackerUid === animal.instanceId) {
    selAttackerUid = null;
    showHint('');
    render();
    return;
  }

  if (!animal.canAttack) {
    return showHint(`${animal.name} vient d'être invoqué (fatigue)`, 'error');
  }
  if (animal.hasAttackedThisTurn) {
    return showHint(`${animal.name} a déjà attaqué ce tour`, 'error');
  }

  selAttackerUid = animal.instanceId;
  selHandIndex   = null;

  const hasOppAnimals = gs.opponent.board.animals.length > 0;
  showHint(hasOppAnimals
    ? `${animal.name} — cliquez sur un animal adverse`
    : `${animal.name} — cliquez sur l'adversaire pour attaquer directement`);
  render();
}

function onOpponentAnimalClick(instanceId) {
  if (!selAttackerUid) return;
  socket.emit('declare_attack', { attackerInstanceId: selAttackerUid, targetInstanceId: instanceId });
  clearSelection();
}

// Clic sur la zone board du joueur → poser la carte animal sélectionnée
myBoardZone.addEventListener('click', () => {
  if (selHandIndex === null) return;
  const card = gs?.me?.hand[selHandIndex];
  if (!card || card.type !== 'animal') return;
  socket.emit('play_card', { cardIndex: selHandIndex });
  clearSelection();
});

// Clic sur la zone adversaire → attaque directe
oppPlayerZone.addEventListener('click', () => {
  if (!selAttackerUid) return;
  if (gs.opponent.board.animals.length > 0) {
    return showHint('Détruisez d\'abord les animaux adverses !', 'error');
  }
  socket.emit('declare_attack', { attackerInstanceId: selAttackerUid, targetInstanceId: 'player' });
  clearSelection();
});

// Fin de tour
document.getElementById('btn-end-turn').addEventListener('click', () => {
  socket.emit('end_turn');
  clearSelection();
  showHint('');
});

// Échap = désélectionner
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    clearSelection();
    showHint('');
    render();
  }
});

// ── Helpers ───────────────────────────────────────────────────────
function clearSelection() {
  selHandIndex   = null;
  selAttackerUid = null;
}

function showHint(msg, type = '') {
  const el = document.getElementById('hint-zone');
  el.textContent = msg;
  el.className   = 'hint ' + type;
}

function getIcon(id) {
  return ICONS[id] || `<span style="font-size:1.4rem;font-weight:900;line-height:1">${id[0].toUpperCase()}</span>`;
}
