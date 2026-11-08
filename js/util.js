'use strict';
// Shared constants, helpers, input, save data and world state for ZOMBIE SURVIVAL.

const W = 960, H = 540;            // the game is always drawn at 960x540 (16:9), then scaled to fit
const RES = 2;                     // canvas pixels per game pixel (keeps everything sharp)
const GROUND = 468;                // y of the ground everybody walks on
const GRAV = 1900;                 // gravity, pixels per second per second
const FONT = "'Bungee', 'Arial Black', Impact, sans-serif";
const SPOOKY = "'Creepster', 'Bungee', Impact, sans-serif";

const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const randi = (a, b) => Math.floor(rand(a, b + 1));
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const approach = (v, target, step) => (v < target ? Math.min(target, v + step) : Math.max(target, v - step));
// Stable pseudo-random 0..1 for a number (so scenery doesn't flicker).
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
function angLerp(a, b, t) { const d = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI; return a + d * t; }
function shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
// Seeded random numbers, so each level's background is the same every time.
function seeded(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16), f = v => clamp(Math.round(v * (1 + amt)), 0, 255);
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

// ---- Drawing helpers -----------------------------------------------------
function rr(c, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  c.beginPath(); c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function fillRR(c, x, y, w, h, r, col) { c.fillStyle = col; rr(c, x, y, w, h, r); c.fill(); }
function circle(c, x, y, r, col) { if (col) c.fillStyle = col; c.beginPath(); c.arc(x, y, Math.max(0, r), 0, Math.PI * 2); c.fill(); }
function poly(c, pts, col) {
  if (col) c.fillStyle = col;
  c.beginPath(); c.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
  c.closePath(); c.fill();
}
function heartPath(c, x, y, s) { // x,y = top middle, s = size
  c.beginPath(); c.moveTo(x, y + s * 0.3);
  c.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.3);
  c.bezierCurveTo(x - s * 0.5, y + s * 0.6, x, y + s * 0.75, x, y + s);
  c.bezierCurveTo(x, y + s * 0.75, x + s * 0.5, y + s * 0.6, x + s * 0.5, y + s * 0.3);
  c.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.3);
  c.closePath();
}
function text(c, str, x, y, o = {}) {
  c.font = `${o.size || 16}px ${o.font || FONT}`;
  c.textAlign = o.align || 'center'; c.textBaseline = o.base || 'middle';
  if (o.stroke) { c.lineJoin = 'round'; c.lineWidth = o.lw || 4; c.strokeStyle = o.stroke; c.strokeText(str, x, y); }
  c.fillStyle = o.color || '#fff'; c.fillText(str, x, y);
}
function drawCoin(c, x, y, r, squash = 1, big = false) {
  c.save(); c.translate(x, y); c.scale(Math.max(0.15, squash), 1);
  circle(c, 0, 0, r, '#b07c12');
  circle(c, 0, 0, r - 1.5, big ? '#ffe36b' : '#ffcf3a');
  c.fillStyle = '#d59f1c'; c.fillRect(-r * 0.16, -r * 0.5, r * 0.32, r);
  circle(c, -r * 0.35, -r * 0.35, r * 0.24, '#fff6c8');
  c.restore();
}

// ---- Input (filled in by game.js) ----------------------------------------
const keys = {};
const mouse = { sx: W / 2, sy: H / 2, down: false, id: null };
const touch = { left: false, right: false, down: false, jump: false, fire: false };
// Which keys each player uses. Solo can use either set; in 2 players P1 is WASD and P2 is the arrows.
// nade = throw a grenade, ntype = switch grenade kind. 'rshift' is the right Shift key (see keyName in game.js).
const CONTROLS = {
  solo: { left: ['a', 'arrowleft'], right: ['d', 'arrowright'], jump: ['w', 'arrowup'], down: ['s', 'arrowdown'], fire: [' ', 'j', 'f'], prev: ['q'], next: ['e'], nade: ['g'], ntype: ['r'], mouse: true, touch: true, slots: true },
  p1: { left: ['a'], right: ['d'], jump: ['w'], down: ['s'], fire: ['f', ' '], prev: ['q'], next: ['e'], nade: ['g'], ntype: ['r'], mouse: true, slots: true },
  p2: { left: ['arrowleft'], right: ['arrowright'], jump: ['arrowup'], down: ['arrowdown'], fire: ['enter', '/'], prev: [','], next: ['.'], nade: ['rshift'], ntype: ["'"] },
  remote: { left: [], right: [], jump: [], down: [], fire: [], prev: [], next: [], nade: [], ntype: [] },   // Wi-Fi players
};
// Wi-Fi players (p.remote) send their buttons over the network instead.
const held = (p, action) => (p.remote ? !!p.remote[action] : p.ctrl[action].some(k => keys[k]) || (p.ctrl.touch && touch[action]));

