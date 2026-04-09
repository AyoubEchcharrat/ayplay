// riftRoom.js — Game room for RiftBoard (tactical board game)
'use strict';

const {
  BASE_TERRAIN,
  ROWS,
  COLS,
  FOUNTAINS_BLUE,
  FOUNTAINS_RED,
  CHAMPIONS,
  getTerrainBonus,
} = require('./riftData');

// ── Helpers ───────────────────────────────────────────────────────────────────

function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function chebyshev(r1, c1, r2, c2) {
  return Math.max(Math.abs(r1 - r2), Math.abs(c1 - c2));
}

function inBounds(r, c) {
  return r >= 0 && r < ROWS && c >= 0 && c < COLS;
}

// Physical damage formula: soft mitigation via armor
function calcPhysDmg(base, arm, armorPen) {
  const effectiveArm = arm * (1 - (armorPen || 0));
  return Math.max(10, Math.floor(base * (1 - effectiveArm / (effectiveArm + 300))));
}

// Magic damage formula: soft mitigation via rm
function calcMagicDmg(base, rm, armorPen) {
  const effectiveRm = rm * (1 - (armorPen || 0));
  return Math.max(10, Math.floor(base * (1 - effectiveRm / (effectiveRm + 300))));
}

// Get cells in a direction from a start cell
function getCellsInDirection(fromR, fromC, dr, dc, maxRange, stopOnFirst = false) {
  const cells = [];
  let r = fromR + dr;
  let c = fromC + dc;
  let count = 0;
  while (inBounds(r, c) && count < maxRange) {
    cells.push([r, c]);
    count++;
    if (stopOnFirst) break;
    r += dr;
    c += dc;
  }
  return cells;
}

// All 8 diagonal + cardinal directions
const DIRS8 = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
const DIRS_DIAG = [[-1,-1],[-1,1],[1,-1],[1,1]];
const DIRS_CARD = [[-1,0],[0,-1],[0,1],[1,0]];

// ── RiftRoom ──────────────────────────────────────────────────────────────────

class RiftRoom {
  constructor(code, hostId) {
    this.code   = code;
    this.hostId = hostId;
    // socketId → { id, socket, name, avatar, team, chosenChampions, ready }
    this.players = new Map();
    this.phase   = 'lobby';

    // Board
    this.terrain  = deepCopy(BASE_TERRAIN);
    this.pieces   = new Map(); // pieceId → piece
    this.fountains = new Map(); // fountainId → fountain
    this.walls    = []; // [{r, c, team, duration}]
    this.traps    = []; // [{id, r, c, team, dmg, status, duration}]
    this.trails   = []; // [{r, c, dmg, status, duration}]

    this.turnOrder  = [];
    this.turnIndex  = 0;
    this.round      = 1;
    this.winner     = null;
    this.log        = [];

    this.placementQueue = [];
    this.placedCount    = { blue: 0, red: 0 };

    this._trapIdCounter = 0;
  }

  // ── Players ─────────────────────────────────────────────────────────────────

  addPlayer(id, socket, name, avatar) {
    const team = this.players.size === 0 ? 'blue' : 'red';
    this.players.set(id, { id, socket, name, avatar, team, chosenChampions: [], ready: false });
  }

  removePlayer(id) {
    this.players.delete(id);
    if (this.hostId === id) {
      const next = this.players.keys().next().value;
      if (next) this.hostId = next;
    }
  }

  broadcast(event, data) {
    for (const p of this.players.values()) p.socket.emit(event, data);
  }

  // ── Public state ─────────────────────────────────────────────────────────────

  publicState() {
    const currentPieceId = this.turnOrder[this.turnIndex] || null;
    const currentPiece   = currentPieceId ? this.pieces.get(currentPieceId) : null;
    const currentTeam    = currentPiece ? currentPiece.team : null;

    return {
      phase: this.phase,
      code: this.code,
      round: this.round,
      players: [...this.players.values()].map(p => ({
        id: p.id, name: p.name, avatar: p.avatar,
        team: p.team, chosenChampions: p.chosenChampions, ready: p.ready,
      })),
      pieces:    [...this.pieces.values()],
      fountains: [...this.fountains.values()],
      walls:     this.walls,
      traps:     this.traps,
      trails:    this.trails,
      turnOrder: this.turnOrder,
      currentPieceId,
      currentTeam,
      placementTeam: this.placementQueue?.[0] || null,
      winner:  this.winner,
      log:     this.log.slice(-20),
      terrain: this.terrain,
    };
  }

  // ── Draft ────────────────────────────────────────────────────────────────────

  chooseDraft(playerId, championIds) {
    const player = this.players.get(playerId);
    if (!player) return;
    if (this.phase !== 'draft') return;
    // Validate: 5 unique valid champions
    if (!Array.isArray(championIds) || championIds.length !== 5) return;
    if (championIds.some(id => !CHAMPIONS[id])) return;
    if (new Set(championIds).size !== championIds.length) return;


    player.chosenChampions = championIds;
    player.ready = true;

    this.log.push(`${player.name} a choisi ses champions.`);
    this.broadcast('rb:state', this.publicState());

    const players = [...this.players.values()];
    if (players.length === 2 && players.every(p => p.ready)) {
      this.startPlacement();
    }
  }

  // ── Placement ────────────────────────────────────────────────────────────────

  startPlacement() {
    this.phase = 'placement';

    // Init fountains
    let fIdx = 0;
    for (const f of FOUNTAINS_BLUE) {
      const id = `fountain_blue_${fIdx++}`;
      this.fountains.set(id, { id, team: 'blue', row: f.row, col: f.col, hp: f.hp, maxHp: f.hp });
    }
    fIdx = 0;
    for (const f of FOUNTAINS_RED) {
      const id = `fountain_red_${fIdx++}`;
      this.fountains.set(id, { id, team: 'red', row: f.row, col: f.col, hp: f.hp, maxHp: f.hp });
    }

    this.placementQueue = ['blue', 'red'];
    this.placedCount = { blue: 0, red: 0 };

    // Reset ready flags for re-use
    for (const p of this.players.values()) p.ready = false;

    this.log.push('Phase de placement commencée. Équipe bleue place en premier.');
    this.broadcast('rb:state', this.publicState());
  }

