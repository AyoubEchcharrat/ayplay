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
  for (let r = 0; r < ROWS; r++) {
    grid[r] = [];
    for (let c = 0; c < COLS; c++) {
      let terrain;
      if (r === 0 || r === 12) {
        terrain = 'base';
      } else if (r === 6) {
        terrain = (c === 6) ? 'bridge' : 'river';
      } else {
        const inJungle = (c >= 1 && c <= 3) || (c >= 9 && c <= 11);
        terrain = inJungle ? 'jungle' : 'lane';
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
  { row: 12, col: 2,  hp: 3000 },
  { row: 12, col: 6,  hp: 5000 },
  { row: 12, col: 10, hp: 3000 },
];

const FOUNTAINS_RED = [
  { row: 0, col: 2,  hp: 3000 },
  { row: 0, col: 6,  hp: 5000 },
  { row: 0, col: 10, hp: 3000 },
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
      hp: 2800,
      atk: 220,
      arm: 60,
      rm: 30,
      spd: 2,
      move: 2,
      atkRange: 1,
    },
    spells: {
      s1: {
        name: 'Charge Tellurique',
        desc: 'Fonce en ligne droite sur 4 cases, repousse les ennemis sur le côté et les embrase par friction.',
        targeting: 'line',
        range: 4,
        cd: 2,
        effects: [
          { type: 'caster_move_to_line_end' },
          { type: 'damage', base: 250, scaling: 'atk' },
          { type: 'push', dir: 'side', dist: 1 },
          { type: 'status', name: 'embrasé', duration: 2, value: 40 },
        ],
      },
      s2: {
        name: 'Frappe Sismique',
        desc: 'Frappe en arc frontal sur 2 cases et ralentit les ennemis touchés.',
        targeting: 'front_arc',
        range: 2,
        cd: 2,
        effects: [
          { type: 'damage', base: 200, scaling: 'atk' },
          { type: 'status', name: 'ralenti', duration: 1 },
        ],
      },
      ultim: {
        name: 'Pilier de Terre',
        desc: 'Érige un pilier de terre, devenant inaccessible et ignorant les déplacements forcés.',
        targeting: 'self',
        range: 0,
        cd: 5,
        effects: [
          { type: 'buff', name: 'pilier', duration: 2 },
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

  syal: {
    id: 'syal',
    name: 'Syal',
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
        name: 'Voile Noir',
        desc: 'Syal devient invisible pendant 1 tour (déplacement max 2 cases). L\'invisibilité est brisée si Syal est touché.',
        targeting: 'self',
        range: 0,
        cd: 4,
        effects: [
          { type: 'status', name: 'invisible', duration: 1, self: true },
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
        name: 'Vague Horizontale',
        desc: 'Envoie une vague sur toute la rangée, poussant les ennemis de 2 cases.',
        targeting: 'full_row',
        range: 12,
        cd: 0,
        effects: [
          { type: 'damage', base: 200, scaling: 'rm' },
          { type: 'push', dir: 'horizontal', dist: 2 },
        ],
      },
      s2: {
        name: 'Brume Glacée',
        desc: 'Gèle les ennemis dans un rayon de 2 cases autour de Vélara.',
        targeting: 'aoe_self',
        range: 2,
        cd: 2,
        effects: [
          { type: 'damage', base: 150, scaling: 'rm' },
          { type: 'status', name: 'gelé', duration: 2, value: 1 },
        ],
      },
      ultim: {
        name: 'Déluge',
        desc: 'Déluge en ligne : éteint embrasé sur les alliés, inflige 400 dégâts aux ennemis feu.',
        targeting: 'line',
        range: 5,
        cd: 5,
        effects: [
          { type: 'deluge' },
        ],
      },
    },
  },

  pyrox: {
    id: 'pyrox',
    name: 'Pyrox',
    title: 'Le Brasier Vivant',
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
          { type: 'damage', base: 350, scaling: 'rm' },
          { type: 'status', name: 'embrasé', duration: 3, value: 50 },
        ],
      },
      s2: {
        name: 'Explosion Diagonale',
        desc: 'Envoie des flammes en diagonale avec éclaboussure de rayon 1.',
        targeting: 'all_diag',
        range: 4,
        cd: 2,
        effects: [
          { type: 'damage', base: 250, scaling: 'rm' },
          { type: 'aoe_splash', radius: 1 },
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
    title: 'La Forteresse',
    class: 'tank',
    element: 'terre',
    emoji: '🏰',
    stats: {
      hp: 3800,
      atk: 180,
      arm: 90,
      rm: 60,
      spd: 1,
      move: 2,
      atkRange: 1,
    },
    spells: {
      s1: {
        name: 'Mur de Pierre',
        desc: 'Érige un mur de 3 cases de large pendant 5 tours.',
        targeting: 'adjacent',
        range: 2,
        cd: 0,
        effects: [
          { type: 'create_wall', width: 3, duration: 5 },
        ],
      },
      s2: {
        name: 'Rush de Forteresse',
        desc: 'Fonce en avant avec une vitesse surprenante : +4 de déplacement ce tour, mais -25% ARM et RM jusqu\'au prochain tour.',
        targeting: 'self',
        range: 0,
        cd: 3,
        effects: [
          { type: 'bonus_move', amount: 4 },
          { type: 'self_debuff_armor', percent: 0.25, duration: 1 },
        ],
      },
      ultim: {
        name: 'Bastion Absolu',
        desc: 'Devient un bastion imprenable pendant 2 tours, réduisant massivement les dégâts subis.',
        targeting: 'self',
        range: 0,
        cd: 5,
        effects: [
          { type: 'buff', name: 'bastion', duration: 2 },
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
        cd: 0,
        effects: [
          { type: 'heal_or_damage', healBase: 350, dmgBase: 200, scaling: 'rm' },
        ],
      },
      s2: {
        name: 'Croix de Lumière',
        desc: 'Croix diagonale de lumière : soigne les alliés (150) ou blesse les ennemis (150).',
        targeting: 'all_diag',
        range: 2,
        cd: 2,
        effects: [
          { type: 'heal_or_damage', healBase: 150, dmgBase: 150, scaling: 'rm' },
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
      hp: 2600,
      atk: 250,
      arm: 55,
      rm: 40,
      spd: 2,
      move: 2,
      atkRange: 1,
    },
    spells: {
      s1: {
        name: 'Morsure Vorace',
        desc: 'Morsure adjacente : dégâts + saignement 3 tours + vol de vie (30%, 60% si cible saigne déjà).',
        targeting: 'adjacent',
        range: 1,
        cd: 0,
        effects: [
          { type: 'damage', base: 250, scaling: 'atk' },
          { type: 'lifesteal', ratio: 0.3, bonusRatio: 0.6, bonusCond: 'saignement' },
          { type: 'status', name: 'saignement', duration: 3, value: 30 },
        ],
      },
      s2: {
        name: 'Rugissement',
        desc: 'Rugissement frontal qui repousse les ennemis d\'une case et inflige 150 dégâts contre un mur.',
        targeting: 'front_arc',
        range: 1,
        cd: 2,
        effects: [
          { type: 'damage', base: 180, scaling: 'atk' },
          { type: 'push', dir: 'away', dist: 1, wallDmg: 150 },
        ],
      },
      ultim: {
        name: 'Rage des Abysses',
        desc: 'Entre en rage pendant 2 tours, décuplant sa puissance de combat.',
        targeting: 'self',
        range: 0,
        cd: 5,
        effects: [
          { type: 'buff', name: 'rage', duration: 2 },
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
        cd: 0,
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
          { type: 'leave_trail', dmg: 180, status: { name: 'ralenti', duration: 1 } },
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

  syal_shadow: {
    id: 'syal_shadow',
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

};

/** Ordered array of champion ids for iteration / pick screens */
const CHAMPION_LIST = [
  'karek',
  'lysha',
  'syal',
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
