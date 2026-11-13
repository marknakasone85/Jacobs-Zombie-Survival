'use strict';
// Grenades: buy them in the Gun Shop, throw them with G (or the grenade button on phones and tablets).
// A grenade that hits a zombie in the air blows up right away. One that lands bounces and rolls,
// STICKS to the first zombie it touches and blows up a moment later (or by itself when its fuse runs out).
//   dmg = blast damage in the middle (half at the edge)   radius = blast size   knock = how far zombies fly
//   price = coins for one grenade   max = how many of that kind you can carry   power = the shop's Damage bar
// Grenades are used up when you throw them. Everyone has their own (prof.nades) and picks a kind to throw (prof.nade).

const NADES = [
  { id: 'frag', name: 'Frag Grenade', short: 'FRAG', price: 15, max: 10, dmg: 220, radius: 125, knock: 380, power: 320, col: '#a8c060',
    desc: 'BOOM, and sharp metal pieces fly out all around and hit zombies even further away.' },
  { id: 'he', name: 'High Explosive', short: 'HE', price: 30, max: 10, dmg: 480, radius: 180, knock: 640, power: 480, col: '#ff7a59',
    desc: 'The biggest boom in the shop. Wrecks everything nearby, even bosses feel it.' },
  { id: 'acid', name: 'Acid Grenade', short: 'ACID', price: 25, max: 10, dmg: 90, radius: 115, knock: 200, power: 400, col: '#9dff5a',
    pool: { w: 190, t: 6, dps: 90 }, desc: 'Splashes a bubbling acid puddle that melts every zombie walking through it for 6 seconds.' },
  { id: 'cryo', name: 'Cryo Grenade', short: 'ICE', price: 25, max: 10, dmg: 140, radius: 165, knock: 150, power: 260, col: '#7fe0ff',
    freeze: 3.5, desc: 'Freezes zombies solid: no walking, no biting, and frozen zombies take extra damage!' },
];
const NADE_MAP = Object.assign(Object.create(null), Object.fromEntries(NADES.map(n => [n.id, n])));   // only real grenades (see WMAP)
const NADE_IDS = NADES.map(n => n.id);
const NADE_G = 1500, NADE_R = 5, NADE_RANGE = 640, THROW_TIME = 0.24, FROZEN_HURT = 1.5;
// A grenade count list from a save (or from a friend's device): only real kinds, never more than you can carry.
function cleanNades(n) {
  return Object.fromEntries(NADES.map(T => [T.id, n && typeof n === 'object' && Number.isFinite(n[T.id]) ? clamp(Math.floor(n[T.id]), 0, T.max) : 0]));
}
const nadeCount = (prof, id) => (prof && prof.nades && prof.nades[id]) || 0;

// ---- Throwing -------------------------------------------------------------------
function throwNade(p) {
  if (p.dead || p.nadeCd > 0 || !['playing', 'cleared'].includes(G.state)) return;
  const prof = p.prof;
  if (!nadeCount(prof, prof.nade)) {   // none of this kind left: throw a kind you still have
    const other = NADES.find(T => nadeCount(prof, T.id) > 0);
    if (!other) { p.nadeCd = 0.8; addText(p.x, p.y - 96, 'NO GRENADES! Buy some in the shop', '#ff9a8a', 12); Sound.play('nope', p.x); return; }
    prof.nade = other.id;
  }
  const T = NADE_MAP[prof.nade];
  prof.nades[T.id]--;
  p.nadeCd = 0.5; p.throwT = THROW_TIME;
  const sx = p.x + p.facing * 8, sy = p.y - 56;
  // Where to: the mouse, or the zombie you're shooting at, or the closest one in front of you, or just ahead.
  let tx, ty, z = null;
  if (p.aimMode === 'mouse') { tx = p.remote ? p.remote.mx : mouse.sx + G.camX; ty = p.remote ? p.remote.my : mouse.sy; }
  else {
    z = p.target && !p.target.dead ? p.target : null;
    if (!z) {
      let bd = Infinity;
      for (const q of G.zombies) {
        const dx = q.x - p.x, d = Math.abs(dx) + Math.abs(q.y - p.y) * 0.6;
        if (!q.dead && dx * p.facing > 10 && Math.abs(dx) < NADE_RANGE && d < bd) { bd = d; z = q; }
      }
    }
    if (z) { tx = z.x; ty = z.y - z.h * 0.5; } else { tx = p.x + p.facing * 340; ty = GROUND - 20; }
  }
  let dx = clamp(tx - sx, -NADE_RANGE, NADE_RANGE);
  const tFly = clamp(0.36 + Math.abs(dx) / 1100, 0.36, 0.95);
  if (z) dx = clamp(dx + (z.vx || 0) * tFly * 0.8, -NADE_RANGE, NADE_RANGE);   // aim where it's going
  const dy = clamp(ty - sy, -380, 300);
  const vx = dx / tFly + p.vx * 0.2, vy = clamp((dy - 0.5 * NADE_G * tFly * tFly) / tFly, -1150, 250);
  G.nades.push({ type: T.id, x: sx, y: sy, vx, vy, rot: 0, vr: p.facing * 12, fuse: 2.4, bounced: false, stuck: null, sx: 0, sy: 0, stickT: 0 });
  Sound.play('toss', p.x);
}
// Pick the next kind of grenade you have.
function cycleNade(p) {
  if (p.dead) return;
  const prof = p.prof, have = NADES.filter(T => nadeCount(prof, T.id) > 0);
  if (!have.length) { addText(p.x, p.y - 96, 'NO GRENADES', '#ff9a8a', 12); Sound.play('nope', p.x); return; }
  const next = have[(have.findIndex(T => T.id === prof.nade) + 1) % have.length];
  prof.nade = next.id;
  addText(p.x, p.y - 96, `${next.short} x${nadeCount(prof, next.id)}`, next.col, 13);
  Sound.play('swap', p.x);
}

