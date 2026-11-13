'use strict';
// Levels: where you fight, what it looks like, which zombies come in each wave, and where coins are hidden.
//
// To add a new level, copy one of these and change it:
//   theme      the background art: 'suburb' 'city' 'graveyard' 'snow' 'desert' 'military' 'carnival'
//              (in this file) or 'farm' 'outback' 'zoo' (in js/themes.js)
//   worldW     how wide the map is in pixels
//   hp, speed  zombie toughness and speed (1 = normal)
//   platforms  [kind, x, width, color?]  one-way: jump up through them, press Down to drop off
//              kinds: car van shed treehouse crate bus scaffold dumpster crypt wall mausoleum logs cabin icerock
//              barrels trailer canopy rock container tank tower bunker stand wagon stage boxes
//              haybales tractor barn coop ute watertank termite shack cage kiosk rockpile train statue
//   coins      extra coins lying around: [x, heightAboveGround, howMany]  (every platform gets a row too)
//   bigCoins   shiny 10-coins in hard places: [x, heightAboveGround]
//   barrels    things to shoot that go BOOM (js/barrels.js): [kind, x]
//              kinds: boom (explosive) oil gas acid goo (sticky slime) ice (liquid nitrogen) zap (electric)
//   waves      mix = how many of each zombie, every = seconds between zombies, max = most at once,
//              boss: true = the level boss shows up halfway through that wave
//   boss       the boss's name.  bossType = which boss: 'boss' (a giant zombie, the default), 'ram', 'kingroo', 'grizz',
//              'mower', 'ratking', 'yeti' or 'kingbloat' (js/bosses.js).  bossLine = what the banner says when it shows up
//   zombies    walker runner leaper brute tiny giant bloater, and the animals: dog sheep roo crow bear

const LEVELS = [
  {
    name: 'Maple Street', blurb: 'A quiet street at sunset. Not so quiet any more... and Mr. Mower wants you OFF his lawn.', theme: 'suburb',
    worldW: 2600, hp: 1, speed: 1, boss: 'Mr. Mower', bossType: 'mower', bossLine: 'GET OFF MY LAWN! Jump over his charge!',
    platforms: [['car', 330, 96, '#b8483b'], ['shed', 720, 110], ['car', 1150, 96, '#3b6a9a'], ['treehouse', 1520, 140], ['van', 1960, 130], ['crate', 2330, 64]],
    coins: [[110, 20, 4], [560, 30, 3], [960, 40, 4], [1380, 30, 3], [1800, 26, 3], [2200, 30, 3]],
    bigCoins: [[1590, 196]],
    barrels: [['boom', 560], ['goo', 1320], ['zap', 1780], ['boom', 2160]],
    waves: [
      { mix: { walker: 8 }, every: 1.6, max: 8 },
      { mix: { walker: 12, runner: 2, dog: 2 }, every: 1.3, max: 10 },
      { mix: { walker: 14, runner: 5, dog: 3 }, boss: true, every: 1.15, max: 12 },
    ],
  },
  {
    name: 'Downtown', blurb: 'The city at night. Watch out for jumpers, stray zombie dogs... and the Rat King from the sewers!', theme: 'city',
    worldW: 3200, hp: 1.25, speed: 1.05, boss: 'The Rat King', bossType: 'ratking', bossLine: 'He crawled up out of the sewers. Watch his pounce!',
    platforms: [['car', 230, 96, '#6b6b3b'], ['crate', 660, 64], ['bus', 1060, 250], ['scaffold', 1560, 170], ['car', 2010, 96, '#3b5a8a'], ['dumpster', 2360, 90], ['scaffold', 2700, 150], ['car', 2990, 96, '#8a3b3b']],
    coins: [[470, 30, 4], [880, 40, 3], [1420, 120, 3], [1830, 30, 4], [2560, 30, 3]],
    bigCoins: [[1645, 196], [2775, 190]],
    barrels: [['boom', 430], ['gas', 880], ['zap', 1880], ['goo', 2580], ['oil', 2930]],
    waves: [
      { mix: { walker: 12, runner: 4, dog: 3 }, every: 1.2, max: 12 },
      { mix: { walker: 12, runner: 5, leaper: 4, dog: 5 }, every: 1.1, max: 14 },
      { mix: { walker: 14, runner: 6, leaper: 5, brute: 2, dog: 6 }, every: 1.0, max: 16 },
      { mix: { walker: 16, runner: 8, leaper: 6, brute: 3, dog: 8 }, boss: true, every: 0.95, max: 18 },
    ],
  },
  {
    name: 'Graveyard', blurb: 'Where they all came from. Zombie crows in the trees... and something BIG.', theme: 'graveyard',
    worldW: 3000, hp: 1.5, speed: 1.1, boss: 'The Grave Giant',
    platforms: [['crypt', 420, 140], ['wall', 900, 120], ['mausoleum', 1360, 170], ['wall', 1860, 100], ['crypt', 2240, 140], ['wall', 2660, 90]],
    coins: [[200, 26, 4], [700, 40, 3], [1140, 40, 4], [1660, 40, 3], [2060, 40, 3], [2500, 36, 3], [2860, 26, 3]],
    bigCoins: [[1445, 196], [490, 150]],
    barrels: [['acid', 680], ['boom', 1640], ['zap', 2100], ['goo', 2540]],
    waves: [
      { mix: { walker: 14, runner: 6, leaper: 4, crow: 5 }, every: 1.0, max: 14 },
      { mix: { walker: 14, runner: 8, leaper: 6, brute: 3, crow: 6, dog: 4 }, every: 0.95, max: 16 },
      { mix: { walker: 16, runner: 8, leaper: 6, brute: 3, crow: 8, dog: 6 }, every: 0.9, max: 18 },
      { mix: { walker: 16, runner: 8, leaper: 6, brute: 3, crow: 8 }, boss: true, every: 0.9, max: 18 },
    ],
  },
  {
    name: 'Frozen Forest', blurb: 'A snowy night under the northern lights. Tiny zombies, zombie wolves, a BEAR... and the Yeti!', theme: 'snow',
    worldW: 3000, hp: 1.8, speed: 1.12, boss: 'The Yeti', bossType: 'yeti', bossLine: 'Look out for flying snowballs!',
    platforms: [['logs', 260, 110], ['cabin', 640, 180], ['icerock', 1080, 90], ['logs', 1420, 110], ['cabin', 1820, 180], ['icerock', 2280, 100], ['logs', 2620, 120]],
    coins: [[470, 30, 4], [910, 40, 3], [1240, 30, 4], [1640, 40, 3], [2100, 30, 4], [2470, 40, 3]],
    bigCoins: [[730, 160], [1910, 160]],
    barrels: [['ice', 880], ['gas', 1620], ['boom', 2150], ['ice', 2490]],
    waves: [
      { mix: { walker: 14, tiny: 8, dog: 4 }, every: 0.95, max: 14 },
      { mix: { walker: 14, runner: 8, tiny: 10, leaper: 4, dog: 6 }, every: 0.9, max: 16 },
      { mix: { walker: 16, tiny: 12, leaper: 6, brute: 3, dog: 6, bear: 1 }, every: 0.85, max: 18 },
      { mix: { walker: 16, runner: 10, tiny: 12, brute: 3, giant: 1, dog: 8 }, every: 0.8, max: 20 },
      { mix: { walker: 18, tiny: 14, dog: 10, bear: 2, giant: 1 }, boss: true, every: 0.8, max: 20 },
    ],
  },
  {
    name: 'Desert Gas Stop', blurb: 'Hot sand, cactus, BLOATERS and zombie vultures. Pop them from far away! Their king is the biggest of all.', theme: 'desert',
    worldW: 3200, hp: 2.1, speed: 1.15, boss: 'King Bloat', bossType: 'kingbloat', bossLine: 'Dodge his goo, and stand back when he POPS!',
    platforms: [['barrels', 240, 70], ['trailer', 600, 190], ['canopy', 1100, 280], ['rock', 1640, 140], ['trailer', 2060, 190], ['barrels', 2500, 70], ['rock', 2820, 130]],
    coins: [[420, 30, 4], [880, 40, 3], [1500, 30, 3], [1880, 40, 4], [2340, 30, 3], [2680, 40, 3]],
    bigCoins: [[1240, 200], [1710, 170]],
    barrels: [['oil', 450], ['gas', 950], ['gas', 1500], ['boom', 1990], ['oil', 2690]],
    waves: [
      { mix: { walker: 16, runner: 8, bloater: 4, dog: 4 }, every: 0.9, max: 16 },
      { mix: { walker: 16, runner: 10, bloater: 6, tiny: 8, crow: 6 }, every: 0.85, max: 18 },
      { mix: { walker: 18, leaper: 8, bloater: 6, brute: 4, dog: 6 }, every: 0.8, max: 18 },
      { mix: { walker: 18, runner: 12, bloater: 8, brute: 4, giant: 2, crow: 8 }, every: 0.75, max: 20 },
      { mix: { walker: 20, runner: 12, bloater: 8, dog: 10, crow: 8, giant: 2 }, boss: true, every: 0.75, max: 22 },
    ],
  },
  {
    name: 'Army Base', blurb: 'Searchlights, tanks, zombie army dogs and a zombie general. Six waves of chaos.', theme: 'military',
    worldW: 3400, hp: 2.35, speed: 1.18, boss: 'General Rotten',
    platforms: [['container', 260, 180, '#3a6a8a'], ['tank', 720, 170], ['tower', 1180, 110], ['bunker', 1600, 210], ['container', 2100, 180, '#8a4a2a'], ['tank', 2560, 170], ['tower', 3020, 110]],
    coins: [[480, 30, 4], [960, 40, 3], [1420, 30, 3], [1880, 40, 4], [2340, 30, 3], [2800, 40, 3]],
    bigCoins: [[1235, 200], [3075, 200]],
    barrels: [['boom', 560], ['gas', 1010], ['zap', 1520], ['boom', 1960], ['acid', 2390], ['ice', 2880]],
    waves: [
      { mix: { walker: 18, runner: 10, dog: 6 }, every: 0.85, max: 18 },
      { mix: { walker: 18, runner: 10, leaper: 8, tiny: 10, dog: 8 }, every: 0.8, max: 20 },
      { mix: { walker: 20, brute: 5, bloater: 6, tiny: 10, crow: 6 }, every: 0.75, max: 20 },
      { mix: { walker: 20, runner: 12, leaper: 8, giant: 2, dog: 10 }, every: 0.7, max: 22 },
      { mix: { walker: 20, runner: 12, dog: 12, brute: 5, bloater: 6, crow: 6 }, every: 0.7, max: 22 },
      { mix: { walker: 20, runner: 12, brute: 5, bloater: 6, giant: 2, dog: 8 }, boss: true, every: 0.7, max: 22 },
    ],
  },
  {
    name: 'Creepy Carnival', blurb: 'The rides still spin... boxing zombie kangaroos, the petting zoo and the Big Top Brute.', theme: 'carnival',
    worldW: 3600, hp: 2.6, speed: 1.2, boss: 'The Big Top Brute',
    platforms: [['stand', 280, 150], ['wagon', 720, 190], ['stage', 1200, 260], ['stand', 1760, 150], ['boxes', 2160, 90], ['wagon', 2560, 190], ['stage', 3040, 240]],
    coins: [[500, 30, 4], [1000, 40, 3], [1540, 30, 4], [1980, 40, 3], [2380, 30, 4], [2840, 40, 3]],
    bigCoins: [[1330, 120], [2205, 130], [3160, 120]],
    barrels: [['gas', 560], ['goo', 1000], ['boom', 1620], ['zap', 2050], ['ice', 2420], ['boom', 2900]],
    waves: [
      { mix: { walker: 20, tiny: 12, runner: 10 }, every: 0.8, max: 20 },
      { mix: { walker: 20, runner: 12, bloater: 8, leaper: 8, roo: 4 }, every: 0.75, max: 22 },
      { mix: { walker: 22, tiny: 16, brute: 6, giant: 1, sheep: 8 }, every: 0.7, max: 22 },
      { mix: { walker: 22, runner: 14, bloater: 8, leaper: 10, giant: 2, roo: 6 }, every: 0.65, max: 24 },
      { mix: { walker: 22, roo: 8, sheep: 8, dog: 10, giant: 2 }, every: 0.65, max: 24 },
      { mix: { walker: 24, runner: 14, brute: 6, bloater: 8, giant: 3, roo: 6, sheep: 6 }, boss: true, every: 0.65, max: 24 },
    ],
  },
  {
    name: 'Zombie Farm', blurb: 'A sunny morning on the farm. The dogs, the sheep and the crows have ALL turned.', theme: 'farm',
    worldW: 3400, hp: 2.8, speed: 1.22, boss: 'The Big Bad Ram', bossType: 'ram',
    platforms: [['haybales', 260, 120], ['tractor', 680, 150], ['coop', 1120, 110], ['barn', 1500, 220], ['haybales', 2000, 120], ['tractor', 2400, 150], ['coop', 2880, 110]],
    coins: [[520, 30, 4], [960, 40, 3], [1360, 30, 4], [1820, 40, 3], [2240, 30, 4], [2700, 40, 3], [3150, 30, 3]],
    bigCoins: [[1610, 200], [745, 150]],
    barrels: [['oil', 520], ['boom', 960], ['goo', 1820], ['gas', 2260], ['acid', 2700]],
    waves: [
      { mix: { walker: 16, dog: 8, crow: 6 }, every: 0.8, max: 20 },
      { mix: { walker: 16, sheep: 8, dog: 8, crow: 8 }, every: 0.75, max: 22 },
      { mix: { walker: 18, sheep: 10, dog: 10, bloater: 4, crow: 8 }, every: 0.72, max: 22 },
      { mix: { walker: 18, sheep: 10, dog: 12, brute: 4, crow: 10, bear: 1 }, every: 0.7, max: 24 },
      { mix: { walker: 20, sheep: 12, dog: 12, crow: 10, giant: 2 }, boss: true, every: 0.68, max: 24 },
    ],
  },
  {
    name: 'The Outback', blurb: 'Red dirt and blazing sun. Zombie kangaroos hop EVERYWHERE, even up to you.', theme: 'outback',
    worldW: 3500, hp: 3, speed: 1.24, boss: 'King Roo', bossType: 'kingroo',
    platforms: [['ute', 240, 130, '#d8d4c8'], ['termite', 640, 80], ['watertank', 980, 100], ['shack', 1380, 200], ['ute', 1900, 130, '#c8a040'], ['termite', 2300, 80], ['watertank', 2650, 100], ['shack', 3020, 200]],
    coins: [[460, 30, 4], [840, 40, 3], [1200, 30, 4], [1700, 40, 3], [2120, 30, 4], [2480, 40, 3], [2850, 30, 4]],
    bigCoins: [[1030, 196], [2700, 196], [3110, 170]],
    barrels: [['oil', 480], ['gas', 840], ['boom', 1700], ['goo', 2160], ['zap', 2520], ['oil', 2900]],
    waves: [
      { mix: { walker: 16, roo: 6, dog: 8 }, every: 0.78, max: 20 },
      { mix: { walker: 18, roo: 8, dog: 10, crow: 8 }, every: 0.74, max: 22 },
      { mix: { runner: 12, roo: 10, dog: 10, bloater: 6, crow: 8 }, every: 0.7, max: 22 },
      { mix: { walker: 18, roo: 12, dog: 12, brute: 4, giant: 2 }, every: 0.68, max: 24 },
      { mix: { walker: 20, roo: 14, dog: 12, crow: 10, giant: 2 }, boss: true, every: 0.65, max: 24 },
    ],
  },
  {
    name: 'Zombie Zoo', blurb: 'The final level. Every cage is open: bears, kangaroos, sheep, crows... and Big Grizz.', theme: 'zoo',
    worldW: 3800, hp: 3.2, speed: 1.26, boss: 'Big Grizz', bossType: 'grizz',
    platforms: [['cage', 260, 150], ['kiosk', 700, 130], ['rockpile', 1080, 170], ['train', 1500, 220], ['statue', 2020, 140], ['cage', 2420, 150], ['kiosk', 2860, 130], ['rockpile', 3260, 170]],
    coins: [[500, 30, 4], [920, 40, 3], [1340, 30, 4], [1820, 40, 3], [2260, 30, 4], [2680, 40, 3], [3120, 30, 4], [3560, 40, 3]],
    bigCoins: [[2090, 210], [765, 200], [3330, 170]],
    barrels: [['acid', 540], ['ice', 960], ['boom', 1820], ['zap', 2280], ['goo', 2700], ['gas', 3120], ['boom', 3560]],
    waves: [
      { mix: { walker: 18, dog: 10, crow: 10 }, every: 0.75, max: 22 },
      { mix: { walker: 18, roo: 8, sheep: 8, tiny: 12 }, every: 0.72, max: 22 },
      { mix: { walker: 20, bear: 3, dog: 12, leaper: 8 }, every: 0.7, max: 24 },
      { mix: { walker: 20, roo: 10, sheep: 10, bloater: 8, crow: 12 }, every: 0.68, max: 24 },
      { mix: { walker: 22, bear: 4, giant: 2, runner: 14, dog: 12 }, every: 0.65, max: 26 },
      { mix: { walker: 24, roo: 12, sheep: 10, bear: 3, crow: 12, giant: 2 }, boss: true, every: 0.62, max: 26 },
    ],
  },
];

