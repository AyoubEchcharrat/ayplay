// scripts/download-images.js — passe 2 avec les bons filenames + fallback Wikipedia REST API
const https = require('https');
const http  = require('http');
const fs    = require('fs');
const path  = require('path');

const DIR = path.join(__dirname, '../client/assets/histodate');
fs.mkdirSync(DIR, { recursive: true });

// [filename_local, commons_filename | null, wikipedia_article_fallback | null]
const IMAGES = [
  // ── Images déjà téléchargées (skip auto) ─────────────────────────
  ['001_first_photo.jpg',        'View_from_the_Window_at_Le_Gras,_Joseph_Nicéphore_Niépce.jpg', null],
  ['002_first_selfie.jpg',       '1839_Self-portrait_by_Robert_Cornelius.jpg', 'Robert Cornelius'],
  ['003_first_xray.jpg',         "X-ray_by_Wilhelm_Röntgen_of_Albert_von_Kölliker's_hand_-_18960123-02.jpg", 'Wilhelm Röntgen'],
  ['004_wright_brothers.jpg',    'First_flight2.jpg', 'Wright brothers in popular culture'],
  ['005_titanic.jpg',            'RMS_Titanic_3.jpg', 'RMS Titanic'],
  ['006_hindenburg.jpg',         'Hindenburg_disaster.jpg', 'Hindenburg disaster'],
  ['007_lunch_skyscraper.jpg',   'Lunch_atop_a_Skyscraper.jpg', 'Lunch atop a Skyscraper'],
  ['008_migrant_mother.jpg',     'Migrant_Mother.jpg', 'Migrant Mother'],
  ['009_iwo_jima.jpg',           'Raising_the_Flag_on_Iwo_Jima,_larger.jpeg', 'Raising the Flag on Iwo Jima'],
  ['010_nagasaki.jpg',           'Nagasakibomb.jpg', 'Atomic bombings of Hiroshima and Nagasaki'],
  ['011_einstein_tongue.jpg',    'Albert_Einstein_sticks_his_tongue.jpg', 'Albert Einstein'],
  ['012_che_guevara.jpg',        'Che_Guevara_-_Guerrillero_Heroico_by_Alberto_Korda.jpg', 'Guerrillero Heroico'],
  ['013_mlk_speech.jpg',         'Martin_Luther_King_-_March_on_Washington.jpg', 'March on Washington'],
  ['014_burning_monk.jpg',       'Thich_Quang_Duc_self-immolation.jpg', 'Thích Quảng Đức'],
  ['015_saigon_execution.jpg',   'Saigon-execution.jpg', 'Execution of Nguyễn Văn Lém'],
  ['016_napalm_girl.jpg',        null, 'The Terror of War'],  // fair-use, fallback Wikipedia
  ['017_olympic_salute.jpg',     'John_Carlos,_Tommie_Smith,_Peter_Norman_1968cr.jpg', '1968 Olympics Black Power salute'],
  ['018_earthrise.jpg',          'NASA-Apollo8-Dec24-Earthrise.jpg', 'Earthrise'],
  ['019_moon_buzz.jpg',          'Buzz_salutes_the_U.S._Flag.jpg', 'Buzz Aldrin'],  // capital F!
  ['020_blue_marble.jpg',        'The_Blue_Marble.jpg', 'The Blue Marble'],
  ['021_moon_bootprint.jpg',     'Apollo_11_bootprint.jpg', 'Apollo 11'],
  ['022_apollo_launch.jpg',      'Apollo_11_Launch_-_GPN-2000-000630.jpg', 'Apollo 11'],
  ['023_challenger.jpg',         'Challenger_explosion.jpg', 'Space Shuttle Challenger disaster'],
  ['024_tank_man.jpg',           null, 'Tank Man'],  // fair-use, fallback Wikipedia
  ['025_berlin_wall_fall.jpg',   'BerlinWall-BrandenburgGate.jpg', 'Fall of the Berlin Wall'],
  ['026_berlin_wall_build.jpg',  'Berlinermauer.jpg', 'Construction of the Berlin Wall'],
  ['027_mandela.jpg',            'Nelson_Mandela.jpg', 'Nelson Mandela'],
  ['028_9_11.jpg',               'WTC_smoking_on_9-11.jpeg', 'September 11 attacks'],
  ['029_notre_dame_fire.jpg',    'Notre-Dame_en_feu,_20h06.jpg', '2019 Notre-Dame de Paris fire'],
  ['030_black_hole.jpg',         'Black_hole_-_Messier_87_crop_max_res.jpg', 'Event Horizon Telescope'],
  ['031_eniac.jpg',              'Eniac.jpg', 'ENIAC'],
  ['032_sputnik.jpg',            'Sputnik_asm.jpg', 'Sputnik 1'],
  ['033_gagarin.jpg',            'Gagarin_in_Sweden.jpg', 'Yuri Gagarin'],
  ['034_dolly_sheep.jpg',        'Dolly_face_closeup.jpg', 'Dolly (sheep)'],
  ['035_dna_photo51.jpg',        null, 'Photo 51'],  // fair-use, fallback Wikipedia
  ['036_jesse_owens.jpg',        'Jesse_Owens_1936.jpg', 'Jesse Owens'],
  ['037_mickey_mouse.jpg',       'Steamboat-willie.jpg', 'Steamboat Willie'],
  ['038_lincoln.jpg',            'Abraham_Lincoln_November_1863.jpg', 'Abraham Lincoln'],
  ['039_yalta.jpg',              'Yalta_Conference_1945_Churchill,_Stalin,_Roosevelt.jpg', 'Yalta Conference'],
  ['040_san_francisco_1906.jpg', 'San_francisco_fire_1906.jpg', '1906 San Francisco earthquake'],
  ['041_chernobyl.jpg',          'IAEA_02790015_(5613115146).jpg', 'Chernobyl disaster'],
  ['042_first_iphone.jpg',       'Steve_Jobs_presents_iPhone.jpg', 'IPhone (1st generation)'],
  ['043_obama.jpg',              'US_President_Barack_Obama_taking_his_Oath_of_Office_-_2009Jan20.jpg', 'First inauguration of Barack Obama'],
  ['044_gandhi_salt.jpg',        'Gandhi_at_Dandi,_5_April_1930.jpg', 'Salt March'],
  ['045_woodstock.jpg',          'Woodstock_redmond_stage.JPG', 'Woodstock'],
  ['046_afghan_girl.jpg',        null, 'Afghan Girl'],  // fair-use
  ['047_saddam_statue.jpg',      'SaddamStatue.jpg', 'Fall of Baghdad'],
  ['048_usain_bolt.jpg',         'Usain_Bolt_Olympics_Celebration.jpg', 'Usain Bolt at the 2008 Summer Olympics'],
  ['049_live_aid.jpg',           'Live_Aid_at_JFK_Stadium,_Philadelphia,_PA.jpg', 'Live Aid'],
  ['050_first_web_server.jpg',   'First_Web_Server.jpg', 'History of the World Wide Web'],
  ['051_concorde.jpg',           'British_Airways_Concorde_G-BOAC_03.jpg', 'Concorde'],
  ['052_golden_gate_build.jpg',  'Golden_Gate_Bridge_under_construction_3c00678u.jpg', 'Golden Gate Bridge'],
  ['053_fukushima.jpg',          'Appearance_of_Fukushima_I_Nuclear_Power_Plant_Unit_3_after_the_explosion_20110315.jpg', 'Fukushima Daiichi nuclear disaster'],
  ['054_ben_gurion.jpg',         'Ben_Gurion_proclaiming_independence.jpg', 'Israeli Declaration of Independence'],
  ['055_gorbachev_reagan.jpg',   'Reagan_and_Gorbachev_signing.jpg', 'Intermediate-Range Nuclear Forces Treaty'],
  ['056_mao_proclamation.jpg',   'Mao_proclaiming_PRC.jpg', 'Proclamation of the People\'s Republic of China'],
  ['057_haiti_earthquake.jpg',   'Haiti_earthquake_building_damage.jpg', '2010 Haiti earthquake'],
  ['058_trinity_test.jpg',       'Trinity_shot_color.jpg', 'Trinity (nuclear test)'],
  ['059_hiroshima.jpg',          'Atomic_bombing_of_Japan.jpg', null],
  ['060_selma_march.jpg',        'Selma_to_Montgomery_Marches.jpg', 'Selma to Montgomery marches'],
  ['061_dday.jpg',               'Into_the_Jaws_of_Death_23-0455M_edit.jpg', 'Normandy landings'],
  ['062_mars_pathfinder.jpg',    'Mars_Pathfinder_Rover_Deployed.jpg', 'Mars Pathfinder'],
  ['063_diana_wedding.jpg',      'Diana_Charles_Wedding.jpg', 'Wedding of Charles, Prince of Wales, and Lady Diana Spencer'],
  ['064_empire_state_build.jpg', 'Empire_State_Building_construction.jpg', 'Empire State Building'],
  ['065_katrina.jpg',            'FEMA_-_15691_-_Photograph_by_Jocelyn_Augustino_taken_on_09-11-2005_in_Louisiana.jpg', 'Hurricane Katrina'],
  ['066_tahrir_square.jpg',      'Tahrir_Square_during_18_days.jpg', '2011 Egyptian revolution'],
  ['067_rwanda.jpg',             'Rwandan_genocide_refugees.jpg', 'Rwandan genocide'],
  ['068_mandela_president.jpg',  'Nelson_Mandela_1994.jpg', null],
  ['069_tiananmen_1989.jpg',     'Tiananmen_Square_protests_of_1989_burning_apc.jpg', 'Tiananmen Square protests of 1989'],
  ['070_kristallnacht.jpg',      'Kristallnacht.jpg', null],
  ['071_armstrong_neil.jpg',     'Neil_Armstrong_pose.jpg', 'Neil Armstrong'],
  ['072_abbey_road.jpg',         'Beatles_-_Abbey_Road.jpg', 'Abbey Road'],
  ['073_pelé.jpg',               'Pele_Brazil_1970.jpg', 'Pelé'],
  ['074_che_guevara2.jpg',       'Che_Guevara_-_Guerrillero_Heroico_by_Alberto_Korda.jpg', null],
  ['075_michael_jordan.jpg',     'Michael_Jordan_in_2014.jpg', 'Michael Jordan'],
];

