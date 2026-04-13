// riftData.js — Data layer for RiftBoard
// Map: 13 cols (0–12), 13 rows (0–12). Row 0 = top (red/enemy), Row 12 = bottom (blue/player).

const ROWS = 13;
const COLS = 13;

// ---------------------------------------------------------------------------
// TERRAIN
// ---------------------------------------------------------------------------

/**
 * Build the full terrain grid as a 2D array [row][col].
 * Priority order: fountain override > base > river/bridge > lane/jungle
 */
function buildBaseTerrain() {
  const grid = [];
  // Staircase jungle: narrower near base, wider toward river
  // Defined per row for red side; mirror for blue side
  const jungleCols = (r) => {
    // Distance from river (row 6)
    const distFromRiver = Math.abs(r - 6);
    if (distFromRiver === 5) return [[1,2],[10,11]];         // rows 1, 11 : 2 cols
    if (distFromRiver === 4) return [[1,3],[9,11]];          // rows 2, 10 : 3 cols
    if (distFromRiver === 3) return [[1,3],[9,11]];          // rows 3, 9  : 3 cols
    if (distFromRiver === 2) return [[2,4],[8,10]];          // rows 4, 8  : 3 cols décalées
    if (distFromRiver === 1) return [[2,4],[8,10]];          // rows 5, 7  : 3 cols décalées
    return [];
  };

  for (let r = 0; r < ROWS; r++) {
    grid[r] = [];
    for (let c = 0; c < COLS; c++) {
      let terrain;
      if (r === 0 || r === 12) {
        terrain = 'base';
      } else if (r === 6) {
        terrain = (c === 6) ? 'bridge' : 'river';
      } else {
        const ranges = jungleCols(r);
        const isJungle = ranges.some(([lo, hi]) => c >= lo && c <= hi);
        terrain = isJungle ? 'jungle' : 'lane';
      }
      grid[r][c] = terrain;
    }
  }
  return grid;
}

const BASE_TERRAIN = buildBaseTerrain();

// ---------------------------------------------------------------------------
// FOUNTAINS
// ---------------------------------------------------------------------------

const FOUNTAINS_BLUE = [
  { row: 12, col: 2,  hp: 500  },   // extérieure gauche
  { row: 12, col: 6,  hp: 1000 },   // intérieure centrale
  { row: 12, col: 10, hp: 500  },   // extérieure droite
];

const FOUNTAINS_RED = [
  { row: 0, col: 2,  hp: 500  },
  { row: 0, col: 6,  hp: 1000 },
  { row: 0, col: 10, hp: 500  },
];

// Apply fountain overrides to the terrain grid (fountain cells are still 'base' zone,
// but are flagged separately; callers may check FOUNTAINS_BLUE/RED for the override).
// The BASE_TERRAIN grid itself keeps 'base' for those cells — fountain identity is
// resolved via the FOUNTAINS arrays.

// ---------------------------------------------------------------------------
// TERRAIN BONUS FUNCTION
// ---------------------------------------------------------------------------

/**
 * Returns terrain-based stat modifiers for a champion.
 *
 * @param {string} championClass  - The champion's class string.
 * @param {string} element        - The champion's element string.
 * @param {string} terrain        - The terrain type of the current cell.
 * @returns {object} Modifier object with relevant keys (atkMult, rmMult, movePenalty, etc.)
 */
function getTerrainBonus(championClass, element, terrain) {
  const bonus = {
    atkMult: 1.0,
    rmMult: 1.0,
    movePenalty: 0,   // subtract from effective move (capped to min 1 by caller)
  };

  if (terrain === 'jungle') {
    if (championClass === 'assassin') {
      bonus.atkMult = 1.10;
    }
    if (
      championClass === 'tank' ||
      championClass === 'tank-guerrier' ||
      championClass === 'tank-bruiser'
    ) {
      bonus.movePenalty = 1;
    }
  }

  if (terrain === 'river') {
    if (element === 'feu') {
      bonus.rmMult = 0.80;
    }
  }

  // bridge: no penalty (default values apply)

  return bonus;
}