// How tall each platform is (its top is this many pixels above the ground).
const PLATFORM_TOP = {
  car: 46, van: 70, shed: 80, treehouse: 136, crate: 64, bus: 88, scaffold: 136, dumpster: 54, crypt: 96, wall: 56, mausoleum: 138,
  logs: 50, cabin: 96, icerock: 72, barrels: 62, trailer: 82, canopy: 136, rock: 108, container: 86, tank: 74, tower: 138, bunker: 66,
  stand: 94, wagon: 88, stage: 58, boxes: 72,
};
function buildPlatforms(L) {
  return L.platforms.map(([kind, x, w, color]) => ({ kind, x, w, color, top: GROUND - PLATFORM_TOP[kind] }));
}

// Coins lying around the map when a level starts (they float and don't disappear).
function mapCoinSpots(L) {
  const spots = [];
  for (const p of buildPlatforms(L)) {
    const n = Math.max(2, Math.floor(p.w / 30)), gap = p.w / n;
    for (let i = 0; i < n; i++) spots.push({ x: p.x + gap * (i + 0.5), y: p.top - 24, val: 1 });
  }
  for (const [x, h, n] of L.coins || []) for (let i = 0; i < n; i++) spots.push({ x: x + i * 24, y: GROUND - h - 14, val: 1 });
  for (const [x, h] of L.bigCoins || []) spots.push({ x, y: GROUND - h, val: 10 });
  return spots;
}

// ---- Background art -------------------------------------------------------
const STARS = (() => { const r = seeded(99); return Array.from({ length: 130 }, () => ({ x: r() * W, y: r() * 300, s: r() * 1.3 + 0.4, p: r() * 6, sp: 0.5 + r() * 2 })); })();
function drawStars(c, alpha) {
  c.fillStyle = '#fff';
  for (const s of STARS) { c.globalAlpha = alpha * (0.35 + 0.65 * Math.sin(G.t * s.sp + s.p) ** 2); c.fillRect(s.x, s.y, s.s, s.s); }
  c.globalAlpha = 1;
}
function ridge(c, camX, par, base, amp, freq, color, seed) {
  c.fillStyle = color; c.beginPath(); c.moveTo(0, H);
  for (let sx = 0; sx <= W + 8; sx += 8) {
    const wx = (sx + camX * par) * freq;
    c.lineTo(sx, base - (Math.sin(wx + seed) * amp + Math.sin(wx * 2.3 + seed * 2) * amp * 0.4 + Math.sin(wx * 5.1 + seed) * amp * 0.15));
  }
  c.lineTo(W, H); c.closePath(); c.fill();
}
function glow(c, x, y, r, rgb, a) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
  c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
}
const pickR = (r, arr) => arr[Math.floor(r() * arr.length)];

function genCity(r, span, minH, maxH) {
  const out = []; let x = -100;
  while (x < span) {
    const w = (70 + r() * 110) | 0, h = (minH + r() * (maxH - minH)) | 0;
    const cols = Math.max(1, Math.floor((w - 12) / 14)), rows = Math.max(1, Math.floor((h - 24) / 18));
    const lit = []; for (let i = 0; i < cols * rows; i++) lit.push(r() < 0.26 ? (r() < 0.2 ? 2 : 1) : 0);
    out.push({ x, w, h, cols, lit, ant: r() < 0.3, tank: r() < 0.15 });
    x += w + ((r() * 14) | 0) - 2;
  }
  return out;
}
function deadTree(r, x, y, ang, len, wid, depth, out = []) {
  const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
  out.push([x, y, x2, y2, wid]);
  if (depth < 3) { const n = depth < 1 ? 3 : 2; for (let i = 0; i < n; i++) deadTree(r, x2, y2, ang + (r() - 0.5) * 1.5, len * (0.55 + r() * 0.2), wid * 0.62, depth + 1, out); }
  return out;
}
const HOUSE_BODIES = ['#7d6a8e', '#8e6a6a', '#6a7d8e', '#8e806a', '#6f8a73'];
const HOUSE_ROOFS = ['#3d2b45', '#4a2d2d', '#2d3a4a', '#3a3a2d'];

function bgData(L) {
  if (L._bg) return L._bg;
  const r = seeded(L.name.length * 977 + L.worldW), bg = {};
  if (THEMES[L.theme]) THEMES[L.theme].bg(bg, L, r);   // the animal maps (js/themes.js)
  else if (L.theme === 'suburb') {
    bg.houses = []; let x = -80; const span = L.worldW * 0.5 + W + 200;
    while (x < span) {
      const w = 150 + r() * 90, h = 86 + r() * 40;
      bg.houses.push({ x, w, h, roofH: 38 + r() * 26, body: pickR(r, HOUSE_BODIES), roof: pickR(r, HOUSE_ROOFS), lit: [r() < 0.65, r() < 0.5, r() < 0.45], chim: r() < 0.6, attic: r() < 0.5, tree: r() < 0.55, treeLeft: r() < 0.5 });
      x += w + 50 + r() * 80;
    }
    bg.clouds = Array.from({ length: 7 }, () => ({ x: r() * (W + 400) - 200, y: 60 + r() * 170, w: 120 + r() * 180, h: 7 + r() * 9 }));
    bg.fences = []; for (let fx = 60; fx < L.worldW - 140; fx += 240 + r() * 200) bg.fences.push({ x: fx, w: 80 + r() * 110 });
    bg.mail = []; for (let mx = 190; mx < L.worldW - 60; mx += 360 + r() * 300) bg.mail.push(mx);
  } else if (L.theme === 'city') {
    bg.far = genCity(r, L.worldW * 0.15 + W + 200, 150, 320);
    bg.mid = genCity(r, L.worldW * 0.4 + W + 200, 90, 230);
    bg.barrels = [520, 1450, 2250, 2880];
  } else if (L.theme === 'snow') {
    bg.peaks = []; for (let x = -100; x < L.worldW * 0.06 + W + 300; x += 140 + r() * 160) bg.peaks.push({ x, w: 220 + r() * 200, h: 120 + r() * 110 });
    bg.farPines = []; for (let x = -40; x < L.worldW * 0.2 + W + 100; x += 26 + r() * 30) bg.farPines.push({ x, h: 50 + r() * 40 });
    bg.midPines = []; for (let x = -60; x < L.worldW * 0.45 + W + 120; x += 60 + r() * 70) bg.midPines.push({ x, h: 90 + r() * 60 });
    bg.trees = []; for (let x = 120; x < L.worldW - 120; x += 300 + r() * 260) bg.trees.push({ x, h: 130 + r() * 70 });
    bg.snowmen = [520, 1700, 2560].filter(x => x < L.worldW - 80);
  } else if (L.theme === 'desert') {
    bg.mesas = []; for (let x = -100; x < L.worldW * 0.1 + W + 300; x += 220 + r() * 260) bg.mesas.push({ x, w: 140 + r() * 220, h: 60 + r() * 90 });
    bg.farCacti = []; for (let x = 0; x < L.worldW * 0.35 + W + 100; x += 90 + r() * 140) bg.farCacti.push({ x, h: 30 + r() * 30 });
    bg.poles = []; for (let x = 0; x < L.worldW * 0.6 + W + 400; x += 260) bg.poles.push(x);
    bg.cacti = []; for (let x = 90; x < L.worldW - 90; x += 220 + r() * 260) bg.cacti.push({ x, h: 60 + r() * 50, arms: r() < 0.5 ? 1 : 2 });
    bg.skulls = [700, 1900, 2700];
  } else if (L.theme === 'military') {
    bg.hangars = []; for (let x = -100; x < L.worldW * 0.12 + W + 300; x += 260 + r() * 140) bg.hangars.push({ x, w: 180 + r() * 80 });
    bg.lights = [0.15, 0.5, 0.85];
    bg.bags = []; for (let x = 150; x < L.worldW - 150; x += 340 + r() * 260) bg.bags.push(x);
    bg.signs = [450, 1450, 2450];
  } else if (L.theme === 'carnival') {
    bg.tents = []; for (let x = -80; x < L.worldW * 0.35 + W + 200; x += 300 + r() * 200) bg.tents.push({ x, w: 140 + r() * 80, h: 90 + r() * 50, c: pickR(r, ['#a8322a', '#3a5aa8', '#8a3aa8', '#2a8a5a']) });
    bg.balloons = []; for (let x = 200; x < L.worldW - 200; x += 260 + r() * 220) bg.balloons.push({ x, c: pickR(r, ['#ff5a6e', '#ffd23f', '#5ab0ff', '#7CFC4A', '#c78bff']), h: 60 + r() * 40 });
  } else {
    bg.trees = [];
    for (let tx = -40; tx < L.worldW * 0.35 + W + 100; tx += 110 + r() * 170) bg.trees.push({ x: tx, segs: deadTree(r, 0, 0, -Math.PI / 2 + (r() - 0.5) * 0.2, 55 + r() * 45, 7 + r() * 3, 0) });
    bg.stones = [];
    for (let sx = 50; sx < L.worldW - 50; sx += 55 + r() * 90) bg.stones.push({ x: sx, kind: Math.floor(r() * 4), h: 24 + r() * 22, w: 18 + r() * 10, tilt: (r() - 0.5) * 0.16, moss: r() < 0.4 });
    bg.lanterns = [300, 1150, 2000, 2800];
    bg.clouds = Array.from({ length: 5 }, () => ({ x: r() * (W + 400) - 200, y: 70 + r() * 120, w: 160 + r() * 200, h: 10 + r() * 10 }));
  }
  L._bg = bg;
  return bg;
}

