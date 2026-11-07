'use strict';
// All the weapons: how they shoot (or swing), what they cost in the shop, and how they look.
// Ammo is unlimited. Weapons only differ in power, speed and range.
//   cd = seconds between shots   pellets = bullets per shot   spread = how wide they fly (radians)
//   dmg = damage per bullet      life = how long a bullet flies (sets the range)   pierce = zombies a bullet goes through
//   len = barrel length (where bullets come out)   grip = where the other hand holds it (0 = one hand)
// Melee weapons (kind 'melee') hit everything in front of you:
//   reach = how far   swing = how long the swing takes   lift = how high zombies get knocked   quake = ground shockwave size

const WEAPONS = [
  { id: 'shotgun', name: 'Shotgun', price: 0, desc: 'Your trusty boomstick. A wide blast that knocks zombies back.',
    cd: 0.72, pellets: 7, spread: 0.26, speed: 980, dmg: 8, life: 0.36, knock: 210, pierce: 1, kind: 'pellet', shake: 6, sfx: 'shotgun', len: 34, grip: 18, kick: 70, bounds: [-18, 35, -6, 9] },
  { id: 'smg', name: 'Rapid SMG', price: 50, desc: 'Small and speedy. Sprays bullets super fast.',
    cd: 0.085, pellets: 1, spread: 0.08, speed: 1150, dmg: 7, life: 0.5, knock: 30, pierce: 1, kind: 'bullet', shake: 1.4, sfx: 'smg', len: 24, grip: 0, bounds: [-6, 25, -7, 13] },
  { id: 'sword', name: 'Sword', price: 80, desc: 'A sharp steel sword. Slices every zombie right in front of you.',
    cd: 0.36, pellets: 1, speed: 0, life: 0, dmg: 34, reach: 76, knock: 260, lift: 120, swing: 0.22, kind: 'melee', shake: 3, sfx: 'sword', hitSfx: 'clang', len: 44, grip: 0, bounds: [-7, 47, -7, 7] },
  { id: 'magnum', name: 'Magnum Revolver', price: 90, desc: 'A huge hand cannon. One BANG goes through 2 zombies.',
    cd: 0.42, pellets: 1, spread: 0.01, speed: 2200, dmg: 48, life: 0.45, knock: 240, pierce: 2, kind: 'slug', shake: 6, sfx: 'magnum', len: 26, grip: 0, kick: 50, bounds: [-6, 28, -8, 11] },
  { id: 'rifle', name: 'Assault Rifle', price: 120, desc: 'Strong, accurate and fast. A great all-rounder.',
    cd: 0.12, pellets: 1, spread: 0.03, speed: 1450, dmg: 15, life: 0.65, knock: 55, pierce: 1, kind: 'bullet', shake: 2.2, sfx: 'rifle', len: 37, grip: 18, bounds: [-19, 38, -9, 14] },
  { id: 'sniper', name: 'Sniper', price: 200, desc: 'One giant shot that zips through 5 zombies.',
    cd: 0.9, pellets: 1, spread: 0, speed: 2600, dmg: 95, life: 0.7, knock: 260, pierce: 5, kind: 'slug', shake: 7, sfx: 'sniper', len: 54, grip: 24, kick: 40, bounds: [-22, 55, -13, 11] },
  { id: 'hammer', name: 'War Hammer', price: 250, desc: 'Slow but HUGE. Smashes zombies flying and shakes the ground.',
    cd: 0.8, pellets: 1, speed: 0, life: 0, dmg: 90, reach: 86, knock: 520, lift: 320, swing: 0.32, quake: 130, kind: 'melee', shake: 10, sfx: 'hammer', hitSfx: 'thud', len: 44, grip: 12, bounds: [-9, 48, -13, 13] },
  { id: 'flame', name: 'Flamethrower', price: 300, desc: 'Short range fire that burns through whole crowds.',
    cd: 0.03, pellets: 2, spread: 0.2, speed: 540, dmg: 3, life: 0.42, knock: 10, pierce: 99, kind: 'flame', shake: 0.5, sfx: 'flame', len: 34, grip: 16, bounds: [-16, 38, -7, 13] },
  { id: 'crossbow', name: 'Boom Crossbow', price: 350, desc: 'Fires exploding bolts that arc through the air. KABOOM!',
    cd: 0.75, pellets: 1, spread: 0.01, speed: 1050, dmg: 85, life: 1.3, knock: 320, pierce: 1, kind: 'bolt', radius: 95, shake: 3, sfx: 'crossbow', len: 30, grip: 14, bounds: [-15, 36, -16, 16] },
  { id: 'rocket', name: 'Rocket Launcher', price: 450, desc: 'BOOM! Blows up every zombie nearby.',
    cd: 1.0, pellets: 1, spread: 0.01, speed: 620, dmg: 120, life: 1.6, knock: 420, pierce: 1, kind: 'rocket', radius: 130, shake: 4, sfx: 'rocket', len: 31, grip: 12, kick: 120, bounds: [-24, 39, -12, 12] },
  { id: 'saber', name: 'Laser Sword', price: 500, desc: 'A humming blade of pure light. Super fast slashes with long reach.',
    cd: 0.22, pellets: 1, speed: 0, life: 0, dmg: 48, reach: 94, knock: 200, lift: 100, swing: 0.17, kind: 'melee', shake: 2, sfx: 'saber', hitSfx: 'zap', len: 52, grip: 0, bounds: [-5, 53, -6, 6] },
  { id: 'plasma', name: 'Plasma Rifle', price: 600, desc: 'Shoots glowing plasma balls that burn through 3 zombies.',
    cd: 0.15, pellets: 1, spread: 0.04, speed: 1000, dmg: 24, life: 0.75, knock: 90, pierce: 3, kind: 'plasma', shake: 2, sfx: 'plasma', len: 39, grip: 18, bounds: [-17, 41, -10, 12] },
  { id: 'minigun', name: 'Minigun', price: 700, desc: 'A spinning wall of bullets. Nothing gets close.',
    cd: 0.045, pellets: 1, spread: 0.12, speed: 1350, dmg: 11, life: 0.6, knock: 40, pierce: 1, kind: 'bullet', shake: 1.8, sfx: 'mini', len: 43, grip: 6, bounds: [-10, 44, -13, 15] },
  { id: 'laser', name: 'Laser Cannon', price: 1000, desc: 'Zaps a beam through EVERY zombie in a line.',
    cd: 0.32, pellets: 1, spread: 0, speed: 0, dmg: 55, life: 0, range: 950, knock: 120, pierce: 999, kind: 'laser', shake: 3, sfx: 'laser', len: 35, grip: 14, bounds: [-12, 38, -11, 10] },
];
const WMAP = Object.fromEntries(WEAPONS.map(w => [w.id, w]));
const wRange = w => (w.kind === 'laser' ? w.range : w.kind === 'melee' ? w.reach : w.speed * w.life);