// ---------------------------------------------------------------------------
// CHAMPIONS
// ---------------------------------------------------------------------------

const CHAMPIONS = {

  karek: {
    id: 'karek',
    name: 'Gavik',
    title: 'Le Brise-Ligne',
    class: 'tank-guerrier',
    element: 'terre',
    emoji: '🪨',
    stats: {
      hp: 2000,
      atk: 260,
      arm: 45,
      rm: 30,
      spd: 3,
      move: 3,
      atkRange: 1,
    },
    spells: {
      s1: {
        name: 'Charge Tellurique',
        desc: 'Fonce en ligne sur 4 cases, repousse les ennemis sur le côté, les embrase et brûle la jungle.',
        targeting: 'line',
        range: 4,
        cd: 2,
        effects: [
          { type: 'caster_move_to_line_end' },
          { type: 'damage', base: 320, scaling: 'atk', burnsJungle: true },
          { type: 'push', dir: 'side', dist: 1 },
          { type: 'status', name: 'embrasé', duration: 3, value: 40 },
        ],
      },
      s2: {
        name: 'Tremblement de Terre',
        desc: 'Fait trembler le sol autour de lui (rayon 1) : frappe les ennemis et les immobilise 1 rotation.',
        targeting: 'aoe_self',
        range: 1,
        cd: 3,
        effects: [
          { type: 'damage', base: 220, scaling: 'atk' },
          { type: 'status', name: 'immobilisé', duration: 1 },
        ],
      },
      ultim: {
        name: 'Éruption Sismique',
        desc: 'Déclenche une explosion de sol dans un rayon 2 : dégâts lourds + immobilise tous les ennemis touchés.',
        targeting: 'self',
        range: 0,
        cd: 5,
        effects: [
          { type: 'aoe_all', radius: 2, base: 380, scaling: 'atk', friendlyFire: false,
            applyStatus: { name: 'immobilisé', duration: 1 } },
        ],
      },
    },
  },

  lysha: {
    id: 'lysha',
    name: 'Lysha',
    title: 'La Lame-Fantôme',
    class: 'assassin',
    element: 'vent',
    emoji: '🗡️',
    stats: {
      hp: 1300,
      atk: 280,
      arm: 20,
      rm: 25,
      spd: 5,
      move: 3,
      atkRange: 1,
    },
    spells: {
      s1: {
        name: 'Bond Diagonal',
        desc: 'Bond en diagonale (2–3 cases) et attaque immédiatement à l\'atterrissage.',
        targeting: 'diag_jump',
        range: 3,
        minRange: 2,
        cd: 0,
        effects: [
          { type: 'jump', withAttack: true },
          { type: 'damage', base: 300, scaling: 'atk' },
        ],
      },
      s2: {
        name: 'Lacération en X',
        desc: 'Tranche en croix diagonale et fait saigner tous les ennemis touchés.',
        targeting: 'all_diag',
        range: 2,
        cd: 2,
        effects: [
          { type: 'damage', base: 180, scaling: 'atk' },
          { type: 'status', name: 'saignement', duration: 3, value: 30 },
        ],
      },
      ultim: {
        name: 'Lame du Néant',
        desc: 'Frappe adjacente à pénétration d\'armure totale ; exécute les cibles sous 35% de PV.',
        targeting: 'adjacent',
        range: 1,
        cd: 5,
        effects: [
          { type: 'damage', base: 350, scaling: 'atk', armorPen: 1.0 },
          { type: 'execute', threshold: 0.35 },
        ],
      },
    },
  },

  sayl: {
    id: 'sayl',
    name: 'Sayl',
    title: 'Le Tisserand d\'Ombre',
    class: 'mage',
    element: 'ombre',
    emoji: '🌑',
    stats: {
      hp: 1600,
      atk: 240,
      arm: 25,
      rm: 50,
      spd: 4,
      move: 3,
      atkRange: 2,
    },
    spells: {
      s1: {
        name: 'Invocation d\'Ombre',
        desc: 'Invoque une ombre spectrale sur la case ciblée (portée 2). L\'ombre peut se déplacer, attaquer (50% ATK) et utiliser Désincarnation pour se dissoudre.',
        targeting: 'single',
        range: 2,
        cd: 3,
        effects: [
          { type: 'summon_shadow' },
        ],
      },
      s2: {
        name: 'Transposition',
        desc: 'Échange instantanément sa position avec celle de l\'ombre invoquée.',
        targeting: 'shadow',
        range: 99,
        cd: 2,
        effects: [
          { type: 'swap_shadow' },
        ],
      },
      ultim: {
        name: 'Ombre Supérieure',
        desc: 'Invoque une seconde ombre, plus puissante, sur une case ciblée (portée 3). Elle peut Effrayer les ennemis et déployer un Voile des Ténèbres.',
        targeting: 'single',
        range: 3,
        cd: 5,
        effects: [
          { type: 'summon_shadow2' },
        ],
      },
    },
  },

  velara: {
    id: 'velara',
    name: 'Vélara',
    title: 'L\'Ensorcelleuse des Marées',
    class: 'mage-support',
    element: 'eau',
    emoji: '🌊',
    stats: {
      hp: 1700,
      atk: 200,
      arm: 30,
      rm: 55,
      spd: 3,
      move: 2,
      atkRange: 2,
    },
    spells: {
      s1: {
        name: 'Vague Dévastatrice',
        desc: 'Lance une vague dans une direction (H/V/diag) sur 4 cases (8 si sur rivière). Dégâts aux ennemis + recul 1 case. Alliés : recul sans dégâts. Éteint Embrasé sur tous.',
        targeting: 'line',
        range: 4,
        cd: 0,
        effects: [
          { type: 'tidal_wave', extendedRange: 8, leavesWaterTrail: true },
        ],
      },
      s2: {
        name: 'Brume Glacée',
        desc: 'Zone de rayon 2 autour de Vélara : dégâts magiques + statut Gelé 2 tours aux ennemis.',
        targeting: 'aoe_self',
        range: 2,
        cd: 2,
        effects: [
          { type: 'damage', base: 150, scaling: 'rm', leavesWaterTrail: true },
          { type: 'status', name: 'gelé', duration: 2, value: 1 },
        ],
      },
      ultim: {
        name: 'Bénédiction des Marées',
        desc: 'Confère à un allié ciblé +20 ATK flat + 5% ATK bonus + 1 mouvement pendant 2 tours.',
        targeting: 'single_ally',
        range: 4,
        cd: 5,
        effects: [
          { type: 'ally_atk_buff', flat: 20, percent: 0.05, movBonus: 1, duration: 2 },
        ],
      },
    },
  },

  pyrox: {
    id: 'pyrox',
    name: 'Richard',
    title: 'Cœur de Dragon',
    class: 'mage',
    element: 'feu',
    emoji: '🔥',
    stats: {
      hp: 1500,
      atk: 260,
      arm: 20,
      rm: 45,
      spd: 3,
      move: 2,
      atkRange: 2,
    },
    spells: {
      s1: {
        name: 'Trait de Feu',
        desc: 'Projette un trait enflammé en ligne droite qui embrase les cibles.',
        targeting: 'line',
        range: 6,
        cd: 0,
        effects: [
          { type: 'damage', base: 350, scaling: 'rm', burnsJungle: true },
          { type: 'status', name: 'embrasé', duration: 3, value: 50 },
          { type: 'leave_fire_trail', dmg: 80, duration: 1 },
        ],
      },
      s2: {
        name: 'Explosion Diagonale',
        desc: 'Envoie des flammes en diagonale avec éclaboussure de rayon 1.',
        targeting: 'all_diag',
        range: 4,
        cd: 2,
        effects: [
          { type: 'damage', base: 250, scaling: 'rm', burnsJungle: true },
          { type: 'aoe_splash', radius: 1 },
          { type: 'leave_fire_trail', dmg: 60, duration: 1 },
        ],
      },
      ultim: {
        name: 'Éruption',
        desc: 'Éruption de rayon 3 (feu ami inclus) ; Pyrox s\'inflige 200 dégâts mais devient immunisé à embrasé.',
        targeting: 'self',
        range: 0,
        cd: 5,
        effects: [
          { type: 'aoe_all', radius: 3, friendlyFire: true, base: 500, scaling: 'rm' },
          { type: 'self_damage', base: 200 },
          { type: 'status', name: 'immunisé_embrasé', duration: 3, self: true },
        ],
      },
    },
  },

  gorath: {
    id: 'gorath',
    name: 'Gorath',
    title: 'Le Briseur de Lignes',
    class: 'tank',
    element: 'terre',
    emoji: '🏰',
    stats: {
      hp: 2200,
      atk: 240,
      arm: 55,
      rm: 35,
      spd: 3,
      move: 3,
      atkRange: 1,
    },
    spells: {
      s1: {
        name: 'Coup de Masse',
        desc: 'Frappe violente adjacente : dégâts élevés + repousse l\'ennemi de 2 cases.',
        targeting: 'adjacent',
        range: 1,
        cd: 0,
        effects: [
          { type: 'damage', base: 360, scaling: 'atk' },
          { type: 'push', dir: 'away', dist: 2 },
        ],
      },
      s2: {
        name: 'Percée Blindée',
        desc: 'Charge en ligne sur 4 cases, frappe tous les ennemis rencontrés et les étourdit 1 rotation.',
        targeting: 'line',
        range: 4,
        cd: 3,
        effects: [
          { type: 'caster_move_to_line_end' },
          { type: 'damage', base: 280, scaling: 'atk' },
          { type: 'status', name: 'étourdi', duration: 1 },
        ],
      },
      ultim: {
        name: 'Déchaînement',
        desc: 'Entre dans un état de furie : +35% ATK, +1 déplacement, -15% dégâts reçus pendant 2 rotations.',
        targeting: 'self',
        range: 0,
        cd: 5,
        effects: [
          { type: 'ally_aura_buff', atkPct: 0.35, rmPct: 0.0, dmgReducPct: 0.15, movBonus: 1, duration: 2 },
        ],
      },
    },
  },

  aelys: {
    id: 'aelys',
    name: 'Aelys',
    title: 'La Gardienne',
    class: 'support',
    element: 'lumière',
    emoji: '✨',
    stats: {
      hp: 1400,
      atk: 160,
      arm: 35,
      rm: 65,
      spd: 3,
      move: 2,
      atkRange: 2,
    },
    spells: {
      s1: {
        name: 'Rayon de Soin',
        desc: 'Soin ciblé à portée 3 : soigne un allié (350 PV) ou blesse un ennemi (200 PV). Soigne aussi Aelys elle-même si elle se cible.',
        targeting: 'single',
        range: 3,
        cd: 2,
        effects: [
          { type: 'heal_or_damage', healBase: 350, dmgBase: 200, scaling: 'rm' },
        ],
      },
      s2: {
        name: 'Aura Sacrée',
        desc: 'Insuffle une aura à un allié (ou elle-même) : +10% ATK & RM, -5% dégâts reçus pendant 2 tours.',
        targeting: 'single_ally',
        range: 3,
        cd: 3,
        effects: [
          { type: 'ally_aura_buff', atkPct: 0.10, rmPct: 0.10, dmgReducPct: 0.05, duration: 2 },
        ],
      },
      ultim: {
        name: 'Renaissance',
        desc: 'Ressuscite un allié mort avec 600 PV ; Aelys est étourdie 1 tour.',
        targeting: 'dead_ally',
        range: 99,
        cd: 99,
        effects: [
          { type: 'resurrect', hp: 600 },
          { type: 'status', name: 'étourdi', duration: 1, self: true },
        ],
      },
    },
  },

  rohn: {
    id: 'rohn',
    name: 'Rohn',
    title: 'Le Traqueur',
    class: 'chasseur',
    element: 'nature',
    emoji: '🏹',
    stats: {
      hp: 1900,
      atk: 230,
      arm: 40,
      rm: 35,
      spd: 4,
      move: 3,
      atkRange: 3,
    },
    spells: {
      s1: {
        name: 'Flèche Longue Portée',
        desc: 'Flèche en ligne sur 7 cases ; inflige le double des dégâts si la cible est empoisonnée.',
        targeting: 'line',
        range: 7,
        cd: 0,
        effects: [
          { type: 'damage', base: 280, scaling: 'atk' },
          { type: 'double_if_poisoned' },
        ],
      },
      s2: {
        name: 'Piège Diagonal',
        desc: 'Pose un piège sur deux cases en diagonale : immobilise et inflige 150 dégâts.',
        targeting: 'two_diag_place',
        range: 3,
        cd: 2,
        effects: [
          { type: 'place_trap', dmg: 150, status: { name: 'immobilisé', duration: 1 } },
        ],
      },
      ultim: {
        name: 'Traque Sans Fin',
        desc: 'Marque une cible sur toute la carte pendant 3 tours : +1 mouvement et poison auto (40/tour).',
        targeting: 'single',
        range: 99,
        cd: 5,
        effects: [
          { type: 'mark', duration: 3, moveBonus: 1, autoPoison: { value: 40 } },
        ],
      },
    },
  },

  vek: {
    id: 'vek',
    name: 'Vek',
    title: 'La Bête des Profondeurs',
    class: 'tank-bruiser',
    element: 'bête',
    emoji: '🦷',
    stats: {
      hp: 2000,
      atk: 280,
      arm: 40,
      rm: 30,
      spd: 3,
      move: 3,
      atkRange: 1,
    },
    spells: {
      s1: {
        name: 'Morsure Vorace',
        desc: 'Morsure adjacente : dégâts + saignement 3 rotations + vol de vie (40%, 70% si cible saigne déjà).',
        targeting: 'adjacent',
        range: 1,
        cd: 0,
        effects: [
          { type: 'damage', base: 270, scaling: 'atk' },
          { type: 'lifesteal', ratio: 0.4, bonusRatio: 0.7, bonusCond: 'saignement' },
          { type: 'status', name: 'saignement', duration: 3, value: 35 },
        ],
      },
      s2: {
        name: 'Charge Bestiale',
        desc: 'Fonce sur 3 cases en renversant les ennemis : dégâts + repousse de 2 cases + saignement.',
        targeting: 'line',
        range: 3,
        cd: 3,
        effects: [
          { type: 'caster_move_to_line_end' },
          { type: 'damage', base: 260, scaling: 'atk' },
          { type: 'push', dir: 'away', dist: 2 },
          { type: 'status', name: 'saignement', duration: 3, value: 35 },
        ],
      },
      ultim: {
        name: 'Fureur Bestiale',
        desc: 'Déchaîne sa furie : +40% ATK, vol de vie 20% sur attaques, +1 mouvement pendant 3 rotations.',
        targeting: 'self',
        range: 0,
        cd: 5,
        effects: [
          { type: 'ally_aura_buff', atkPct: 0.40, rmPct: 0.0, dmgReducPct: 0.0,
            movBonus: 1, lifeStealPct: 0.20, duration: 3 },
        ],
      },
    },
  },

  zhen: {
    id: 'zhen',
    name: 'Zhen',
    title: 'Le Moine de l\'Éclair',
    class: 'duelliste',
    element: 'foudre',
    emoji: '⚡',
    stats: {
      hp: 1800,
      atk: 210,
      arm: 35,
      rm: 45,
      spd: 4,
      move: 3,
      atkRange: 2,
    },
    spells: {
      s1: {
        name: 'Chaîne d\'Éclairs',
        desc: 'Éclair en ligne rebondissant sur 2 cibles supplémentaires à 70% des dégâts.',
        targeting: 'line',
        range: 5,
        cd: 2,
        effects: [
          { type: 'damage', base: 300, scaling: 'rm' },
          { type: 'chain', bounces: 2, mult: 0.7 },
        ],
      },
      s2: {
        name: 'Dash Électrique',
        desc: 'Bond diagonal sans attaque, laisse une traînée électrique ralentissant les ennemis.',
        targeting: 'diag_jump',
        range: 3,
        cd: 2,
        effects: [
          { type: 'jump', withAttack: false },
          { type: 'leave_trail', dmg: 180, status: { name: 'ralenti', duration: 2 } },
        ],
      },
      ultim: {
        name: 'Tempête Convergente',
        desc: 'Lance 8 éclairs dans toutes les directions (portée 4) ; Zhen est étourdi 1 tour.',
        targeting: 'self',
        range: 0,
        cd: 5,
        effects: [
          { type: 'star_burst', directions: 8, range: 4, base: 300, scaling: 'rm' },
          { type: 'status', name: 'étourdi', duration: 1, self: true },
        ],
      },
    },
  },

  sayl_shadow: {
    id: 'sayl_shadow',
    name: 'Ombre',
    title: 'Projection Spectrale',
    class: 'mage',
    element: 'ombre',
    emoji: '👤',
    stats: {
      hp: 600,
      atk: 120,
      arm: 0,
      rm: 0,
      spd: 4,
      move: 2,
      atkRange: 1,
    },
    spells: {
      s1: {
        name: 'Désincarnation',
        desc: 'Dissout l\'ombre immédiatement.',
        targeting: 'self',
        range: 0,
        cd: 0,
        effects: [
          { type: 'kill_self' },
        ],
      },
    },
  },

  sayl_shadow2: {
    id: 'sayl_shadow2',
    name: 'Ombre Supérieure',
    title: 'Émanation Obscure',
    class: 'mage',
    element: 'ombre',
    emoji: '🌑',
    stats: {
      hp: 900,
      atk: 180,
      arm: 5,
      rm: 40,
      spd: 5,
      move: 3,
      atkRange: 2,
    },
    spells: {
      s1: {
        name: 'Effroi',
        desc: 'Terrifie un ennemi à portée 3 : il ne peut plus attaquer ni lancer de sorts jusqu\'à sa prochaine rotation.',
        targeting: 'single',
        range: 3,
        cd: 3,
        effects: [
          { type: 'effroi' },
        ],
      },
      ultim: {
        name: 'Voile des Ténèbres',
        desc: 'Déploie une zone d\'ombre 3×3 autour de l\'ombre : les ennemis ne peuvent attaquer ni lancer de sorts, déplacement réduit de moitié. Dure 2 rotations.',
        targeting: 'self',
        range: 0,
        cd: 5,
        effects: [
          { type: 'zone_ombre', durationRounds: 2 },
        ],
      },
    },
  },

};