// Wikimedia Commons API
function getCommonsUrl(filename) {
  return new Promise((resolve, reject) => {
    const title = 'File:' + filename;
    const url = 'https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url%7Cthumburl&iiurlwidth=1200&titles=' + encodeURIComponent(title) + '&format=json';
    get(url, (data) => {
      try {
        const pages = Object.values(JSON.parse(data).query.pages);
        const info = pages[0]?.imageinfo?.[0];
        if (!info?.thumburl && !info?.url) return reject(new Error('No imageinfo'));
        resolve(info.thumburl || info.url);
      } catch(e) { reject(e); }
    }, reject);
  });
}

// Wikipedia REST API thumbnail
function getWikipediaThumb(article) {
  return new Promise((resolve, reject) => {
    const url = 'https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(article);
    get(url, (data) => {
      try {
        const json = JSON.parse(data);
        const src = json.thumbnail?.source || json.originalimage?.source;
        if (!src) return reject(new Error('No thumbnail for: ' + article));
        resolve(src);
      } catch(e) { reject(e); }
    }, reject);
  });
}

// Generic HTTPS GET helper
function get(url, onData, onError) {
  const mod = url.startsWith('https') ? https : http;
  mod.get(url, { headers: { 'User-Agent': 'HistoDateGame/1.0 (educational nodejs)' }, timeout: 15000 }, (res) => {
    if ([301,302,303,307,308].includes(res.statusCode)) {
      const next = res.headers.location.startsWith('http') ? res.headers.location : new URL(res.headers.location, url).href;
      return get(next, onData, onError);
    }
    let d = ''; res.setEncoding('utf8');
    res.on('data', c => d += c);
    res.on('end', () => onData(d));
  }).on('error', onError).on('timeout', function() { this.destroy(); onError(new Error('Timeout')); });
}

