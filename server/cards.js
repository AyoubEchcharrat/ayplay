// ── Données des cartes ──────────────────────────────────────────────

const ANIMALS = [
  { id: 'tortue',    name: 'Tortue',    type: 'animal', baseATK: 0, baseDEF: 6, isNocturnal: false },
  { id: 'jaguar',    name: 'Jaguar',    type: 'animal', baseATK: 5, baseDEF: 2, isNocturnal: true  },
  { id: 'serpent',   name: 'Serpent',   type: 'animal', baseATK: 2, baseDEF: 3, isNocturnal: true  },
  { id: 'chouette',  name: 'Chouette',  type: 'animal', baseATK: 3, baseDEF: 2, isNocturnal: true  },
  { id: 'crocodile', name: 'Crocodile', type: 'animal', baseATK: 3, baseDEF: 4, isNocturnal: false },
  { id: 'renard',    name: 'Renard',    type: 'animal', baseATK: 2, baseDEF: 2, isNocturnal: false },
  { id: 'ours',      name: 'Ours',      type: 'animal', baseATK: 4, baseDEF: 3, isNocturnal: false },
  { id: 'colibri',   name: 'Colibri',   type: 'animal', baseATK: 1, baseDEF: 1, isNocturnal: false },
  { id: 'lion',      name: 'Lion',      type: 'animal', baseATK: 4, baseDEF: 4, isNocturnal: false },
  { id: 'elephant',  name: 'Éléphant',  type: 'animal', baseATK: 2, baseDEF: 7, isNocturnal: false },
  { id: 'requin',    name: 'Requin',    type: 'animal', baseATK: 4, baseDEF: 2, isNocturnal: true  },
  { id: 'gorille',   name: 'Gorille',   type: 'animal', baseATK: 5, baseDEF: 3, isNocturnal: false },
  { id: 'faucon',    name: 'Faucon',    type: 'animal', baseATK: 3, baseDEF: 1, isNocturnal: true  },
  { id: 'araignee',  name: 'Araignée',  type: 'animal', baseATK: 1, baseDEF: 3, isNocturnal: true  },
];

// Les terrains affectent les deux boards (mod global)
const TERRAINS = [
  { id: 'foret',    name: 'Forêt',    type: 'terrain', description: '+1 DEF à tous les animaux',       modifiers: { atk:  0, def:  1 } },
  { id: 'ville',    name: 'Ville',    type: 'terrain', description: '-1 DEF à tous les animaux',       modifiers: { atk:  0, def: -1 } },
  { id: 'desert',   name: 'Désert',   type: 'terrain', description: '+1 ATK, -1 DEF à tous',           modifiers: { atk:  1, def: -1 } },
  { id: 'marais',   name: 'Marais',   type: 'terrain', description: '-1 ATK à tous les animaux',       modifiers: { atk: -1, def:  0 } },
  { id: 'montagne', name: 'Montagne', type: 'terrain', description: '+2 ATK, -1 DEF à tous',           modifiers: { atk:  2, def: -1 } },
  { id: 'ocean',    name: 'Océan',    type: 'terrain', description: '-1 ATK, +2 DEF à tous',           modifiers: { atk: -1, def:  2 } },
  { id: 'plaine',   name: 'Plaine',   type: 'terrain', description: '+1 ATK à tous les animaux',       modifiers: { atk:  1, def:  0 } },
  { id: 'volcan',   name: 'Volcan',   type: 'terrain', description: '+3 ATK, -2 DEF à tous (risqué !)',modifiers: { atk:  3, def: -2 } },
];