// Sky and far-away scenery (drawn in screen space, scrolling slower than the street).
function drawBackdrop(c, L, camX) {
  const bg = bgData(L);
  if (THEMES[L.theme]) THEMES[L.theme].backdrop(c, L, camX, bg);
  else if (L.theme === 'suburb') {
    const g = c.createLinearGradient(0, 0, 0, GROUND);
    g.addColorStop(0, '#221a44'); g.addColorStop(0.45, '#5e3570'); g.addColorStop(0.78, '#c95c6c'); g.addColorStop(1, '#f39a58');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    drawStars(c, 0.35);
    const sx = 720 - camX * 0.03, sy = 360;
    glow(c, sx, sy, 210, '255,200,120', 0.5);
    circle(c, sx, sy, 56, '#ffcf7a');
    c.fillStyle = 'rgba(255,170,170,0.16)';
    for (const cl of bg.clouds) { const x = ((cl.x - camX * 0.04) % (W + 400) + W + 400) % (W + 400) - 200; rr(c, x, cl.y, cl.w, cl.h, cl.h / 2); c.fill(); }
    ridge(c, camX, 0.08, 400, 16, 0.006, '#4a2a5c', 1);
    ridge(c, camX, 0.2, 428, 9, 0.035, '#37203f', 4);
    for (const h of bg.houses) drawHouse(c, h.x - camX * 0.5, h);
  } else if (L.theme === 'city') {
    const g = c.createLinearGradient(0, 0, 0, GROUND);
    g.addColorStop(0, '#0c0820'); g.addColorStop(0.6, '#24163f'); g.addColorStop(1, '#4a2450');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    drawStars(c, 0.9);
    const mx = 760 - camX * 0.02, my = 92;
    glow(c, mx, my, 120, '240,230,200', 0.22);
    circle(c, mx, my, 32, '#f3edd6'); circle(c, mx - 9, my - 6, 6, '#e0d8bd'); circle(c, mx + 8, my + 9, 4, '#e0d8bd');
    drawCityLayer(c, bg.far, camX * 0.15, '#1d1636', ['rgba(150,130,210,0.35)', 'rgba(255,220,140,0.45)'], 5, 7);
    const hz = c.createLinearGradient(0, GROUND - 160, 0, GROUND); hz.addColorStop(0, 'rgba(120,60,120,0)'); hz.addColorStop(1, 'rgba(120,60,120,0.3)');
    c.fillStyle = hz; c.fillRect(0, GROUND - 160, W, 160);
    drawCityLayer(c, bg.mid, camX * 0.4, '#271d43', ['#e8c46a', '#fff0b8'], 7, 10);
  } else if (L.theme === 'snow') {
    const g = c.createLinearGradient(0, 0, 0, GROUND);
    g.addColorStop(0, '#081429'); g.addColorStop(0.55, '#16325a'); g.addColorStop(1, '#4a6f96');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    drawStars(c, 0.8);
    drawAurora(c, camX);
    const mx = 200 - camX * 0.02; glow(c, mx, 90, 110, '220,235,255', 0.22); circle(c, mx, 90, 30, '#eef4ff');
    for (const pk of bg.peaks) {   // snowy mountains
      const x = pk.x - camX * 0.06; if (x > W + 300 || x + pk.w < -300) continue;
      const top = GROUND - 90 - pk.h;
      poly(c, [x, GROUND - 60, x + pk.w / 2, top, x + pk.w, GROUND - 60], '#2a4468');
      poly(c, [x + pk.w * 0.32, top + pk.h * 0.36, x + pk.w / 2, top, x + pk.w * 0.68, top + pk.h * 0.36, x + pk.w * 0.58, top + pk.h * 0.3, x + pk.w / 2, top + pk.h * 0.4, x + pk.w * 0.42, top + pk.h * 0.3], '#dce8f5');
    }
    c.fillStyle = '#b8cadc'; c.fillRect(0, GROUND - 62, W, 70);
    for (const t of bg.farPines) { const x = t.x - camX * 0.2; if (x > -40 && x < W + 40) drawPine(c, x, GROUND - 40, t.h, '#1c3554', null); }
    for (const t of bg.midPines) { const x = t.x - camX * 0.45; if (x > -80 && x < W + 80) drawPine(c, x, GROUND - 14, t.h, '#132842', '#cfe0ee'); }
  } else if (L.theme === 'desert') {
    const g = c.createLinearGradient(0, 0, 0, GROUND);
    g.addColorStop(0, '#2a1640'); g.addColorStop(0.55, '#b4482e'); g.addColorStop(1, '#f6b25a');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    const sx = 480 - camX * 0.03, sy = 330;
    glow(c, sx, sy, 260, '255,200,110', 0.45); circle(c, sx, sy, 78, '#ffd87a');
    c.fillStyle = 'rgba(190,80,60,0.35)'; for (let i = 0; i < 4; i++) c.fillRect(sx - 80, sy + 8 + i * 14, 160, 3 + i);   // stripes across the sun
    for (const m of bg.mesas) {   // flat-topped desert rocks
      const x = m.x - camX * 0.1; if (x > W + 300 || x + m.w < -300) continue;
      const top = GROUND - 50 - m.h;
      poly(c, [x, GROUND - 40, x + 18, top, x + m.w - 18, top, x + m.w, GROUND - 40], '#7a3428');
      c.fillStyle = '#9a4a32'; c.fillRect(x + 18, top, m.w - 36, 5);
      c.fillStyle = '#6a2c22'; c.fillRect(x + 8, top + m.h * 0.5, m.w - 16, 3);
    }
    ridge(c, camX, 0.18, 432, 6, 0.02, '#5a2a2a', 2);
    for (const k of bg.farCacti) { const x = k.x - camX * 0.35; if (x > -30 && x < W + 30) drawCactus(c, x, GROUND - 20, k.h, '#3a1c1c', 1); }
    const off = camX * 0.6; let prev = null;   // telephone poles and wires
    c.strokeStyle = '#2a1414'; c.lineWidth = 1;
    for (const px of bg.poles) {
      const x = px - off; if (x < -300 || x > W + 300) { prev = null; continue; }
      c.fillStyle = '#2a1414'; c.fillRect(x - 2, GROUND - 150, 4, 140); c.fillRect(x - 14, GROUND - 146, 28, 3);
      if (prev !== null) { c.beginPath(); c.moveTo(prev, GROUND - 144); c.quadraticCurveTo((prev + x) / 2, GROUND - 120, x, GROUND - 144); c.stroke(); }
      prev = x;
    }
  } else if (L.theme === 'military') {
    const g = c.createLinearGradient(0, 0, 0, GROUND);
    g.addColorStop(0, '#05080d'); g.addColorStop(0.6, '#101c22'); g.addColorStop(1, '#2a3a3a');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    drawStars(c, 0.7);
    for (const hg of bg.hangars) {
      const x = hg.x - camX * 0.12; if (x > W + 260 || x + hg.w < -260) continue;
      c.fillStyle = '#141e24'; c.beginPath(); c.moveTo(x, GROUND - 30); c.quadraticCurveTo(x + hg.w / 2, GROUND - 30 - hg.w * 0.7, x + hg.w, GROUND - 30); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,220,140,0.25)'; c.fillRect(x + hg.w * 0.4, GROUND - 52, hg.w * 0.2, 22);
    }
    c.globalCompositeOperation = 'lighter';   // sweeping searchlights
    bg.lights.forEach((f, i) => {
      const bx = f * W, by = GROUND - 60, a = -Math.PI / 2 + Math.sin(G.t * 0.45 + i * 2.1) * 0.6, len = 560;
      c.fillStyle = 'rgba(210,235,255,0.08)';
      poly(c, [bx, by, bx + Math.cos(a - 0.07) * len, by + Math.sin(a - 0.07) * len, bx + Math.cos(a + 0.07) * len, by + Math.sin(a + 0.07) * len]);
      glow(c, bx, by, 26, '230,245,255', 0.5);
    });
    c.globalCompositeOperation = 'source-over';
    ridge(c, camX, 0.2, 440, 4, 0.02, '#0e171b', 4);
    const off = camX * 0.5;   // chain-link fence with barbed wire
    c.fillStyle = '#1c2a30';
    for (let x = -(off % 60); x < W + 60; x += 60) c.fillRect(x, GROUND - 92, 3, 80);
    c.strokeStyle = 'rgba(40,60,66,0.8)'; c.lineWidth = 1; c.beginPath();
    for (let x = -(off % 12) - 12; x < W; x += 12) { c.moveTo(x, GROUND - 88); c.lineTo(x + 12, GROUND - 16); c.moveTo(x + 12, GROUND - 88); c.lineTo(x, GROUND - 16); }
    c.stroke();
    c.strokeStyle = '#2a3a40'; c.lineWidth = 1.5; c.beginPath();
    for (let x = -(off % 16) - 16, k = 0; x < W + 16; x += 8, k++) { if (k === 0) c.moveTo(x, GROUND - 96); else c.lineTo(x, GROUND - 96 + (k % 2) * 6); }
    c.stroke();
  } else if (L.theme === 'carnival') {
    const g = c.createLinearGradient(0, 0, 0, GROUND);
    g.addColorStop(0, '#12061f'); g.addColorStop(0.55, '#3a1240'); g.addColorStop(1, '#7a2a55');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    drawStars(c, 0.7);
    const mx = 820 - camX * 0.02; circle(c, mx, 80, 26, '#f6ecd0'); c.fillStyle = g; c.beginPath(); c.arc(mx + 11, 73, 24, 0, Math.PI * 2); c.fill();   // crescent moon
    drawFerrisWheel(c, 640 - camX * 0.15, GROUND - 220, 150);
    ridge(c, camX, 0.2, 440, 5, 0.02, '#1e0a22', 6);
    for (const t of bg.tents) { const x = t.x - camX * 0.35; if (x < W + 200 && x + t.w > -200) drawTent(c, x, GROUND - 16, t.w, t.h, t.c); }
  } else {
    const g = c.createLinearGradient(0, 0, 0, GROUND);
    g.addColorStop(0, '#06111a'); g.addColorStop(0.6, '#0f2a33'); g.addColorStop(1, '#24473f');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    drawStars(c, 0.6);
    const mx = 240 - camX * 0.02, my = 120;
    glow(c, mx, my, 190, '190,255,200', 0.22);
    circle(c, mx, my, 58, '#eef5dc'); circle(c, mx - 18, my - 10, 10, '#d9e3c4'); circle(c, mx + 16, my + 14, 8, '#d9e3c4'); circle(c, mx + 20, my - 22, 5, '#d9e3c4');
    c.fillStyle = 'rgba(10,25,30,0.75)';
    for (const cl of bg.clouds) { const x = ((cl.x - camX * 0.05 - G.t * 6) % (W + 400) + W + 400) % (W + 400) - 200; rr(c, x, cl.y, cl.w, cl.h, cl.h / 2); c.fill(); }
    ridge(c, camX, 0.08, 385, 20, 0.007, '#0e2128', 2);
    drawChurch(c, 640 - camX * 0.12, GROUND - 40);
    ridge(c, camX, 0.2, 432, 8, 0.02, '#0b191d', 5);
    c.strokeStyle = '#0b1a1d'; c.lineCap = 'round';
    for (const t of bg.trees) {
      const x = t.x - camX * 0.35; if (x < -120 || x > W + 120) continue;
      for (const [x1, y1, x2, y2, wd] of t.segs) { c.lineWidth = wd; c.beginPath(); c.moveTo(x + x1, GROUND - 6 + y1); c.lineTo(x + x2, GROUND - 6 + y2); c.stroke(); }
    }
  }
}
function drawCityLayer(c, layer, off, color, win, ww, wh) {
  for (const b of layer) {
    const x = b.x - off; if (x > W + 10 || x + b.w < -10) continue;
    const top = GROUND - b.h;
    c.fillStyle = color; c.fillRect(x, top, b.w, b.h + 2);
    if (b.ant) c.fillRect(x + b.w * 0.6, top - 28, 2, 28);
    if (b.tank) { c.fillRect(x + b.w * 0.2, top - 18, 22, 14); c.fillRect(x + b.w * 0.2 + 3, top - 4, 3, 4); c.fillRect(x + b.w * 0.2 + 16, top - 4, 3, 4); }
    for (let i = 0; i < b.lit.length; i++) {
      const l = b.lit[i]; if (!l) continue;
      c.fillStyle = win[l - 1];
      c.fillRect(x + 8 + (i % b.cols) * 14, top + 12 + ((i / b.cols) | 0) * 18, ww, wh);
    }
    c.fillStyle = color;
  }
}
function drawHouse(c, x, h) {
  if (x > W + 80 || x + h.w < -80) return;
  const by = GROUND - 12, top = by - h.h;
  if (h.tree) {
    const tx = h.treeLeft ? x - 26 : x + h.w + 26;
    c.fillStyle = '#3a2a2a'; c.fillRect(tx - 4, by - 62, 8, 62);
    for (const [dx, dy, r] of [[0, -84, 32], [-20, -66, 22], [20, -68, 24]]) circle(c, tx + dx, by + dy, r, '#2c3a33');
  }
  c.fillStyle = h.body; c.fillRect(x, top, h.w, h.h);
  if (h.chim) { c.fillStyle = h.roof; c.fillRect(x + h.w * 0.7, top - h.roofH * 0.8, 14, h.roofH * 0.6); }
  poly(c, [x - 12, top + 2, x + h.w / 2, top - h.roofH, x + h.w + 12, top + 2], h.roof);
  const trim = shade(h.body, -0.35), ww = 26, wh = 24, wy = top + 16;
  [x + 18, x + h.w - 18 - ww].forEach((wx, i) => {
    const lit = h.lit[i];
    fillRR(c, wx - 3, wy - 3, ww + 6, wh + 6, 2, trim);
    c.fillStyle = lit ? '#ffd77e' : '#2a2340'; c.fillRect(wx, wy, ww, wh);
    c.fillStyle = trim; c.fillRect(wx + ww / 2 - 1, wy, 2, wh); c.fillRect(wx, wy + wh / 2 - 1, ww, 2);
  });
  if (h.attic) circle(c, x + h.w / 2, top - h.roofH * 0.38, 7, h.lit[2] ? '#ffd77e' : '#2a2340');
  c.fillStyle = shade(h.body, -0.45); c.fillRect(x + h.w / 2 - 11, by - 38, 22, 38);
  circle(c, x + h.w / 2 + 6, by - 19, 1.6, '#e0c060');
}
function drawChurch(c, x, base) {
  if (x < -260 || x > W + 260) return;
  const col = '#0c1d22';
  c.fillStyle = col; c.fillRect(x, base - 90, 130, 90);
  poly(c, [x - 8, base - 88, x + 65, base - 140, x + 138, base - 88], col);
  c.fillRect(x + 130, base - 170, 36, 170);
  poly(c, [x + 126, base - 168, x + 148, base - 230, x + 170, base - 168], col);
  c.fillRect(x + 146, base - 252, 4, 24); c.fillRect(x + 139, base - 244, 18, 4);
  c.fillStyle = 'rgba(210,255,150,0.55)';
  rr(c, x + 140, base - 140, 16, 26, 8); c.fill();
  rr(c, x + 30, base - 70, 14, 22, 7); c.fill(); rr(c, x + 86, base - 70, 14, 22, 7); c.fill();
}