  placeChampion(playerId, championId, row, col) {
    if (this.phase !== 'placement') return { error: 'Phase invalide' };

    const player = this.players.get(playerId);
    if (!player) return { error: 'Joueur introuvable' };

    const team = player.team;
    if (this.placementQueue[0] !== team) return { error: "Ce n'est pas votre tour de placement" };

    // Champion must be in their chosen list
    if (!player.chosenChampions.includes(championId)) return { error: 'Champion non choisi' };

    // Not yet placed
    const existingPieceId = `${team}_${championId}`;
    if (this.pieces.has(existingPieceId)) return { error: 'Champion déjà placé' };

    // Row validation
    const baseRows = team === 'blue' ? [7, 8] : [0, 1];
    if (!baseRows.includes(row)) return { error: 'Ligne de placement invalide' };

    // Validate col
    if (!inBounds(row, col)) return { error: 'Cellule hors limites' };

    // No river/fountain terrain
    const terrainType = this.terrain[row][col];
    if (terrainType === 'river' || terrainType === 'bridge') return { error: 'Terrain invalide' };

    // Cell empty (no piece, no fountain)
    for (const p of this.pieces.values()) {
      if (p.row === row && p.col === col) return { error: 'Cellule occupée par une pièce' };
    }
    for (const f of this.fountains.values()) {
      if (f.row === row && f.col === col) return { error: 'Cellule occupée par une fontaine' };
    }

    const champDef = CHAMPIONS[championId];
    const piece = {
      id: `${team}_${championId}`,
      championId,
      team,
      row, col,
      hp: champDef.stats.hp, maxHp: champDef.stats.hp,
      atk: champDef.stats.atk,
      arm: champDef.stats.arm,
      rm: champDef.stats.rm,
      spd: champDef.stats.spd,
      move: champDef.stats.move,
      atkRange: champDef.stats.atkRange,
      alive: true,
      statuses: [],
      spellCooldowns: { s1: 0, s2: 0, ultim: 0 },
      actedThisTurn: { moved: false, attacked: false, spelled: false },
      hasShadow: false, shadowId: null,
      isAnchor: false,
      bastionActive: false, bastionTurns: 0,
      rageActive: false, rageTurns: 0, rageKills: 0,
      markTarget: null, markTurns: 0,
      ultUsed: false,
    };

    this.pieces.set(piece.id, piece);
    this.placedCount[team]++;

    // Alternate placement teams
    if (this.placementQueue[0] === 'blue') {
      this.placementQueue = ['red', 'blue'];
    } else {
      this.placementQueue = ['blue', 'red'];
    }

    this.log.push(`${player.name} a placé ${champDef.name} en (${row},${col}).`);
    this.broadcast('rb:state', this.publicState());

    // Check if all placed
    const allPlayers = [...this.players.values()];
    const allPlaced = allPlayers.every(p => p.chosenChampions.length === this.placedCount[p.team]);
    if (this.placedCount.blue === 5 && this.placedCount.red === 5) {
      this.startGame();
    }

    return { ok: true };
  }

  // ── Game start ───────────────────────────────────────────────────────────────

  startGame() {
    this.phase = 'playing';
    this.round = 1;
    this.turnIndex = 0;

    // Build turn order
    const alivePieces = [...this.pieces.values()].filter(p => p.alive);
    alivePieces.sort((a, b) => {
      if (b.spd !== a.spd) return b.spd - a.spd;
      return Math.random() < 0.5 ? -1 : 1;
    });
    this.turnOrder = alivePieces.map(p => p.id);

    this.log.push('Partie commencée! Tour 1');
    this.broadcast('rb:state', this.publicState());
  }

  // ── Turn helpers ──────────────────────────────────────────────────────────────

  getCurrentPiece() {
    for (let i = 0; i < this.turnOrder.length; i++) {
      const idx = (this.turnIndex + i) % this.turnOrder.length;
      const piece = this.pieces.get(this.turnOrder[idx]);
      if (piece && piece.alive) return piece;
    }
    return null;
  }

  _getPlayerByTeam(team) {
    return [...this.players.values()].find(p => p.team === team) || null;
  }

  _validateTurn(playerId, pieceId) {
    const player = this.players.get(playerId);
    if (!player) return 'Joueur introuvable';
    if (this.phase !== 'playing') return 'Pas en phase de jeu';
    const piece = this.pieces.get(pieceId);
    if (!piece) return 'Pièce introuvable';
    if (!piece.alive) return 'Pièce morte';
    if (piece.team !== player.team) return "Cette pièce n'est pas la vôtre";
    const currentPiece = this.turnOrder[this.turnIndex];
    if (currentPiece !== pieceId) return "Ce n'est pas le tour de cette pièce";
    return null;
  }

  hasStatus(piece, name) {
    return piece.statuses.some(s => s.name === name);
  }

  addStatus(piece, name, duration, value) {
    // Don't add embrasé if immune
    if (name === 'embrasé' && this.hasStatus(piece, 'immunisé_embrasé')) return;
    // Don't stack immobilisé
    if (name === 'immobilisé' && this.hasStatus(piece, 'immobilisé')) return;
    const existing = piece.statuses.find(s => s.name === name);
    if (existing) {
      // Refresh duration
      existing.duration = Math.max(existing.duration, duration);
      if (value !== undefined) existing.value = value;
    } else {
      piece.statuses.push({ name, duration, value: value !== undefined ? value : null });
    }
  }

  removeStatus(piece, name) {
    piece.statuses = piece.statuses.filter(s => s.name !== name);
  }

  // ── Move range ────────────────────────────────────────────────────────────────

  getEffectiveMoveRange(piece) {
    if (!piece.alive) return 0;

    // Stuck/stunned/anchored conditions
    if (this.hasStatus(piece, 'étourdi')) return 0;
    if (this.hasStatus(piece, 'immobilisé')) return 0;
    if (piece.isAnchor) return 0;

    const champDef = CHAMPIONS[piece.championId];
    const terrainCell = this.terrain[piece.row] ? this.terrain[piece.row][piece.col] : 'base';
    const bonus = getTerrainBonus(champDef ? champDef.class : '', champDef ? champDef.element : '', terrainCell);

    let move = piece.move - (bonus.movePenalty || 0);
    if (this.hasStatus(piece, 'ralenti')) move -= 1;
    if (this.hasStatus(piece, 'gelé')) move -= 1;

    // Rohn mark bonus: +1 move for Rohn himself when marking
    if (piece.championId === 'rohn' && piece.markTarget) move += 1;

    return Math.max(0, move);
  }

  getReachableCells(piece) {
    const moveRange = this.getEffectiveMoveRange(piece);
    if (moveRange === 0) return [];

    // BFS
    const visited = new Set();
    const reachable = [];
    const queue = [{ r: piece.row, c: piece.col, steps: 0 }];
    visited.add(`${piece.row},${piece.col}`);

    while (queue.length > 0) {
      const { r, c, steps } = queue.shift();
      if (steps === moveRange) continue;

      for (const [dr, dc] of DIRS_CARD) {
        const nr = r + dr;
        const nc = c + dc;
        const key = `${nr},${nc}`;
        if (!inBounds(nr, nc)) continue;
        if (visited.has(key)) continue;

        const terrain = this.terrain[nr][nc];
        // River blocks unless bridge
        if (terrain === 'river') continue;

        // Walls block
        if (this.walls.some(w => w.r === nr && w.c === nc)) continue;

        // Fountains block traversal and landing
        if ([...this.fountains.values()].some(f => f.row === nr && f.col === nc)) continue;

        // Enemy pieces block (cannot traverse, cannot land)
        const occupant = this._getPieceAt(nr, nc);
        if (occupant && occupant.team !== piece.team) continue;

        visited.add(key);

        // Can traverse ally-occupied cells but cannot land on them
        if (!occupant) {
          reachable.push([nr, nc]);
        }

        queue.push({ r: nr, c: nc, steps: steps + 1 });
      }
    }

    return reachable;
  }

  _getPieceAt(r, c) {
    for (const p of this.pieces.values()) {
      if (p.alive && p.row === r && p.col === c) return p;
    }
    return null;
  }

  _getFountainAt(r, c) {
    for (const f of this.fountains.values()) {
      if (f.row === r && f.col === c) return f;
    }
    return null;
  }

  // ── Attackable targets ────────────────────────────────────────────────────────

  getAttackableTargets(piece) {
    const targets = [];
    // Enemy pieces
    for (const p of this.pieces.values()) {
      if (!p.alive) continue;
      if (p.team === piece.team) continue;
      // Invisible pieces cannot be targeted unless adjacent
      if (this.hasStatus(p, 'invisible') && chebyshev(piece.row, piece.col, p.row, p.col) > 1) continue;
      if (chebyshev(piece.row, piece.col, p.row, p.col) <= piece.atkRange) {
        targets.push({ row: p.row, col: p.col, type: 'piece', id: p.id });
      }
    }
    // Enemy fountains
    for (const f of this.fountains.values()) {
      if (f.team === piece.team) continue;
      if (f.hp <= 0) continue;
      if (chebyshev(piece.row, piece.col, f.row, f.col) <= piece.atkRange) {
        targets.push({ row: f.row, col: f.col, type: 'fountain', id: f.id });
      }
    }
    return targets;
  }