// Draws a gun pointing right, with the shooting hand at (0, 0).
function drawGun(c, id, t = 0, loaded = true) {
  switch (id) {
    case 'shotgun': {
      poly(c, [-18, -2, -2, -3, -2, 3, -18, 5], '#7a4a24');              // wooden stock
      c.fillStyle = '#5e3818'; c.fillRect(-18, -2, 2.5, 7);
      fillRR(c, -3, -4, 13, 7, 2, '#2b2b33');                             // body
      c.fillStyle = '#4a4a58'; c.fillRect(9, -4, 26, 3);                 // barrel
      c.fillStyle = '#2b2b33'; c.fillRect(9, -1, 23, 2);                 // tube
      fillRR(c, 13, -2, 11, 5, 1.5, '#9a6634');                           // pump
      c.fillStyle = '#6e4520'; for (const x of [15.5, 18.5, 21.5]) c.fillRect(x, -2, 1, 5);
      c.fillStyle = '#1c1c22'; c.fillRect(-1, 2, 3, 6);                  // grip
      break;
    }
    case 'smg': {
      fillRR(c, -6, -5, 20, 8, 2, '#22232a');
      c.fillStyle = '#3a3b44'; c.fillRect(14, -3.5, 11, 3);
      c.fillStyle = '#17181d'; c.fillRect(4, 3, 4.5, 10); c.fillRect(-3, 2, 4, 6);
      c.fillStyle = '#4aa8ff'; c.fillRect(1, -4, 8, 1.5);
      c.fillStyle = '#111'; c.fillRect(-1, -7, 5, 2);
      break;
    }
    case 'rifle': {
      poly(c, [-19, -3, -3, -4, -3, 3, -19, 6], '#1f2026');
      fillRR(c, -4, -5, 22, 8, 2, '#2c2e36');
      c.fillStyle = '#3b3e48'; c.fillRect(18, -3.5, 20, 3);
      c.fillStyle = '#22242a'; c.fillRect(32, -6, 2, 3);
      fillRR(c, 14, -4.5, 9, 7, 1.5, '#4f6340');
      poly(c, [6, 3, 11, 3, 13.5, 14, 8.5, 14], '#17181d');
      c.fillStyle = '#111'; c.fillRect(1, -9, 10, 4);
      c.fillStyle = '#17181d'; c.fillRect(-2, 2, 4, 6);
      break;
    }
    case 'sniper': {
      poly(c, [-22, -3, -2, -4, -2, 3, -12, 3, -22, 7], '#4b5a32');
      fillRR(c, -3, -4.5, 20, 7, 2, '#26282e');
      c.fillStyle = '#33363e'; c.fillRect(16, -3, 35, 2.5);
      c.fillStyle = '#1c1d22'; c.fillRect(50, -4.2, 5, 5);               // muzzle brake
      fillRR(c, 1, -12.5, 18, 5.5, 2.5, '#121317');                       // scope
      circle(c, 19, -9.7, 2.2, '#4ad0ff');
      c.fillStyle = '#121317'; c.fillRect(5, -7.5, 2, 3.5); c.fillRect(13, -7.5, 2, 3.5);
      c.strokeStyle = '#222'; c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(37, -1); c.lineTo(33, 10); c.moveTo(37, -1); c.lineTo(41, 10); c.stroke();
      c.fillStyle = '#17181d'; c.fillRect(-1, 2, 4, 6);
      break;
    }
    case 'flame': {
      fillRR(c, -16, 2, 16, 10, 4.5, '#c0392b');                          // fuel tank
      c.fillStyle = '#e25b4b'; c.fillRect(-14, 3.5, 12, 2);
      c.strokeStyle = '#333'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(-1, 7); c.quadraticCurveTo(6, 10, 8, 3); c.stroke();
      fillRR(c, -4, -5, 22, 8, 2, '#5a5d66');
      c.fillStyle = '#8b8f99'; c.fillRect(18, -4, 13, 5);
      c.fillStyle = '#2e3036'; c.fillRect(31, -5, 3.5, 7);
      circle(c, 36, -1.5, 1.6 + Math.sin(t * 40) * 0.5, Math.sin(t * 25) > 0 ? '#5cd4ff' : '#ffb347'); // pilot light
      c.fillStyle = '#17181d'; c.fillRect(-1, 2, 4, 6);
      break;
    }
    case 'rocket': {
      fillRR(c, -24, -6, 55, 11, 3.5, '#5b6b34');
      c.fillStyle = '#44512a'; c.fillRect(-12, -6, 3, 11); c.fillRect(20, -6, 3, 11);
      c.fillStyle = '#2b2f22'; c.fillRect(-24, -6.5, 3, 12); c.fillRect(28, -6.5, 3, 12);
      c.fillStyle = '#1c1d22'; c.fillRect(-2, 4, 4, 7); c.fillRect(10, 4, 4, 6);
      fillRR(c, 3, -11.5, 8, 5.5, 1.5, '#1c1d22');
      if (loaded) poly(c, [31, -4.5, 39, -0.5, 31, 3.5], '#d6452f');
      break;
    }
    case 'minigun': {
      fillRR(c, -10, -7, 23, 13, 3, '#34363e');
      const off = Math.floor(t * 30) % 2 ? 0.7 : 0;
      c.fillStyle = '#5a5d66';
      for (let i = 0; i < 3; i++) c.fillRect(13, -4.5 + i * 3 + off, 31, 2);
      c.fillStyle = '#222'; c.fillRect(24, -6, 3, 10); c.fillRect(41, -6, 3, 10);
      fillRR(c, -3, 6, 11, 8, 2, '#4f6340');
      c.strokeStyle = '#222'; c.lineWidth = 2.2;
      c.beginPath(); c.moveTo(-2, -7); c.quadraticCurveTo(4, -13, 9, -7); c.stroke();
      break;
    }
    case 'laser': {
      fillRR(c, -12, -6, 34, 11, 5, '#e6ebf2');
      fillRR(c, -2, -3, 20, 4, 2, `rgba(60,255,255,${0.75 + Math.sin(t * 8) * 0.25})`);
      c.fillStyle = '#9aa3b5'; c.fillRect(21, -5, 12, 8);
      poly(c, [2, -6, 10, -6, 6, -11], '#b8c0cf'); poly(c, [2, 5, 10, 5, 6, 10], '#b8c0cf');
      circle(c, 35, -1, 2.5, '#5ff');
      c.fillStyle = '#17181d'; c.fillRect(-1, 4, 4, 5);
      break;
    }
    case 'magnum': {
      poly(c, [-4, 1, 3, 1, 6, 10, -1, 10], '#6b4423');                   // wooden grip
      fillRR(c, -2, -5, 12, 8, 2, '#a9b1bb');                              // frame
      fillRR(c, 2, -5.8, 8, 7.5, 2.5, '#8a929c');                          // cylinder
      c.fillStyle = '#6a727c'; c.fillRect(4, -5.8, 1, 7.5); c.fillRect(7, -5.8, 1, 7.5);
      c.fillStyle = '#c3cad3'; c.fillRect(10, -4.5, 16, 3.5);             // long barrel
      c.fillStyle = '#8a929c'; c.fillRect(10, -5.6, 16, 1.2);
      c.fillStyle = '#2a2a2a'; c.fillRect(23, -7, 2, 2); c.fillRect(-3, -7, 3, 2.5);   // sight, hammer
      c.strokeStyle = '#5a6068'; c.lineWidth = 1.2; c.beginPath(); c.arc(1, 3.5, 3, 0, Math.PI); c.stroke();  // trigger guard
      break;
    }
    case 'crossbow': {
      fillRR(c, -15, -2.5, 36, 5, 2, '#6b4423');                           // stock
      c.strokeStyle = '#3a3f48'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(22, -15); c.quadraticCurveTo(29, 0, 22, 15); c.stroke();   // bow limbs
      c.strokeStyle = '#e8e2d0'; c.lineWidth = 0.9;
      c.beginPath(); c.moveTo(22, -15); c.lineTo(loaded ? 8 : 18, 0); c.lineTo(22, 15); c.stroke();   // string
      if (loaded) { c.fillStyle = '#d8d0b8'; c.fillRect(8, -1, 23, 2); poly(c, [30, -3.2, 36, 0, 30, 3.2], '#e8413a'); }   // exploding bolt
      c.fillStyle = '#1c1d22'; c.fillRect(-2, 2, 4, 6);
      break;
    }
    case 'plasma': {
      poly(c, [-17, -3, -3, -4, -3, 3, -17, 5], '#3a2a5a');               // stock
      fillRR(c, -4, -6, 27, 10, 4, '#5a3f8a');                             // body
      fillRR(c, 4, -4, 15, 4, 2, `rgba(120,255,200,${0.7 + Math.sin(t * 10) * 0.3})`);   // glowing core
      c.fillStyle = '#2a1f40'; for (const x of [7, 11, 15]) c.fillRect(x, -4, 1, 4);
      fillRR(c, 22, -4.5, 15, 6, 2, '#7a5aaa');                            // barrel
      circle(c, 39, -1.5, 2.6, '#8fffd0');
      c.fillStyle = '#1c1d22'; c.fillRect(-1, 3, 4, 7); fillRR(c, 9, 4, 6, 7, 2, '#2a1f40');
      break;
    }
    case 'sword': {
      fillRR(c, -5, -2, 9, 4, 2, '#5a3a22');                               // handle
      c.fillStyle = '#c9a227'; c.fillRect(-7, -2.4, 2.6, 4.8);           // pommel
      fillRR(c, 3, -6.5, 3, 13, 1, '#c9a227');                             // crossguard
      poly(c, [6, -2.6, 40, -2.2, 47, 0, 40, 2.2, 6, 2.6], '#dfe6ee');     // blade
      c.fillStyle = '#9fb0c2'; c.fillRect(7, -0.4, 32, 0.8);
      break;
    }
    case 'hammer': {
      fillRR(c, -9, -2, 46, 4, 2, '#6b4423');                              // long handle
      c.fillStyle = '#4a2e18'; for (const x of [-7, -3, 1]) c.fillRect(x, -2, 1.5, 4);
      fillRR(c, 32, -13, 14, 26, 3, '#6d737c');                            // big iron head
      c.fillStyle = '#8a929c'; c.fillRect(34, -13, 10, 3);
      fillRR(c, 46, -8, 2.5, 16, 1, '#545a62');
      c.fillStyle = '#c9a227'; c.fillRect(29, -3, 3, 6);
      break;
    }
    case 'saber': {
      fillRR(c, -5, -2.3, 13, 4.6, 1.5, '#b8c0ca');                        // hilt
      c.fillStyle = '#3a3f48'; c.fillRect(-2, -2.3, 1.5, 4.6); c.fillRect(2, -2.3, 1.5, 4.6);
      c.fillStyle = '#e8413a'; c.fillRect(5, -0.8, 1.5, 1.6);
      c.save(); c.globalCompositeOperation = 'lighter';                    // the glowing blade
      fillRR(c, 8, -4, 45, 8, 4, `rgba(60,255,120,${0.3 + Math.sin(t * 30) * 0.05})`);
      fillRR(c, 8, -1.7, 44, 3.4, 1.7, '#eaffef');
      c.restore();
      break;
    }
  }
}