// ---- Flying, bouncing, sticking ---------------------------------------------------
function updateNades(dt) {
  const ns = G.nades;
  for (let i = ns.length - 1; i >= 0; i--) {
    const g = ns[i];
    g.fuse -= dt;
    if (g.stuck) {
      const z = g.stuck;
      if (z.dead) { g.stuck = null; g.vx = rand(-60, 60); g.vy = -120; }   // its zombie died: it falls off
      else {
        g.x = z.x + g.sx; g.y = z.y + g.sy; g.stickT -= dt;
        if (g.stickT <= 0) { ns.splice(i, 1); nadeBoom(g, z); }
        continue;
      }
    }
    let hit = null;
    const steps = Math.max(1, Math.ceil(Math.hypot(g.vx, g.vy) * dt / 8)), h = dt / steps;
    for (let s = 0; s < steps && !hit; s++) {
      g.vy = Math.min(g.vy + NADE_G * h, 1600);
      const py = g.y;
      g.x += g.vx * h; g.y += g.vy * h;
      if (g.x < 12 || g.x > G.level.worldW - 12) { g.x = clamp(g.x, 12, G.level.worldW - 12); g.vx *= -0.5; }
      if (g.vy > 0) {   // landing on the ground or on a platform: bounce, then roll
        let floor = GROUND;
        for (const pl of G.platforms) if (py <= pl.top - NADE_R + 0.5 && g.y >= pl.top - NADE_R && g.x > pl.x - 4 && g.x < pl.x + pl.w + 4) floor = Math.min(floor, pl.top);
        if (g.y >= floor - NADE_R) {
          g.y = floor - NADE_R;
          if (g.vy > 160) Sound.play('clink', g.x);
          g.bounced = true;
          if (g.vy > 90) { g.vy = -g.vy * 0.42; g.vx *= 0.72; } else { g.vy = 0; g.vx *= Math.exp(-5 * h); }
        }
      }
      for (const z of G.zombies) {
        if (!z.dead && g.x > z.x - z.w / 2 - 3 && g.x < z.x + z.w / 2 + 3 && g.y > z.y - z.h - 3 && g.y < z.y + 3) { hit = z; break; }
      }
    }
    g.rot += (g.vy === 0 ? g.vx / NADE_R : g.vr) * dt;
    if (hit) {
      if (!g.bounced) { ns.splice(i, 1); nadeBoom(g, hit); continue; }   // a direct hit: BOOM!
      g.stuck = hit; g.stickT = 0.55; g.vx = g.vy = 0;               // it bounced first: it sticks on, then BOOM
      g.sx = clamp(g.x - hit.x, -hit.w / 2, hit.w / 2); g.sy = clamp(g.y - hit.y, -hit.h + 4, -4);
      ring(g.x, g.y, 16, NADE_MAP[g.type].col, 0.25);
      Sound.play('beep', g.x);
      continue;
    }
    if (g.fuse <= 0) { ns.splice(i, 1); nadeBoom(g); }
  }
}

