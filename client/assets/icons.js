// SVGs minimalistes — noir sur blanc, viewBox 0 0 60 60
// Chaque clé correspond à l'id de la carte

const ICONS = {

  // ── Animaux ──────────────────────────────────────────────────────

  tortue: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"
    fill="none" stroke="currentColor" stroke-width="2.5"
    stroke-linecap="round" stroke-linejoin="round">
    <!-- Carapace -->
    <ellipse cx="30" cy="38" rx="19" ry="14"/>
    <!-- Dôme intérieur -->
    <ellipse cx="30" cy="38" rx="10" ry="7" stroke-width="1.5"/>
    <!-- Lignes de carapace -->
    <line x1="30" y1="24" x2="22" y2="31" stroke-width="1.5"/>
    <line x1="30" y1="24" x2="38" y2="31" stroke-width="1.5"/>
    <line x1="11" y1="38" x2="20" y2="38" stroke-width="1.5"/>
    <line x1="40" y1="38" x2="49" y2="38" stroke-width="1.5"/>
    <line x1="30" y1="45" x2="30" y2="52" stroke-width="1.5"/>
    <!-- Tête -->
    <circle cx="30" cy="16" r="8"/>
    <circle cx="27" cy="14" r="1.5" fill="currentColor" stroke="none"/>
    <!-- Pattes -->
    <line x1="14" y1="32" x2="5"  y2="27"/>
    <line x1="46" y1="32" x2="55" y2="27"/>
    <line x1="14" y1="45" x2="5"  y2="52"/>
    <line x1="46" y1="45" x2="55" y2="52"/>
  </svg>`,

  jaguar: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"
    fill="none" stroke="currentColor" stroke-width="2.5"
    stroke-linecap="round" stroke-linejoin="round">
    <!-- Tête -->
    <circle cx="30" cy="33" r="20"/>
    <!-- Oreilles -->
    <polygon points="14,17 7,4 22,14"/>
    <polygon points="46,17 53,4 38,14"/>
    <!-- Yeux en amande -->
    <ellipse cx="22" cy="28" rx="5" ry="3.5" transform="rotate(-10 22 28)"/>
    <ellipse cx="38" cy="28" rx="5" ry="3.5" transform="rotate(10 38 28)"/>
    <ellipse cx="22" cy="28" rx="2" ry="2.5" fill="currentColor" stroke="none" transform="rotate(-10 22 28)"/>
    <ellipse cx="38" cy="28" rx="2" ry="2.5" fill="currentColor" stroke="none" transform="rotate(10 38 28)"/>
    <!-- Nez -->
    <polygon points="30,36 27,32 33,32" fill="currentColor" stroke="none"/>
    <!-- Bouche -->
    <path d="M27 37 Q30 41 33 37"/>
    <!-- Taches -->
    <circle cx="20" cy="42" r="2"   fill="currentColor" stroke="none"/>
    <circle cx="30" cy="47" r="2"   fill="currentColor" stroke="none"/>
    <circle cx="40" cy="42" r="2"   fill="currentColor" stroke="none"/>
    <circle cx="24" cy="47" r="1.5" fill="currentColor" stroke="none"/>
    <circle cx="36" cy="47" r="1.5" fill="currentColor" stroke="none"/>
  </svg>`,

  serpent: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"
    fill="none" stroke="currentColor" stroke-width="3"
    stroke-linecap="round" stroke-linejoin="round">
    <!-- Corps en S -->
    <path d="M30 56 C50 46 50 30 30 24 C10 18 10 6 24 4"/>
    <!-- Tête -->
    <ellipse cx="27" cy="5" rx="9" ry="5.5" transform="rotate(-20 27 5)"/>
    <!-- Œil -->
    <circle cx="24" cy="3" r="1.5" fill="currentColor" stroke="none"/>
    <!-- Langue fourchue -->
    <line x1="19" y1="7" x2="12" y2="4"/>
    <line x1="19" y1="7" x2="13" y2="10"/>
  </svg>`,

  chouette: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"
    fill="none" stroke="currentColor" stroke-width="2.5"
    stroke-linecap="round" stroke-linejoin="round">
    <!-- Corps -->
    <ellipse cx="30" cy="40" rx="15" ry="17"/>
    <!-- Tête -->
    <circle cx="30" cy="22" r="13"/>
    <!-- Aigrettes -->
    <polygon points="22,11 18,2 26,10"/>
    <polygon points="38,11 42,2 34,10"/>
    <!-- Grands yeux -->
    <circle cx="23" cy="22" r="7"/>
    <circle cx="37" cy="22" r="7"/>
    <circle cx="23" cy="22" r="4"   fill="currentColor" stroke="none"/>
    <circle cx="37" cy="22" r="4"   fill="currentColor" stroke="none"/>
    <circle cx="24.5" cy="20.5" r="1.5" fill="white" stroke="none"/>
    <circle cx="38.5" cy="20.5" r="1.5" fill="white" stroke="none"/>
    <!-- Bec -->
    <polygon points="30,26 27,30 33,30" fill="currentColor" stroke="none"/>
    <!-- Ailes -->
    <path d="M15 40 Q22 32 30 36" stroke-width="1.5"/>
    <path d="M45 40 Q38 32 30 36" stroke-width="1.5"/>
  </svg>`,

  crocodile: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"
    fill="none" stroke="currentColor" stroke-width="2.5"
    stroke-linecap="round" stroke-linejoin="round">
    <!-- Corps -->
    <ellipse cx="28" cy="40" rx="22" ry="10"/>
    <!-- Mâchoire haute -->
    <path d="M6 32 Q18 20 36 22 L50 26 L50 32 Z"/>
    <!-- Mâchoire basse -->
    <path d="M6 32 L50 32 Q50 38 36 36 Q18 38 6 36 Z"/>
    <!-- Dents -->
    <line x1="18" y1="22" x2="18" y2="28" stroke-width="2"/>
    <line x1="28" y1="21" x2="28" y2="27" stroke-width="2"/>
    <line x1="38" y1="23" x2="38" y2="28" stroke-width="2"/>
    <!-- Œil -->
    <circle cx="44" cy="27" r="4"/>
    <circle cx="44" cy="27" r="2" fill="currentColor" stroke="none"/>
    <!-- Queue -->
    <path d="M50 40 Q58 42 56 48 Q52 52 48 48"/>
    <!-- Pattes -->
    <line x1="14" y1="48" x2="8"  y2="56"/>
    <line x1="24" y1="50" x2="20" y2="57"/>
    <line x1="36" y1="50" x2="40" y2="57"/>
    <line x1="46" y1="48" x2="52" y2="56"/>
  </svg>`,

  renard: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"
    fill="none" stroke="currentColor" stroke-width="2.5"
    stroke-linecap="round" stroke-linejoin="round">
    <!-- Visage -->
    <ellipse cx="30" cy="36" rx="18" ry="16"/>
    <!-- Grandes oreilles pointues -->
    <polygon points="16,25 7,4 24,21"/>
    <polygon points="44,25 53,4 36,21"/>
    <!-- Yeux -->
    <ellipse cx="23" cy="29" rx="4" ry="4.5"/>
    <ellipse cx="37" cy="29" rx="4" ry="4.5"/>
    <ellipse cx="23" cy="30" rx="1.5" ry="2" fill="currentColor" stroke="none"/>
    <ellipse cx="37" cy="30" rx="1.5" ry="2" fill="currentColor" stroke="none"/>
    <!-- Museau -->
    <ellipse cx="30" cy="43" rx="8" ry="6"/>
    <!-- Truffe -->
    <ellipse cx="30" cy="39" rx="3" ry="2" fill="currentColor" stroke="none"/>
    <!-- Bouche -->
    <line x1="30" y1="41" x2="30" y2="45"/>
    <path d="M24 45 Q30 49 36 45"/>
  </svg>`,

  ours: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"
    fill="none" stroke="currentColor" stroke-width="2.5"
    stroke-linecap="round" stroke-linejoin="round">
    <!-- Tête -->
    <circle cx="30" cy="33" r="22"/>
    <!-- Oreilles rondes -->
    <circle cx="11" cy="14" r="8"/>
    <circle cx="49" cy="14" r="8"/>
    <!-- Yeux -->
    <circle cx="22" cy="27" r="4"/>
    <circle cx="38" cy="27" r="4"/>
    <circle cx="22" cy="28" r="2" fill="currentColor" stroke="none"/>
    <circle cx="38" cy="28" r="2" fill="currentColor" stroke="none"/>
    <!-- Museau -->
    <ellipse cx="30" cy="41" rx="11" ry="8"/>
    <!-- Truffe -->
    <ellipse cx="30" cy="37" rx="4" ry="3" fill="currentColor" stroke="none"/>
    <!-- Bouche -->
    <line x1="30" y1="40" x2="30" y2="45"/>
    <path d="M23 45 Q30 50 37 45"/>
  </svg>`,

  colibri: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"
    fill="none" stroke="currentColor" stroke-width="2.5"
    stroke-linecap="round" stroke-linejoin="round">
    <!-- Corps -->
    <ellipse cx="32" cy="37" rx="13" ry="8" transform="rotate(-25 32 37)"/>
    <!-- Tête -->
    <circle cx="18" cy="22" r="8"/>
    <!-- Long bec -->
    <line x1="11" y1="19" x2="-2" y2="13"/>
    <!-- Œil -->
    <circle cx="16" cy="20" r="2" fill="currentColor" stroke="none"/>
    <!-- Aile -->
    <path d="M30 30 Q42 14 53 20 Q44 26 36 32"/>
    <!-- Queue -->
    <path d="M42 43 Q52 48 54 57"/>
    <path d="M44 41 Q55 44 57 52"/>
  </svg>`,

  // ── Terrains ──────────────────────────────────────────────────────

  foret: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"
    fill="none" stroke="currentColor" stroke-width="2.5"
    stroke-linecap="round" stroke-linejoin="round">
    <!-- Arbre gauche -->
    <polygon points="11,40 3,40 11,26 19,40"/>
    <polygon points="11,33 5,33 11,21 17,33"/>
    <line x1="11" y1="40" x2="11" y2="52"/>
    <!-- Arbre central (plus grand) -->
    <polygon points="30,42 20,42 30,26 40,42"/>
    <polygon points="30,33 22,33 30,19 38,33"/>
    <polygon points="30,24 24,24 30,12 36,24"/>
    <line x1="30" y1="42" x2="30" y2="54"/>
    <!-- Arbre droit -->
    <polygon points="49,40 41,40 49,26 57,40"/>
    <polygon points="49,33 43,33 49,21 55,33"/>
    <line x1="49" y1="40" x2="49" y2="52"/>
  </svg>`,

  ville: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"
    fill="none" stroke="currentColor" stroke-width="2.5"
    stroke-linecap="round" stroke-linejoin="round">
    <!-- Sol -->
    <line x1="2" y1="53" x2="58" y2="53"/>
    <!-- Immeuble 1 (petit) -->
    <rect x="3"  y="42" width="11" height="11"/>
    <line x1="6"  y1="45" x2="6"  y2="49"/>
    <line x1="11" y1="45" x2="11" y2="49"/>
    <!-- Immeuble 2 (haut) -->
    <rect x="17" y="24" width="13" height="29"/>
    <line x1="20" y1="28" x2="20" y2="33"/>
    <line x1="26" y1="28" x2="26" y2="33"/>
    <line x1="20" y1="37" x2="20" y2="42"/>
    <line x1="26" y1="37" x2="26" y2="42"/>
    <!-- Immeuble 3 (moyen) -->
    <rect x="33" y="34" width="14" height="19"/>
    <line x1="36" y1="38" x2="36" y2="43"/>
    <line x1="44" y1="38" x2="44" y2="43"/>
    <!-- Immeuble 4 (fin et haut) -->
    <rect x="50" y="16" width="8"  height="37"/>
    <line x1="53" y1="21" x2="53" y2="27"/>
    <line x1="53" y1="31" x2="53" y2="37"/>
  </svg>`,

  desert: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"
    fill="none" stroke="currentColor" stroke-width="2.5"
    stroke-linecap="round" stroke-linejoin="round">
    <!-- Soleil -->
    <circle cx="42" cy="18" r="8"/>
    <line x1="42" y1="4"  x2="42" y2="8"/>
    <line x1="42" y1="28" x2="42" y2="32"/>
    <line x1="28" y1="18" x2="32" y2="18"/>
    <line x1="52" y1="18" x2="56" y2="18"/>
    <line x1="31" y1="7"  x2="34" y2="10"/>
    <line x1="50" y1="26" x2="53" y2="29"/>
    <line x1="53" y1="7"  x2="50" y2="10"/>
    <line x1="34" y1="26" x2="31" y2="29"/>
    <!-- Dunes -->
    <path d="M0 55 Q15 34 30 50 Q45 64 60 48"/>
    <path d="M0 62 Q20 44 40 57 Q50 63 60 55"/>
  </svg>`,

  marais: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"
    fill="none" stroke="currentColor" stroke-width="2.5"
    stroke-linecap="round" stroke-linejoin="round">
    <!-- Eau ondulée -->
    <path d="M3 38 Q12 31 21 38 Q30 45 39 38 Q48 31 57 38"/>
    <path d="M3 47 Q12 40 21 47 Q30 54 39 47 Q48 40 57 47"/>
    <!-- Roseau 1 -->
    <line x1="12" y1="8" x2="12" y2="36"/>
    <ellipse cx="12" cy="8" rx="3" ry="8" fill="currentColor" stroke="none"/>
    <line x1="12" y1="18" x2="5"  y2="13"/>
    <line x1="12" y1="24" x2="19" y2="19"/>
    <!-- Roseau 2 -->
    <line x1="30" y1="6" x2="30" y2="35"/>
    <ellipse cx="30" cy="6" rx="3" ry="8" fill="currentColor" stroke="none"/>
    <line x1="30" y1="16" x2="37" y2="11"/>
    <!-- Roseau 3 -->
    <line x1="48" y1="10" x2="48" y2="36"/>
    <ellipse cx="48" cy="10" rx="3" ry="8" fill="currentColor" stroke="none"/>
    <line x1="48" y1="20" x2="41" y2="15"/>
  </svg>`,

  // ── États ─────────────────────────────────────────────────────────

  nuit: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"
    fill="none" stroke="currentColor" stroke-width="2.5"
    stroke-linecap="round" stroke-linejoin="round">
    <!-- Lune croissant -->
    <path d="M38 8 Q54 18 54 35 Q54 52 38 57 Q26 52 26 35 Q26 18 38 8 Z"
      fill="currentColor" stroke="none"/>
    <path d="M38 8 Q54 18 54 35 Q54 52 38 57 Q25 52 25 35 Q25 18 38 8"/>
    <path d="M38 8 Q24 18 24 35 Q24 52 38 57"
      stroke="white" stroke-width="8" fill="none"/>
    <!-- Étoiles -->
    <circle cx="9"  cy="12" r="2.5" fill="currentColor" stroke="none"/>
    <circle cx="18" cy="27" r="1.5" fill="currentColor" stroke="none"/>
    <circle cx="7"  cy="38" r="2"   fill="currentColor" stroke="none"/>
    <circle cx="20" cy="48" r="1.5" fill="currentColor" stroke="none"/>
    <!-- Scintillement -->
    <line x1="9" y1="6"  x2="9"  y2="10"/>
    <line x1="9" y1="14" x2="9"  y2="18"/>
    <line x1="3" y1="12" x2="7"  y2="12"/>
    <line x1="11" y1="12" x2="15" y2="12"/>
  </svg>`,

  rage: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"
    fill="none" stroke="currentColor" stroke-width="2.5"
    stroke-linecap="round" stroke-linejoin="round">
    <!-- Flamme principale -->
    <path d="M30 56 Q10 46 14 30 Q17 20 10 9
             Q24 20 21 29
             Q27 14 30 4
             Q33 14 39 29
             Q36 20 50 9
             Q43 20 46 30
             Q50 46 30 56 Z"/>
    <!-- Flamme intérieure -->
    <path d="M30 50 Q19 42 21 33 Q24 24 21 16
             Q28 25 27 34
             Q31 25 38 33
             Q40 42 30 50 Z"
      stroke-width="1.5"/>
  </svg>`,

  bouclier: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"
    fill="none" stroke="currentColor" stroke-width="2.5"
    stroke-linecap="round" stroke-linejoin="round">
    <!-- Bouclier -->
    <path d="M30 5 L53 15 L53 33 Q53 52 30 59 Q7 52 7 33 L7 15 Z"/>
    <!-- Croix intérieure -->
    <line x1="30" y1="20" x2="30" y2="50"/>
    <line x1="18" y1="32" x2="42" y2="32"/>
  </svg>`,

  concentration: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"
    fill="none" stroke="currentColor" stroke-width="2.5"
    stroke-linecap="round" stroke-linejoin="round">
    <!-- Œil -->
    <path d="M4 30 Q30 7 56 30 Q30 53 4 30 Z"/>
    <!-- Iris -->
    <circle cx="30" cy="30" r="10"/>
    <!-- Pupille -->
    <circle cx="30" cy="30" r="4" fill="currentColor" stroke="none"/>
    <!-- Reflet -->
    <circle cx="33" cy="27" r="2" fill="white" stroke="none"/>
    <!-- Lignes de focus -->
    <line x1="30" y1="4"  x2="30" y2="11"/>
    <line x1="30" y1="49" x2="30" y2="56"/>
    <line x1="4"  y1="30" x2="11" y2="30"/>
    <line x1="49" y1="30" x2="56" y2="30"/>
  </svg>`,
};