// Téléchargement binaire
function downloadBinary(src, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    let redirects = 0;
    function fetch(url) {
      const mod = url.startsWith('https') ? https : http;
      mod.get(url, {
        headers: {
          'User-Agent': 'HistoDateGame/1.0 (educational nodejs)',
          'Accept': 'image/*,*/*',
          'Referer': 'https://commons.wikimedia.org/',
        },
        timeout: 30000,
      }, (res) => {
        if ([301,302,303,307,308].includes(res.statusCode)) {
          if (++redirects > 8) { file.close(); fs.unlink(dest, ()=>{}); return reject(new Error('Too many redirects')); }
          const loc = res.headers.location;
          return fetch(loc.startsWith('http') ? loc : new URL(loc, url).href);
        }
        if (res.statusCode !== 200) { file.close(); fs.unlink(dest, ()=>{}); return reject(new Error('HTTP ' + res.statusCode)); }
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
        file.on('error', e => { fs.unlink(dest, ()=>{}); reject(e); });
      }).on('error', e => { file.close(); fs.unlink(dest, ()=>{}); reject(e); })
        .on('timeout', function() { this.destroy(); reject(new Error('Timeout')); });
    }
    fetch(src);
  });
}

async function main() {
  let ok = 0, failed = 0;
  const failList = [];

  for (const [localName, commonsFile, article] of IMAGES) {
    const dest = path.join(DIR, localName);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 10000) {
      process.stdout.write(`[skip] ${localName}\n`); ok++; continue;
    }

    let imgUrl = null;
    let source = '';

    // Essai 1 : Wikimedia Commons API
    if (commonsFile) {
      try {
        imgUrl = await getCommonsUrl(commonsFile);
        source = 'commons';
      } catch(e) { /* try fallback */ }
    }

    // Essai 2 : Wikipedia article thumbnail
    if (!imgUrl && article) {
      try {
        imgUrl = await getWikipediaThumb(article);
        source = 'wikipedia';
      } catch(e) { /* skip */ }
    }

    if (!imgUrl) {
      process.stdout.write(`[ERR] ${localName}: aucune URL trouvée\n`);
      failList.push(localName); failed++; continue;
    }

    try {
      await downloadBinary(imgUrl, dest);
      const size = fs.statSync(dest).size;
      if (size < 5000) { fs.unlinkSync(dest); throw new Error('Trop petit ' + size + 'B'); }
      process.stdout.write(`[ ok] ${localName}  ${(size/1024).toFixed(0)}KB  [${source}]\n`);
      ok++;
    } catch(e) {
      process.stdout.write(`[ERR] ${localName}: ${e.message}\n`);
      failList.push(localName); failed++;
    }

    await new Promise(r => setTimeout(r, 600));
  }

  console.log(`\n✓ ${ok} OK   ✗ ${failed} échecs`);
  if (failList.length) console.log('Échecs restants:', failList.join(', '));
}

main().catch(console.error);