// Pictures of each gun for the shop and the HUD.
const ICON = {}, ICON_URL = {};
let MEDKIT_URL = '';
function makeIcons() {
  for (const w of WEAPONS) {
    const cv = document.createElement('canvas'); cv.width = 240; cv.height = 96;
    const c = cv.getContext('2d'), [x0, x1, y0, y1] = w.bounds;
    const s = Math.min(216 / (x1 - x0), 80 / (y1 - y0), 5.2);
    c.translate(120 - ((x0 + x1) / 2) * s, 48 - ((y0 + y1) / 2) * s); c.scale(s, s);
    drawGun(c, w.id, 0.3, true);
    ICON[w.id] = cv; ICON_URL[w.id] = cv.toDataURL();
  }
  const cv = document.createElement('canvas'); cv.width = 240; cv.height = 96;
  const c = cv.getContext('2d');
  fillRR(c, 86, 18, 68, 60, 10, '#f2f2f2'); fillRR(c, 86, 18, 68, 12, 6, '#d8d8d8');
  fillRR(c, 106, 10, 28, 12, 4, '#9a9aa6');
  c.fillStyle = '#e8413a'; c.fillRect(113, 36, 14, 34); c.fillRect(103, 46, 34, 14);
  MEDKIT_URL = cv.toDataURL();
}