// ---- Scenery pieces for the newer maps --------------------------------------
function drawAurora(c, camX) {   // northern lights
  c.globalCompositeOperation = 'lighter';
  for (let band = 0; band < 3; band++) {
    c.fillStyle = band === 1 ? 'rgba(160,90,255,0.07)' : 'rgba(80,255,170,0.08)';
    const wave = sx => 70 + band * 34 + Math.sin(sx * 0.008 + G.t * 0.3 + band * 2 - camX * 0.0006) * 26 + Math.sin(sx * 0.021 + G.t * 0.5) * 10;
    c.beginPath(); c.moveTo(0, wave(0));
    for (let sx = 16; sx <= W; sx += 16) c.lineTo(sx, wave(sx));
    for (let sx = W; sx >= 0; sx -= 16) c.lineTo(sx, wave(sx) + 60);
    c.closePath(); c.fill();
  }
  c.globalCompositeOperation = 'source-over';
}
function drawPine(c, x, base, h, col, snow) {
  c.fillStyle = col; c.fillRect(x - 3, base - h * 0.18, 6, h * 0.18);
  for (let i = 0; i < 3; i++) {
    const ty = base - h * 0.15 - i * h * 0.27, hw = h * (0.32 - i * 0.07);
    poly(c, [x - hw, ty, x + hw, ty, x, ty - h * 0.42], col);
    if (snow) poly(c, [x - hw * 0.55, ty - h * 0.18, x, ty - h * 0.42, x + hw * 0.55, ty - h * 0.18, x, ty - h * 0.25], snow);
  }
}
function drawSnowman(c, x) {
  circle(c, x, GROUND - 14, 16, '#f4f8fc'); circle(c, x, GROUND - 38, 12, '#f4f8fc'); circle(c, x, GROUND - 56, 9, '#f4f8fc');
  c.fillStyle = '#1a1a1a'; circle(c, x - 3, GROUND - 58, 1.4); circle(c, x + 3, GROUND - 58, 1.4); circle(c, x, GROUND - 40, 1.4); circle(c, x, GROUND - 34, 1.4);
  poly(c, [x, GROUND - 56, x + 9, GROUND - 54, x, GROUND - 53], '#f28a2a');
  c.fillRect(x - 8, GROUND - 66, 16, 2); c.fillRect(x - 5, GROUND - 76, 10, 10);
  c.strokeStyle = '#5a3a22'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 11, GROUND - 40); c.lineTo(x - 24, GROUND - 50); c.moveTo(x + 11, GROUND - 40); c.lineTo(x + 24, GROUND - 48); c.stroke();
  c.fillStyle = '#d6452f'; c.fillRect(x - 9, GROUND - 49, 18, 3);
}
function drawCactus(c, x, base, h, col, arms) {
  const w = Math.max(6, h * 0.16);
  fillRR(c, x - w / 2, base - h, w, h, w / 2, col);
  if (arms >= 1) { fillRR(c, x + w / 2 - 1, base - h * 0.55, w * 0.9, w * 0.7, 3, col); fillRR(c, x + w * 1.1, base - h * 0.85, w * 0.7, h * 0.36, w * 0.35, col); }
  if (arms >= 2) { fillRR(c, x - w * 1.4, base - h * 0.45, w * 0.95, w * 0.7, 3, col); fillRR(c, x - w * 1.5, base - h * 0.7, w * 0.7, h * 0.3, w * 0.35, col); }
}
function drawSkull(c, x) {
  fillRR(c, x - 7, GROUND - 12, 14, 10, 4, '#ece4d4');
  c.strokeStyle = '#ece4d4'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x - 6, GROUND - 10); c.quadraticCurveTo(x - 16, GROUND - 14, x - 14, GROUND - 22); c.moveTo(x + 6, GROUND - 10); c.quadraticCurveTo(x + 16, GROUND - 14, x + 14, GROUND - 22); c.stroke();
  c.fillStyle = '#3a2a2a'; circle(c, x - 3, GROUND - 8, 1.6); circle(c, x + 3, GROUND - 8, 1.6);
}
function drawSandbags(c, x) {
  for (let row = 0; row < 3; row++) for (let i = 0; i < 4 - row; i++) {
    const bx = x + i * 22 + row * 11, by = GROUND - 12 - row * 11;
    fillRR(c, bx, by, 22, 12, 6, row % 2 ? '#7a6a4a' : '#8a7a5a');
  }
}
function drawWarnSign(c, x) {
  c.fillStyle = '#3a3a3a'; c.fillRect(x - 2, GROUND - 60, 4, 60);
  fillRR(c, x - 34, GROUND - 82, 68, 34, 3, '#e8c22e');
  c.strokeStyle = '#1a1a1a'; c.lineWidth = 2; c.strokeRect(x - 31, GROUND - 79, 62, 28);
  text(c, 'DANGER', x, GROUND - 71, { size: 9, color: '#1a1a1a' });
  text(c, 'ZOMBIES', x, GROUND - 59, { size: 8, color: '#a8322a' });
}
function drawFerrisWheel(c, fx, fy, R) {
  if (fx < -R - 100 || fx > W + R + 100) return;
  const rot = G.t * 0.12;
  c.strokeStyle = '#2a1030'; c.lineWidth = 6;
  c.beginPath(); c.moveTo(fx - 90, GROUND - 30); c.lineTo(fx, fy); c.lineTo(fx + 90, GROUND - 30); c.stroke();
  c.lineWidth = 5; c.beginPath(); c.arc(fx, fy, R, 0, Math.PI * 2); c.stroke();
  c.lineWidth = 2; c.beginPath();
  for (let i = 0; i < 12; i++) { const a = rot + i * Math.PI / 6; c.moveTo(fx, fy); c.lineTo(fx + Math.cos(a) * R, fy + Math.sin(a) * R); }
  c.stroke();
  for (let i = 0; i < 12; i++) { const a = rot + i * Math.PI / 6; fillRR(c, fx + Math.cos(a) * R - 9, fy + Math.sin(a) * R + 2, 18, 14, 4, '#3a1438'); }
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 36; i++) {
    if ((Math.floor(G.t * 4) + i) % 3 === 0) continue;
    const a = rot + i * Math.PI / 18;
    circle(c, fx + Math.cos(a) * R, fy + Math.sin(a) * R, 2.4, ['#ffd23f', '#ff5a6e', '#5ab0ff'][i % 3]);
  }
  c.globalCompositeOperation = 'source-over';
}
function drawTent(c, x, base, w, h, col) {
  const top = base - h * 0.5, n = 6, sw = w / n, dark = shade(col, -0.45), cream = '#6e6456';
  for (let i = 0; i < n; i++) {
    c.fillStyle = i % 2 ? cream : dark; c.fillRect(x + i * sw, top, sw + 0.5, h * 0.5);
    poly(c, [x + i * sw, top, x + w / 2, base - h, x + (i + 1) * sw, top], i % 2 ? cream : dark);
  }
  poly(c, [x + w / 2 - 12, base, x + w / 2, top + 6, x + w / 2 + 12, base], '#1a0a1a');
  c.fillStyle = '#2a1030'; c.fillRect(x + w / 2 - 1, base - h - 16, 2, 16);
  poly(c, [x + w / 2 + 1, base - h - 16, x + w / 2 + 12, base - h - 12, x + w / 2 + 1, base - h - 8], '#c9a227');
}
function drawBalloon(c, x, y, col, baseY) {
  c.strokeStyle = 'rgba(230,220,240,0.6)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y + 13); c.quadraticCurveTo(x + 4, (y + baseY) / 2, x, baseY); c.stroke();
  c.fillStyle = col; c.beginPath(); c.ellipse(x, y, 10, 13, 0, 0, Math.PI * 2); c.fill();
  poly(c, [x - 3, y + 15, x, y + 12, x + 3, y + 15], col);
  circle(c, x - 3, y - 5, 2.5, 'rgba(255,255,255,0.55)');
}

