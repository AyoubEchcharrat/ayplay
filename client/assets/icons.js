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

  // ── Nouveaux animaux ──────────────────────────────────────────────

  lion: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"
    fill="none" stroke="currentColor" stroke-width="2.5"
    stroke-linecap="round" stroke-linejoin="round">
    <circle cx="30" cy="32" r="16"/>
    <path d="M30 16 Q18 8 10 14 Q16 20 14 28" stroke-width="2"/>
    <path d="M30 16 Q42 8 50 14 Q44 20 46 28" stroke-width="2"/>
    <path d="M30 16 Q24 6 20 10 Q22 16 18 20" stroke-width="1.5"/>
    <path d="M30 16 Q36 6 40 10 Q38 16 42 20" stroke-width="1.5"/>
    <path d="M30 16 Q30 4 30 8" stroke-width="1.5"/>
    <ellipse cx="22" cy="29" rx="4" ry="3.5"/>
    <ellipse cx="38" cy="29" rx="4" ry="3.5"/>
    <ellipse cx="22" cy="30" rx="1.8" ry="2" fill="currentColor" stroke="none"/>
    <ellipse cx="38" cy="30" rx="1.8" ry="2" fill="currentColor" stroke="none"/>
    <ellipse cx="30" cy="40" rx="7" ry="5"/>
    <ellipse cx="30" cy="36" rx="3" ry="2" fill="currentColor" stroke="none"/>
    <line x1="30" y1="38" x2="30" y2="43"/>
    <path d="M24 43 Q30 47 36 43"/>
  </svg>`,

  elephant: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"
    fill="none" stroke="currentColor" stroke-width="2.5"
    stroke-linecap="round" stroke-linejoin="round">
    <circle cx="28" cy="24" r="16"/>
    <circle cx="14" cy="16" r="7"/>
    <circle cx="42" cy="16" r="7"/>
    <circle cx="23" cy="20" r="4"/>
    <circle cx="33" cy="20" r="4"/>
    <circle cx="23" cy="21" r="1.8" fill="currentColor" stroke="none"/>
    <circle cx="33" cy="21" r="1.8" fill="currentColor" stroke="none"/>
    <path d="M28 32 Q22 38 18 46 Q22 50 24 46 Q26 42 28 44 Q30 42 32 46 Q34 50 38 46 Q34 38 28 32"/>
    <line x1="14" y1="40" x2="10" y2="55"/>
    <line x1="20" y1="42" x2="18" y2="56"/>
    <line x1="36" y1="42" x2="38" y2="56"/>
    <line x1="44" y1="40" x2="48" y2="55"/>
  </svg>`,

  requin: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"
    fill="none" stroke="currentColor" stroke-width="2.5"
    stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 38 Q12 28 24 32 Q36 36 56 32 Q52 42 36 44 Q20 46 4 38 Z"/>
    <path d="M28 32 L32 10 L36 32"/>
    <path d="M44 36 L50 28 L54 36"/>
    <path d="M4 38 Q8 44 16 44 L56 32"/>
    <ellipse cx="46" cy="38" rx="2" ry="1.5" fill="currentColor" stroke="none"/>
    <path d="M36 44 Q38 48 42 48 Q46 48 48 44" stroke-width="2"/>
    <path d="M28 44 Q24 50 20 52 Q16 50 18 46"/>
  </svg>`,

  gorille: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"
    fill="none" stroke="currentColor" stroke-width="2.5"
    stroke-linecap="round" stroke-linejoin="round">
    <circle cx="30" cy="28" r="18"/>
    <circle cx="14" cy="18" r="8"/>
    <circle cx="46" cy="18" r="8"/>
    <ellipse cx="22" cy="24" rx="5" ry="4"/>
    <ellipse cx="38" cy="24" rx="5" ry="4"/>
    <ellipse cx="22" cy="25" rx="2.5" ry="2.5" fill="currentColor" stroke="none"/>
    <ellipse cx="38" cy="25" rx="2.5" ry="2.5" fill="currentColor" stroke="none"/>
    <ellipse cx="30" cy="36" rx="12" ry="8"/>
    <ellipse cx="30" cy="36" rx="8" ry="5" stroke-width="1.5"/>
    <ellipse cx="30" cy="33" rx="4" ry="3" fill="currentColor" stroke="none"/>
    <path d="M22 40 Q30 46 38 40"/>
  </svg>`,

  faucon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"
    fill="none" stroke="currentColor" stroke-width="2.5"
    stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="32" cy="34" rx="12" ry="8" transform="rotate(-20 32 34)"/>
    <circle cx="20" cy="20" r="10"/>
    <polygon points="10,22 4,26 12,28"/>
    <circle cx="17" cy="18" r="2.5" fill="currentColor" stroke="none"/>
    <circle cx="17.8" cy="17.2" r="1" fill="white" stroke="none"/>
    <path d="M30 28 Q46 18 56 22 Q48 28 42 32"/>
    <path d="M38 38 Q50 42 52 50 Q44 50 38 44"/>
    <path d="M20 30 L16 42 L22 40"/>
  </svg>`,

  araignee: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"
    fill="none" stroke="currentColor" stroke-width="2.5"
    stroke-linecap="round" stroke-linejoin="round">
    <circle cx="30" cy="30" r="10"/>
    <circle cx="30" cy="22" r="6"/>
    <circle cx="28" cy="20" r="2" fill="currentColor" stroke="none"/>
    <circle cx="32" cy="20" r="2" fill="currentColor" stroke="none"/>
    <line x1="8"  y1="20" x2="22" y2="28"/>
    <line x1="4"  y1="30" x2="20" y2="30"/>
    <line x1="8"  y1="42" x2="22" y2="34"/>
    <line x1="52" y1="20" x2="38" y2="28"/>
    <line x1="56" y1="30" x2="40" y2="30"/>
    <line x1="52" y1="42" x2="38" y2="34"/>
    <line x1="20" y1="40" x2="16" y2="52"/>
    <line x1="40" y1="40" x2="44" y2="52"/>
  </svg>`,

  // ── Nouveaux terrains ─────────────────────────────────────────────

  montagne: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"
    fill="none" stroke="currentColor" stroke-width="2.5"
    stroke-linecap="round" stroke-linejoin="round">
    <polygon points="30,6 4,54 56,54"/>
    <polygon points="44,22 28,54 60,54"/>
    <path d="M22,22 Q30,14 38,22" stroke-width="2"/>
    <path d="M36,32 Q44,26 50,32" stroke-width="1.5"/>
    <line x1="2" y1="54" x2="58" y2="54"/>
  </svg>`,

  ocean: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"
    fill="none" stroke="currentColor" stroke-width="2.5"
    stroke-linecap="round" stroke-linejoin="round">
    <path d="M2 22 Q12 14 22 22 Q32 30 42 22 Q52 14 58 22"/>
    <path d="M2 35 Q12 27 22 35 Q32 43 42 35 Q52 27 58 35"/>
    <path d="M2 48 Q12 40 22 48 Q32 56 42 48 Q52 40 58 48"/>
    <circle cx="44" cy="10" r="7"/>
    <line x1="44" y1="1"  x2="44" y2="4"/>
    <line x1="44" y1="17" x2="44" y2="19"/>
    <line x1="35" y1="10" x2="33" y2="10"/>
    <line x1="55" y1="10" x2="53" y2="10"/>
  </svg>`,

  plaine: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"
    fill="none" stroke="currentColor" stroke-width="2.5"
    stroke-linecap="round" stroke-linejoin="round">
    <circle cx="30" cy="16" r="10"/>
    <line x1="30" y1="2"  x2="30" y2="5"/>
    <line x1="30" y1="27" x2="30" y2="30"/>
    <line x1="16" y1="16" x2="13" y2="16"/>
    <line x1="44" y1="16" x2="47" y2="16"/>
    <line x1="20" y1="6"  x2="18" y2="4"/>
    <line x1="42" y1="26" x2="44" y2="28"/>
    <line x1="42" y1="6"  x2="44" y2="4"/>
    <line x1="20" y1="26" x2="18" y2="28"/>
    <line x1="2"  y1="42" x2="58" y2="42"/>
    <path d="M2 42 Q10 36 18 42 Q26 48 34 42 Q42 36 50 42 Q54 44 58 42"/>
    <line x1="2"  y1="54" x2="58" y2="54"/>
  </svg>`,

  volcan: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"
    fill="none" stroke="currentColor" stroke-width="2.5"
    stroke-linecap="round" stroke-linejoin="round">
    <polygon points="30,10 6,56 54,56"/>
    <path d="M22,10 Q26,4 30,2 Q34,4 38,10"/>
    <path d="M24,12 Q28,8 30,6 Q32,8 34,12" stroke-width="1.5"/>
    <path d="M26,6 Q28,3 30,5 Q29,8 28,7" fill="currentColor" stroke="none"/>
    <path d="M30,2 Q32,5 34,4 Q32,8 30,6" fill="currentColor" stroke="none"/>
    <line x1="6"  y1="56" x2="54" y2="56"/>
  </svg>`,

  // ── Nouveaux états ────────────────────────────────────────────────

  armure: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"
    fill="none" stroke="currentColor" stroke-width="2.5"
    stroke-linecap="round" stroke-linejoin="round">
    <path d="M30 4 L52 12 L52 32 Q52 50 30 58 Q8 50 8 32 L8 12 Z"/>
    <path d="M8 20 L52 20"/>
    <path d="M8 30 L52 30"/>
    <path d="M18 12 L18 58" stroke-width="1.5"/>
    <path d="M30 10 L30 58" stroke-width="1.5"/>
    <path d="M42 12 L42 58" stroke-width="1.5"/>
  </svg>`,

  'frenésie': `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"
    fill="none" stroke="currentColor" stroke-width="2.5"
    stroke-linecap="round" stroke-linejoin="round">
    <path d="M36 4 L22 28 L32 28 L18 56" stroke-width="3"/>
    <path d="M26 4 L12 28 L22 28 L8 56" stroke-width="1.5" opacity="0.5"/>
    <path d="M46 4 L32 28 L42 28 L28 56" stroke-width="1.5" opacity="0.5"/>
  </svg>`,

  invisibilite: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"
    fill="none" stroke="currentColor" stroke-width="2.5"
    stroke-linecap="round" stroke-linejoin="round"
    stroke-dasharray="4 3">
    <circle cx="30" cy="24" r="14"/>
    <path d="M16 24 Q16 44 30 50 Q44 44 44 24"/>
    <circle cx="24" cy="20" r="3" stroke-dasharray="none"/>
    <circle cx="36" cy="20" r="3" stroke-dasharray="none"/>
    <circle cx="24" cy="21" r="1.5" fill="currentColor" stroke="none"/>
    <circle cx="36" cy="21" r="1.5" fill="currentColor" stroke="none"/>
    <path d="M24 30 Q30 35 36 30" stroke-dasharray="none"/>
  </svg>`,

  // ── Spéciaux ──────────────────────────────────────────────────────

  draw_two: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"
    fill="none" stroke="currentColor" stroke-width="2.5"
    stroke-linecap="round" stroke-linejoin="round">
    <rect x="6"  y="14" width="30" height="40" rx="4"/>
    <rect x="16" y="8"  width="30" height="40" rx="4"/>
    <line x1="22" y1="22" x2="40" y2="22"/>
    <line x1="22" y1="30" x2="40" y2="30"/>
    <line x1="22" y1="38" x2="34" y2="38"/>
    <path d="M44 2 L44 14" stroke-width="2.5"/>
    <path d="M40 6 L44 2 L48 6" stroke-width="2.5"/>
  </svg>`,

  destroy_terrain: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"
    fill="none" stroke="currentColor" stroke-width="2.5"
    stroke-linecap="round" stroke-linejoin="round">
    <circle cx="20" cy="14" r="10"/>
    <line x1="20" y1="24" x2="36" y2="50"/>
    <path d="M8 50 L20 56 L52 50"/>
    <line x1="36" y1="50" x2="52" y2="50"/>
    <line x1="10" y1="46" x2="20" y2="56"/>
    <line x1="42" y1="50" x2="38" y2="56"/>
    <line x1="34" y1="38" x2="46" y2="34"/>
    <line x1="38" y1="42" x2="48" y2="40"/>
    <line x1="44" y1="26" x2="52" y2="18"/>
    <line x1="48" y1="30" x2="56" y2="24"/>
  </svg>`,

  destroy_state: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"
    fill="none" stroke="currentColor" stroke-width="2.5"
    stroke-linecap="round" stroke-linejoin="round">
    <path d="M30 4 L52 14 L52 32 Q52 50 30 58 Q8 50 8 32 L8 14 Z"/>
    <line x1="18" y1="20" x2="42" y2="44" stroke-width="4"/>
    <line x1="42" y1="20" x2="18" y2="44" stroke-width="4"/>
  </svg>`,
};