// In a Wi-Fi game the host records every effect and sound so the other screens can replay them.
const Rec = {
  on: false, depth: 0, fx: [], au: [],
  push(kind, name, args) { const list = this[kind]; list.push([name, args]); if (list.length > 400) list.shift(); },
  take() { const out = { fx: this.fx, au: this.au }; this.fx = []; this.au = []; return out; },
};

// ---- World state ---------------------------------------------------------
const G = {
  state: 'title', t: 0, pausedFrom: 'playing', uid: 0,
  numPlayers: 1, players: [],
  levelIndex: 0, level: null, waveIndex: 0, next: null,
  camX: 0, shake: 0, hurtFlash: 0, coinPulse: 0,
  platforms: [], zombies: [], bullets: [], coins: [], particles: [], texts: [], beams: [], nades: [], pools: [],
  queue: [], spawnT: 0, maxAlive: 8, every: 1.4, bossPending: false, bossAt: 0, boss: null,
  collectAll: false, clearT: 0, levelDone: false,
  banner: null, toast: null,
  run: { kills: 0, coins: 0 },
};
function setState(s) { G.state = s; }

// Lands a falling thing (player, zombie) on a platform or the ground.
// Platforms are one-way: you jump up through them and land on top.
function land(e) {
  e.onGround = false;
  if (e.vy < 0) return;
  if (!(e.dropT > 0)) {
    for (const p of G.platforms) {
      if (e.prevY <= p.top + 0.5 && e.y >= p.top && e.x > p.x - 6 && e.x < p.x + p.w + 6) {
        e.y = p.top; e.vy = 0; e.onGround = true; e.onPlat = p; return;
      }
    }
  }
  if (e.y >= GROUND) { e.y = GROUND; e.vy = 0; e.onGround = true; e.onPlat = null; }
}
function surfaceBelow(x, y) {
  let s = GROUND;
  for (const p of G.platforms) if (p.top >= y - 1 && p.top < s && x > p.x - 6 && x < p.x + p.w + 6) s = p.top;
  return s;
}
function drawShadow(c, x, y, w) {
  const s = surfaceBelow(x, y), k = clamp(1 - (s - y) / 220, 0.3, 1);
  c.fillStyle = `rgba(0,0,0,${0.32 * k})`;
  c.beginPath(); c.ellipse(x, s, w * 0.6 * k, 4 * k, 0, 0, Math.PI * 2); c.fill();
}

// ---- Save data (coins, guns and unlocked levels stay between games) ------
// Every player has their own wallet and their own guns.
const SAVE_KEY = 'jacob-zombie-survival.v1';
const MAX_PLAYERS = 2;
// armors = armor sets you own, armor = the one you wear, boost = how many health boosts you bought (js/gear.js)
// nades = how many grenades of each kind you have, nade = the kind you throw (js/grenades.js). Everyone starts with 3 frags.
const newProfile = () => ({ coins: 0, owned: ['shotgun'], equipped: 'shotgun', armors: [], armor: '', boost: 0, nades: { frag: 3, he: 0, acid: 0, cryo: 0 }, nade: 'frag' });
const save = { players: [newProfile(), newProfile()], unlocked: 1, beaten: [], muted: false, numPlayers: 1 };
function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (s && typeof s === 'object') {
      if (Array.isArray(s.players)) {
        s.players.slice(0, MAX_PLAYERS).forEach((sp, i) => {
          if (!sp || typeof sp !== 'object') return;
          const p = save.players[i];
          if (Number.isFinite(sp.coins)) p.coins = Math.max(0, Math.floor(sp.coins));
          if (Array.isArray(sp.owned)) p.owned = sp.owned.filter(id => typeof id === 'string');
          if (typeof sp.equipped === 'string') p.equipped = sp.equipped;
          if (Array.isArray(sp.armors)) p.armors = sp.armors.filter(id => typeof id === 'string');
          if (typeof sp.armor === 'string') p.armor = sp.armor;
          if (Number.isFinite(sp.boost)) p.boost = Math.max(0, Math.floor(sp.boost));
          if (sp.nades && typeof sp.nades === 'object') p.nades = sp.nades;   // checked in game.js (cleanNades)
          if (typeof sp.nade === 'string') p.nade = sp.nade;
        });
      }
      if (Number.isFinite(s.unlocked)) save.unlocked = Math.max(1, Math.floor(s.unlocked));
      if (Array.isArray(s.beaten)) save.beaten = s.beaten.filter(Number.isInteger);
      if (s.numPlayers === 2) save.numPlayers = 2;
      save.muted = !!s.muted;
    }
  } catch (e) { /* private mode or broken save: start fresh */ }
  for (const p of save.players) if (!p.owned.includes('shotgun')) p.owned.unshift('shotgun');
}
function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* can't save: keep playing */ } }
function resetSave() {
  save.players = [newProfile(), newProfile()]; save.unlocked = 1; save.beaten = [];
  writeSave();
}
loadSave();