  // ── Push helper ───────────────────────────────────────────────────────────────

  pushPiece(piece, dr, dc, dist, wallDmg = 0) {
    for (let i = 0; i < dist; i++) {
      const nr = piece.row + dr;
      const nc = piece.col + dc;
      if (!inBounds(nr, nc)) {
        // Pushed to wall/edge
        if (wallDmg > 0) {
          this._applyDamage(piece, wallDmg);
          this.log.push(`${this._pieceName(piece)} percute un mur pour ${wallDmg} dégâts!`);
        }
        break;
      }
      const terrain = this.terrain[nr][nc];
      if (terrain === 'river') {
        if (wallDmg > 0) this._applyDamage(piece, wallDmg);
        break;
      }
      const wall = this.walls.find(w => w.r === nr && w.c === nc);
      if (wall) {
        if (wallDmg > 0) {
          this._applyDamage(piece, wallDmg);
          this.log.push(`${this._pieceName(piece)} percute un mur pour ${wallDmg} dégâts!`);
        }
        break;
      }
      const blocker = this._getPieceAt(nr, nc);
      if (blocker) break;
      const fountain = this._getFountainAt(nr, nc);
      if (fountain) break;

      piece.row = nr;
      piece.col = nc;
    }
  }

  _pieceName(piece) {
    const def = CHAMPIONS[piece.championId];
    return def ? `${def.name} (${piece.team})` : piece.id;
  }

  // ── Apply damage helpers ──────────────────────────────────────────────────────

  _applyDamage(piece, amount) {
    if (!piece.alive) return 0;
    // Bastion: negate damage and reflect
    if (this.hasStatus(piece, 'bastion')) return 0;
    const actual = Math.max(0, Math.floor(amount));
    piece.hp -= actual;
    if (piece.hp <= 0) {
      piece.hp = 0;
      this.killPiece(piece);
    }
    return actual;
  }

  _applyDamageToFountain(fountain, amount) {
    if (fountain.hp <= 0) return;
    fountain.hp = Math.max(0, fountain.hp - Math.floor(amount));
    this.log.push(`Fontaine ${fountain.team} touchée pour ${Math.floor(amount)} dégâts! (${fountain.hp}/${fountain.maxHp} PV)`);
    this.checkWinCondition();
  }

  // ── Actions ───────────────────────────────────────────────────────────────────

  actionMove(playerId, pieceId, targetRow, targetCol) {
    const err = this._validateTurn(playerId, pieceId);
    if (err) return { error: err };

    const piece = this.pieces.get(pieceId);
    if (piece.actedThisTurn.moved) return { error: 'Déjà bougé ce tour' };
    if (this.hasStatus(piece, 'immobilisé') || this.hasStatus(piece, 'étourdi') || piece.isAnchor) {
      return { error: 'Ne peut pas se déplacer' };
    }

    const reachable = this.getReachableCells(piece);
    const canReach = reachable.some(([r, c]) => r === targetRow && c === targetCol);
    if (!canReach) return { error: 'Cellule inaccessible' };

    piece.row = targetRow;
    piece.col = targetCol;
    piece.actedThisTurn.moved = true;

    // Check traps
    const triggeredTrap = this.traps.find(t =>
      t.r === targetRow && t.c === targetCol && t.team !== piece.team && t.duration > 0
    );
    if (triggeredTrap) {
      const trapDmg = this._applyDamage(piece, triggeredTrap.dmg);
      if (triggeredTrap.status) {
        this.addStatus(piece, triggeredTrap.status.name, triggeredTrap.status.duration);
      }
      this.log.push(`${this._pieceName(piece)} déclenche un piège! (-${trapDmg} PV)`);
      triggeredTrap.duration = 0; // consumed
    }

    // Check trails
    const trail = this.trails.find(t => t.r === targetRow && t.c === targetCol && t.duration > 0);
    if (trail) {
      const trailDmg = this._applyDamage(piece, trail.dmg);
      if (trail.status) this.addStatus(piece, trail.status.name, trail.status.duration);
      this.log.push(`${this._pieceName(piece)} traverse une traînée! (-${trailDmg} PV)`);
    }

    this.log.push(`${this._pieceName(piece)} se déplace en (${targetRow},${targetCol}).`);
    this.broadcast('rb:state', this.publicState());
    return { ok: true };
  }

  actionAttack(playerId, pieceId, targetRow, targetCol) {
    const err = this._validateTurn(playerId, pieceId);
    if (err) return { error: err };

    const piece = this.pieces.get(pieceId);
    if (piece.actedThisTurn.attacked) return { error: 'Déjà attaqué ce tour' };

    // Check provoqué: must attack the provoking target
    const provoqueStatus = piece.statuses.find(s => s.name === 'provoqué');
    if (provoqueStatus) {
      const provoker = this.pieces.get(provoqueStatus.value);
      if (provoker && provoker.alive) {
        if (provoker.row !== targetRow || provoker.col !== targetCol) {
          return { error: 'Vous êtes provoqué et devez attaquer le provocateur' };
        }
      }
    }

    // Find target
    const targetPiece    = this._getPieceAt(targetRow, targetCol);
    const targetFountain = this._getFountainAt(targetRow, targetCol);

    if (!targetPiece && !targetFountain) return { error: 'Aucune cible en ('+targetRow+','+targetCol+')' };

    const dist = chebyshev(piece.row, piece.col, targetRow, targetCol);
    if (dist > piece.atkRange) return { error: 'Cible hors portée' };

    // Must be an enemy target
    if (targetPiece && targetPiece.team === piece.team) return { error: 'Ne peut pas attaquer un allié' };
    if (targetFountain && targetFountain.team === piece.team) return { error: 'Ne peut pas attaquer sa propre fontaine' };

    // Invisible check
    if (targetPiece && this.hasStatus(targetPiece, 'invisible') && dist > 1) {
      return { error: 'Cible invisible' };
    }

    let baseDmg = piece.atk;
    // Rage bonus: +20% per kill
    if (piece.rageActive) baseDmg = Math.floor(baseDmg * (1 + 0.2 * piece.rageKills));

    if (targetPiece) {
      const arm = targetPiece.arm;
      let effectiveDmg = calcPhysDmg(baseDmg, arm, 0);

      // Bastion: reflect 50% and push
      if (this.hasStatus(targetPiece, 'bastion')) {
        const reflect = Math.floor(effectiveDmg * 0.5);
        this._applyDamage(piece, reflect);
        this.log.push(`${this._pieceName(targetPiece)} est en Bastion! ${reflect} dégâts réfléchis sur ${this._pieceName(piece)}.`);
        // Push attacker 2 diagonal back
        const dr = piece.row < targetPiece.row ? -1 : 1;
        const dc = piece.col < targetPiece.col ? -1 : 1;
        this.pushPiece(piece, dr, dc, 2);
        piece.actedThisTurn.attacked = true;
        this.broadcast('rb:state', this.publicState());
        return { ok: true };
      }

      // Pilier (Karek buff): attacker gets reflected 40%
      if (this.hasStatus(targetPiece, 'pilier')) {
        const reflect = Math.floor(effectiveDmg * 0.4);
        this._applyDamage(piece, reflect);
        // Still take some damage
        effectiveDmg = Math.floor(effectiveDmg * 0.6);
        this.log.push(`${this._pieceName(targetPiece)} est un Pilier! ${reflect} dégâts réfléchis.`);
      }

      const actualDmg = this._applyDamage(targetPiece, effectiveDmg);
      this.log.push(`${this._pieceName(piece)} attaque ${this._pieceName(targetPiece)} pour ${actualDmg} dégâts.`);

      // Vek rage splash: also hit 2 diagonal-front cells
      if (piece.rageActive && targetPiece.alive !== false) {
        const dr = Math.sign(targetRow - piece.row);
        const dc = Math.sign(targetCol - piece.col);
        const splashDirs = [
          [dr, dc + (dc === 0 ? 1 : 0)],
          [dr, dc - (dc === 0 ? -1 : 0)],
          [dr + (dr === 0 ? 1 : 0), dc],
          [dr - (dr === 0 ? -1 : 0), dc],
        ].filter(([r2,c2]) => !(r2 === 0 && c2 === 0));
        const splashed = new Set([`${targetRow},${targetCol}`]);
        for (const [sdr, sdc] of splashDirs.slice(0, 2)) {
          const sr = piece.row + sdr;
          const sc = piece.col + sdc;
          const key = `${sr},${sc}`;
          if (!inBounds(sr, sc) || splashed.has(key)) continue;
          splashed.add(key);
          const sp = this._getPieceAt(sr, sc);
          if (sp && sp.team !== piece.team && sp.alive) {
            const splashDmg = calcPhysDmg(Math.floor(baseDmg * 0.5), sp.arm, 0);
            this._applyDamage(sp, splashDmg);
            this.log.push(`Rage de ${this._pieceName(piece)}: ${this._pieceName(sp)} subit ${splashDmg} dégâts de splash.`);
          }
        }
      }

      // Rohn: if this target is marked, apply auto-poison
      if (piece.championId === 'rohn' && piece.markTarget === targetPiece.id) {
        if (!this.hasStatus(targetPiece, 'poison')) {
          this.addStatus(targetPiece, 'poison', 3, 40);
          this.log.push(`Rohn applique du poison à ${this._pieceName(targetPiece)}!`);
        }
      }

      // Check Vek kill for rage count
      if (!targetPiece.alive && piece.rageActive) {
        piece.rageKills++;
      }

    } else if (targetFountain) {
      // Direct damage on fountains (no armor)
      this._applyDamageToFountain(targetFountain, baseDmg);
      this.log.push(`${this._pieceName(piece)} attaque la fontaine ${targetFountain.team} pour ${baseDmg} dégâts.`);
    }

    piece.actedThisTurn.attacked = true;
    this.broadcast('rb:state', this.publicState());
    return { ok: true };
  }

