// ── Données pays ────────────────────────────────────────────────────

const COUNTRIES = [
  { code: 'fr', name: 'France' },
  { code: 'de', name: 'Allemagne' },
  { code: 'es', name: 'Espagne' },
  { code: 'it', name: 'Italie' },
  { code: 'pt', name: 'Portugal' },
  { code: 'gb', name: 'Royaume-Uni' },
  { code: 'us', name: 'États-Unis' },
  { code: 'ca', name: 'Canada' },
  { code: 'br', name: 'Brésil' },
  { code: 'mx', name: 'Mexique' },
  { code: 'jp', name: 'Japon' },
  { code: 'cn', name: 'Chine' },
  { code: 'in', name: 'Inde' },
  { code: 'au', name: 'Australie' },
  { code: 'ar', name: 'Argentine' },
  { code: 'ru', name: 'Russie' },
  { code: 'tr', name: 'Turquie' },
  { code: 'sa', name: 'Arabie Saoudite' },
  { code: 'ma', name: 'Maroc' },
  { code: 'za', name: 'Afrique du Sud' },
  { code: 'ng', name: 'Nigeria' },
  { code: 'eg', name: 'Égypte' },
  { code: 'id', name: 'Indonésie' },
  { code: 'kr', name: 'Corée du Sud' },
  { code: 'se', name: 'Suède' },
  { code: 'no', name: 'Norvège' },
  { code: 'nl', name: 'Pays-Bas' },
  { code: 'be', name: 'Belgique' },
  { code: 'ch', name: 'Suisse' },
  { code: 'pl', name: 'Pologne' },
  { code: 'gr', name: 'Grèce' },
  { code: 'at', name: 'Autriche' },
  { code: 'dk', name: 'Danemark' },
  { code: 'fi', name: 'Finlande' },
  { code: 'ua', name: 'Ukraine' },
  { code: 'ro', name: 'Roumanie' },
  { code: 'hu', name: 'Hongrie' },
  { code: 'cz', name: 'Tchéquie' },
  { code: 'hr', name: 'Croatie' },
  { code: 'rs', name: 'Serbie' },
  { code: 'ie', name: 'Irlande' },
  { code: 'pk', name: 'Pakistan' },
  { code: 'bd', name: 'Bangladesh' },
  { code: 'vn', name: 'Vietnam' },
  { code: 'th', name: 'Thaïlande' },
  { code: 'ph', name: 'Philippines' },
  { code: 'dz', name: 'Algérie' },
  { code: 'tn', name: 'Tunisie' },
  { code: 'ke', name: 'Kenya' },
  { code: 'ge', name: 'Géorgie' },
  { code: 'az', name: 'Azerbaïdjan' },
  { code: 'kz', name: 'Kazakhstan' },
  { code: 'lk', name: 'Sri Lanka' },
  { code: 'et', name: 'Éthiopie' },
  { code: 'gh', name: 'Ghana' },
  { code: 'cm', name: 'Cameroun' },
  { code: 'tz', name: 'Tanzanie' },
  { code: 'nz', name: 'Nouvelle-Zélande' },
  { code: 'cl', name: 'Chili' },
  { code: 'co', name: 'Colombie' },
  { code: 'pe', name: 'Pérou' },
  { code: 'il', name: 'Israël' },
  { code: 'ir', name: 'Iran' },
  { code: 'jo', name: 'Jordanie' },
  { code: 'sg', name: 'Singapour' },
  { code: 'my', name: 'Malaisie' },
  { code: 'np', name: 'Népal' },
  { code: 'ci', name: "Côte d'Ivoire" },
  { code: 'sn', name: 'Sénégal' },
  { code: 'uy', name: 'Uruguay' },
  { code: 'ec', name: 'Équateur' },
  { code: 'bo', name: 'Bolivie' },
  { code: 'py', name: 'Paraguay' },
  { code: 'sk', name: 'Slovaquie' },
  { code: 'bg', name: 'Bulgarie' },
  { code: 'lt', name: 'Lituanie' },
  { code: 'lv', name: 'Lettonie' },
  { code: 'ee', name: 'Estonie' },
  { code: 'si', name: 'Slovénie' },
  { code: 'mk', name: 'Macédoine du Nord' },
  { code: 'al', name: 'Albanie' },
  { code: 'by', name: 'Biélorussie' },
  { code: 'md', name: 'Moldavie' },
  { code: 'am', name: 'Arménie' },
  { code: 'iq', name: 'Irak' },
  { code: 'kw', name: 'Koweït' },
  { code: 'qa', name: 'Qatar' },
  { code: 'ae', name: 'Émirats Arabes Unis' },
  { code: 'om', name: 'Oman' },
];

function flagUrl(code) {
  return `https://flagcdn.com/w160/${code}.png`;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateSequence(length, numOptions) {
  const questions = [];
  const pool = shuffle(COUNTRIES);

  for (let i = 0; i < length; i++) {
    const correct = pool[i % pool.length];
    const others = shuffle(COUNTRIES.filter(c => c.code !== correct.code)).slice(0, numOptions - 1);
    const options = shuffle([correct, ...others]);
    questions.push({
      correctCode: correct.code,
      countryName: correct.name,
      options: options.map(c => ({ code: c.code, name: c.name })),
    });
  }
  return questions;
}

module.exports = { COUNTRIES, flagUrl, generateSequence };