/** Ordered array of champion ids for iteration / pick screens */
const CHAMPION_LIST = [
  'karek',
  'lysha',
  'sayl',
  'velara',
  'pyrox',
  'gorath',
  'aelys',
  'rohn',
  'vek',
  'zhen',
];

// ---------------------------------------------------------------------------
// STARTING POSITIONS
// ---------------------------------------------------------------------------

/** Five starting cells for the blue (player / bottom) team — row 11 */
const BLUE_START_POSITIONS = [
  { row: 11, col: 1 },
  { row: 11, col: 4 },
  { row: 11, col: 6 },
  { row: 11, col: 9 },
  { row: 11, col: 11 },
];

/** Five starting cells for the red (enemy / top) team — row 1 */
const RED_START_POSITIONS = [
  { row: 1, col: 1 },
  { row: 1, col: 4 },
  { row: 1, col: 6 },
  { row: 1, col: 9 },
  { row: 1, col: 11 },
];

// ---------------------------------------------------------------------------
// EXPORTS
// ---------------------------------------------------------------------------

module.exports = {
  ROWS,
  COLS,
  BASE_TERRAIN,
  FOUNTAINS_BLUE,
  FOUNTAINS_RED,
  CHAMPIONS,
  CHAMPION_LIST,
  BLUE_START_POSITIONS,
  RED_START_POSITIONS,
  getTerrainBonus,
};