  // ── Spell system ──────────────────────────────────────────────────────────────

  actionSpell(playerId, pieceId, spellKey, targetRow, targetCol, extra) {
    const err = this._validateTurn(playerId, pieceId);
    if (err) return { error: err };

    const piece = this.pieces.get(pieceId);
    if (piece.actedThisTurn.spelled) return { error: 'Déjà lancé un sort ce tour' };
    if (this.hasStatus(piece, 'étourdi')) return { error: 'Pièce étourdie, ne peut pas agir' };

    const champDef = CHAMPIONS[piece.championId];
    if (!champDef) return { error: 'Champion introuvable' };
    const spell = champDef.spells[spellKey];
    if (!spell) return { error: 'Sort introuvable' };

    const cd = piece.spellCooldowns[spellKey] || 0;
    if (cd > 0) return { error: `Sort en recharge (${cd} tours)` };

    // Ultim once per game for Aelys
    if (spellKey === 'ultim' && piece.championId === 'aelys' && piece.ultUsed) {
      return { error: 'Renaissance déjà utilisée' };
    }

    const result = this.applySpellEffects(piece, spell, spellKey, targetRow, targetCol, extra);
    if (result && result.error) return result;

    piece.spellCooldowns[spellKey] = spell.cd;
    piece.actedThisTurn.spelled = true;

    if (spellKey === 'ultim' && piece.championId === 'aelys') {
      piece.ultUsed = true;
    }

    this.log.push(`${this._pieceName(piece)} lance ${spell.name}!`);
    this.broadcast('rb:state', this.publicState());
    return { ok: true };
  }

  applySpellEffects(caster, spell, spellKey, targetRow, targetCol, extra) {
    const targets = this._collectSpellTargets(caster, spell, targetRow, targetCol, extra);
    if (targets && targets.error) return targets;

    for (const effect of spell.effects) {
      this._applyEffect(caster, spell, effect, targets, targetRow, targetCol, extra);
    }
    return { ok: true };
  }

  _collectSpellTargets(caster, spell, targetRow, targetCol, extra) {
    const type = spell.targeting;
    const range = spell.range || 0;
    let collected = [];

    switch (type) {
      case 'self':
        // No external targets, effects use caster directly
        break;

      case 'adjacent':
      case 'single': {
        const dist = chebyshev(caster.row, caster.col, targetRow, targetCol);
        if (dist > range) return { error: 'Cible hors portée' };
        if (dist < (spell.minRange || 0)) return { error: 'Cible trop proche' };
        collected.push({ row: targetRow, col: targetCol });
        break;
      }

      case 'line': {
        // Direction from caster to target
        const dr = Math.sign(targetRow - caster.row);
        const dc = Math.sign(targetCol - caster.col);
        if (dr === 0 && dc === 0) return { error: 'Cible invalide pour ligne' };
        // Must be straight line (same row, col, or diagonal)
        const rowDiff = Math.abs(targetRow - caster.row);
        const colDiff = Math.abs(targetCol - caster.col);
        if (rowDiff !== 0 && colDiff !== 0 && rowDiff !== colDiff) {
          return { error: 'Doit viser en ligne droite ou diagonale' };
        }
        let r = caster.row + dr;
        let c = caster.col + dc;
        let steps = 0;
        while (inBounds(r, c) && steps < range) {
          collected.push({ row: r, col: c });
          r += dr;
          c += dc;
          steps++;
        }
        break;
      }

      case 'all_diag': {
        for (const [dr, dc] of DIRS_DIAG) {
          for (let step = 1; step <= range; step++) {
            const r = caster.row + dr * step;
            const c = caster.col + dc * step;
            if (!inBounds(r, c)) break;
            collected.push({ row: r, col: c });
          }
        }
        break;
      }

      case 'front_arc': {
        // Front = direction caster is facing. We infer from target if provided.
        // Without explicit facing, default to all 3 cells in front (row toward enemy)
        const facingDr = caster.team === 'blue' ? -1 : 1; // blue faces up (lower row), red faces down
        const frontCells = [
          [facingDr, -1], [facingDr, 0], [facingDr, 1]
        ];
        for (const [dr, dc] of frontCells) {
          for (let step = 1; step <= range; step++) {
            const r = caster.row + dr * step;
            const c = caster.col + dc * step;
            if (!inBounds(r, c)) break;
            collected.push({ row: r, col: c });
          }
        }
        break;
      }

      case 'aoe_self': {
        for (let r = caster.row - range; r <= caster.row + range; r++) {
          for (let c = caster.col - range; c <= caster.col + range; c++) {
            if (!inBounds(r, c)) continue;
            if (r === caster.row && c === caster.col) continue;
            if (chebyshev(caster.row, caster.col, r, c) <= range) {
              collected.push({ row: r, col: c });
            }
          }
        }
        break;
      }

      case 'full_row': {
        // All cells on caster's row, both directions
        for (let c = 0; c < COLS; c++) {
          if (c !== caster.col) collected.push({ row: caster.row, col: c });
        }
        break;
      }

      case 'diag_jump': {
        // Target must be diagonal cell within range
        const dr = targetRow - caster.row;
        const dc = targetCol - caster.col;
        if (Math.abs(dr) !== Math.abs(dc)) return { error: 'Doit sauter en diagonale' };
        const dist = Math.abs(dr);
        if (dist > range) return { error: 'Cible hors portée' };
        if (spell.minRange && dist < spell.minRange) return { error: 'Cible trop proche' };
        collected.push({ row: targetRow, col: targetCol });
        break;
      }

      case 'two_diag_place': {
        // Rohn's trap: two diagonal cells provided in extra
        if (!extra || !Array.isArray(extra.cells) || extra.cells.length !== 2) {
          return { error: 'Dois fournir 2 cellules diagonales' };
        }
        for (const cell of extra.cells) {
          const dist = chebyshev(caster.row, caster.col, cell.row, cell.col);
          if (dist > range) return { error: 'Cellule de piège hors portée' };
          collected.push({ row: cell.row, col: cell.col });
        }
        break;
      }

      case 'dead_ally': {
        // Aelys ultim: targetRow/Col points to where to place the resurrected piece
        // extra.targetPieceId = the dead piece to resurrect
        collected.push({ row: targetRow, col: targetCol });
        break;
      }

      case 'shadow': {
        // Syal's Transposition: swap with shadow
        if (!caster.hasShadow || !caster.shadowId) return { error: 'Pas d\'ombre invoquée' };
        break;
      }

      case 'front_row3': {
        // 3 cells directly in front
        const facingDr2 = caster.team === 'blue' ? -1 : 1;
        for (const dc of [-1, 0, 1]) {
          const r = caster.row + facingDr2;
          const c = caster.col + dc;
          if (inBounds(r, c)) collected.push({ row: r, col: c });
        }
        break;
      }

      default:
        break;
    }

    return collected;
  }

