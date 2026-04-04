const crypto = require('crypto');
const { buildDeck, TERRAINS, STATES } = require('./cards');

const INITIAL_HP   = 20;
const INITIAL_HAND = 5;

// ── Init ─────────────────────────────────────────────────────────────

function initGameState(players) {
  const gs = {
    turn: Math.random() < 0.5 ? 0 : 1,
    turnNumber: 1,
    winner: null,
    players: players.map((p, i) => {
      const deck = buildDeck();
      const hand = deck.splice(0, INITIAL_HAND);
      return {
        id: p.id,
        index: i,
        hp: INITIAL_HP,
        deck,
        hand,
        board: { animals: [], terrain: null, state: null },
        playedTerrain: false,
        playedState:   false,
      };
    }),
    log: [],
  };
  addLog(gs, `--- Tour 1 : Joueur ${gs.turn + 1} commence ---`);
  return gs;
}

// ── Recalcul des stats ────────────────────────────────────────────────
// Les terrains des deux joueurs s'accumulent et affectent tout le monde.
// L'état n'affecte que les animaux du joueur qui l'a joué.

function recalcStats(gs) {
  // Accumule les mods terrain globaux
  let gATK = 0, gDEF = 0;
  for (const p of gs.players) {
    if (p.board.terrain) {
      const t = TERRAINS.find(t => t.id === p.board.terrain.id);
      if (t) { gATK += t.modifiers.atk; gDEF += t.modifiers.def; }
    }
  }

  for (const player of gs.players) {
    const stateCard = player.board.state
      ? STATES.find(s => s.id === player.board.state.id)
      : null;

    for (const animal of player.board.animals) {
      let atkMod = gATK, defMod = gDEF;

      if (stateCard) {
        const applies =
          stateCard.scope === 'all' ||
          (stateCard.scope === 'nocturnal' && animal.isNocturnal);
        if (applies) {
          atkMod += stateCard.modifiers.atk;
          defMod += stateCard.modifiers.def;
        }
      }

      animal.effectiveATK = Math.max(0, animal.baseATK + atkMod);
      animal.defModifier  = defMod; // peut être négatif (= plus vulnérable)
    }
  }
}

// ── Vue client (asymétrique) ──────────────────────────────────────────

function buildClientState(gs, forIdx) {
  const me  = gs.players[forIdx];
  const opp = gs.players[1 - forIdx];
  return {
    turn:       gs.turn,
    turnNumber: gs.turnNumber,
    myIndex:    forIdx,
    isMyTurn:   gs.turn === forIdx,
    winner:     gs.winner,
    me: {
      hp:           me.hp,
      hand:         me.hand,
      board:        me.board,
      deckSize:     me.deck.length,
      playedTerrain: me.playedTerrain,
      playedState:   me.playedState,
    },
    opponent: {
      hp:        opp.hp,
      handCount: opp.hand.length,
      board:     opp.board,
      deckSize:  opp.deck.length,
    },
    log: gs.log.slice(-8),
  };
}

// ── Actions ───────────────────────────────────────────────────────────

function handlePlayCard(gs, playerIdx, cardIndex) {
  if (gs.turn !== playerIdx) return err('Pas votre tour');

  const player = gs.players[playerIdx];
  if (cardIndex < 0 || cardIndex >= player.hand.length) return err('Carte invalide');

  const card = player.hand[cardIndex];

  if (card.type === 'terrain') {
    if (player.playedTerrain) return err('Terrain déjà joué ce tour');
    player.hand.splice(cardIndex, 1);
    player.board.terrain  = { ...card };
    player.playedTerrain  = true;
    recalcStats(gs);
    addLog(gs, `J${playerIdx + 1} joue le terrain : ${card.name}`);

  } else if (card.type === 'state') {
    if (player.playedState) return err('État déjà joué ce tour');
    player.hand.splice(cardIndex, 1);
    player.board.state  = { ...card };
    player.playedState  = true;
    recalcStats(gs);
    addLog(gs, `J${playerIdx + 1} joue l'état : ${card.name}`);

  } else if (card.type === 'animal') {
    player.hand.splice(cardIndex, 1);
    const instanceId = crypto.randomUUID();
    const animal = {
      ...card,
      instanceId,
      currentHP:         card.baseDEF,
      canAttack:         false, // invocation sickness
      hasAttackedThisTurn: false,
      effectiveATK:      card.baseATK,
      defModifier:       0,
    };
    player.board.animals.push(animal);
    recalcStats(gs);
    addLog(gs, `J${playerIdx + 1} invoque ${card.name} (${animal.effectiveATK}⚔ ♥${card.baseDEF})`);

  } else {
    return err('Type de carte inconnu');
  }

  // Pioche 1 carte après avoir joué
  draw(player, 1);

  return { ok: true };
}