// Street-level scenery and the ground (drawn in world space, behind everybody).
function drawWorldBack(c, L, camX) {
  const bg = bgData(L), x0 = camX - 30, x1 = camX + W + 30, vis = (x, pad = 80) => x > x0 - pad && x < x1 + pad;
  if (THEMES[L.theme]) THEMES[L.theme].back(c, L, camX, bg, x0, x1, vis);
  else if (L.theme === 'suburb') {
    c.fillStyle = '#2f5a36'; c.fillRect(x0, GROUND - 18, x1 - x0, 18);
    c.fillStyle = '#3c6e42';
    for (let gx = Math.floor(x0 / 9) * 9; gx < x1; gx += 9) { const h = 3 + hash(gx) * 5; c.fillRect(gx, GROUND - 18 - h, 2, h); }
    for (const f of bg.fences) if (vis(f.x, f.w)) drawFence(c, f.x, f.w);
    for (const m of bg.mail) if (vis(m)) drawMailbox(c, m);
    for (let i = 0, x = 400; x < L.worldW; i++, x += 620) if (vis(x, 160)) drawLamp(c, x, i, '255,214,140');
    drawStreet(c, x0, x1, '#6e6480', '#8a7f9c', '#4a4058', '#2b2636', '#b8952f');
  } else if (L.theme === 'city') {
    for (let i = 0, x = 210; x < L.worldW; i++, x += 420) if (vis(x, 160)) drawLamp(c, x, i, '255,214,140');
    for (const b of bg.barrels) if (vis(b)) drawFireBarrel(c, b);
    drawStreet(c, x0, x1, '#3b3452', '#4d4566', '#2a2440', '#1d1a2b', '#6e5d2a');
  } else if (L.theme === 'snow') {
    for (const t of bg.trees) if (vis(t.x, 100)) drawPine(c, t.x, GROUND - 2, t.h, '#1a3a2e', '#eef5fb');
    for (const s of bg.snowmen) if (vis(s)) drawSnowman(c, s);
    for (let x = 900; x < L.worldW; x += 900) if (vis(x, 140)) drawLantern(c, x, '255,200,120');
    c.fillStyle = '#e8f0f8'; c.fillRect(x0, GROUND, x1 - x0, H - GROUND);
    c.fillStyle = '#f6fafd'; for (let gx = Math.floor(x0 / 26) * 26; gx < x1; gx += 26) circle(c, gx, GROUND + 3, 8 + hash(gx) * 6);
    c.fillStyle = '#c4d4e4'; c.fillRect(x0, GROUND + 14, x1 - x0, 2);
    c.fillStyle = '#cfdcea'; for (let fx = Math.floor(x0 / 34) * 34; fx < x1; fx += 34) { c.beginPath(); c.ellipse(fx + hash(fx) * 10, GROUND + 26 + hash(fx * 2) * 30, 4, 2, 0, 0, Math.PI * 2); c.fill(); }
  } else if (L.theme === 'desert') {
    c.fillStyle = '#c98a4a'; c.fillRect(x0, GROUND - 14, x1 - x0, 14);
    for (const k of bg.cacti) if (vis(k.x)) drawCactus(c, k.x, GROUND - 4, k.h, '#3f7a3a', k.arms);
    for (const s of bg.skulls) if (vis(s)) drawSkull(c, s);
    for (let i = 0; i < 3; i++) {   // tumbleweeds rolling by
      const tx = ((G.t * (60 + i * 25) + i * 900) % (L.worldW + 200)) - 100;
      if (vis(tx)) drawTumbleweed(c, tx, GROUND - 12 - Math.abs(Math.sin(G.t * 4 + i)) * 12, G.t * 5 + i);
    }
    c.fillStyle = '#d9a35f'; c.fillRect(x0, GROUND, x1 - x0, 10);
    c.fillStyle = '#e8b870'; c.fillRect(x0, GROUND, x1 - x0, 2);
    c.fillStyle = '#3a3438'; c.fillRect(x0, GROUND + 10, x1 - x0, H - GROUND);
    c.fillStyle = '#a8874a'; for (let dx = Math.floor(x0 / 90) * 90; dx < x1; dx += 90) if (hash(dx) > 0.25) c.fillRect(dx, GROUND + 40, 46, 4);
    c.strokeStyle = '#2a2428'; c.lineWidth = 1.2; c.beginPath();
    for (let cx = Math.floor(x0 / 70) * 70; cx < x1; cx += 70) { const k = hash(cx * 1.7); if (k < 0.5) continue; c.moveTo(cx, GROUND + 18); c.lineTo(cx + 10 * k, GROUND + 30); c.lineTo(cx + 4, GROUND + 44); }
    c.stroke();
  } else if (L.theme === 'military') {
    for (const b of bg.bags) if (vis(b)) drawSandbags(c, b);
    for (const s of bg.signs) if (vis(s)) drawWarnSign(c, s);
    for (let i = 0, x = 300; x < L.worldW; i++, x += 700) if (vis(x, 160)) drawLamp(c, x, i, '230,240,255');
    c.fillStyle = '#4a4e4a'; c.fillRect(x0, GROUND, x1 - x0, 14);
    c.fillStyle = '#5a5e5a'; c.fillRect(x0, GROUND, x1 - x0, 2);
    c.fillStyle = '#3a3e3a'; for (let jx = Math.floor(x0 / 64) * 64; jx < x1; jx += 64) c.fillRect(jx, GROUND + 2, 1.5, 12);
    for (let hx = Math.floor(x0 / 24) * 24; hx < x1; hx += 24) { c.fillStyle = (hx / 24) % 2 ? '#c9a227' : '#1a1a1a'; c.fillRect(hx, GROUND + 14, 24, 4); }
    c.fillStyle = '#2a2e2c'; c.fillRect(x0, GROUND + 18, x1 - x0, H - GROUND);
  } else if (L.theme === 'carnival') {
    for (let px = 150; px < L.worldW; px += 320) {   // poles with strings of blinking lights
      if (!vis(px, 340)) continue;
      for (let s = 0; s < 120; s += 12) { c.fillStyle = (s / 12) % 2 ? '#e8e0d0' : '#c8322a'; c.fillRect(px - 3, GROUND - 120 + s, 6, 12); }
      circle(c, px, GROUND - 122, 5, '#ffd23f');
      if (px + 320 < L.worldW) {
        c.strokeStyle = '#2a1030'; c.lineWidth = 1; c.beginPath(); c.moveTo(px, GROUND - 118); c.quadraticCurveTo(px + 160, GROUND - 70, px + 320, GROUND - 118); c.stroke();
        c.globalCompositeOperation = 'lighter';
        for (let k = 1; k < 16; k++) {
          const tt = k / 16, bx = px + 320 * tt, by = (1 - tt) * (1 - tt) * (GROUND - 118) + 2 * (1 - tt) * tt * (GROUND - 70) + tt * tt * (GROUND - 118);
          if ((Math.floor(G.t * 3) + k) % 4 === 0) continue;
          circle(c, bx, by + 3, 2.6, ['#ffd23f', '#ff5a6e', '#5ab0ff', '#7CFC4A'][k % 4]);
        }
        c.globalCompositeOperation = 'source-over';
      }
    }
    for (const b of bg.balloons) if (vis(b.x)) drawBalloon(c, b.x, GROUND - b.h - Math.sin(G.t * 2 + b.x) * 4, b.c, GROUND - 4);
    c.fillStyle = '#6a4a32'; c.fillRect(x0, GROUND, x1 - x0, 14);
    c.fillStyle = '#4a3222'; for (let bx = Math.floor(x0 / 24) * 24; bx < x1; bx += 24) c.fillRect(bx, GROUND, 1.5, 14);
    c.fillStyle = '#7a5a40'; c.fillRect(x0, GROUND, x1 - x0, 2);
    c.fillStyle = '#2a1e1a'; c.fillRect(x0, GROUND + 14, x1 - x0, H - GROUND);
    c.fillStyle = '#f2d27a'; for (let px = Math.floor(x0 / 18) * 18; px < x1; px += 18) if (hash(px) > 0.8) circle(c, px + hash(px * 3) * 10, GROUND + 22 + hash(px * 5) * 40, 1.8);   // spilled popcorn
  } else {
    c.fillStyle = '#16262a';
    for (let fx = Math.floor(x0 / 14) * 14; fx < x1; fx += 14) {
      if (hash(Math.floor(fx / 280)) < 0.35) continue;
      c.fillRect(fx, GROUND - 62, 2.5, 56); poly(c, [fx - 1.5, GROUND - 62, fx + 1.25, GROUND - 70, fx + 4, GROUND - 62]);
      if (Math.floor(fx / 14) % 1 === 0) { c.fillRect(fx, GROUND - 54, 14, 2); c.fillRect(fx, GROUND - 20, 14, 2); }
    }
    for (const s of bg.stones) if (vis(s.x)) drawTombstone(c, s);
    for (const l of bg.lanterns) if (vis(l, 140)) drawLantern(c, l);
    c.fillStyle = '#221f1a'; c.fillRect(x0, GROUND, x1 - x0, H - GROUND);
    c.fillStyle = '#2b4a2e'; c.fillRect(x0, GROUND, x1 - x0, 5);
    c.fillStyle = '#335a36';
    for (let gx = Math.floor(x0 / 7) * 7; gx < x1; gx += 7) { const h = 2 + hash(gx * 3) * 6; c.fillRect(gx, GROUND - h + 1, 2, h); }
    c.fillStyle = '#2e2a24';
    for (let sx = Math.floor(x0 / 60) * 60; sx < x1; sx += 60) { const k = hash(sx); if (k < 0.5) { rr(c, sx + k * 30, GROUND + 18 + k * 30, 12 + k * 10, 6, 3); c.fill(); } }
  }
  drawBarricade(c, 0, 1); drawBarricade(c, L.worldW, -1);
}
function drawStreet(c, x0, x1, walk, walkTop, curb, road, dash) {
  c.fillStyle = walk; c.fillRect(x0, GROUND, x1 - x0, 14);
  c.fillStyle = walkTop; c.fillRect(x0, GROUND, x1 - x0, 2);
  c.fillStyle = curb;
  for (let tx = Math.floor(x0 / 48) * 48; tx < x1; tx += 48) c.fillRect(tx, GROUND + 2, 1.5, 12);
  c.fillRect(x0, GROUND + 14, x1 - x0, 4);
  c.fillStyle = road; c.fillRect(x0, GROUND + 18, x1 - x0, H - GROUND);
  c.fillStyle = dash;
  for (let dx = Math.floor(x0 / 90) * 90; dx < x1; dx += 90) c.fillRect(dx, GROUND + 44, 46, 4);
}
function drawLamp(c, x, i, rgb) {
  const lx = x + 24, ly = GROUND - 176;
  const broken = i % 3 === 2, on = !broken || Math.sin(G.t * 17 + i) * Math.sin(G.t * 5.3 + i * 3) > -0.55;
  if (on) {
    glow(c, lx, ly + 4, 150, rgb, 0.26);
    c.fillStyle = `rgba(${rgb},0.06)`;
    poly(c, [lx - 6, ly + 6, lx + 6, ly + 6, lx + 70, GROUND, lx - 70, GROUND]);
  }
  c.fillStyle = '#2b2740'; c.fillRect(x - 3, GROUND - 180, 6, 180); c.fillRect(x - 6, GROUND - 8, 12, 8); c.fillRect(x, GROUND - 182, 26, 4);
  fillRR(c, lx - 9, ly - 4, 18, 7, 3, '#3a3552');
  c.fillStyle = on ? '#ffe7a8' : '#6a6050'; c.fillRect(lx - 6, ly + 3, 12, 3);
}
function drawFence(c, x, w) {
  c.fillStyle = '#cbbfd6';
  for (let px = x; px < x + w; px += 13) poly(c, [px, GROUND - 4, px, GROUND - 28, px + 4, GROUND - 33, px + 8, GROUND - 28, px + 8, GROUND - 4]);
  c.fillRect(x, GROUND - 24, w, 3); c.fillRect(x, GROUND - 12, w, 3);
}
function drawMailbox(c, x) {
  c.fillStyle = '#5a4a3a'; c.fillRect(x - 2, GROUND - 30, 4, 30);
  fillRR(c, x - 10, GROUND - 42, 20, 13, 5, '#3a5a8a');
  c.fillStyle = '#e8413a'; c.fillRect(x + 7, GROUND - 48, 2, 10); c.fillRect(x + 7, GROUND - 48, 6, 4);
}
function drawFireBarrel(c, x) {
  glow(c, x, GROUND - 40, 110, '255,140,60', 0.28);
  fillRR(c, x - 12, GROUND - 32, 24, 32, 3, '#5a4a3a');
  c.fillStyle = '#463a2e'; c.fillRect(x - 12, GROUND - 24, 24, 3); c.fillRect(x - 12, GROUND - 10, 24, 3);
  c.fillStyle = '#2a2018'; c.fillRect(x - 10, GROUND - 33, 20, 3);
}
function drawTombstone(c, s) {
  c.save(); c.translate(s.x, GROUND); c.rotate(s.tilt);
  const col = '#4e555b', dark = '#3a4045';
  if (s.kind === 0) { fillRR(c, -s.w / 2, -s.h, s.w, s.h + 2, s.w / 2, col); }
  else if (s.kind === 1) { c.fillStyle = col; c.fillRect(-3, -s.h - 6, 6, s.h + 6); c.fillRect(-11, -s.h + 4, 22, 6); }
  else if (s.kind === 2) { poly(c, [-s.w / 3, 0, -s.w / 4, -s.h - 10, 0, -s.h - 18, s.w / 4, -s.h - 10, s.w / 3, 0], col); }
  else { fillRR(c, -s.w / 2 - 2, -s.h * 0.75, s.w + 4, s.h * 0.75 + 2, 3, col); }
  c.fillStyle = dark; c.fillRect(-4, -s.h * 0.6, 8, 2); c.fillRect(-5, -s.h * 0.45, 10, 2);
  if (s.moss) { c.fillStyle = '#3e5a3a'; c.fillRect(-s.w / 2, -4, s.w * 0.7, 4); }
  c.restore();
}
function drawLantern(c, x, rgb = '170,255,140') {
  const flick = 0.8 + Math.sin(G.t * 9 + x) * 0.1 + Math.sin(G.t * 23 + x) * 0.06;
  glow(c, x, GROUND - 74, 120, rgb, 0.25 * flick);
  c.fillStyle = '#1a2a2a'; c.fillRect(x - 2, GROUND - 66, 4, 66);
  fillRR(c, x - 8, GROUND - 86, 16, 20, 3, '#22363a');
  c.fillStyle = `rgba(${rgb},${0.8 * flick})`; c.fillRect(x - 5, GROUND - 82, 10, 12);
  poly(c, [x - 10, GROUND - 86, x, GROUND - 95, x + 10, GROUND - 86], '#1a2a2a');
}
function drawBarricade(c, x, dir) {
  const bx = dir > 0 ? x : x - 40;
  c.fillStyle = '#4a3828'; c.fillRect(bx + 4, GROUND - 70, 6, 70); c.fillRect(bx + 30, GROUND - 70, 6, 70);
  for (const [y, h] of [[GROUND - 64, 14], [GROUND - 36, 14]]) {
    c.fillStyle = '#e8e2d0'; c.fillRect(bx - 2, y, 44, h);
    c.fillStyle = '#d6452f';
    for (let i = 0; i < 4; i++) poly(c, [bx - 2 + i * 12, y + h, bx + 6 + i * 12, y, bx + 12 + i * 12, y, bx + 4 + i * 12, y + h]);
  }
}