  _applyEffect(caster, spell, effect, targets, targetRow, targetCol, extra) {
    const champDef = CHAMPIONS[caster.championId];

    switch (effect.type) {

      case 'damage': {
        const scaling = effect.scaling || 'atk';
        let base = effect.base || 0;
        if (scaling === 'atk') base += 0; // base already includes atk modifier conceptually
        let totalLifesteal = 0;

        for (const cell of targets) {
          const target = this._getPieceAt(cell.row, cell.col);
          const fountain = this._getFountainAt(cell.row, cell.col);

          if (target && target.team !== caster.team) {
            const arm = scaling === 'rm' ? target.rm : target.arm;
            let dmg = scaling === 'rm'
              ? calcMagicDmg(base, arm, effect.armorPen || 0)
              : calcPhysDmg(base, arm, effect.armorPen || 0);

            // Rage bonus on spells
            if (caster.rageActive) dmg = Math.floor(dmg * (1 + 0.2 * caster.rageKills));

            const actual = this._applyDamage(target, dmg);
            totalLifesteal += actual;
            this.log.push(`${this._pieceName(caster)} inflige ${actual} dégâts à ${this._pieceName(target)}.`);
            if (!target.alive && caster.rageActive) caster.rageKills++;
          } else if (fountain && fountain.team !== caster.team) {
            this._applyDamageToFountain(fountain, base);
          }
        }

        // Handle lifesteal from effect chain (for vek s1 lifesteal handled separately)
        if (effect.lifesteal) {
          const ls = effect.lifesteal;
          // Done below in lifesteal effect
        }
        break;
      }

      case 'heal': {
        for (const cell of targets) {
          const target = this._getPieceAt(cell.row, cell.col);
          if (target && target.team === caster.team) {
            const healAmt = effect.base || 0;
            target.hp = Math.min(target.maxHp, target.hp + healAmt);
            this.log.push(`${this._pieceName(caster)} soigne ${this._pieceName(target)} de ${healAmt} PV.`);
          }
        }
        break;
      }

      case 'heal_or_damage': {
        for (const cell of targets) {
          const target = this._getPieceAt(cell.row, cell.col);
          if (!target) continue;
          if (target.team === caster.team) {
            const healAmt = effect.healBase || 0;
            target.hp = Math.min(target.maxHp, target.hp + healAmt);
            this.log.push(`${this._pieceName(caster)} soigne ${this._pieceName(target)} de ${healAmt} PV.`);
          } else {
            const rm = caster.rm;
            const dmg = calcMagicDmg(effect.dmgBase || 0, target.rm, 0);
            const actual = this._applyDamage(target, dmg);
            this.log.push(`${this._pieceName(caster)} inflige ${actual} dégâts à ${this._pieceName(target)}.`);
          }
        }
        break;
      }

      case 'status': {
        const applyTo = effect.self ? [caster] : [];
        if (!effect.self) {
          for (const cell of targets) {
            const target = this._getPieceAt(cell.row, cell.col);
            if (target && target.team !== caster.team) applyTo.push(target);
          }
        }
        for (const target of applyTo) {
          this.addStatus(target, effect.name, effect.duration || 1, effect.value);
          this.log.push(`${this._pieceName(target)} reçoit le statut ${effect.name}.`);
        }
        break;
      }

      case 'push': {
        for (const cell of targets) {
          const target = this._getPieceAt(cell.row, cell.col);
          if (!target || target.team === caster.team) continue;

          let dr, dc;
          if (effect.dir === 'away') {
            dr = Math.sign(target.row - caster.row);
            dc = Math.sign(target.col - caster.col);
            if (dr === 0 && dc === 0) { dr = 1; dc = 0; }
          } else if (effect.dir === 'side') {
            // Perpendicular to cast direction
            const castDr = Math.sign(targetRow - caster.row);
            const castDc = Math.sign(targetCol - caster.col);
            // Perpendicular: rotate 90 degrees
            if (castDr !== 0 && castDc === 0) { dr = 0; dc = 1; }
            else if (castDr === 0 && castDc !== 0) { dr = 1; dc = 0; }
            else { dr = castDc; dc = -castDr; } // diagonal → perpendicular
          } else if (effect.dir === 'horizontal') {
            // Direction of the row wave (casting direction)
            dr = 0;
            dc = target.col > caster.col ? 1 : -1;
          } else {
            dr = Math.sign(target.row - caster.row);
            dc = Math.sign(target.col - caster.col);
          }

          this.pushPiece(target, dr, dc, effect.dist || 1, effect.wallDmg || 0);
        }
        break;
      }

      case 'jump': {
        // Move caster to target cell
        if (!inBounds(targetRow, targetCol)) break;
        const blocker = this._getPieceAt(targetRow, targetCol);
        if (blocker && blocker.id !== caster.id) break;
        caster.row = targetRow;
        caster.col = targetCol;

        if (effect.withAttack) {
          // Attack all adjacent enemies after landing
          for (const [dr, dc] of DIRS8) {
            const ar = targetRow + dr;
            const ac = targetCol + dc;
            if (!inBounds(ar, ac)) continue;
            const enemy = this._getPieceAt(ar, ac);
            if (enemy && enemy.team !== caster.team && enemy.alive) {
              const dmgEffect = spell.effects.find(e => e.type === 'damage');
              if (dmgEffect) {
                const dmg = calcPhysDmg(dmgEffect.base || 0, enemy.arm, 0);
                const actual = this._applyDamage(enemy, dmg);
                this.log.push(`${this._pieceName(caster)} frappe ${this._pieceName(enemy)} à l'atterrissage pour ${actual} dégâts.`);
              }
            }
          }
        }
        break;
      }

      case 'lifesteal': {
        // Typically paired with a damage effect
        // Find last damage dealt (simplified: use Vek s1 target)
        const dmgTarget = this._getPieceAt(targetRow, targetCol);
        if (dmgTarget) {
          const dmgEffect = spell.effects.find(e => e.type === 'damage');
          if (dmgEffect) {
            const baseDmg = calcPhysDmg(dmgEffect.base || 0, dmgTarget.arm, 0);
            let lsRatio = effect.ratio || 0.3;
            if (effect.bonusCond && this.hasStatus(dmgTarget, effect.bonusCond)) {
              lsRatio = effect.bonusRatio || lsRatio;
            }
            const healed = Math.floor(baseDmg * lsRatio);
            caster.hp = Math.min(caster.maxHp, caster.hp + healed);
            this.log.push(`${this._pieceName(caster)} récupère ${healed} PV par vol de vie.`);
          }
        }
        break;
      }

      case 'aoe_splash': {
        const radius = effect.radius || 1;
        const alreadyHit = new Set(targets.map(t => `${t.row},${t.col}`));
        const splashTargets = [];
        for (const cell of targets) {
          for (let dr = -radius; dr <= radius; dr++) {
            for (let dc = -radius; dc <= radius; dc++) {
              if (dr === 0 && dc === 0) continue;
              const sr = cell.row + dr;
              const sc = cell.col + dc;
              const key = `${sr},${sc}`;
              if (!inBounds(sr, sc) || alreadyHit.has(key)) continue;
              alreadyHit.add(key);
              splashTargets.push({ row: sr, col: sc });
            }
          }
        }
        for (const cell of splashTargets) {
          const target = this._getPieceAt(cell.row, cell.col);
          if (target && target.team !== caster.team) {
            const dmgEffect = spell.effects.find(e => e.type === 'damage');
            if (dmgEffect) {
              const scaling = dmgEffect.scaling || 'atk';
              const splashDmg = Math.floor((dmgEffect.base || 0) * 0.5);
              const dmg = scaling === 'rm'
                ? calcMagicDmg(splashDmg, target.rm, 0)
                : calcPhysDmg(splashDmg, target.arm, 0);
              const actual = this._applyDamage(target, dmg);
              this.log.push(`Éclaboussure sur ${this._pieceName(target)}: -${actual} PV.`);
            }
          }
        }
        break;
      }

      case 'chain': {
        // Lightning chain: bounces to nearby targets
        const bounces = effect.bounces || 2;
        const mult = effect.mult || 0.7;
        const dmgEffect = spell.effects.find(e => e.type === 'damage');
        if (!dmgEffect) break;

        // Primary target
        const primaryTarget = this._getPieceAt(targetRow, targetCol);
        if (!primaryTarget || primaryTarget.team === caster.team) break;

        const chainTargets = [primaryTarget];
        const hitIds = new Set([primaryTarget.id]);

        let currentPiece = primaryTarget;
        let currentDmg = dmgEffect.base || 0;

        for (let b = 0; b < bounces; b++) {
          currentDmg = Math.floor(currentDmg * mult);
          // Find nearest unhit enemy
          let nearest = null;
          let nearestDist = Infinity;
          for (const p of this.pieces.values()) {
            if (!p.alive || p.team === caster.team || hitIds.has(p.id)) continue;
            const d = chebyshev(currentPiece.row, currentPiece.col, p.row, p.col);
            if (d < nearestDist && d <= 3) { nearest = p; nearestDist = d; }
          }
          if (!nearest) break;
          chainTargets.push(nearest);
          hitIds.add(nearest.id);
          currentPiece = nearest;
        }

        let chainDmg = dmgEffect.base || 0;
        for (const t of chainTargets) {
          const dmg = calcMagicDmg(chainDmg, t.rm, 0);
          const actual = this._applyDamage(t, dmg);
          this.log.push(`Chaîne d'éclairs: ${this._pieceName(t)} subit ${actual} dégâts.`);
          chainDmg = Math.floor(chainDmg * mult);
        }
        break;
      }

      case 'create_wall': {
        // Gorath: create wall at 3 horizontal cells around target
        const wallDuration = effect.duration || 2;
        const width = effect.width || 3;
        const half = Math.floor(width / 2);
        for (let dc = -half; dc <= half; dc++) {
          const wc = targetCol + dc;
          if (!inBounds(targetRow, wc)) continue;
          // Don't place on pieces or fountains
          if (this._getPieceAt(targetRow, wc)) continue;
          if (this._getFountainAt(targetRow, wc)) continue;
          // Remove existing wall at same cell
          this.walls = this.walls.filter(w => !(w.r === targetRow && w.c === wc));
          this.walls.push({ r: targetRow, c: wc, team: caster.team, duration: wallDuration });
        }
        this.log.push(`${this._pieceName(caster)} érige un mur de pierre!`);
        break;
      }

      case 'taunt': {
        const radius = effect.radius || 2;
        const duration = effect.duration || 1;
        for (const p of this.pieces.values()) {
          if (!p.alive) continue;
          if (p.team === caster.team) continue;
          if (chebyshev(caster.row, caster.col, p.row, p.col) <= radius) {
            this.addStatus(p, 'provoqué', duration, caster.id);
            this.log.push(`${this._pieceName(p)} est provoqué par ${this._pieceName(caster)}!`);
          }
        }
        break;
      }

      case 'summon_shadow': {
        if (caster.hasShadow) break; // Already has shadow
        const shadowId = `${caster.team}_syal_shadow`;
        const shadow = {
          id: shadowId,
          championId: 'syal_shadow',
          team: caster.team,
          row: caster.row, col: caster.col,
          hp: 600, maxHp: 600,
          atk: 180, arm: 0, rm: 0,
          spd: 0, move: 0, atkRange: 1,
          alive: true,
          statuses: [],
          spellCooldowns: { s1: 0, s2: 0, ultim: 0 },
          actedThisTurn: { moved: false, attacked: false, spelled: false },
          hasShadow: false, shadowId: null, isAnchor: true,
          bastionActive: false, bastionTurns: 0,
          rageActive: false, rageTurns: 0, rageKills: 0,
          markTarget: null, markTurns: 0, ultUsed: false,
          isShadow: true, ownerId: caster.id,
        };
        this.pieces.set(shadowId, shadow);
        // Insert shadow right after caster in turnOrder
        const casterIdx = this.turnOrder.indexOf(caster.id);
        this.turnOrder.splice(casterIdx + 1, 0, shadowId);
        caster.hasShadow = true;
        caster.shadowId = shadowId;
        this.log.push(`${this._pieceName(caster)} invoque une ombre!`);
        break;
      }

      case 'swap_shadow': {
        if (!caster.hasShadow || !caster.shadowId) break;
        const shadow = this.pieces.get(caster.shadowId);
        if (!shadow || !shadow.alive) break;
        // Swap positions
        const tmpRow = caster.row;
        const tmpCol = caster.col;
        caster.row = shadow.row;
        caster.col = shadow.col;
        shadow.row = tmpRow;
        shadow.col = tmpCol;
        this.log.push(`${this._pieceName(caster)} se transpose avec son ombre!`);
        break;
      }

      case 'place_trap': {
        let trapCells = [];
        if (spell.targeting === 'two_diag_place' && extra && Array.isArray(extra.cells)) {
          trapCells = extra.cells;
        } else {
          trapCells = targets;
        }
        for (const cell of trapCells) {
          const trapId = `trap_${++this._trapIdCounter}`;
          this.traps.push({
            id: trapId,
            r: cell.row, c: cell.col,
            team: caster.team,
            dmg: effect.dmg || 150,
            status: effect.status || null,
            duration: 5,
          });
        }
        this.log.push(`${this._pieceName(caster)} pose ${trapCells.length} piège(s)!`);
        break;
      }

      case 'mark': {
        const markTarget = this._getPieceAt(targetRow, targetCol);
        if (!markTarget || markTarget.team === caster.team) break;
        caster.markTarget = markTarget.id;
        caster.markTurns = effect.duration || 3;
        // Apply poison immediately
        if (effect.autoPoison) {
          this.addStatus(markTarget, 'poison', effect.duration || 3, effect.autoPoison.value || 40);
        }
        this.log.push(`${this._pieceName(caster)} marque ${this._pieceName(markTarget)}!`);
        break;
      }

      case 'resurrect': {
        // Find dead ally specified by extra.targetPieceId
        if (!extra || !extra.targetPieceId) break;
        const deadPiece = this.pieces.get(extra.targetPieceId);
        if (!deadPiece || deadPiece.alive || deadPiece.team !== caster.team) break;
        if (!inBounds(targetRow, targetCol)) break;
        if (this._getPieceAt(targetRow, targetCol)) break;

        deadPiece.hp = effect.hp || 600;
        deadPiece.row = targetRow;
        deadPiece.col = targetCol;
        deadPiece.alive = true;
        deadPiece.statuses = [];
        deadPiece.actedThisTurn = { moved: false, attacked: false, spelled: false };
        // Re-insert in turnOrder
        if (!this.turnOrder.includes(deadPiece.id)) {
          this.turnOrder.push(deadPiece.id);
        }
        this.log.push(`${this._pieceName(caster)} ressuscite ${this._pieceName(deadPiece)}!`);
        break;
      }

      case 'leave_trail': {
        // Leave trail on cells between caster's original position and target
        // We add trail at previous position (before jump)
        // Since jump happens via 'jump' effect, leave trail on caster's old cell
        this.trails.push({
          r: caster.row, c: caster.col,
          dmg: effect.dmg || 180,
          status: effect.status || null,
          duration: 2,
        });
        this.log.push(`${this._pieceName(caster)} laisse une traînée électrique!`);
        break;
      }

      case 'execute': {
        if (!effect.threshold) break;
        const exTarget = this._getPieceAt(targetRow, targetCol);
        if (!exTarget || exTarget.team === caster.team || !exTarget.alive) break;
        const hpRatio = exTarget.hp / exTarget.maxHp;
        if (hpRatio <= effect.threshold) {
          this.log.push(`Exécution! ${this._pieceName(exTarget)} est éliminé!`);
          this.killPiece(exTarget);
        }
        break;
      }

      case 'buff': {
        const buffName = effect.name;
        const duration = effect.duration || 2;
        this.addStatus(caster, buffName, duration);

        if (buffName === 'rage') {
          caster.rageActive = true;
          caster.rageTurns = duration;
          caster.rageKills = 0;
          this.log.push(`${this._pieceName(caster)} entre en Rage!`);
        } else if (buffName === 'bastion') {
          caster.bastionActive = true;
          caster.bastionTurns = duration;
          this.log.push(`${this._pieceName(caster)} active le Bastion Absolu!`);
        } else if (buffName === 'pilier') {
          caster.isAnchor = true;
          this.log.push(`${this._pieceName(caster)} devient un Pilier de Terre!`);
        } else {
          this.log.push(`${this._pieceName(caster)} reçoit le buff ${buffName}.`);
        }
        break;
      }

      case 'aoe_all': {
        // Pyrox ultim: hit all pieces in radius including allies
        const radius = effect.radius || 3;
        const base = effect.base || 500;
        const scaling = effect.scaling || 'rm';
        for (const p of this.pieces.values()) {
          if (!p.alive) continue;
          if (p.id === caster.id) continue;
          if (chebyshev(caster.row, caster.col, p.row, p.col) <= radius) {
            const arm = scaling === 'rm' ? p.rm : p.arm;
            const dmg = scaling === 'rm' ? calcMagicDmg(base, arm, 0) : calcPhysDmg(base, arm, 0);
            const actual = this._applyDamage(p, dmg);
            this.log.push(`Éruption: ${this._pieceName(p)} subit ${actual} dégâts.`);
          }
        }
        break;
      }

      case 'self_damage': {
        const dmg = effect.base || 200;
        this._applyDamage(caster, dmg);
        this.log.push(`${this._pieceName(caster)} s'inflige ${dmg} dégâts.`);
        break;
      }

      case 'star_burst': {
        // Zhen ultim: hit all 8 directions
        const burstRange = effect.range || 4;
        const base = effect.base || 300;
        const scaling = effect.scaling || 'rm';
        for (const [dr, dc] of DIRS8) {
          for (let step = 1; step <= burstRange; step++) {
            const r = caster.row + dr * step;
            const c = caster.col + dc * step;
            if (!inBounds(r, c)) break;
            const target = this._getPieceAt(r, c);
            if (target && target.team !== caster.team && target.alive) {
              const arm = scaling === 'rm' ? target.rm : target.arm;
              const dmg = scaling === 'rm' ? calcMagicDmg(base, arm, 0) : calcPhysDmg(base, arm, 0);
              const actual = this._applyDamage(target, dmg);
              this.log.push(`Tempête: ${this._pieceName(target)} subit ${actual} dégâts.`);
              break; // Stop in this direction after hitting first target
            }
            if (this.walls.some(w => w.r === r && w.c === c)) break;
          }
        }
        break;
      }

      case 'deluge': {
        // Velara ultim: extinguish embrasé on allies, 400 damage to feu enemies on line
        // Targets are cells on the line
        for (const cell of targets) {
          const target = this._getPieceAt(cell.row, cell.col);
          if (!target) continue;
          if (target.team === caster.team) {
            // Extinguish embrasé
            if (this.hasStatus(target, 'embrasé')) {
              this.removeStatus(target, 'embrasé');
              this.log.push(`Déluge éteint l'embrasement de ${this._pieceName(target)}!`);
            }
          } else {
            // Enemy feu: 400 damage
            const enemyChamp = CHAMPIONS[target.championId];
            if (enemyChamp && enemyChamp.element === 'feu') {
              const actual = this._applyDamage(target, 400);
              this.log.push(`Déluge inflige ${actual} dégâts à ${this._pieceName(target)} (feu)!`);
            }
          }
        }
        break;
      }

      case 'double_if_poisoned': {
        // Rohn s1: double damage if target has poison
        // This is applied retroactively to the damage effect
        const dmgTarget = this._getPieceAt(targetRow, targetCol);
        if (dmgTarget && this.hasStatus(dmgTarget, 'poison')) {
          const dmgEffect = spell.effects.find(e => e.type === 'damage');
          if (dmgEffect) {
            // Apply extra damage = same base again
            const arm = dmgEffect.scaling === 'rm' ? dmgTarget.rm : dmgTarget.arm;
            const bonusDmg = dmgEffect.scaling === 'rm'
              ? calcMagicDmg(dmgEffect.base || 0, arm, 0)
              : calcPhysDmg(dmgEffect.base || 0, arm, 0);
            const actual = this._applyDamage(dmgTarget, bonusDmg);
            this.log.push(`Double dégâts sur cible empoisonnée: +${actual} dégâts!`);
          }
        }
        break;
      }

      default:
        // Unknown effect type, skip
        break;
    }
  }