function handleDeclareAttack(gs, playerIdx, attackerInstanceId, targetInstanceId) {
  if (gs.turn !== playerIdx) return err('Pas votre tour');

  const attPlayer = gs.players[playerIdx];
  const defPlayer = gs.players[1 - playerIdx];

  const attacker = attPlayer.board.animals.find(a => a.instanceId === attackerInstanceId);
  if (!attacker)                    return err('Animal attaquant introuvable');
  if (!attacker.canAttack)          return err(`${attacker.name} vient d'être invoqué — il ne peut pas encore attaquer`);
  if (attacker.hasAttackedThisTurn) return err(`${attacker.name} a déjà attaqué ce tour`);

  const defStateCard = defPlayer.board.state
    ? STATES.find(s => s.id === defPlayer.board.state.id)
    : null;
  const canCounter = !defStateCard?.noCounterAttack;

  if (targetInstanceId === 'player') {
    // Attaque directe sur le joueur
    if (defPlayer.board.animals.length > 0)
      return err('Détruisez d\'abord les animaux adverses !');

    const dmg = attacker.effectiveATK;
    defPlayer.hp -= dmg;
    attacker.hasAttackedThisTurn = true;
    addLog(gs, `${attacker.name} attaque le joueur adverse (−${dmg} HP) → ${defPlayer.hp} HP`);

  } else {
    // Attaque sur un animal
    if (defPlayer.board.animals.length === 0)
      return err('L\'adversaire n\'a pas d\'animaux');

    const target = defPlayer.board.animals.find(a => a.instanceId === targetInstanceId);
    if (!target) return err('Cible introuvable');

    const dmgToTarget   = Math.max(0, attacker.effectiveATK - target.defModifier);
    const dmgToAttacker = canCounter
      ? Math.max(0, target.effectiveATK - attacker.defModifier)
      : 0;

    target.currentHP   -= dmgToTarget;
    attacker.currentHP -= dmgToAttacker;
    attacker.hasAttackedThisTurn = true;

    addLog(gs,
      `${attacker.name} attaque ${target.name}` +
      ` (${dmgToTarget} dégâts${canCounter ? ` / contre-attaque ${dmgToAttacker}` : ' / pas de contre'})`
    );

    // Retire les animaux morts
    if (target.currentHP <= 0) {
      defPlayer.board.animals = defPlayer.board.animals.filter(a => a.instanceId !== targetInstanceId);
      addLog(gs, `${target.name} est éliminé !`);
    }
    if (attacker.currentHP <= 0) {
      attPlayer.board.animals = attPlayer.board.animals.filter(a => a.instanceId !== attackerInstanceId);
      addLog(gs, `${attacker.name} tombe au combat !`);
    }
  }

  // Condition de victoire
  if (defPlayer.hp <= 0) {
    gs.winner = playerIdx;
    addLog(gs, `🏆 Joueur ${playerIdx + 1} remporte la partie !`);
    return { ok: true, gameOver: true, winner: playerIdx };
  }

  return { ok: true };
}

function handleEndTurn(gs, playerIdx) {
  if (gs.turn !== playerIdx) return err('Pas votre tour');

  const player = gs.players[playerIdx];
  player.playedTerrain = false;
  player.playedState   = false;
  player.board.animals.forEach(a => {
    a.hasAttackedThisTurn = false;
    a.canAttack = true; // fatigue levée
  });

  gs.turn = 1 - playerIdx;
  gs.turnNumber++;

  // Pioche pour le joueur suivant
  const next = gs.players[gs.turn];
  draw(next, 1);

  addLog(gs, `--- Tour ${gs.turnNumber} : Joueur ${gs.turn + 1} ---`);
  return { ok: true };
}

// ── Helpers ───────────────────────────────────────────────────────────

function draw(player, n) {
  for (let i = 0; i < n && player.deck.length > 0; i++) {
    player.hand.push(player.deck.splice(0, 1)[0]);
  }
}

function addLog(gs, msg) {
  gs.log.push(msg);
  if (gs.log.length > 30) gs.log.shift();
}

function err(msg) { return { ok: false, error: msg }; }

module.exports = {
  initGameState,
  recalcStats,
  buildClientState,
  handlePlayCard,
  handleDeclareAttack,
  handleEndTurn,
};