// ---- The explosions ---------------------------------------------------------------
// on = the zombie it hit or stuck to (if any)
function nadeBoom(g, on) {
  const T = NADE_MAP[g.type], x = g.x, y = g.y;
  if (!T) return;
  blastZombies(x, y, T.radius, T.dmg, T.knock, T.freeze ? z => freezeZombie(z, T.freeze) : null);
  blastBarrels(x, y, T.radius);   // js/barrels.js
  if (T.id === 'frag') {
    flashAt(x, y, 150); fireBurst(x, y, 22, 1); smoke(x, y, 12, 16, '#4a4450'); ring(x, y, T.radius, '#ffd27a', 0.4);
    sparks(x, y, 26, -Math.PI / 2, Math.PI, '#e8e0c0', 620);
    for (let k = 0; k < 16; k++) {   // shrapnel: sharp pieces that fly out and hit zombies further away
      const a = (k / 16) * Math.PI * 2 + rand(-0.12, 0.12), sp = rand(820, 1080);
      G.bullets.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.3, max: 0.3, dist: 99, hide: 0, dmg: 28, pierce: 2, hit: new Set(), kind: 'shrap', knock: 70 });
    }
    G.shake = Math.max(G.shake, 13);
    Sound.play('frag', x);
  } else if (T.id === 'he') {
    flashAt(x, y, 290); fireBurst(x, y, 60, 1.7); smoke(x, y, 24, 26, '#3e3846');
    ring(x, y, T.radius, '#ffb347', 0.5); ring(x, y, T.radius * 0.55, '#fff0c0', 0.3);
    sparks(x, y, 30, -Math.PI / 2, Math.PI, '#ffcf6a', 760);
    if (y > GROUND - 40) { dust(x - 40, GROUND, 6); dust(x + 40, GROUND, 6); }
    G.shake = Math.max(G.shake, 22);
    Sound.play('bigboom', x);
  } else if (T.id === 'acid') {
    goo(x, y, 34, 0, 1.6); ring(x, y, T.radius, '#9dff5a', 0.45); flashAt(x, y, 80); smoke(x, y, 8, 14, '#7fbf3a');
    // The puddle goes where that zombie is standing (not on a car roof above its feet), or under the grenade.
    const floorY = on && on.onGround ? on.y : surfaceBelow(x, y - 2);
    G.pools.push({ kind: 'acid', x, y: floorY, w: T.pool.w, t: T.pool.t, max: T.pool.t, dps: T.pool.dps, tick: 0 });
    G.shake = Math.max(G.shake, 8);
    Sound.play('acid', x);
  } else {   // cryo
    ring(x, y, T.radius, '#bff4ff', 0.5); ring(x, y, T.radius * 0.55, '#ffffff', 0.3);
    sparks(x, y, 34, -Math.PI / 2, Math.PI, '#dff8ff', 560); sparks(x, y, 16, -Math.PI / 2, Math.PI, '#5ad8ff', 400);
    smoke(x, y, 16, 20, '#cfefff');
    G.shake = Math.max(G.shake, 9);
    Sound.play('freeze', x);
  }
}
// Frozen solid for a while (bosses shake it off sooner). See updateZombies in js/zombies.js.
function freezeZombie(z, t) {
  if (z.dead) return;
  if (!(z.frozen > 0)) sparks(z.x, z.y - z.h * 0.5, 6, -Math.PI / 2, Math.PI, '#dff8ff', 200);
  z.frozen = Math.max(z.frozen || 0, z.T.boss ? t * 0.4 : t);
  z.chargeT = z.windT = 0; z.pose = 0; z.kbx *= 0.3;
}
// Puddles (js/barrels.js makes them too): acid and burning oil hurt the zombies standing in them,
// sticky slime glues their feet (not crows flying over).
function updatePools(dt) {
  for (let i = G.pools.length - 1; i >= 0; i--) {
    const q = G.pools[i];
    q.t -= dt; q.tick -= dt;
    if (q.tick <= 0) {
      q.tick = 0.25;
      for (const z of G.zombies) {
        if (z.dead || z.T.fly || Math.abs(z.x - q.x) > q.w / 2 + z.w * 0.25 || Math.abs(z.y - q.y) > 8) continue;
        if (q.kind === 'goo') { z.sticky = Math.max(z.sticky || 0, 0.4); continue; }   // see updateZombies
        hurtZombie(z, q.dps * 0.25, 0, 0, true, false);
        if (Math.random() < 0.5) {
          if (q.kind === 'fire') addPart({ type: 'fire', x: z.x + rand(-z.w / 2, z.w / 2), y: z.y - rand(0, z.h * 0.6), vx: rand(-20, 20), vy: rand(-120, -50), g: 0, life: rand(0.25, 0.5), size: rand(4, 8) });
          else smoke(z.x + rand(-6, 6), z.y - 6, 1, 6, '#9be36a');
        }
      }
    }
    if (q.t <= 0) G.pools.splice(i, 1);
  }
}