  // ── End turn ─────────────────────────────────────────────────────────────────

  actionEndTurn(playerId, pieceId) {
    const err = this._validateTurn(playerId, pieceId);
    if (err) return { error: err };
    this.advanceTurn();
    return { ok: true };
  }

  advanceTurn() {
    if (this.phase !== 'playing') return;

    const currentPieceId = this.turnOrder[this.turnIndex];
    const currentPiece = this.pieces.get(currentPieceId);

    if (currentPiece && currentPiece.alive) {
      // Reduce cooldowns
      for (const key of ['s1', 's2', 'ultim']) {
        if (currentPiece.spellCooldowns[key] > 0) {
          currentPiece.spellCooldowns[key]--;
        }
      }

      // Reduce buff durations
      if (currentPiece.bastionActive) {
        currentPiece.bastionTurns--;
        if (currentPiece.bastionTurns <= 0) {
          currentPiece.bastionActive = false;
          this.removeStatus(currentPiece, 'bastion');
        }
      }
      if (currentPiece.rageActive) {
        currentPiece.rageTurns--;
        if (currentPiece.rageTurns <= 0) {
          currentPiece.rageActive = false;
          currentPiece.rageKills = 0;
          this.removeStatus(currentPiece, 'rage');
        }
      }
      if (currentPiece.isAnchor && this.hasStatus(currentPiece, 'pilier')) {
        const pilierStatus = currentPiece.statuses.find(s => s.name === 'pilier');
        if (pilierStatus) {
          pilierStatus.duration--;
          if (pilierStatus.duration <= 0) {
            currentPiece.isAnchor = false;
            this.removeStatus(currentPiece, 'pilier');
          }
        }
      }

      // Reduce status durations on current piece
      currentPiece.statuses = currentPiece.statuses.filter(s => {
        s.duration--;
        return s.duration > 0;
      });

      // Reset actedThisTurn
      currentPiece.actedThisTurn = { moved: false, attacked: false, spelled: false };
    }

    // Reduce wall/trap/trail durations
    this.walls = this.walls.filter(w => { w.duration--; return w.duration > 0; });
    this.traps = this.traps.filter(t => { t.duration--; return t.duration > 0; });
    this.trails = this.trails.filter(t => { t.duration--; return t.duration > 0; });

    // Advance turn index
    const oldIndex = this.turnIndex;
    this.turnIndex = (this.turnIndex + 1) % this.turnOrder.length;

    // Check if new round (wrapped back to start)
    if (this.turnIndex <= oldIndex) {
      this.round++;
      // Rebuild turnOrder with alive pieces sorted by spd
      const alivePieces = this.turnOrder
        .map(id => this.pieces.get(id))
        .filter(p => p && p.alive);
      alivePieces.sort((a, b) => {
        if (b.spd !== a.spd) return b.spd - a.spd;
        return Math.random() < 0.5 ? -1 : 1;
      });
      this.turnOrder = alivePieces.map(p => p.id);
      this.turnIndex = 0;

      // Apply DOT statuses at start of round
      for (const piece of this.pieces.values()) {
        if (!piece.alive) continue;
        this._applyStartOfRoundEffects(piece);
      }

      // Reduce Rohn mark turns
      for (const piece of this.pieces.values()) {
        if (!piece.alive) continue;
        if (piece.markTarget && piece.markTurns > 0) {
          piece.markTurns--;
          if (piece.markTurns <= 0) {
            piece.markTarget = null;
            this.log.push(`La marque de ${this._pieceName(piece)} expire.`);
          }
        }
      }

      this.log.push(`Tour ${this.round} commence.`);
    }

    // Skip stunned or dead pieces
    this._skipInvalidPieces();

    this.broadcast('rb:state', this.publicState());
  }