// Les états n'affectent que les animaux de leur propriétaire
const STATES = [
  { id: 'nuit',          name: 'Nuit',          type: 'state', description: '+1 ATK/DEF aux animaux nocturnes',          scope: 'nocturnal', modifiers: { atk: 1, def:  1 } },
  { id: 'rage',          name: 'Rage',          type: 'state', description: '+2 ATK, -1 DEF à vos animaux',             scope: 'all',       modifiers: { atk: 2, def: -1 } },
  { id: 'bouclier',      name: 'Bouclier',      type: 'state', description: '+2 DEF à vos animaux',                     scope: 'all',       modifiers: { atk: 0, def:  2 } },
  { id: 'concentration', name: 'Concentration', type: 'state', description: '+1 ATK, pas de contre-attaque adverse',    scope: 'all',       modifiers: { atk: 1, def:  0 }, noCounterAttack: true },
  { id: 'armure',        name: 'Armure',        type: 'state', description: '+3 DEF à vos animaux',                     scope: 'all',       modifiers: { atk: 0, def:  3 } },
  { id: 'frenésie',      name: 'Frénésie',      type: 'state', description: '+3 ATK, -2 DEF à vos animaux',             scope: 'all',       modifiers: { atk: 3, def: -2 } },
  { id: 'invisibilite',  name: 'Invisibilité',  type: 'state', description: '+1 ATK/DEF nocturnes, sans contre-attaque',scope: 'nocturnal', modifiers: { atk: 1, def:  1 }, noCounterAttack: true },
];

// Cartes spéciales à effet immédiat
const SPECIALS = [
  { id: 'draw_two',        name: 'Piocher ×2',     type: 'special', effect: 'draw_two',        description: 'Piochez 2 cartes immédiatement' },
  { id: 'destroy_terrain', name: 'Bulldozer',       type: 'special', effect: 'destroy_terrain', description: 'Détruit le terrain adverse' },
  { id: 'destroy_state',   name: 'Neutralisation',  type: 'special', effect: 'destroy_state',   description: "Détruit l'état adverse" },
];

// Composition du deck (~35 cartes)
const DECK_COMPOSITION = [
  // Animaux communs ×2
  { id: 'tortue',   count: 2 },
  { id: 'jaguar',   count: 2 },
  { id: 'serpent',  count: 2 },
  { id: 'chouette', count: 2 },
  { id: 'renard',   count: 2 },
  { id: 'colibri',  count: 2 },
  // Animaux rares ×1
  { id: 'crocodile', count: 1 },
  { id: 'ours',      count: 1 },
  { id: 'lion',      count: 1 },
  { id: 'elephant',  count: 1 },
  { id: 'requin',    count: 1 },
  { id: 'gorille',   count: 1 },
  { id: 'faucon',    count: 1 },
  { id: 'araignee',  count: 1 },
  // Terrains ×1
  { id: 'foret',    count: 1 },
  { id: 'ville',    count: 1 },
  { id: 'desert',   count: 1 },
  { id: 'marais',   count: 1 },
  { id: 'montagne', count: 1 },
  { id: 'ocean',    count: 1 },
  { id: 'plaine',   count: 1 },
  { id: 'volcan',   count: 1 },
  // États ×1
  { id: 'nuit',          count: 1 },
  { id: 'rage',          count: 1 },
  { id: 'bouclier',      count: 1 },
  { id: 'concentration', count: 1 },
  { id: 'armure',        count: 1 },
  { id: 'frenésie',      count: 1 },
  { id: 'invisibilite',  count: 1 },
  // Spéciaux
  { id: 'draw_two',        count: 2 },
  { id: 'destroy_terrain', count: 1 },
  { id: 'destroy_state',   count: 1 },
];

function buildDeck() {
  const allCards = [...ANIMALS, ...TERRAINS, ...STATES, ...SPECIALS];
  const deck = [];

  for (const entry of DECK_COMPOSITION) {
    const card = allCards.find(c => c.id === entry.id);
    if (!card) continue;
    for (let i = 0; i < entry.count; i++) {
      deck.push({ ...card });
    }
  }

  // Mélange Fisher-Yates
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

module.exports = { ANIMALS, TERRAINS, STATES, SPECIALS, buildDeck };
