const IMG = '/assets/histodate/';

const IMAGES = [
  { id:1,  f:'001_first_photo.jpg',        title:"La première photographie de l'histoire",                      year:1826, month:null, hint:"Prise en Bourgogne par Niépce, exposition de plusieurs heures",                      difficulty:'hard',   category:'technologie' },
  { id:2,  f:'002_first_selfie.jpg',       title:"Premier autoportrait photographique (le premier selfie)",     year:1839, month:10,   hint:"Un chimiste américain se photographie lui-même dans sa boutique",                     difficulty:'hard',   category:'technologie' },
  { id:3,  f:'003_first_xray.jpg',         title:"Première radiographie : la main avec une bague",              year:1895, month:12,   hint:"La main appartient à la femme du physicien qui a découvert les rayons X",             difficulty:'medium', category:'science' },
  { id:4,  f:'004_wright_brothers.jpg',    title:"Premier vol motorisé des frères Wright à Kitty Hawk",        year:1903, month:12,   hint:"Le vol a duré 12 secondes sur 36 mètres en Caroline du Nord",                         difficulty:'medium', category:'technologie' },
  { id:5,  f:'005_titanic.jpg',            title:"Le RMS Titanic avant son départ inaugural",                   year:1912, month:4,    hint:"Le navire quitta Southampton pour sa première et dernière traversée",                  difficulty:'easy',   category:'histoire' },
  { id:6,  f:'006_hindenburg.jpg',         title:"La catastrophe du dirigeable Hindenburg",                     year:1937, month:5,    hint:"Le dirigeable s'est enflammé au-dessus de Lakehurst, New Jersey",                      difficulty:'easy',   category:'histoire' },
  { id:7,  f:'007_lunch_skyscraper.jpg',   title:"Déjeuner au sommet d'un gratte-ciel new-yorkais",            year:1932, month:9,    hint:"Ces ouvriers construisaient le 30 Rockefeller Plaza sans harnais de sécurité",         difficulty:'medium', category:'culture' },
  { id:8,  f:'008_migrant_mother.jpg',     title:"La mère migrante de Dorothea Lange",                         year:1936, month:3,    hint:"Florence Owens Thompson, symbole humain de la Grande Dépression américaine",           difficulty:'medium', category:'histoire' },
  { id:9,  f:'009_iwo_jima.jpg',           title:"Lever du drapeau américain à Iwo Jima",                      year:1945, month:2,    hint:"Photo de Joe Rosenthal, lauréat du Pulitzer, au mont Suribachi dans le Pacifique",     difficulty:'easy',   category:'guerre' },
  { id:10, f:'010_nagasaki.jpg',           title:"Le nuage atomique au-dessus de Nagasaki",                     year:1945, month:8,    hint:"La seconde bombe atomique, 3 jours après Hiroshima",                                  difficulty:'easy',   category:'histoire' },
  { id:11, f:'011_einstein_tongue.jpg',    title:"Albert Einstein tire la langue",                              year:1951, month:3,    hint:"Photo prise par Arthur Sasse lors du 72e anniversaire du physicien",                  difficulty:'easy',   category:'culture' },
  { id:12, f:'012_che_guevara.jpg',        title:"Le portrait révolutionnaire du Che Guevara",                 year:1960, month:3,    hint:"Prise par Alberto Korda lors d'une cérémonie à La Havane, Cuba",                      difficulty:'medium', category:'culture' },
  { id:13, f:'013_mlk_speech.jpg',         title:"Martin Luther King 'I Have a Dream' à Washington",           year:1963, month:8,    hint:"La marche sur Washington rassembla 250 000 personnes au Lincoln Memorial",            difficulty:'easy',   category:'histoire' },
  { id:14, f:'014_burning_monk.jpg',       title:"Le moine bouddhiste en feu (Thích Quảng Đức)",               year:1963, month:6,    hint:"Il protestait contre la persécution des bouddhistes au Vietnam du Sud",               difficulty:'medium', category:'histoire' },
  { id:15, f:'015_saigon_execution.jpg',   title:"L'exécution sommaire à Saïgon — photo d'Eddie Adams",       year:1968, month:2,    hint:"Le chef de la police de Saïgon exécute un prisonnier viet-cong en pleine rue",        difficulty:'medium', category:'guerre' },
  { id:16, f:'016_napalm_girl.jpg',        title:"La petite fille au napalm — Nick Ut",                        year:1972, month:6,    hint:"Kim Phúc fuit le napalm sur la route 1 vers Trang Bang, Vietnam",                     difficulty:'medium', category:'guerre' },
  { id:17, f:'017_olympic_salute.jpg',     title:"Le salut du poing levé aux JO de Mexico",                    year:1968, month:10,   hint:"Smith et Carlos ont été exclus de l'équipe américaine après ce geste historique",     difficulty:'medium', category:'sport' },
  { id:18, f:'018_earthrise.jpg',          title:"Le Lever de Terre vu depuis la Lune (Earthrise)",            year:1968, month:12,   hint:"Prise par William Anders lors de la mission Apollo 8, soir de Noël",                 difficulty:'medium', category:'espace' },
  { id:19, f:'019_moon_buzz.jpg',          title:"Buzz Aldrin sur la surface de la Lune",                      year:1969, month:7,    hint:"Neil Armstrong prend la photo ; il se reflète dans la visière du casque",             difficulty:'easy',   category:'espace' },
  { id:20, f:'020_blue_marble.jpg',        title:"La Terre vue de l'espace — The Blue Marble",                 year:1972, month:12,   hint:"Prise par l'équipage d'Apollo 17 à 45 000 km de la Terre",                           difficulty:'medium', category:'espace' },
  { id:21, f:'021_moon_bootprint.jpg',     title:"Empreinte de pas sur la Lune",                               year:1969, month:7,    hint:"Restera intacte des millions d'années sans atmosphère pour l'effacer",                difficulty:'easy',   category:'espace' },
  { id:22, f:'022_apollo_launch.jpg',      title:"Lancement d'Apollo 11 vers la Lune",                        year:1969, month:7,    hint:"La fusée Saturn V décolle de Cape Canaveral avec Armstrong, Aldrin et Collins",      difficulty:'medium', category:'espace' },
  { id:23, f:'023_challenger.jpg',         title:"Explosion de la navette spatiale Challenger",                year:1986, month:1,    hint:"La catastrophe survint 73 secondes après le lancement, regardée en direct à la TV",  difficulty:'medium', category:'espace' },
  { id:24, f:'024_tank_man.jpg',           title:"L'homme de Tiananmen face aux chars",                       year:1989, month:6,    hint:"Photo prise le lendemain du massacre de la place Tiananmen, Pékin",                  difficulty:'easy',   category:'histoire' },
  { id:25, f:'025_berlin_wall_fall.jpg',   title:"La chute du mur de Berlin",                                  year:1989, month:11,   hint:"Les Berlinois de l'Est et de l'Ouest se retrouvent après 28 ans de séparation",      difficulty:'easy',   category:'histoire' },
  { id:26, f:'026_berlin_wall_build.jpg',  title:"La construction du mur de Berlin",                          year:1961, month:8,    hint:"Les soldats est-allemands posent les barbelés en une seule nuit",                     difficulty:'medium', category:'histoire' },
  { id:27, f:'027_mandela.jpg',            title:"Nelson Mandela libéré de prison",                            year:1990, month:2,    hint:"Il avait passé 27 ans emprisonné principalement sur Robben Island",                  difficulty:'easy',   category:'histoire' },
  { id:28, f:'028_9_11.jpg',               title:"Les tours du World Trade Center en feu",                     year:2001, month:9,    hint:"La seconde tour est touchée quelques minutes après la première, un mardi matin",      difficulty:'easy',   category:'histoire' },
  { id:29, f:'029_notre_dame_fire.jpg',    title:"Incendie de Notre-Dame de Paris",                            year:2019, month:4,    hint:"La flèche s'est effondrée lors d'un incendie pendant les travaux de rénovation",     difficulty:'easy',   category:'histoire' },
  { id:30, f:'030_black_hole.jpg',         title:"Première image d'un trou noir (M87)",                       year:2019, month:4,    hint:"Obtenue par le réseau de radio-télescopes Event Horizon Telescope",                  difficulty:'easy',   category:'science' },
  { id:31, f:'031_eniac.jpg',              title:"L'ordinateur ENIAC, premier ordinateur électronique",       year:1946, month:2,    hint:"Il pesait 27 tonnes, occupait 167 m² et consommait 150 kilowatts",                  difficulty:'hard',   category:'technologie' },
  { id:32, f:'032_sputnik.jpg',            title:"Spoutnik 1, premier satellite artificiel",                   year:1957, month:10,   hint:"Lancé par l'URSS, il déclencha la course à l'espace entre les superpuissances",     difficulty:'medium', category:'espace' },
  { id:33, f:'033_gagarin.jpg',            title:"Yuri Gagarine, premier homme dans l'espace",                year:1961, month:4,    hint:"Sa mission Vostok 1 dura 108 minutes en orbite autour de la Terre",                 difficulty:'easy',   category:'espace' },
  { id:34, f:'034_dolly_sheep.jpg',        title:"La brebis Dolly, premier mammifère cloné",                  year:1997, month:2,    hint:"Clonée à l'Institut Roslin en Écosse à partir d'une cellule mammaire adulte",       difficulty:'medium', category:'science' },
  { id:35, f:'035_dna_photo51.jpg',        title:"Cliché 51 — la clé de la structure de l'ADN",              year:1952, month:5,    hint:"Prise par Rosalind Franklin, cette image révéla la double hélice de l'ADN",          difficulty:'hard',   category:'science' },
  { id:36, f:'036_jesse_owens.jpg',        title:"Jesse Owens aux Jeux Olympiques de Berlin",                 year:1936, month:8,    hint:"Il remporta 4 médailles d'or sous le regard furieux d'Adolf Hitler",                difficulty:'medium', category:'sport' },
  { id:37, f:'037_mickey_mouse.jpg',       title:"Mickey Mouse dans 'Steamboat Willie'",                      year:1928, month:11,   hint:"Premier dessin animé sonore synchronisé, première apparition officielle de Mickey",  difficulty:'medium', category:'culture' },
  { id:38, f:'038_lincoln.jpg',            title:"Portrait d'Abraham Lincoln (une des dernières photos)",     year:1863, month:11,   hint:"Prise par Alexander Gardner, quelques jours après le discours de Gettysburg",        difficulty:'hard',   category:'histoire' },
  { id:39, f:'039_yalta.jpg',              title:"La conférence de Yalta — Churchill, Roosevelt, Staline",    year:1945, month:2,    hint:"Les trois Alliés se partagent le monde d'après-guerre en Crimée",                    difficulty:'medium', category:'histoire' },
  { id:40, f:'040_san_francisco_1906.jpg', title:"Séisme et incendies de San Francisco",                      year:1906, month:4,    hint:"Magnitude 7,9 et incendies ont détruit 80% de la ville",                             difficulty:'medium', category:'catastrophe' },
  { id:41, f:'041_chernobyl.jpg',          title:"Catastrophe nucléaire de Tchernobyl",                       year:1986, month:4,    hint:"Le réacteur n°4 de la centrale a explosé en Ukraine soviétique",                     difficulty:'easy',   category:'catastrophe' },
  { id:42, f:'042_first_iphone.jpg',       title:"Premier iPhone présenté par Steve Jobs",                   year:2007, month:1,    hint:"Présenté lors de la Macworld Conference à San Francisco",                            difficulty:'easy',   category:'technologie' },
  { id:43, f:'043_obama.jpg',              title:"Inauguration de Barack Obama comme 44e président",          year:2009, month:1,    hint:"Premier président afro-américain des États-Unis, devant 1,8 million de personnes",   difficulty:'easy',   category:'politique' },
  { id:44, f:'044_gandhi_salt.jpg',        title:"Gandhi lors de la Marche du Sel",                           year:1930, month:3,    hint:"Il marchait 388 km pour protester contre la taxe britannique sur le sel",             difficulty:'medium', category:'histoire' },
  { id:45, f:'045_woodstock.jpg',          title:"Woodstock — le plus grand festival de l'histoire",         year:1969, month:8,    hint:"600 000 personnes rassemblées dans une ferme de Bethel, État de New York",            difficulty:'medium', category:'culture' },
  { id:46, f:'046_afghan_girl.jpg',        title:"La jeune fille afghane du National Geographic",             year:1984, month:6,    hint:"Photographiée par Steve McCurry dans un camp de réfugiés à Peshawar, Pakistan",      difficulty:'easy',   category:'culture' },
  { id:47, f:'047_saddam_statue.jpg',      title:"La chute de la statue de Saddam Hussein à Bagdad",         year:2003, month:4,    hint:"Symbole de la chute du régime lors de l'invasion américaine de l'Irak",              difficulty:'easy',   category:'histoire' },
  { id:48, f:'048_usain_bolt.jpg',         title:"Usain Bolt célèbre sa victoire aux JO de Pékin",           year:2008, month:8,    hint:"Il bat le record du monde du 100m en 9,69 secondes avant même la ligne d'arrivée",   difficulty:'easy',   category:'sport' },
  { id:49, f:'049_live_aid.jpg',           title:"Live Aid — concert humanitaire mondial",                    year:1985, month:7,    hint:"Organisé par Bob Geldof pour l'Éthiopie, retransmis en direct dans 110 pays",        difficulty:'medium', category:'culture' },
  { id:50, f:'050_first_web_server.jpg',   title:"Premier serveur web — au CERN de Genève",                  year:1991, month:12,   hint:"Tim Berners-Lee a inventé le World Wide Web dans ce bureau en Suisse",               difficulty:'hard',   category:'technologie' },
  { id:51, f:'051_concorde.jpg',           title:"Concorde — avion supersonique commercial",                  year:1969, month:3,    hint:"L'avion franco-britannique vole pour la première fois à Toulouse",                   difficulty:'medium', category:'technologie' },
  { id:52, f:'052_golden_gate_build.jpg',  title:"Construction du Golden Gate Bridge",                        year:1937, month:5,    hint:"Le plus long pont suspendu du monde à son ouverture, à San Francisco",              difficulty:'medium', category:'architecture' },
  { id:53, f:'053_fukushima.jpg',          title:"Explosion du réacteur de Fukushima",                        year:2011, month:3,    hint:"Déclenché par le tsunami, pire accident nucléaire depuis Tchernobyl",                difficulty:'easy',   category:'catastrophe' },
  { id:54, f:'054_ben_gurion.jpg',         title:"Proclamation de l'État d'Israël par Ben Gourion",          year:1948, month:5,    hint:"Il lit la Déclaration d'indépendance au Musée de Tel-Aviv",                          difficulty:'medium', category:'histoire' },
  { id:55, f:'055_gorbachev_reagan.jpg',   title:"Reagan et Gorbatchev signent le traité INF",               year:1987, month:12,   hint:"Premier traité nucléaire à éliminer toute une catégorie d'armes",                   difficulty:'hard',   category:'politique' },
  { id:56, f:'056_mao_proclamation.jpg',   title:"Mao Tsé-Toung proclame la République populaire de Chine", year:1949, month:10,   hint:"Depuis la porte de Tiananmen à Pékin, naissance de la RPC",                         difficulty:'medium', category:'histoire' },
  { id:57, f:'057_haiti_earthquake.jpg',   title:"Tremblement de terre de Haïti — Port-au-Prince",           year:2010, month:1,    hint:"Le séisme de magnitude 7.0 a tué plus de 230 000 personnes",                        difficulty:'medium', category:'catastrophe' },
  { id:58, f:'058_trinity_test.jpg',       title:"Premier essai nucléaire — Trinity Test",                   year:1945, month:7,    hint:"Premier essai nucléaire de l'histoire dans le désert du Nouveau-Mexique",           difficulty:'medium', category:'science' },
  { id:59, f:'059_hiroshima.jpg',          title:"La bombe atomique au-dessus d'Hiroshima",                  year:1945, month:8,    hint:"La bombe 'Little Boy' explose à 580 mètres au-dessus de la ville à 8h15",           difficulty:'easy',   category:'guerre' },
  { id:60, f:'060_selma_march.jpg',        title:"La marche de Selma à Montgomery pour les droits civiques", year:1965, month:3,    hint:"Les marcheurs traversent le pont Edmund Pettus sous les coups de la police",        difficulty:'medium', category:'histoire' },
  { id:61, f:'061_dday.jpg',               title:"Le débarquement en Normandie — D-Day",                     year:1944, month:6,    hint:"L'opération Overlord : le plus grand débarquement amphibie de l'histoire",          difficulty:'easy',   category:'guerre' },
  { id:62, f:'062_mars_pathfinder.jpg',    title:"Mars Pathfinder — premier rover sur Mars",                 year:1997, month:7,    hint:"Le rover Sojourner explore la surface martienne, première mission mobile sur Mars",  difficulty:'hard',   category:'espace' },
  { id:63, f:'063_diana_wedding.jpg',      title:"Mariage du Prince Charles et de Lady Diana",               year:1981, month:7,    hint:"Plus de 750 millions de personnes ont regardé la cérémonie à la télévision",         difficulty:'easy',   category:'culture' },
  { id:64, f:'064_empire_state_build.jpg', title:"L'Empire State Building — symbole de New York",            year:1931, month:5,    hint:"Inauguré le 1er mai, il fut le plus haut bâtiment du monde pendant 40 ans",         difficulty:'medium', category:'architecture' },
  { id:65, f:'065_katrina.jpg',            title:"Ouragan Katrina — La Nouvelle-Orléans inondée",            year:2005, month:8,    hint:"Les digues ont cédé inondant 80% de la ville, plus de 1800 morts",                  difficulty:'easy',   category:'catastrophe' },
  { id:66, f:'066_tahrir_square.jpg',      title:"Printemps arabe — Place Tahrir au Caire",                  year:2011, month:2,    hint:"Des millions de manifestants ont exigé la chute du président Moubarak",              difficulty:'medium', category:'histoire' },
  { id:67, f:'067_rwanda.jpg',             title:"Génocide rwandais — réfugiés à la frontière",              year:1994, month:4,    hint:"Un million de Tutsi massacrés en 100 jours par les milices Hutu",                   difficulty:'medium', category:'histoire' },
  { id:68, f:'068_mandela_president.jpg',  title:"Nelson Mandela élu président d'Afrique du Sud",            year:1994, month:5,    hint:"Premier président noir de l'Afrique du Sud après la fin de l'apartheid",            difficulty:'medium', category:'histoire' },
  { id:69, f:'069_tiananmen_1989.jpg',     title:"Manifestations de Tiananmen — APC en feu",                year:1989, month:6,    hint:"Des manifestants pro-démocratie s'affrontent avec l'armée à Pékin",                 difficulty:'medium', category:'histoire' },
  { id:70, f:'070_kristallnacht.jpg',      title:"Nuit de Cristal — vitrines brisées en Allemagne nazie",   year:1938, month:11,   hint:"Pogroms organisés contre les Juifs dans tout le Reich, 267 synagogues brûlées",    difficulty:'hard',   category:'histoire' },
  { id:71, f:'071_armstrong_neil.jpg',     title:"Neil Armstrong — premier homme à marcher sur la Lune",    year:1969, month:7,    hint:"'C'est un petit pas pour l'homme, un bond de géant pour l'humanité'",              difficulty:'easy',   category:'espace' },
  { id:72, f:'072_abbey_road.jpg',         title:"Les Beatles traversent Abbey Road",                         year:1969, month:8,    hint:"Pochette de leur dernier album enregistré ensemble, photographiée devant leur studio", difficulty:'easy', category:'culture' },
  { id:73, f:'073_pelé.jpg',               title:"Pelé lors de la Coupe du Monde au Brésil",                 year:1970, month:6,    hint:"Il remporte son 3e titre mondial, symbole absolu du football total",                 difficulty:'medium', category:'sport' },
  { id:74, f:'074_che_guevara2.jpg',       title:"Che Guevara — 'Guerrillero Heroico' (2e version)",        year:1960, month:3,    hint:"Considérée comme la photo la plus reproduite de l'histoire de la photographie",     difficulty:'medium', category:'culture' },
  { id:75, f:'075_michael_jordan.jpg',     title:"Michael Jordan — 'Air Jordan' au Chicago Bulls",           year:1991, month:6,    hint:"Premier titre NBA de Jordan, début d'une dynasty de 6 titres en 8 ans",             difficulty:'hard',   category:'sport' },
].map(img => ({ ...img, url: IMG + img.f }));

function getImagesByDifficulty(difficulty) {
  if (difficulty === 'all') return [...IMAGES];
  return IMAGES.filter(img => img.difficulty === difficulty);
}

function selectRandomImages(difficulty, count) {
  const pool = getImagesByDifficulty(difficulty);
  return [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(count, pool.length));
}

// ── Scoring ──────────────────────────────────────────────────────────
// Exact (0 an)     → 110 pts  (+25 si mois exact aussi → max 135)
// 1 an d'écart     → 100 pts
// 2 ans            →  99 pts
// n ans (n ≥ 1)   → max(0, 101 - n)
// > 100 ans        →   0 pt
function calculateScore(guessYear, guessMonth, correctYear, correctMonth) {
  const yearDiff = Math.abs(guessYear - correctYear);
  if (yearDiff === 0) {
    const monthBonus = (guessMonth && correctMonth && guessMonth === correctMonth) ? 25 : 0;
    return 110 + monthBonus;
  }
  return Math.max(0, 101 - yearDiff);
}

module.exports = { IMAGES, selectRandomImages, calculateScore };