// ---- Drawing ----------------------------------------------------------------------
// One grenade, standing up, about 13 pixels tall around (0, 0).
function nadeTop(c) {
  fillRR(c, -2.2, -7.2, 4.4, 3, 1, '#8a8f96');
  c.strokeStyle = '#b8bdc5'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(1.8, -6.2); c.quadraticCurveTo(6.2, -4.6, 5.4, 2); c.stroke();   // the spoon
  c.strokeStyle = '#e0c860'; c.lineWidth = 0.9; c.beginPath(); c.arc(-3.4, -7.2, 1.7, 0, Math.PI * 2); c.stroke();   // the pin ring
}
function drawNade(c, id) {
  switch (id) {
    case 'frag': {   // the classic "pineapple"
      c.fillStyle = '#4f5f2c'; c.beginPath(); c.ellipse(0, 1.2, 5.2, 6, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(20,28,10,.65)'; c.lineWidth = 0.8; c.beginPath();
      for (const yy of [-1.6, 1.4, 4.4]) { c.moveTo(-5, yy); c.lineTo(5, yy); }
      for (const xx of [-2.5, 0, 2.5]) { c.moveTo(xx, -4.4); c.lineTo(xx, 6.8); }
      c.stroke();
      circle(c, -1.8, -1.4, 1.2, 'rgba(255,255,255,.25)');
      break;
    }
    case 'he': {   // a can of high explosive with a red band
      fillRR(c, -4.6, -4.8, 9.2, 11.8, 2.2, '#2c2e34');
      c.fillStyle = '#d83a2e'; c.fillRect(-4.6, -0.6, 9.2, 3);
      c.fillStyle = '#ffd23f'; c.fillRect(-4.6, 2.6, 9.2, 0.9);
      c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(-3.4, -4, 1.3, 9.6);
      break;
    }
    case 'acid': {   // a glass ball of glowing green acid
      circle(c, 0, 1.4, 5.7, '#2f6a1a');
      circle(c, 0, 1.4, 4.8, '#5fd12a');
      c.fillStyle = '#9dff5a'; c.beginPath(); c.arc(0, 1.4, 4.8, 0.1, Math.PI - 0.1); c.fill();
      circle(c, -1.6, 2.8, 0.9, '#e0ffc0'); circle(c, 1.8, 1, 0.7, '#e0ffc0'); circle(c, 0.4, 4, 0.6, '#e0ffc0');
      circle(c, -2, -1, 1.3, 'rgba(255,255,255,.55)');
      break;
    }
    case 'cryo': {   // an icy canister with a glowing blue window and a snowflake
      fillRR(c, -4.5, -4.8, 9, 11.8, 3, '#e4f6ff');
      fillRR(c, -2.7, -2.6, 5.4, 7.2, 2, '#3ac8ff');
      c.strokeStyle = '#ffffff'; c.lineWidth = 0.7; c.beginPath();
      for (let k = 0; k < 3; k++) { const a = k * Math.PI / 3; c.moveTo(Math.cos(a) * 2.2, 1 + Math.sin(a) * 2.2); c.lineTo(-Math.cos(a) * 2.2, 1 - Math.sin(a) * 2.2); }
      c.stroke();
      c.fillStyle = '#5a7a96'; c.fillRect(-4.5, -4.8, 9, 1.3); c.fillRect(-4.5, 5.7, 9, 1.3);
      break;
    }
  }
  nadeTop(c);
}
function drawNades(c) {
  for (const g of G.nades) {
    c.save(); c.translate(g.x, g.y); c.rotate(g.rot || 0); c.scale(1.35, 1.35);   // a bit bigger than life, so you can follow it
    drawNade(c, g.type);
    // the blinking light blinks faster when it's about to blow
    const fast = g.stuck || g.fuse < 0.8;
    if (Math.floor(G.t * (fast ? 18 : 7)) % 2) { c.globalCompositeOperation = 'lighter'; circle(c, 0, -8.4, 2.6, 'rgba(255,60,40,.6)'); circle(c, 0, -8.4, 1.2, '#ffd0c0'); c.globalCompositeOperation = 'source-over'; }
    c.restore();
  }
}
function drawPools(c) {
  for (const q of G.pools) {
    const k = q.k !== undefined ? q.k : q.t / q.max, a = Math.min(1, k * 4);   // fades away at the end
    const w = q.w * (0.55 + 0.45 * Math.min(1, (1 - k) * 10));                 // spreads out fast
    c.save();
    if (q.kind === 'fire') { drawFirePool(c, q, w, a); c.restore(); continue; }
    if (q.kind === 'goo') { drawSlimePool(c, q, w, a); c.restore(); continue; }
    c.globalAlpha = 0.8 * a;
    c.fillStyle = '#4fb81f'; c.beginPath(); c.ellipse(q.x, q.y, w / 2, 6, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#9dff5a'; c.beginPath(); c.ellipse(q.x, q.y - 1, Math.max(4, w / 2 - 10), 3.2, 0, 0, Math.PI * 2); c.fill();
    for (let i = 0; i < 8; i++) {   // bubbles
      const ph = (G.t * 1.3 + i * 0.37 + hash(i + q.x) * 0.5) % 1, bx = q.x + (hash(i * 7.3 + q.x) - 0.5) * (w - 18);
      c.globalAlpha = a * (1 - ph) * 0.9; circle(c, bx, q.y - 2 - ph * 15, 1.4 + ph * 2.4, '#d8ffa8');
    }
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.16 * a; c.fillStyle = '#7CFC4A';
    c.beginPath(); c.ellipse(q.x, q.y - 5, w / 2 + 8, 16, 0, 0, Math.PI * 2); c.fill();
    c.restore();
  }
}
// Frozen zombies are stuck in a block of ice.
function drawIce(c) {
  for (const z of G.zombies) {
    if (z.dead || !(z.frozen > 0)) continue;
    const x0 = z.x - z.w / 2 - 5, y0 = z.y - z.h - 6, w = z.w + 10, h = z.h + 8;
    fillRR(c, x0, y0, w, h, 7, 'rgba(160,225,255,0.4)');
    c.strokeStyle = 'rgba(235,250,255,0.9)'; c.lineWidth = 2; rr(c, x0, y0, w, h, 7); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 2.5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x0 + 6, y0 + 9); c.lineTo(x0 + 6, y0 + h * 0.45); c.moveTo(x0 + 11, y0 + 7); c.lineTo(x0 + 17, y0 + 7); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(x0 + w * 0.72, y0); c.lineTo(x0 + w * 0.56, y0 + h * 0.3); c.lineTo(x0 + w * 0.76, y0 + h * 0.46); c.stroke();
    c.lineCap = 'butt';
  }
}
// The arm that just threw a grenade swings over your head (drawn behind the body, see drawPlayer).
function drawThrowArm(c, p, sleeve, arm, hand) {
  const k = 1 - p.throwT / THROW_TIME, a = -1.9 + (1 - (1 - k) * (1 - k)) * 2.4;
  c.save(); c.translate(1, -45); c.rotate(a);
  c.lineCap = 'round';
  c.strokeStyle = sleeve; c.lineWidth = 7; c.beginPath(); c.moveTo(0, 0); c.lineTo(6, 0); c.stroke();
  c.strokeStyle = arm; c.lineWidth = 5; c.beginPath(); c.moveTo(5, 0); c.lineTo(17, 0); c.stroke();
  circle(c, 18, 0, 3.2, hand);
  c.lineCap = 'butt';
  c.restore();
}
// The HUD row in each player's panel: how many of each kind you have. The kind you'll throw is lit up.
function drawNadeRow(c, p, x, y, w) {
  const sw = (w - 20) / NADES.length;
  NADES.forEach((T, i) => {
    const sx = x + 10 + i * sw, have = nadeCount(p.prof, T.id), sel = p.prof.nade === T.id;
    if (sel) { fillRR(c, sx, y - 8, sw - 4, 16, 6, 'rgba(255,210,63,.2)'); c.strokeStyle = '#FFD23F'; c.lineWidth = 1.5; rr(c, sx, y - 8, sw - 4, 16, 6); c.stroke(); }
    c.globalAlpha = have ? 1 : 0.35;
    c.save(); c.translate(sx + 10, y + 0.5); c.scale(0.95, 0.95); drawNade(c, T.id); c.restore();
    text(c, String(have), sx + 19, y + 0.5, { size: 10, align: 'left', color: have ? (sel ? '#FFD23F' : '#ffffff') : '#a99fcc', stroke: 'rgba(0,0,0,.6)', lw: 2.5 });
    c.globalAlpha = 1;
  });
}
// Pictures for the shop (wide) and the phone button (square).
const NADE_URL = {}, NADE_SQ = {};
function makeNadeIcons() {
  for (const T of NADES) {
    for (const [cw, ch, s, store] of [[240, 96, 5.6, NADE_URL], [64, 64, 3.6, NADE_SQ]]) {
      const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
      const c = cv.getContext('2d');
      c.translate(cw / 2, ch / 2 + s * 0.6); c.scale(s, s); c.rotate(-0.18);
      drawNade(c, T.id);
      store[T.id] = cv.toDataURL();
    }
  }
}