  _applyStartOfRoundEffects(piece) {
    for (const status of piece.statuses) {
      const value = status.value || 0;
      switch (status.name) {
        case 'embrasé':
          if (value > 0) {
            const dmg = this._applyDamage(piece, value);
            this.log.push(`${this._pieceName(piece)} subit ${dmg} dégâts de brûlure (embrasé).`);
          }
          break;
        case 'saignement':
          if (value > 0) {
            const dmg = this._applyDamage(piece, value);
            this.log.push(`${this._pieceName(piece)} saigne pour ${dmg} dégâts.`);
          }
          break;
        case 'poison':
          if (value > 0) {
            const dmg = this._applyDamage(piece, value);
            this.log.push(`${this._pieceName(piece)} subit ${dmg} dégâts de poison.`);
          }
          break;
        default:
          break;
      }
    }
  }

  _skipInvalidPieces() {
    let safety = 0;
    while (safety < this.turnOrder.length) {
      const pieceId = this.turnOrder[this.turnIndex];
      const piece = this.pieces.get(pieceId);
      if (!piece || !piece.alive) {
        this.turnIndex = (this.turnIndex + 1) % this.turnOrder.length;
        safety++;
        continue;
      }
      if (this.hasStatus(piece, 'étourdi')) {
        this.log.push(`${this._pieceName(piece)} est étourdi, passe son tour.`);
        // Reduce étourdi duration before skipping
        const st = piece.statuses.find(s => s.name === 'étourdi');
        if (st) { st.duration--; if (st.duration <= 0) piece.statuses = piece.statuses.filter(s => s.name !== 'étourdi'); }
        this.turnIndex = (this.turnIndex + 1) % this.turnOrder.length;
        safety++;
        continue;
      }
      break;
    }
  }