// Fog and haze drawn in front of everything at street level.
function drawWorldFront(c, L, camX) {
  const x0 = camX - 30, w = W + 60;
  const FOG = { graveyard: [120, 220, 150, 0.2], city: [130, 110, 180, 0.08], suburb: [255, 190, 150, 0.06], snow: [210, 230, 255, 0.16], desert: [255, 180, 110, 0.12], military: [140, 170, 170, 0.12], carnival: [210, 90, 200, 0.1] };
  const TH = THEMES[L.theme], [r, g, b, a] = (TH && TH.fog) || FOG[L.theme] || FOG.suburb;
  if (TH && TH.front) TH.front(c, L, camX);
  // Weather is worked out from the clock alone, so it costs nothing to keep and nothing to send over Wi-Fi.
  // d = how close a flake or drop is: close ones are bigger, brighter, faster, and slide by faster as you run.
  const wrapX = (v, span) => camX + (((v % span) + span) % span) - 30;
  if (L.theme === 'snow') {   // falling snow
    const n = IS_TOUCH ? 80 : 130, span = W + 60;
    c.fillStyle = '#fff';
    for (let i = 0; i < n; i++) {
      const d = 0.3 + hash(i + 7) * 0.7, drift = Math.sin(G.t * 0.8 + i) * 18 * d;
      const x = wrapX(hash(i) * span + G.t * (10 + 22 * d) + drift - camX * (0.3 + 0.7 * d), span);
      const y = ((hash(i + 5) * (H + 20) + G.t * (25 + 60 * d)) % (H + 20)) - 10;
      c.globalAlpha = 0.45 + 0.5 * d;
      c.beginPath(); c.arc(x, y, 0.7 + 2.3 * d, 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = 1;
  }
  if (L.theme === 'graveyard') {   // light rain, with little splashes on the ground
    const n = IS_TOUCH ? 60 : 100, span = W + 80;
    c.strokeStyle = '#c4d4ff'; c.lineWidth = 1.2;
    for (let i = 0; i < n; i++) {
      const d = 0.3 + hash(i + 11) * 0.7, sp = 560 + 420 * d, len = 9 + 16 * d;
      const x = wrapX(hash(i) * span - G.t * sp * 0.16 - camX * (0.3 + 0.7 * d), span);
      const y = ((hash(i + 5) * (H + 60) + G.t * sp) % (H + 60)) - 40;
      c.globalAlpha = 0.12 + 0.28 * d;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x - len * 0.16, y + len); c.stroke();
    }
    c.lineWidth = 1;
    for (let i = 0; i < (IS_TOUCH ? 10 : 18); i++) {
      const ph = G.t * 2.2 + hash(i + 40), k = ph - Math.floor(ph);
      const x = camX + hash(i * 13 + Math.floor(ph) * 7.3) * W;
      c.globalAlpha = (1 - k) * 0.35;
      c.beginPath(); c.ellipse(x, GROUND + 3, 2 + 7 * k, 1 + 2 * k, 0, 0, Math.PI * 2); c.stroke();
    }
    c.globalAlpha = 1;
  }
  if (L.theme === 'desert') {   // blowing sand, and now and then a tumbleweed bouncing through
    const n = IS_TOUCH ? 45 : 80, span = W + 60;
    c.fillStyle = '#ffe2b0';
    for (let i = 0; i < n; i++) {
      const d = 0.3 + hash(i + 21) * 0.7;
      const x = wrapX(hash(i) * span + G.t * (120 + 220 * d) - camX * (0.3 + 0.7 * d), span);
      const y = GROUND - 8 - hash(i + 3) * 300 * (1 - d * 0.5) + Math.sin(G.t * 3 + i) * 6;
      c.globalAlpha = 0.25 + 0.4 * d;
      c.fillRect(x, y, 5 + 14 * d, 1.2 + 1.3 * d);
    }
    c.globalAlpha = 1;
    for (let k = 0; k < 2; k++) {
      const loop = L.worldW + 900, x = ((G.t * (150 + k * 40) + k * 1700) % loop) - 300;
      if (x < camX - 60 || x > camX + W + 60) continue;
      drawTumbleweed(c, x, GROUND - 16 - Math.abs(Math.sin(G.t * 4.5 + k * 2)) * 24, G.t * (6 + k), 16 + k * 4);
    }
  }
  const gr = c.createLinearGradient(0, GROUND - 90, 0, GROUND + 20);
  gr.addColorStop(0, `rgba(${r},${g},${b},0)`); gr.addColorStop(1, `rgba(${r},${g},${b},${a})`);
  c.fillStyle = gr; c.fillRect(x0, GROUND - 90, w, 110);
  if (L.theme === 'graveyard') {
    for (let i = 0; i < 7; i++) {
      const fx = camX + (((i * 380 + G.t * 18 * (i % 2 ? 1 : -0.6)) % (W + 600)) + W + 600) % (W + 600) - 300;
      const fy = GROUND - 10 - (i % 3) * 14;
      const fg = c.createRadialGradient(fx, fy, 0, fx, fy, 160);
      fg.addColorStop(0, 'rgba(150,230,170,0.09)'); fg.addColorStop(1, 'rgba(150,230,170,0)');
      c.fillStyle = fg; c.fillRect(fx - 160, fy - 60, 320, 120);
    }
  }
}

function drawTumbleweed(c, x, y, rot, r = 12) {
  c.fillStyle = 'rgba(0,0,0,0.25)';
  c.beginPath(); c.ellipse(x, GROUND + 1, r * 0.9, 3, 0, 0, Math.PI * 2); c.fill();
  c.save(); c.translate(x, y); c.rotate(rot);
  c.strokeStyle = '#8a6a3c'; c.lineWidth = 1.6;
  for (let i = 0; i < 7; i++) { c.beginPath(); c.ellipse(0, 0, r, r * (0.35 + hash(i) * 0.5), i * 0.9, 0, Math.PI * 2); c.stroke(); }
  c.strokeStyle = '#c9a56a'; c.lineWidth = 1;
  for (let i = 0; i < 5; i++) { c.beginPath(); c.ellipse(0, 0, r * 0.75, r * (0.2 + hash(i + 9) * 0.5), i * 1.3 + 0.4, 0, Math.PI * 2); c.stroke(); }
  c.restore();
}

// ---- Platforms (things you can jump on) -----------------------------------
const PLATFORM_ART = {
  car(c, p) {
    const col = p.color || '#8a3b3b', x = p.x, t = p.top, bx = x - 18, bw = p.w + 36, by = t + 20, bot = GROUND - 9;
    fillRR(c, bx, by, bw, bot - by, 7, col);
    poly(c, [x - 4, by + 1, x + 10, t, x + p.w - 8, t, x + p.w + 8, by + 1], col);
    c.fillStyle = '#18202e';
    poly(c, [x + 4, by - 1, x + 14, t + 4, x + p.w / 2 - 3, t + 4, x + p.w / 2 - 3, by - 1]);
    poly(c, [x + p.w / 2 + 3, by - 1, x + p.w / 2 + 3, t + 4, x + p.w - 11, t + 4, x + p.w - 1, by - 1]);
    c.strokeStyle = 'rgba(170,190,230,.35)'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(x + 20, t + 6); c.lineTo(x + 28, by - 4); c.moveTo(x + 22, t + 12); c.lineTo(x + 14, by - 3); c.stroke();
    c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(bx + 2, bot - 8, bw - 4, 8);
    c.fillStyle = 'rgba(255,255,255,.14)'; c.fillRect(x + 10, t, p.w - 18, 2);
    c.fillStyle = '#5a4a2a'; c.fillRect(bx + bw - 5, by + 4, 5, 5); c.fillStyle = '#6a2020'; c.fillRect(bx, by + 4, 4, 5);
    for (const wx of [bx + 20, bx + bw - 20]) { circle(c, wx, GROUND - 9, 10, '#121216'); circle(c, wx, GROUND - 9, 4.5, '#6a6a74'); }
  },
  van(c, p) {
    const x = p.x - 6, w = p.w + 12, t = p.top, col = p.color || '#d6d0c2';
    fillRR(c, x, t, w, GROUND - 9 - t, 8, col);
    c.fillStyle = '#18202e';
    poly(c, [x + w - 28, t + 6, x + w - 8, t + 6, x + w - 3, t + 30, x + w - 28, t + 30]);
    rr(c, x + 10, t + 8, 34, 18, 3); c.fill(); rr(c, x + 50, t + 8, 34, 18, 3); c.fill();
    c.fillStyle = '#e0533d'; c.fillRect(x, t + 34, w, 5);
    text(c, 'PIZZA', x + w * 0.42, t + 48, { size: 10, color: '#b83e2c' });
    c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(x, GROUND - 24, w, 15);
    for (const wx of [x + 22, x + w - 24]) { circle(c, wx, GROUND - 9, 11, '#121216'); circle(c, wx, GROUND - 9, 5, '#6a6a74'); }
  },
  shed(c, p) {
    const x = p.x, w = p.w, t = p.top;
    c.fillStyle = '#6e4a30'; c.fillRect(x + 6, t + 12, w - 12, GROUND - t - 12);
    c.fillStyle = '#5a3c26'; for (let px = x + 16; px < x + w - 8; px += 11) c.fillRect(px, t + 12, 1.5, GROUND - t - 12);
    fillRR(c, x + w / 2 - 13, GROUND - 46, 26, 46, 2, '#4e3220'); circle(c, x + w / 2 + 8, GROUND - 23, 1.8, '#c9a227');
    fillRR(c, x + 14, t + 24, 18, 14, 1, '#1d1a2a'); c.fillStyle = '#6e4a30'; c.fillRect(x + 22, t + 24, 2, 14); c.fillRect(x + 14, t + 30, 18, 2);
    fillRR(c, x - 4, t, w + 8, 13, 3, '#3f3a4a');
    c.fillStyle = '#34303e'; for (let sx = x; sx < x + w + 4; sx += 12) c.fillRect(sx, t + 3, 1.5, 10);
  },
  treehouse(c, p) {
    const cx = p.x + p.w / 2, t = p.top;
    for (const [dx, dy, r] of [[0, -54, 62], [-54, -30, 42], [54, -32, 44]]) circle(c, cx + dx, t + dy, r, '#25402c');
    for (const [dx, dy, r] of [[-14, -74, 26], [30, -50, 20]]) circle(c, cx + dx, t + dy, r, '#2e5236');
    poly(c, [cx - 13, GROUND, cx + 13, GROUND, cx + 8, t - 60, cx - 8, t - 60], '#4a3424');
    c.fillStyle = '#3a281a'; c.fillRect(cx - 3, t + 30, 2, 60); c.fillRect(cx + 4, t + 70, 2, 40);
    c.fillStyle = '#7a5a34';
    c.fillRect(cx - 34, t + 8, 3, GROUND - t - 8); c.fillRect(cx - 22, t + 8, 3, GROUND - t - 8);
    for (let ry = t + 20; ry < GROUND; ry += 15) c.fillRect(cx - 34, ry, 15, 3);
    c.strokeStyle = '#6a4a26'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(cx, t + 50); c.lineTo(p.x + 8, t + 9); c.moveTo(cx, t + 50); c.lineTo(p.x + p.w - 8, t + 9); c.stroke();
    fillRR(c, p.x, t, p.w, 9, 2, '#8a6436');
    c.fillStyle = '#6a4a26'; c.fillRect(p.x + 6, t + 9, p.w - 12, 4);
    c.fillStyle = '#7a5a34'; c.fillRect(p.x + 3, t - 16, 4, 16); c.fillRect(p.x + p.w - 7, t - 16, 4, 16); c.fillRect(p.x + 3, t - 16, 22, 3); c.fillRect(p.x + p.w - 25, t - 16, 22, 3);
  },
  crate(c, p) {
    const x = p.x, t = p.top, s = p.w, h = GROUND - t;
    fillRR(c, x, t, s, h, 3, '#8a6236');
    c.strokeStyle = '#5e4122'; c.lineWidth = 4; c.strokeRect(x + 2, t + 2, s - 4, h - 4);
    c.lineWidth = 5; c.beginPath(); c.moveTo(x + 5, t + 5); c.lineTo(x + s - 5, GROUND - 5); c.moveTo(x + s - 5, t + 5); c.lineTo(x + 5, GROUND - 5); c.stroke();
    c.fillStyle = '#a77a46'; c.fillRect(x, t, s, 3);
  },
  bus(c, p) {
    const x = p.x, w = p.w, t = p.top, h = GROUND - 8 - t;
    fillRR(c, x, t, w, h, 8, '#b88a2a');
    c.fillStyle = '#9a7020'; c.fillRect(x + 2, t + h - 16, w - 4, 14);
    c.fillStyle = '#d7aa45'; c.fillRect(x + 6, t, w - 12, 3);
    fillRR(c, x + w - 34, t + 10, 26, 34, 3, '#1b2333');
    for (let wx = x + 12; wx < x + w - 44; wx += 34) {
      fillRR(c, wx, t + 10, 26, 24, 3, '#1b2333');
      if (hash(wx) < 0.35) { c.strokeStyle = 'rgba(170,190,230,.4)'; c.lineWidth = 1; c.beginPath(); c.moveTo(wx + 4, t + 13); c.lineTo(wx + 20, t + 30); c.moveTo(wx + 14, t + 12); c.lineTo(wx + 8, t + 28); c.stroke(); }
    }
    c.fillStyle = '#e6c25a'; c.fillRect(x, t + 42, w, 4);
    text(c, 'CITY BUS', x + w / 2, t + 58, { size: 11, color: '#6e4e12' });
    for (const wx of [x + 40, x + w - 50]) { circle(c, wx, GROUND - 10, 12, '#121216'); circle(c, wx, GROUND - 10, 5, '#6a6a74'); }
  },
  scaffold(c, p) {
    const x = p.x, w = p.w, t = p.top;
    c.fillStyle = '#6a7080';
    const poles = [x + 4, x + w - 9]; if (w > 140) poles.push(x + w / 2 - 2);
    for (const px of poles) c.fillRect(px, t + 6, 5, GROUND - t - 6);
    const mid = (t + GROUND) / 2;
    c.fillRect(x + 4, mid, w - 8, 4);
    c.strokeStyle = '#555b6a'; c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(x + 6, t + 10); c.lineTo(x + w - 6, mid); c.moveTo(x + w - 6, mid + 4); c.lineTo(x + 6, GROUND); c.stroke();
    fillRR(c, x - 4, t, w + 8, 8, 2, '#8a6436');
    c.fillStyle = '#6e4e2a'; for (let px = x + 16; px < x + w; px += 20) c.fillRect(px, t, 1.5, 8);
    c.fillStyle = '#e6c12e'; c.fillRect(x + 10, t + 18, w - 20, 4);
    c.fillStyle = '#1d1a2b'; for (let sx = x + 14; sx < x + w - 14; sx += 14) c.fillRect(sx, t + 18, 6, 4);
  },
  dumpster(c, p) {
    const x = p.x, w = p.w, t = p.top;
    poly(c, [x, t + 6, x + w, t + 6, x + w - 4, GROUND - 6, x + 4, GROUND - 6], '#2f6a45');
    c.fillStyle = '#285c3b'; for (let rx = x + 14; rx < x + w - 8; rx += 16) c.fillRect(rx, t + 10, 3, GROUND - t - 18);
    fillRR(c, x - 3, t, w + 6, 8, 2, '#245236');
    circle(c, x + 10, GROUND - 3, 3.5, '#121216'); circle(c, x + w - 10, GROUND - 3, 3.5, '#121216');
  },
  crypt(c, p) {
    const x = p.x, w = p.w, t = p.top;
    c.fillStyle = '#4b5158'; c.fillRect(x + 6, t + 12, w - 12, GROUND - t - 12);
    c.fillStyle = '#3c4148';
    for (let ry = t + 26, row = 0; ry < GROUND; ry += 14, row++) { c.fillRect(x + 6, ry, w - 12, 1.5); for (let bx = x + 6 + (row % 2) * 14; bx < x + w - 6; bx += 28) c.fillRect(bx, ry - 14, 1.5, 14); }
    c.fillStyle = '#5a6168'; c.fillRect(x + 8, t + 12, 11, GROUND - t - 12); c.fillRect(x + w - 19, t + 12, 11, GROUND - t - 12);
    fillRR(c, x + w / 2 - 17, GROUND - 52, 34, 52, 14, '#11161a');
    c.fillStyle = 'rgba(120,255,150,.13)'; rr(c, x + w / 2 - 12, GROUND - 46, 24, 46, 10); c.fill();
    fillRR(c, x - 6, t, w + 12, 13, 2, '#5d646b'); c.fillStyle = '#6f777e'; c.fillRect(x - 6, t, w + 12, 2);
    text(c, 'R.I.P.', x + w / 2, t + 24, { size: 9, color: '#2b3036' });
    c.fillStyle = '#3e5a3a'; c.fillRect(x - 6, t + 10, 18, 4); c.fillRect(x + w - 16, t + 10, 22, 3);
  },
  wall(c, p) {
    const x = p.x, w = p.w, t = p.top;
    c.fillStyle = '#50565c'; c.fillRect(x, t + 4, w, GROUND - t - 4);
    c.fillStyle = '#3e4349';
    for (let ry = t + 18, row = 0; ry < GROUND; ry += 13, row++) { c.fillRect(x, ry, w, 1.5); for (let bx = x + (row % 2) * 12; bx < x + w; bx += 24) c.fillRect(bx, ry - 13, 1.5, 13); }
    fillRR(c, x - 3, t, w + 6, 7, 2, '#61686e');
    c.fillStyle = '#3e5a3a'; c.fillRect(x + w * 0.3, t + 5, w * 0.3, 3);
  },
  mausoleum(c, p) {
    const x = p.x, w = p.w, t = p.top;
    c.fillStyle = '#474d54'; c.fillRect(x + 8, t + 16, w - 16, GROUND - t - 16);
    c.fillStyle = '#5a6168';
    for (let i = 0; i < 4; i++) { const cx = x + 14 + i * ((w - 40) / 3); c.fillRect(cx, t + 22, 12, GROUND - t - 30); c.fillRect(cx - 2, t + 18, 16, 5); c.fillRect(cx - 2, GROUND - 10, 16, 5); }
    fillRR(c, x + w / 2 - 16, GROUND - 58, 32, 58, 14, '#0f1417');
    glow(c, x + w / 2, GROUND - 30, 40, '120,255,150', 0.25);
    fillRR(c, x - 8, t + 8, w + 16, 10, 2, '#575e65');
    fillRR(c, x - 2, t, w + 4, 10, 2, '#646b72'); c.fillStyle = '#767e85'; c.fillRect(x - 2, t, w + 4, 2);
    text(c, 'FAMILY CRYPT', x + w / 2, t + 30, { size: 8, color: '#2b3036' });
  },
};
Object.assign(PLATFORM_ART, {
  logs(c, p) {
    const x = p.x, w = p.w, t = p.top, rh = (GROUND - t) / 2;
    for (let row = 0; row < 2; row++) {
      const y = GROUND - rh * (row + 1), inset = row * 10;
      fillRR(c, x + inset, y, w - inset * 2, rh - 1, rh / 2, '#7a5232');
      c.fillStyle = '#5e3e24'; c.fillRect(x + inset + 8, y + rh * 0.45, w - inset * 2 - 16, 1.5);
      circle(c, x + inset + rh / 2, y + rh / 2, rh / 2 - 1, '#c89a6a');
      c.strokeStyle = '#9a6e44'; c.lineWidth = 1; c.beginPath(); c.arc(x + inset + rh / 2, y + rh / 2, rh / 4, 0, Math.PI * 2); c.stroke();
    }
    fillRR(c, x + 8, t - 3, w - 16, 6, 3, '#f0f6fc');
  },
  cabin(c, p) {
    const x = p.x, w = p.w, t = p.top, wallTop = t + 22;
    c.fillStyle = '#6e4a2e'; c.fillRect(x + 6, wallTop, w - 12, GROUND - wallTop);
    c.fillStyle = '#5a3a22'; for (let y = wallTop + 8; y < GROUND; y += 10) c.fillRect(x + 6, y, w - 12, 2);
    glow(c, x + 33, wallTop + 24, 44, '255,200,120', 0.25);
    fillRR(c, x + 20, wallTop + 14, 26, 20, 2, '#3a2a1a'); c.fillStyle = '#ffd27a'; c.fillRect(x + 23, wallTop + 17, 20, 14); c.fillStyle = '#3a2a1a'; c.fillRect(x + 32, wallTop + 17, 2, 14);
    fillRR(c, x + w - 48, GROUND - 46, 26, 46, 2, '#4a2e1a');
    poly(c, [x - 8, wallTop + 2, x + 12, t + 4, x + w - 12, t + 4, x + w + 8, wallTop + 2], '#3a2a22');
    fillRR(c, x + 8, t - 2, w - 16, 9, 4, '#f0f6fc');
    c.fillStyle = '#e4eef8'; for (let ix = x + 14; ix < x + w - 14; ix += 22) poly(c, [ix - 2, wallTop + 2, ix + 2, wallTop + 2, ix, wallTop + 9]);   // icicles
  },
  icerock(c, p) {
    const x = p.x, w = p.w, t = p.top;
    poly(c, [x, GROUND, x + 6, t + 18, x + w * 0.3, t + 2, x + w * 0.7, t, x + w - 4, t + 14, x + w, GROUND], '#9cbcd8');
    poly(c, [x + w * 0.3, t + 2, x + w * 0.5, t + 30, x + w * 0.7, t], '#c8e0f4');
    poly(c, [x + 6, t + 18, x + w * 0.2, t + 40, x + w * 0.3, t + 2], '#7c9cba');
    fillRR(c, x + 8, t - 3, w - 16, 6, 3, '#f4f8fc');
  },
  barrels(c, p) {
    const x = p.x, w = p.w, t = p.top, rh = (GROUND - t) / 2, bw = w / 2;
    const cols = [['#a8322a', '#3a6a8a'], ['#4a7a3a', '#c98a2a']];
    for (let row = 0; row < 2; row++) for (let i = 0; i < 2; i++) {
      const bx = x + i * bw, by = GROUND - rh * (row + 1), col = cols[row][i];
      fillRR(c, bx + 1, by, bw - 2, rh - 1, 4, col);
      c.fillStyle = shade(col, -0.3); c.fillRect(bx + 1, by + rh * 0.25, bw - 2, 2); c.fillRect(bx + 1, by + rh * 0.7, bw - 2, 2);
      c.fillStyle = 'rgba(120,60,20,0.35)'; circle(c, bx + bw * 0.6, by + rh * 0.45, 3);
    }
  },
  trailer(c, p) {
    const x = p.x, w = p.w, t = p.top, bot = GROUND - 14;
    fillRR(c, x, t, w, bot - t, 14, '#d8d0c0');
    c.fillStyle = '#5ab0b0'; c.fillRect(x, t + 26, w, 6); c.fillStyle = '#e8a040'; c.fillRect(x, t + 34, w, 3);
    fillRR(c, x + 14, t + 8, 34, 14, 4, '#2a3440'); fillRR(c, x + w - 70, t + 8, 46, 14, 4, '#2a3440');
    fillRR(c, x + w * 0.45, t + 12, 22, bot - t - 12, 3, '#b8b0a0');
    circle(c, x + w * 0.3, GROUND - 10, 11, '#121216'); circle(c, x + w * 0.3, GROUND - 10, 4.5, '#8a8a90');
    c.fillStyle = '#5a5a60'; c.fillRect(x + w, bot - 8, 26, 4);
    c.fillStyle = 'rgba(120,60,20,0.25)'; c.fillRect(x + 4, bot - 12, w - 8, 10);
  },
  canopy(c, p) {
    const x = p.x, w = p.w, t = p.top;
    for (const px of [x + 24, x + w - 34]) { c.fillStyle = '#bcb4aa'; c.fillRect(px, t + 18, 10, GROUND - t - 18); c.fillStyle = '#d6452f'; c.fillRect(px, GROUND - 30, 10, 4); }
    for (const px of [x + w * 0.35, x + w * 0.6]) {   // gas pumps
      fillRR(c, px, GROUND - 52, 26, 52, 3, '#d6452f'); fillRR(c, px + 4, GROUND - 46, 18, 12, 2, '#1d2a2a');
      c.fillStyle = '#7CFC4A'; c.fillRect(px + 7, GROUND - 42, 8, 2); c.fillStyle = '#2a2a2a'; c.fillRect(px + 26, GROUND - 40, 3, 16);
    }
    glow(c, x + w / 2, t + 22, 120, '255,240,200', 0.18);
    fillRR(c, x - 6, t, w + 12, 18, 3, '#ece6dc');
    c.fillStyle = '#d6452f'; c.fillRect(x - 6, t + 7, w + 12, 6);
    text(c, 'GAS  ·  FOOD  ·  COLD DRINKS', x + w / 2, t + 10.5, { size: 7, color: '#ffffff' });
    c.fillStyle = 'rgba(255,250,220,0.9)'; for (let lx = x + 20; lx < x + w - 10; lx += 40) c.fillRect(lx, t + 18, 16, 2);
  },
  rock(c, p) {
    const x = p.x, w = p.w, t = p.top;
    poly(c, [x - 4, GROUND, x + 4, t + 10, x + 14, t, x + w - 12, t, x + w - 2, t + 12, x + w + 6, GROUND], '#a0522d');
    c.fillStyle = '#8a4426'; for (let y = t + 18; y < GROUND - 6; y += 16) c.fillRect(x + 2, y, w - 2, 3);
    c.fillStyle = '#c0703e'; c.fillRect(x + 14, t, w - 26, 4);
    poly(c, [x + w * 0.6, t + 4, x + w * 0.75, t + 40, x + w * 0.66, t + 60], '#7a3a20');
  },
  container(c, p) {
    const x = p.x, w = p.w, t = p.top, col = p.color || '#3a6a8a';
    c.fillStyle = col; c.fillRect(x, t, w, GROUND - t);
    c.fillStyle = shade(col, -0.25); for (let rx = x + 6; rx < x + w - 4; rx += 10) c.fillRect(rx, t + 4, 3, GROUND - t - 8);
    c.fillStyle = shade(col, 0.2); c.fillRect(x, t, w, 4);
    c.fillStyle = shade(col, -0.4); c.fillRect(x, GROUND - 5, w, 5); c.fillRect(x + w - 40, t + 8, 2, GROUND - t - 14); c.fillRect(x + w - 20, t + 8, 2, GROUND - t - 14);
    text(c, 'ZS-0' + (Math.floor(p.x / 100) % 9 + 1), x + 34, t + 20, { size: 10, color: 'rgba(255,255,255,0.7)', align: 'left' });
  },
  tank(c, p) {
    const x = p.x, w = p.w, t = p.top, hullTop = t + 26;
    fillRR(c, x - 14, GROUND - 22, w + 28, 22, 11, '#2a2a22');
    c.fillStyle = '#4a4a3a'; for (let i = 0; i < 7; i++) circle(c, x - 4 + i * (w + 8) / 6, GROUND - 11, 7);
    poly(c, [x - 16, GROUND - 20, x - 6, hullTop, x + w + 6, hullTop, x + w + 20, GROUND - 20], '#4a5a34');
    fillRR(c, x + 10, t, w - 20, 28, 8, '#56683c');
    c.fillStyle = '#3e4c2a'; c.fillRect(x + w - 8, t + 9, 70, 7); c.fillStyle = '#2e3a20'; c.fillRect(x + w + 56, t + 7, 8, 11);
    const sx = x + w / 2, sy = t + 14;   // white star
    c.fillStyle = 'rgba(240,240,230,0.75)'; c.beginPath();
    for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 3.5 : 8; k ? c.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r) : c.moveTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r); }
    c.closePath(); c.fill();
  },
  tower(c, p) {
    const x = p.x, w = p.w, t = p.top;
    c.strokeStyle = '#4a3a2a'; c.lineWidth = 5;
    c.beginPath(); c.moveTo(x + 8, GROUND); c.lineTo(x + 16, t + 10); c.moveTo(x + w - 8, GROUND); c.lineTo(x + w - 16, t + 10); c.stroke();
    c.lineWidth = 2.5; c.beginPath();
    for (let k = 0; k < 3; k++) { const y1 = t + 10 + k * (GROUND - t - 10) / 3, y2 = y1 + (GROUND - t - 10) / 3; c.moveTo(x + 14, y1); c.lineTo(x + w - 12, y2); c.moveTo(x + w - 14, y1); c.lineTo(x + 12, y2); }
    c.stroke();
    fillRR(c, x - 6, t, w + 12, 10, 2, '#6a4a2a');
    c.fillStyle = '#5a3a22'; c.fillRect(x - 6, t - 18, 4, 18); c.fillRect(x + w + 2, t - 18, 4, 18); c.fillRect(x - 6, t - 18, w + 12, 3);
    c.fillRect(x - 2, t - 64, 3, 46); c.fillRect(x + w - 1, t - 64, 3, 46);
    poly(c, [x - 14, t - 62, x + w / 2, t - 84, x + w + 14, t - 62], '#3a2a1a');
    glow(c, x + w / 2, t - 25, 50, '255,250,220', 0.35); fillRR(c, x + w / 2 - 8, t - 30, 16, 10, 3, '#8a8a8a');
  },
  bunker(c, p) {
    const x = p.x, w = p.w, t = p.top;
    poly(c, [x - 10, GROUND, x + 6, t, x + w - 6, t, x + w + 10, GROUND], '#6a6e66');
    c.fillStyle = '#5a5e56'; c.fillRect(x + 6, t, w - 12, 5);
    fillRR(c, x + w * 0.25, t + 18, w * 0.5, 9, 3, '#141618');
    c.fillStyle = 'rgba(255,200,80,0.25)'; c.fillRect(x + w * 0.25 + 4, t + 20, w * 0.5 - 8, 5);
    c.fillStyle = '#8a7a5a'; for (let bx = x - 8; bx < x + w + 8; bx += 18) { rr(c, bx, GROUND - 12, 18, 12, 6); c.fill(); }
    c.fillStyle = '#4a5a3a'; for (let nx = x + 10; nx < x + w - 10; nx += 14) circle(c, nx, t + 2, 5);
  },
  stand(c, p) {
    const x = p.x, w = p.w, t = p.top, aw = 26;
    c.fillStyle = '#e8d8b0'; c.fillRect(x + 6, t + aw, w - 12, GROUND - t - aw);
    text(c, ['POPCORN', 'CORN DOGS', 'CANDY'][Math.floor(p.x / 100) % 3], x + w / 2, t + aw + 7, { size: 8, color: '#a8322a' });
    fillRR(c, x + 18, t + aw + 14, w - 36, 22, 2, '#2a1a1a');
    c.fillStyle = '#a8322a'; c.fillRect(x + 6, GROUND - 26, w - 12, 4);
    const n = 8, sw = (w + 12) / n;   // striped awning (the part you stand on)
    for (let i = 0; i < n; i++) {
      c.fillStyle = i % 2 ? '#f4ece0' : '#d6452f'; c.fillRect(x - 6 + i * sw, t, sw + 0.5, aw - 6);
      c.beginPath(); c.arc(x - 6 + i * sw + sw / 2, t + aw - 6, sw / 2, 0, Math.PI); c.fill();
    }
  },
  wagon(c, p) {
    const x = p.x, w = p.w, t = p.top, bot = GROUND - 18;
    fillRR(c, x, t, w, bot - t, 6, '#a8322a');
    c.fillStyle = '#e0b040'; c.fillRect(x, t, w, 4); c.fillRect(x, bot - 4, w, 4);
    fillRR(c, x + 14, t + 12, w - 28, bot - t - 22, 3, '#1a0a0a');
    if (Math.sin(G.t * 1.3 + x) > -0.7) { circle(c, x + w / 2 - 6, t + 30, 2, '#ffe14a'); circle(c, x + w / 2 + 4, t + 30, 2, '#ffe14a'); }   // something in the cage...
    c.fillStyle = '#e0b040'; for (let bx = x + 20; bx < x + w - 16; bx += 12) c.fillRect(bx, t + 12, 3, bot - t - 22);
    for (const wx of [x + 26, x + w - 26]) {
      circle(c, wx, GROUND - 16, 15, '#e0b040'); circle(c, wx, GROUND - 16, 12, '#5a2a1a');
      c.strokeStyle = '#e0b040'; c.lineWidth = 2; c.beginPath();
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 4; c.moveTo(wx + Math.cos(a) * 12, GROUND - 16 + Math.sin(a) * 12); c.lineTo(wx - Math.cos(a) * 12, GROUND - 16 - Math.sin(a) * 12); }
      c.stroke();
    }
  },
  stage(c, p) {
    const x = p.x, w = p.w, t = p.top;
    c.fillStyle = '#5a3a22'; c.fillRect(x + 4, t + 10, w - 8, GROUND - t - 10);
    c.fillStyle = '#8a1a2a'; c.fillRect(x, t + 10, w, 18);
    c.fillStyle = '#6a1020'; for (let sx = x; sx < x + w; sx += 16) { c.beginPath(); c.arc(sx + 8, t + 28, 8, 0, Math.PI); c.fill(); }
    c.fillStyle = '#e0b040'; for (let sx = x + 8; sx < x + w; sx += 16) c.fillRect(sx - 1, t + 10, 2, 18);
    fillRR(c, x - 6, t, w + 12, 11, 2, '#8a5a34');
    c.fillStyle = '#6e4626'; for (let px = x + 10; px < x + w; px += 26) c.fillRect(px, t, 1.5, 11);
    c.globalCompositeOperation = 'lighter';
    for (let lx = x + 14; lx < x + w - 6; lx += 30) circle(c, lx, t - 2, 2.5, Math.floor(G.t * 3 + lx) % 2 ? '#ffd23f' : '#ff8a5a');
    c.globalCompositeOperation = 'source-over';
  },
  boxes(c, p) {
    const x = p.x, w = p.w, t = p.top, h = GROUND - t;
    for (const [bx, by, bw, bh] of [[x, t + h * 0.45, w * 0.55, h * 0.55], [x + w * 0.5, t + h * 0.45, w * 0.5, h * 0.55], [x + w * 0.18, t, w * 0.64, h * 0.45]]) {
      fillRR(c, bx, by, bw, bh, 2, '#8a6236');
      c.strokeStyle = '#5e4122'; c.lineWidth = 2.5; c.strokeRect(bx + 2, by + 2, bw - 4, bh - 4);
      c.beginPath(); c.moveTo(bx + 3, by + 3); c.lineTo(bx + bw - 3, by + bh - 3); c.stroke();
    }
    drawBalloon(c, x + w * 0.3, t - 50 - Math.sin(G.t * 2) * 3, '#ff5a6e', t);
    drawBalloon(c, x + w * 0.65, t - 62 - Math.sin(G.t * 2 + 1) * 3, '#5ab0ff', t);
  },
});
function drawPlatforms(c) {
  for (const p of G.platforms) {
    if (p.x + p.w + 80 < G.camX || p.x - 80 > G.camX + W) continue;
    PLATFORM_ART[p.kind](c, p);
  }
}
