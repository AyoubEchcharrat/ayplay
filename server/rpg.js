const express   = require('express');
const Anthropic  = require('@anthropic-ai/sdk');
const router     = express.Router();

// ── Client ─────────────────────────────────────────────────────────
let anthropic;
try {
  anthropic = new Anthropic(); // uses ANTHROPIC_API_KEY env var
} catch (e) {
  console.warn('[RPG] Anthropic client non initialisé (clé manquante ?)');
}

// ── Sessions en mémoire ────────────────────────────────────────────
const sessions = new Map();

// ── Prompts ────────────────────────────────────────────────────────
const SYSTEM = `Tu es GENESIS, un moteur de jeu génératif. Tu crées des expériences interactives complètes à partir de n'importe quelle prémisse — fantasy médiéval, visual novel romantique, survival post-apo, slice of life, sci-fi, horreur, etc.

RÈGLES ABSOLUES :
1. Réponds UNIQUEMENT en JSON valide — aucun markdown, aucune explication, aucun bloc de code
2. Le thème visuel doit parfaitement correspondre à l'univers
3. Les stats et l'inventaire doivent être natifs de l'univers (pas de HP/Mana dans un visual novel)
4. La narration est en français, 2ème personne du singulier, présent, 3 paragraphes riches
5. Les choix doivent être variés et signifiants
6. Les noms de polices doivent être de vraies Google Fonts (ex: Cinzel, Playfair Display, Dancing Script, Orbitron, Special Elite, Press Start 2P, VT323, IM Fell English, Uncial Antiqua, Exo 2, Crimson Text)

Exemples de correspondances :
- Fantasy sombre → bg #0a0608, police Cinzel, accent bordeaux/or
- Visual novel romance → bg #fff5f9, police Dancing Script, accent rose tendre
- Survival post-apo → bg #0d0c07, police Special Elite, accent jaune rouille
- Sci-fi spatial → bg #020818, police Orbitron, accent cyan électrique
- Slice of life → bg #fafaf8, police Nunito, accent terre cuite douce`;

function startPrompt(premise) {
  return `Crée une session de jeu pour cette prémisse : "${premise}"

Retourne exactement ce JSON :
{
  "theme": {
    "bg": "couleur hex de fond",
    "surface": "couleur hex des panneaux/cartes",
    "primary": "couleur hex d'accent",
    "text": "couleur hex du texte principal",
    "muted": "couleur hex du texte secondaire",
    "border": "couleur hex des bordures",
    "fontTitle": "nom de Google Font pour les titres",
    "fontBody": "nom de Google Font pour le corps",
    "mood": "un mot décrivant l'ambiance"
  },
  "player": {
    "name": "nom du personnage",
    "avatar": "emoji unique",
    "description": "une phrase de description",
    "stats": [
      { "id": "id_unique", "name": "Nom Stat", "value": 75, "max": 100, "icon": "emoji", "color": "#hex" }
    ],
    "inventory": [
      { "id": "id_unique", "name": "Objet", "desc": "Description courte", "icon": "emoji", "qty": 1 }
    ]
  },
  "world": {
    "location": "lieu actuel",
    "time": "heure/ère",
    "atmosphere": "emoji + description courte"
  },
  "narrative": "Scène d'ouverture — 3 paragraphes immersifs, 2ème personne, présent.",
  "choices": [
    { "id": "c1", "text": "texte de l'action", "icon": "emoji" },
    { "id": "c2", "text": "texte de l'action", "icon": "emoji" },
    { "id": "c3", "text": "texte de l'action", "icon": "emoji" },
    { "id": "c4", "text": "texte de l'action", "icon": "emoji" }
  ]
}

Règles stats : 3 à 5 stats UNIQUEMENT appropriées à cet univers.
Règles inventaire : 3 à 6 objets cohérents avec l'univers.
Règles couleurs : palette cohérente, belle, qui colle au genre.`;
}