  // ── Kill piece ────────────────────────────────────────────────────────────────

  killPiece(piece) {
    if (!piece.alive) return;
    piece.alive = false;
    piece.hp = 0;

    // Remove from turnOrder
    this.turnOrder = this.turnOrder.filter(id => id !== piece.id);
    // Adjust turnIndex if needed
    if (this.turnIndex >= this.turnOrder.length && this.turnOrder.length > 0) {
      this.turnIndex = 0;
    }

    // Syal's shadow handling
    if (piece.isShadow) {
      const owner = this.pieces.get(piece.ownerId);
      if (owner && owner.alive) {
        owner.hasShadow = false;
        owner.shadowId = null;
        // If Syal ultim was used (convergence with shadow), give +200 HP
        if (owner.ultUsed) {
          owner.hp = Math.min(owner.maxHp, owner.hp + 200);
          this.log.push(`L'ombre de Syal est détruite, Syal récupère 200 PV.`);
        }
      }
    }

    // If this piece has a shadow, kill the shadow too
    if (piece.hasShadow && piece.shadowId) {
      const shadow = this.pieces.get(piece.shadowId);
      if (shadow && shadow.alive) this.killPiece(shadow);
    }

    this.log.push(`${this._pieceName(piece)} a été éliminé!`);
    this.checkWinCondition();
  }

  // ── Win condition ─────────────────────────────────────────────────────────────

  checkWinCondition() {
    if (this.phase === 'finished') return;

    // Check fountains
    const redFountainsAlive = [...this.fountains.values()].filter(f => f.team === 'red' && f.hp > 0);
    const blueFountainsAlive = [...this.fountains.values()].filter(f => f.team === 'blue' && f.hp > 0);
    if (redFountainsAlive.length === 0) { this.endGame('blue'); return; }
    if (blueFountainsAlive.length === 0) { this.endGame('red'); return; }

    // Check pieces
    const redPiecesAlive = [...this.pieces.values()].filter(p => p.alive && p.team === 'red' && !p.isShadow);
    const bluePiecesAlive = [...this.pieces.values()].filter(p => p.alive && p.team === 'blue' && !p.isShadow);
    if (redPiecesAlive.length === 0) { this.endGame('blue'); return; }
    if (bluePiecesAlive.length === 0) { this.endGame('red'); return; }
  }

  endGame(winner) {
    if (this.phase === 'finished') return;
    this.winner = winner;
    this.phase  = 'finished';
    this.log.push(`Partie terminée! L'équipe ${winner === 'blue' ? 'bleue' : 'rouge'} remporte la victoire!`);
    this.broadcast('rb:state', this.publicState());
    this.broadcast('rb:game_end', { winner });
  }
}

// ── Room registry ─────────────────────────────────────────────────────────────

const rooms = new Map();

function createRoom(hostId) {
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  const room  = new RiftRoom(code, hostId);
  rooms.set(code, room);
  return room;
}

function getRoom(code)    { return rooms.get(code); }
function deleteRoom(code) { rooms.delete(code); }

module.exports = { RiftRoom, createRoom, getRoom, deleteRoom };
