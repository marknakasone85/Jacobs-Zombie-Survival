'use strict';
// Armor and health boosts from the Gun Shop.
//
// ARMOR: you wear one set at a time. It gives you a blue ARMOR bar that takes the hits before your
// health does, and it is repaired at the start of every wave. Better sets = a bigger armor bar.
// HEALTH BOOSTS: make your health bar bigger for good (100 -> 200 -> 300).
// Guns and armor can be sold back to the shop for everything you paid (SELL_BACK).

const SELL_BACK = 1;   // 1 = you get all your coins back when you sell something
const ARMORS = [
  { id: 'jacket', name: 'Leather Jacket', price: 60, armor: 25, desc: 'A tough motorcycle jacket (and cool shades). Takes the first 25 damage every wave.' },
  { id: 'riot', name: 'Riot Gear', price: 220, armor: 60, desc: 'Helmet with a visor, chest plate, shoulder and knee pads. 60 armor every wave.' },
  { id: 'military', name: 'Full Military', price: 480, armor: 120, desc: 'Combat helmet, camo and a heavy vest full of pouches. 120 armor every wave.' },
  { id: 'space', name: 'Space Suit', price: 950, armor: 250, desc: 'A crazy shiny space suit with a glass bubble helmet. Zombie teeth bounce right off! 250 armor.' },
];
const ARMOR_MAP = Object.assign(Object.create(null), Object.fromEntries(ARMORS.map(a => [a.id, a])));   // only real armor sets (see WMAP)
const ARMOR_IDS = ARMORS.map(a => a.id);
const HEALTH_BOOSTS = [   // buy them in order
  { price: 500, maxHp: 200, name: 'Double Health' },
  { price: 1000, maxHp: 300, name: 'Triple Health' },
];
const maxHpOf = prof => (prof && prof.boost > 0 ? HEALTH_BOOSTS[Math.min(prof.boost, HEALTH_BOOSTS.length) - 1].maxHp : 100);
const armorOf = prof => (prof && ARMOR_MAP[prof.armor] && (prof.armors || []).includes(prof.armor) ? ARMOR_MAP[prof.armor].armor : 0);
// Put a player's armor and health boost on them (after shopping, or at the start of a level).
function applyGear(p, fresh = false) {
  const oldMax = p.maxHp;
  p.maxHp = maxHpOf(p.prof);
  p.armorId = armorOf(p.prof) ? p.prof.armor : '';
  p.maxArmor = armorOf(p.prof);
  if (fresh) { p.hp = p.maxHp; p.armor = p.maxArmor; return; }
  if (p.maxHp > oldMax) p.hp += p.maxHp - oldMax;   // a new health boost fills up the new part
  p.hp = Math.min(p.hp, p.maxHp);
  p.armor = p.maxArmor;                              // new (or swapped) armor is in perfect shape
}