function actionPrompt(session, action) {
  const me = session.player;
  const statsStr = me.stats.map(s => `${s.name}: ${s.value}/${s.max}`).join(', ');
  const invStr   = me.inventory.map(i => `${i.name} x${i.qty}`).join(', ');
  const lastNarr = session.lastNarrative?.slice(0, 400) || '';

  return `Continue la partie :
- Univers : ${session.premise}
- Personnage : ${me.name} | Stats : ${statsStr}
- Inventaire : ${invStr}
- Lieu : ${session.world.location} | ${session.world.time}
- Dernière scène : ${lastNarr}...

Le joueur choisit : "${action}"

Retourne exactement ce JSON :
{
  "narrative": "Ce qui se passe — 2 à 3 paragraphes, 2ème personne, présent",
  "world": { "location": "...", "time": "...", "atmosphere": "..." },
  "stat_changes": [
    { "id": "id_stat", "delta": nombre, "reason": "pourquoi" }
  ],
  "inventory_changes": [
    { "action": "add", "id": "id", "name": "Nom", "desc": "Desc", "icon": "emoji", "qty": 1 },
    { "action": "remove", "id": "id", "qty": 1 }
  ],
  "choices": [
    { "id": "c1", "text": "...", "icon": "emoji" },
    { "id": "c2", "text": "...", "icon": "emoji" },
    { "id": "c3", "text": "...", "icon": "emoji" },
    { "id": "c4", "text": "...", "icon": "emoji" }
  ],
  "game_over": false,
  "game_over_message": null
}

Garde les changements d'inventaire minimaux — seulement si quelque chose se passe vraiment.
Stat_changes : tableau vide [] si rien ne change.`;
}

// ── Helper : appel Claude ─────────────────────────────────────────
async function callClaude(system, userMsg) {
  const response = await anthropic.messages.create({
    model:      'claude-opus-4-6',
    max_tokens: 3000,
    thinking:   { type: 'adaptive' },
    system,
    messages:   [{ role: 'user', content: userMsg }],
  });

  // Cherche le bloc texte (peut être précédé d'un bloc thinking)
  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock) throw new Error('Aucun bloc texte dans la réponse Claude');

  // Nettoie les éventuels blocs de code markdown
  let raw = textBlock.text.trim();
  if (raw.startsWith('```')) {
    raw = raw.replace(/^```(?:json)?\n?/, '').replace(/```$/, '').trim();
  }

  return JSON.parse(raw);
}

// ── Routes ─────────────────────────────────────────────────────────

// Vérification clé API
router.use((req, res, next) => {
  if (!anthropic) {
    return res.status(503).json({ error: 'ANTHROPIC_API_KEY non définie. Lancez le serveur avec votre clé API.' });
  }
  next();
});

// Démarrer une partie
router.post('/start', async (req, res) => {
  const { premise } = req.body;
  if (!premise?.trim()) return res.status(400).json({ error: 'Prémisse manquante' });

  try {
    const gameData = await callClaude(SYSTEM, startPrompt(premise.trim()));

    // Crée la session
    const sessionId = Math.random().toString(36).slice(2, 10);
    sessions.set(sessionId, {
      premise:       premise.trim(),
      theme:         gameData.theme,
      player:        gameData.player,
      world:         gameData.world,
      lastNarrative: gameData.narrative,
      turnCount:     0,
    });

    res.json({ sessionId, ...gameData });
  } catch (err) {
    console.error('[RPG /start]', err.message);
    res.status(500).json({ error: `Erreur de génération : ${err.message}` });
  }
});

// Action du joueur
router.post('/action', async (req, res) => {
  const { sessionId, action } = req.body;
  if (!sessionId || !action) return res.status(400).json({ error: 'sessionId et action requis' });

  const session = sessions.get(sessionId);
  if (!session) return res.status(404).json({ error: 'Session introuvable' });

  try {
    const update = await callClaude(SYSTEM, actionPrompt(session, action));

    // Applique les changements de stats
    if (update.stat_changes?.length) {
      for (const change of update.stat_changes) {
        const stat = session.player.stats.find(s => s.id === change.id);
        if (stat) {
          stat.value = Math.max(0, Math.min(stat.max, stat.value + change.delta));
        }
      }
    }

    // Applique les changements d'inventaire
    if (update.inventory_changes?.length) {
      for (const change of update.inventory_changes) {
        if (change.action === 'add') {
          const existing = session.player.inventory.find(i => i.id === change.id);
          if (existing) {
            existing.qty += change.qty || 1;
          } else {
            session.player.inventory.push({
              id: change.id, name: change.name,
              desc: change.desc, icon: change.icon,
              qty: change.qty || 1,
            });
          }
        } else if (change.action === 'remove') {
          const idx = session.player.inventory.findIndex(i => i.id === change.id);
          if (idx !== -1) {
            session.player.inventory[idx].qty -= change.qty || 1;
            if (session.player.inventory[idx].qty <= 0) {
              session.player.inventory.splice(idx, 1);
            }
          }
        }
      }
    }

    // Met à jour la session
    session.world         = update.world || session.world;
    session.lastNarrative = update.narrative;
    session.turnCount++;

    res.json({
      ...update,
      player: session.player, // état mis à jour
    });
  } catch (err) {
    console.error('[RPG /action]', err.message);
    res.status(500).json({ error: `Erreur de génération : ${err.message}` });
  }
});

module.exports = router;
