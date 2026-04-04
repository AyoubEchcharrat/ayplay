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
];

// Les terrains affectent les deux boards (mod global)
const TERRAINS = [
  {
    id: 'foret',  name: 'Forêt',  type: 'terrain',
    description: '+1 DEF à tous les animaux',
    modifiers: { atk: 0, def: 1 },
  },
  {
    id: 'ville',  name: 'Ville',  type: 'terrain',
    description: '-1 DEF à tous les animaux',
    modifiers: { atk: 0, def: -1 },
  },
  {
    id: 'desert', name: 'Désert', type: 'terrain',
    description: '+1 ATK, -1 DEF à tous les animaux',
    modifiers: { atk: 1, def: -1 },
  },
  {
    id: 'marais', name: 'Marais', type: 'terrain',
    description: '-1 ATK à tous les animaux',
    modifiers: { atk: -1, def: 0 },
  },
];

// Les états n'affectent que les animaux de leur propriétaire
const STATES = [
  {
    id: 'nuit',          name: 'Nuit',          type: 'state',
    description: '+1 ATK/DEF aux animaux nocturnes (Jaguar, Serpent, Chouette)',
    scope: 'nocturnal',
    modifiers: { atk: 1, def: 1 },
  },
  {
    id: 'rage',          name: 'Rage',          type: 'state',
    description: '+2 ATK, -1 DEF à vos animaux',
    scope: 'all',
    modifiers: { atk: 2, def: -1 },
  },
  {
    id: 'bouclier',      name: 'Bouclier',      type: 'state',
    description: '+2 DEF à vos animaux',
    scope: 'all',
    modifiers: { atk: 0, def: 2 },
  },
  {
    id: 'concentration', name: 'Concentration', type: 'state',
    description: '+1 ATK à vos animaux, pas de contre-attaque adverse',
    scope: 'all',
    modifiers: { atk: 1, def: 0 },
    noCounterAttack: true,
  },
];

// Composition du deck (20 cartes)
const DECK_COMPOSITION = [
  // Animaux x2
  { id: 'tortue',   count: 2 },
  { id: 'jaguar',   count: 2 },
  { id: 'serpent',  count: 2 },
  { id: 'chouette', count: 2 },
  { id: 'renard',   count: 2 },
  { id: 'colibri',  count: 2 },
  // Animaux x1
  { id: 'crocodile', count: 1 },
  { id: 'ours',      count: 1 },
  // Terrains x1
  { id: 'foret',  count: 1 },
  { id: 'ville',  count: 1 },
  { id: 'desert', count: 1 },
  // États x1
  { id: 'nuit',     count: 1 },
  { id: 'rage',     count: 1 },
  { id: 'bouclier', count: 1 },
];

function buildDeck() {
  const allCards = [...ANIMALS, ...TERRAINS, ...STATES];
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

module.exports = { ANIMALS, TERRAINS, STATES, buildDeck };