// ---- What each set looks like on a civilian ---------------------------------------
// body = jacket/top colors, pants/boot/glove = replaced colors, head() draws a helmet over the face.
const ARMOR_LOOK = {
  jacket: {
    body: '#2c2a2e', bodyD: '#1c1b1f', sleeve: '#2c2a2e',
    torso(c) {
      fillRR(c, -9, -51, 19, 28, 6, this.body);
      poly(c, [-2, -51, 4, -51, 1, -44], '#4a4650');   // collar
      c.strokeStyle = '#c8c8d0'; c.lineWidth = 1; c.beginPath(); c.moveTo(3, -49); c.lineTo(-1, -27); c.stroke();   // zip
      c.fillStyle = 'rgba(255,255,255,0.13)'; c.fillRect(-7, -48, 3, 18);   // leather shine
      c.fillStyle = '#3a2a20'; c.fillRect(-9, -26, 19, 3);
    },
    head(c) { fillRR(c, 1, -10, 10, 4, 2, '#111116'); c.fillStyle = 'rgba(120,180,255,0.6)'; c.fillRect(6, -9.5, 3, 1.4); },   // shades
  },
  riot: {
    body: '#26324a', bodyD: '#1a2336', sleeve: '#26324a', pants: '#1e2638', pantsD: '#161d2c', boot: '#141414', glove: '#1a1a1e', pad: '#4a5a78', helmet: true,
    torso(c) {
      fillRR(c, -9, -51, 19, 28, 6, this.body);
      fillRR(c, -7, -49, 16, 17, 4, '#4a5a78');   // chest plate
      c.fillStyle = 'rgba(255,255,255,0.2)'; c.fillRect(-5, -47, 12, 2);
      c.fillStyle = '#ffd23f'; c.fillRect(-4, -40, 10, 2);
      c.fillStyle = '#10141e'; c.fillRect(-9, -26, 19, 3);
    },
    shoulder(c) { fillRR(c, -6, -7, 11, 8, 4, '#4a5a78'); },
    head(c) {
      c.fillStyle = '#2a3650'; c.beginPath(); c.arc(0, -8, 12, Math.PI * 0.95, Math.PI * 2.05); c.closePath(); c.fill();   // helmet dome
      fillRR(c, -12, -10, 6, 10, 2, '#2a3650');
      c.fillStyle = 'rgba(160,210,255,0.35)'; rr(c, 2, -12, 11, 14, 4); c.fill();   // see-through visor
      c.strokeStyle = '#8aa0c8'; c.lineWidth = 1.2; rr(c, 2, -12, 11, 14, 4); c.stroke();
    },
  },
  military: {
    body: '#4a5a32', bodyD: '#3a4826', sleeve: '#55663a', pants: '#4a5236', pantsD: '#3c4430', boot: '#2a2418', glove: '#2a2a20', pad: null, helmet: true, camo: true,
    torso(c) {
      fillRR(c, -9, -51, 19, 28, 6, this.body);
      fillRR(c, -8, -50, 17, 23, 4, '#5f6e40');   // heavy vest
      c.fillStyle = '#3a4826'; c.fillRect(-6, -38, 5, 7); c.fillRect(1, -38, 5, 7); c.fillRect(-6, -47, 12, 3);   // pouches
      c.fillStyle = '#6e7a4a'; circle(c, -3, -44, 2.2); circle(c, 5, -33, 2);
      c.fillStyle = '#2a2418'; c.fillRect(-9, -26, 19, 3);
    },
    shoulder(c) { c.fillStyle = '#3a4826'; c.fillRect(-2, -4, 4, 3); },
    head(c) {
      c.fillStyle = '#56683a'; c.beginPath(); c.arc(0, -9, 12, Math.PI, Math.PI * 2); c.closePath(); c.fill();   // combat helmet
      fillRR(c, -13, -11, 27, 3.5, 1.5, '#4a5a32');
      c.fillStyle = '#6e7e4a'; circle(c, -4, -15, 2.4); circle(c, 4, -17, 1.8);
      c.strokeStyle = '#2a2418'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(-6, -8); c.lineTo(-3, 2); c.stroke();   // chin strap
      fillRR(c, -6, -19, 12, 4, 2, '#2a2a2a'); c.fillStyle = 'rgba(140,200,255,0.6)'; c.fillRect(-4, -18.5, 3, 3); c.fillRect(1, -18.5, 3, 3);   // goggles
    },
  },
  space: {
    body: '#e8ecf2', bodyD: '#c4cad6', sleeve: '#e8ecf2', pants: '#e0e4ea', pantsD: '#c4cad6', boot: '#8a92a2', glove: '#f4f6f8', pad: '#ff8a3a', helmet: true, pack: '#b8c0cc',
    torso(c) {
      fillRR(c, -9, -51, 19, 28, 6, this.body);
      fillRR(c, -4, -46, 11, 9, 2, '#2a3440');   // control panel with blinking lights
      const blink = Math.floor(G.t * 3) % 3;
      ['#ff4b4b', '#7CFC4A', '#5ab0ff'].forEach((col, i) => circle(c, -1.5 + i * 3.4, -41.5, 1.3, i === blink ? '#ffffff' : col));
      c.fillStyle = '#ff8a3a'; c.fillRect(-9, -34, 19, 3);
      c.fillStyle = '#9aa0ad'; c.fillRect(-9, -26, 19, 3);
      c.fillStyle = '#9aa0ad'; fillRR(c, -6, -55, 13, 5, 2, '#9aa0ad');   // neck ring
    },
    back(c) {   // backpack with an antenna
      fillRR(c, -17, -52, 9, 24, 3, this.pack);
      c.strokeStyle = '#8a92a2'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-14, -52); c.lineTo(-16, -66); c.stroke();
      circle(c, -16, -67, 1.8, Math.floor(G.t * 2) % 2 ? '#ff4b4b' : '#ffb0b0');
    },
    shoulder(c) { c.fillStyle = '#ff8a3a'; c.fillRect(-3, -4.5, 3, 9); },
    head(c) {   // a big glass bubble helmet
      c.fillStyle = 'rgba(170,220,255,0.22)'; circle(c, 1, -7, 15);
      c.strokeStyle = '#e4ecf6'; c.lineWidth = 2; c.beginPath(); c.arc(1, -7, 15, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 2.2; c.beginPath(); c.arc(1, -7, 11, -2.4, -1.5); c.stroke();
    },
  },
};

// ---- Shop pictures ---------------------------------------------------------------
const ARMOR_URL = {};
let BOOST_URL = '';
function makeGearIcons() {
  for (const a of ARMORS) {
    const cv = document.createElement('canvas'); cv.width = 240; cv.height = 96;
    const c = cv.getContext('2d');
    const dummy = { id: 0, x: 0, y: 0, look: LOOKS[0], facing: 1, weapon: 'shotgun', onGround: true, vx: 0, walkT: 0, aim: -0.35, recoil: 0, flashT: 0, cd: 1, dead: false, inv: 0, armorId: a.id };
    c.translate(120, 92); c.scale(1.2, 1.2);
    drawPlayer(c, dummy);
    ARMOR_URL[a.id] = cv.toDataURL();
  }
  const cv = document.createElement('canvas'); cv.width = 240; cv.height = 96;
  const c = cv.getContext('2d');
  c.fillStyle = '#ff5a6e'; heartPath(c, 120, 18, 64); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.35)'; heartPath(c, 108, 26, 20); c.fill();
  c.fillStyle = '#ffffff'; c.fillRect(113, 38, 14, 34); c.fillRect(103, 48, 34, 14);
  BOOST_URL = cv.toDataURL();
}
