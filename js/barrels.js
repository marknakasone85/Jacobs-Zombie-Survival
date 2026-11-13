'use strict';
// Barrels and tanks standing around the maps. Shoot one, hit it, or blow it up, and it goes off and takes
// the zombies around it with it. Explosions set off the barrels close by too: CHAIN REACTIONS!
// Every barrel is back for the next wave, and a used one drops back in after BARREL_BACK seconds.
//   hp = damage it takes before it goes   w, h = its size   dmg, radius, knock = its blast (half damage at the edge)
//   hurt = damage to players standing too close   chain = its blast sets off other barrels
//   pool = the puddle it leaves   freeze = seconds zombies stay frozen   sticky = seconds zombies stay stuck
//   rocket = it flies around for this long before it blows up
//   arcs = lightning that jumps from zombie to zombie: it zaps up to arcs.jumps of them, each jump at most arcs.hop long,
//          branching to arcs.branch more from each one, and stuns them for arcs.stun seconds (bosses shake it off
//          sooner). It sets off barrels it touches too.
// To put barrels in a level, add  barrels: [[kind, x], ...]  to it in js/levels.js.

const BARRELS = Object.assign(Object.create(null), {   // no prototype: like WMAP, names that aren't barrels find nothing
  boom: { name: 'Explosive Barrel', shape: 'drum', col: '#c8372b', hp: 20, w: 32, h: 52, dmg: 340, radius: 165, knock: 620, hurt: 15, chain: true },
  oil: { name: 'Oil Drum', shape: 'drum', col: '#3a3844', hp: 20, w: 32, h: 52, dmg: 140, radius: 125, knock: 320, hurt: 10, chain: true,
    pool: { kind: 'fire', w: 270, t: 7, dps: 110 } },
  acid: { name: 'Toxic Barrel', shape: 'drum', col: '#e2bf2a', hp: 20, w: 32, h: 52, dmg: 80, radius: 135, knock: 220,
    pool: { kind: 'acid', w: 290, t: 8, dps: 100 } },
  goo: { name: 'Sticky Slime Barrel', shape: 'drum', col: '#6e34a0', hp: 20, w: 32, h: 52, dmg: 30, radius: 175, knock: 90, sticky: 4,
    pool: { kind: 'goo', w: 330, t: 10, dps: 0 } },
  ice: { name: 'Liquid Nitrogen Tank', shape: 'tank', col: '#d8eefa', hp: 20, w: 26, h: 58, dmg: 70, radius: 210, knock: 140, freeze: 4.5 },
  gas: { name: 'Gas Tank', shape: 'tank', col: '#efece0', hp: 12, w: 26, h: 58, dmg: 280, radius: 150, knock: 520, hurt: 12, chain: true, rocket: 1.1 },
  zap: { name: 'Electric Barrel', shape: 'drum', col: '#26304c', hp: 20, w: 32, h: 52, dmg: 130, radius: 230, knock: 90, arcs: { jumps: 12, hop: 170, branch: 2, stun: 2.5 } },
});
const BARREL_IDS = Object.keys(BARRELS);
const POOL_KINDS = ['acid', 'fire', 'goo'];   // puddles: acid (grenades and toxic barrels), burning oil, sticky slime
const BARREL_BACK = 30, CHAIN_DELAY = 0.14, SLIME_SLOW = 0.2;

function makeBarrel(kind, x) {
  const T = BARRELS[kind];
  return { kind, T, home: x, x, y: GROUND, w: T.w, h: T.h, hp: T.hp, armed: false, fuse: 0, dir: 1, chain: 0,
    fly: false, cx: 0, cy: 0, vx: 0, vy: 0, rot: 0, vr: 0, flyT: 0, trail: 0, gone: false, back: 0, drop: 0, wob: 0, flash: 0 };
}
const buildBarrels = L => (L.barrels || []).filter(([k, x]) => BARRELS[k] && Number.isFinite(x)).map(([k, x]) => makeBarrel(k, x));
// A new wave: every barrel is back in its place (used ones drop in from the sky).
function refillBarrels() {
  for (const b of G.barrels) {
    if (b.gone || b.fly || b.armed || b.hp < b.T.hp) Object.assign(b, makeBarrel(b.kind, b.home), { drop: b.gone || b.fly ? 1 : 0 });
  }
}
// The barrel at a spot (for bullets). One still dropping in can't be hit yet.
function barrelAt(x, y) {
  for (const b of G.barrels) {
    if (b.gone || b.drop > 0) continue;
    if (b.fly ? Math.abs(x - b.cx) < 20 && Math.abs(y - b.cy) < 20 : x > b.x - b.w / 2 && x < b.x + b.w / 2 && y > b.y - b.h && y < b.y) return b;
  }
  return null;
}

// ---- Setting them off -------------------------------------------------------------
// A bullet, a sword, flames... dir = which way it was pushed (a gas tank flies off that way).
function hitBarrel(b, dmg, dir) {
  if (b.gone || b.drop > 0) return;
  if (b.fly) { burstBarrel(b); return; }   // shoot a flying gas tank and it blows up right there
  b.wob = 1; b.flash = 0.08;
  if (b.armed) return;
  b.hp -= dmg;
  if (dir) b.dir = dir;
  sparks(b.x - (dir || 1) * b.w * 0.4, b.y - b.h * 0.5, 4, dir > 0 ? Math.PI : 0, 0.9, '#fff2c0', 260);
  Sound.play('drumhit', b.x);
  if (b.hp <= 0) setOffBarrel(b, 0, dir);
}
function setOffBarrel(b, delay, dir) {
  if (b.gone || b.drop > 0 || b.fly) return;
  if (dir) b.dir = dir;
  b.fuse = b.armed ? Math.min(b.fuse, delay) : delay;
  b.armed = true;
}
// Every explosion calls this (grenades, rockets, crossbow bolts, bloaters and barrels themselves):
// barrels inside the blast go off a moment later, so you can see the chain run along.
function blastBarrels(x, y, r, chain = 0) {
  for (const b of G.barrels) {
    if (b.gone || b.drop > 0) continue;
    if (b.fly) { if (Math.hypot(b.cx - x, b.cy - y) < r) b.flyT = Math.min(b.flyT, CHAIN_DELAY); continue; }
    const cx = clamp(x, b.x - b.w / 2, b.x + b.w / 2), cy = clamp(y, b.y - b.h, b.y);
    if (Math.hypot(cx - x, cy - y) >= r) continue;
    b.chain = Math.max(b.chain, chain);
    setOffBarrel(b, CHAIN_DELAY + rand(0, 0.08), Math.sign(b.x - x) || 1);
  }
}
// The gas tank's valve breaks off and it rockets away, spinning, until it hits a zombie (or runs out of gas).
function launchBarrel(b) {
  Object.assign(b, { fly: true, flyT: b.T.rocket, cx: b.x, cy: b.y - b.h / 2, vx: b.dir * rand(480, 600), vy: rand(-540, -380), vr: b.dir * rand(10, 15), rot: 0, trail: 0 });
  smoke(b.x, b.y - b.h, 6, 8, '#e8e6f0');
  Sound.play('hiss', b.x);
}
function flyBarrel(b, dt) {
  b.flyT -= dt;
  b.vy += 950 * dt;
  b.cx += b.vx * dt; b.cy += b.vy * dt; b.rot += b.vr * dt;
  const ww = G.level.worldW;
  if (b.cx < 20 || b.cx > ww - 20) { b.cx = clamp(b.cx, 20, ww - 20); b.vx = -b.vx * 0.6; b.vr = -b.vr; }
  if (b.cy < 40) { b.cy = 40; b.vy = Math.abs(b.vy) * 0.4; }
  if (b.cy > GROUND - 13) { b.cy = GROUND - 13; b.vy = -Math.abs(b.vy) * 0.55 - 120; b.vx *= 0.8; Sound.play('clang', b.cx); dust(b.cx, GROUND, 4); }
  b.trail -= dt;
  if (b.trail <= 0) {   // gas and fire shooting out of the broken valve
    b.trail = 0.035;
    const nx = b.cx + Math.sin(b.rot) * b.h * 0.5, ny = b.cy - Math.cos(b.rot) * b.h * 0.5;
    smoke(nx, ny, 1, 7, '#e8e6f0');
    addPart({ type: 'fire', x: nx, y: ny, vx: Math.sin(b.rot) * 160 + rand(-30, 30), vy: -Math.cos(b.rot) * 160 + rand(-30, 30), g: 0, life: 0.18, size: 6 });
  }
  for (const z of G.zombies) {
    if (!z.dead && Math.abs(z.x - b.cx) < z.w / 2 + 12 && b.cy > z.y - z.h - 12 && b.cy < z.y + 12) { burstBarrel(b); return; }
  }
  if (b.flyT <= 0) burstBarrel(b);
}

// BOOM (or SPLASH, or FWOOSH...)
function burstBarrel(b) {
  const T = b.T, x = b.fly ? b.cx : b.x, y = b.fly ? b.cy : b.y - b.h * 0.45;
  b.gone = true; b.armed = false; b.fly = false; b.back = BARREL_BACK;
  const onHit = T.freeze ? z => freezeZombie(z, T.freeze) : T.sticky ? z => { if (!z.T.fly) z.sticky = Math.max(z.sticky || 0, T.sticky); } : null;
  if (T.arcs) zapChain(x, y, T, b.chain + 1); else blastZombies(x, y, T.radius, T.dmg, T.knock, onHit);
  if (T.hurt) for (const p of G.players) if (!p.dead && Math.hypot(p.x - x, (p.y - 32) - y) < T.radius * 0.55) hurtPlayer(p, T.hurt, Math.sign(p.x - x) || 1, 1.3);
  if (T.chain) blastBarrels(x, y, T.radius, b.chain + 1);
  if (T.pool) { const P = T.pool; G.pools.push({ kind: P.kind, x, y: b.y, w: P.w, t: P.t, max: P.t, dps: P.dps, tick: 0 }); }
  if (b.chain > 0) addText(x, y - 70, `CHAIN x${b.chain + 1}!`, '#FFD23F', 18);
  for (let i = 0; i < 7; i++) {   // pieces of the barrel flying everywhere
    addPart({ type: 'shell', x: x + rand(-10, 10), y: y + rand(-14, 14), vx: rand(-320, 320), vy: rand(-560, -220), g: 1500, life: rand(0.9, 1.4),
      size: rand(3.5, 6), col: i % 3 ? T.col : shade(T.col, -0.35), rot: rand(6), vr: rand(-20, 20), bounce: 0.3 });
  }
  if (b.kind === 'boom') {
    flashAt(x, y, 230); fireBurst(x, y, 48, 1.6); smoke(x, y, 18, 24, '#3e3846');
    ring(x, y, T.radius, '#ffb347', 0.45); sparks(x, y, 26, -Math.PI / 2, Math.PI, '#ffcf6a', 720);
    dust(x - 30, GROUND, 6); dust(x + 30, GROUND, 6);
    G.shake = Math.max(G.shake, 20); Sound.play('bigboom', x);
  } else if (b.kind === 'gas') {
    flashAt(x, y, 180); fireBurst(x, y, 36, 1.35); smoke(x, y, 14, 18, '#6a6474');
    ring(x, y, T.radius, '#ffd27a', 0.4); sparks(x, y, 20, -Math.PI / 2, Math.PI, '#fff0b0', 620);
    G.shake = Math.max(G.shake, 16); Sound.play('boom', x);
  } else if (b.kind === 'oil') {
    flashAt(x, y, 150); fireBurst(x, y, 30, 1.2); smoke(x, y - 20, 16, 22, '#1e1a22'); ring(x, y, T.radius, '#ff8a3a', 0.4);
    G.shake = Math.max(G.shake, 12); Sound.play('fireball', x);
  } else if (b.kind === 'acid') {
    goo(x, y, 40, 0, 1.8); ring(x, y, T.radius, '#9dff5a', 0.45); smoke(x, y, 10, 16, '#7fbf3a'); flashAt(x, y, 70);
    G.shake = Math.max(G.shake, 8); Sound.play('acid', x);
  } else if (b.kind === 'goo') {
    goo(x, y, 44, 0, 2, 'slime'); ring(x, y, T.radius, '#ff8af0', 0.45); ring(x, y, T.radius * 0.6, '#d65cf0', 0.3);
    G.shake = Math.max(G.shake, 8); Sound.play('slime', x);
  } else if (b.kind === 'zap') {
    flashAt(x, y, 160); ring(x, y, 90, '#9fe8ff', 0.35); sparks(x, y, 30, -Math.PI / 2, Math.PI, '#dff4ff', 560); smoke(x, y, 8, 14, '#5a6a8a');
    for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + rand(-1.4, 1.4), r = rand(50, 110); zapArc(x, y, x + Math.cos(a) * r, y + Math.sin(a) * r); }   // sparks into the air
    G.shake = Math.max(G.shake, 10); Sound.play('shock', x);
  } else {   // ice
    ring(x, y, T.radius, '#bff4ff', 0.5); ring(x, y, T.radius * 0.55, '#ffffff', 0.3);
    sparks(x, y, 40, -Math.PI / 2, Math.PI, '#dff8ff', 620); sparks(x, y, 18, -Math.PI / 2, Math.PI, '#5ad8ff', 420);
    smoke(x, y, 22, 22, '#e6f6ff');
    G.shake = Math.max(G.shake, 10); Sound.play('freeze', x);
  }
}

// The electric barrel: lightning jumps to the nearest zombie, then on to the next one close to it, and so on.
// It can jump into another barrel too, and that one goes off.
const zapArc = (x1, y1, x2, y2) => addPart({ type: 'zap', x: x1, y: y1, x2, y2, vx: 0, vy: 0, g: 0, life: 0.32, seed: randi(1, 999) });
function zapChain(x, y, T, chain) {
  const A = T.arcs, done = new Set(), queue = [{ x, y, r: T.radius, branch: A.branch + 1 }];
  let count = 0;
  while (queue.length && count < A.jumps) {   // like real lightning it branches: each one zapped zaps the ones next to it
    const from = queue.shift(), near = [];
    for (const z of G.zombies) {
      if (z.dead || done.has(z)) continue;
      const tx = z.x, ty = z.y - z.h * 0.5, d = Math.hypot(tx - from.x, ty - from.y);
      if (d < from.r) near.push({ t: z, d, tx, ty, barrel: false });
    }
    for (const b of G.barrels) {
      if (b.gone || b.fly || b.drop > 0 || b.armed || done.has(b)) continue;
      const tx = b.x, ty = b.y - b.h * 0.5, d = Math.hypot(tx - from.x, ty - from.y);
      if (d < from.r) near.push({ t: b, d, tx, ty, barrel: true });
    }
    near.sort((a, b) => a.d - b.d);
    for (const n of near.slice(0, from.branch)) {
      if (count >= A.jumps) break;
      done.add(n.t); count++;
      zapArc(from.x, from.y, n.tx, n.ty);
      const dir = Math.sign(n.tx - from.x) || 1;
      if (n.barrel) { n.t.chain = Math.max(n.t.chain, chain); setOffBarrel(n.t, CHAIN_DELAY, dir); }
      else {
        hurtZombie(n.t, T.dmg, dir * T.knock, -80, true);
        if (!n.t.dead) shockZombie(n.t, A.stun);
        sparks(n.tx, n.ty, 8, -Math.PI / 2, Math.PI, '#dff4ff', 300);
      }
      queue.push({ x: n.tx, y: n.ty, r: A.hop, branch: A.branch });
    }
  }
}
function shockZombie(z, t) {
  z.shocked = Math.max(z.shocked || 0, z.T.boss ? t * 0.4 : t);
  z.chargeT = z.windT = 0; z.pose = 0;
}
// A jagged lightning bolt from (x1, y1) to (x2, y2). seed picks the zigzag, so it flickers when the seed changes.
function zigzag(c, x1, y1, x2, y2, seed) {
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
  const n = Math.max(3, Math.round(len / 16));
  c.beginPath(); c.moveTo(x1, y1);
  for (let i = 1; i < n; i++) { const off = (hash(seed * 13.7 + i * 3.1) - 0.5) * Math.min(26, len * 0.3); c.lineTo(x1 + dx * i / n + nx * off, y1 + dy * i / n + ny * off); }
  c.lineTo(x2, y2);
}
function drawZap(c, x1, y1, x2, y2, seed, a) {
  c.globalAlpha = a * 0.6; c.strokeStyle = '#4ab8ff'; c.lineWidth = 6; zigzag(c, x1, y1, x2, y2, seed); c.stroke();
  c.globalAlpha = a; c.strokeStyle = '#e8f8ff'; c.lineWidth = 2; zigzag(c, x1, y1, x2, y2, seed); c.stroke();
}
// Zapped zombies twitch and crackle with electricity (see updateZombies).
function drawShocked(c) {
  c.globalCompositeOperation = 'lighter';
  for (const z of G.zombies) {
    if (z.dead || !(z.shocked > 0)) continue;
    const f = Math.floor(G.t * 24), cy = z.y - z.h * 0.5;
    c.globalAlpha = 0.25 + 0.2 * hash(f + z.uid); c.fillStyle = '#6ac8ff';
    c.beginPath(); c.ellipse(z.x, cy, z.w * 0.7, z.h * 0.6, 0, 0, Math.PI * 2); c.fill();
    for (let k = 0; k < 2; k++) {
      const s = f * 7 + k * 31 + z.uid, a1 = hash(s) * Math.PI * 2, a2 = a1 + 1 + hash(s + 1) * 2;
      drawZap(c, z.x + Math.cos(a1) * z.w * 0.6, cy + Math.sin(a1) * z.h * 0.5, z.x + Math.cos(a2) * z.w * 0.6, cy + Math.sin(a2) * z.h * 0.5, s, 0.9);
    }
  }
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
}

function updateBarrels(dt) {
  for (const b of G.barrels) {
    b.wob = Math.max(0, b.wob - dt * 3); b.flash = Math.max(0, b.flash - dt);
    if (b.gone) {
      b.back -= dt;
      if (b.back <= 0 && G.state === 'playing') Object.assign(b, makeBarrel(b.kind, b.home), { drop: 1 });
      continue;
    }
    if (b.drop > 0) {   // falling back in from the sky
      b.drop = Math.max(0, b.drop - dt * 2.2);
      if (b.drop === 0) { dust(b.x, GROUND, 8); Sound.play('clang', b.x); }
      continue;
    }
    if (b.fly) { flyBarrel(b, dt); continue; }
    if (b.armed) {
      b.wob = 1; b.fuse -= dt;
      if (b.fuse <= 0) { b.armed = false; if (b.T.rocket) launchBarrel(b); else burstBarrel(b); }
    }
  }
}

// ---- Drawing ----------------------------------------------------------------------
// A little flame shape: bottom middle at (x, y), r wide, h tall.
function flameShape(c, x, y, r, h, col) {
  c.fillStyle = col; c.beginPath();
  c.moveTo(x, y - h);
  c.bezierCurveTo(x + r * 0.3, y - h * 0.55, x + r, y - h * 0.4, x + r, y - r);
  c.arc(x, y - r, r, 0, Math.PI);
  c.bezierCurveTo(x - r, y - h * 0.4, x - r * 0.3, y - h * 0.55, x, y - h);
  c.fill();
}
function snowflake(c, x, y, r, col) {
  c.strokeStyle = col; c.lineWidth = 1.2; c.beginPath();
  for (let k = 0; k < 3; k++) { const a = k * Math.PI / 3 + Math.PI / 2; c.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); c.lineTo(x - Math.cos(a) * r, y - Math.sin(a) * r); }
  c.stroke();
}
// A metal drum, drawn standing on (0, 0).
function drawDrum(c, T, kind) {
  const w = T.w, h = T.h, x0 = -w / 2, dark = shade(T.col, -0.35), my = -h * 0.5 + 1;
  fillRR(c, x0, -h, w, h, 5, T.col);
  c.fillStyle = 'rgba(255,255,255,0.2)'; c.fillRect(x0 + 4, -h + 3, 4, h - 6);
  c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(w / 2 - 8, -h + 3, 5, h - 6);
  c.fillStyle = dark; c.fillRect(x0, -h + 11, w, 3); c.fillRect(x0, -14, w, 3);   // the two rings round a drum
  c.fillStyle = shade(T.col, 0.15); c.beginPath(); c.ellipse(0, -h, w / 2 - 0.5, 3.5, 0, 0, Math.PI * 2); c.fill();   // the lid
  circle(c, w * 0.22, -h, 1.8, dark);
  if (kind === 'boom') {   // a yellow danger diamond with a flame on it
    c.save(); c.translate(0, my); c.rotate(Math.PI / 4);
    fillRR(c, -7.5, -7.5, 15, 15, 1.5, '#ffd23f'); c.strokeStyle = '#1a1416'; c.lineWidth = 1.2; c.strokeRect(-6, -6, 12, 12);
    c.restore();
    flameShape(c, 0, my + 5, 3.4, 10, '#1a1416');
  } else if (kind === 'oil') {   // an OIL label and black oil dribbling over the edge
    fillRR(c, x0 + 3, my - 6.5, w - 6, 13, 2, '#f2efe6');
    text(c, 'OIL', 0, my + 0.5, { size: 9, color: '#1a1416' });
    fillRR(c, -9, -h, 4, 9, 2, '#141018'); circle(c, -7, -h + 10, 2.4, '#141018');
  } else if (kind === 'acid') {   // the toxic sign, with green acid running down
    circle(c, 0, my, 9, '#1a1416');
    for (let k = 0; k < 3; k++) { const a = k * Math.PI * 2 / 3 - Math.PI / 2; circle(c, Math.cos(a) * 4.4, my + Math.sin(a) * 4.4, 3.1, T.col); }
    circle(c, 0, my, 1.8, '#1a1416');
    for (const [dx, len] of [[-10, 10], [3, 6], [9, 13]]) { fillRR(c, dx - 2, -h, 4, len, 2, '#8cff4a'); circle(c, dx, -h + len, 2.6, '#8cff4a'); }
  } else if (kind === 'zap') {   // a giant battery: yellow band, a lightning bolt, and sparks between the terminals
    c.fillStyle = '#ffd23f'; c.fillRect(x0, my - 8, w, 16);
    poly(c, [2, my - 7, -5, my + 1, -0.5, my + 1, -3, my + 7, 5, my - 2, 0.5, my - 2], '#1a1416');
    fillRR(c, -11, -h - 5, 6, 5, 1.5, '#c8372b'); fillRR(c, 5, -h - 5, 6, 5, 1.5, '#9aa4b0');   // + and - terminals
    if (hash(Math.floor(G.t * 12)) < 0.55) {
      c.globalCompositeOperation = 'lighter'; drawZap(c, -8, -h - 6, 8, -h - 6, Math.floor(G.t * 30), 0.9);
      c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    }
  } else if (kind === 'goo') {   // pink slime bubbling over the top, and a happy slime face
    c.fillStyle = '#e070f0'; c.beginPath(); c.ellipse(0, -h - 1, w / 2 + 1, 5, 0, 0, Math.PI * 2); c.fill();
    for (const [dx, len, ph] of [[-11, 11, 0], [-3, 7, 1.3], [5, 15, 2.1], [11, 9, 3.4]]) {
      const l = len + Math.sin(G.t * 2.4 + ph) * 2.5;
      fillRR(c, dx - 2.3, -h, 4.6, l, 2.3, '#e070f0'); circle(c, dx, -h + l, 2.8, '#e070f0');
    }
    circle(c, -4, -h - 4, 2.6, '#ff9af2');   // a bubble
    c.fillStyle = '#e070f0'; c.beginPath(); c.ellipse(0, my + 2, 9, 7.5, 0, Math.PI, 0); c.lineTo(9, my + 4); c.lineTo(-9, my + 4); c.fill();
    circle(c, -3.2, my, 1.6, '#ffffff'); circle(c, 3.2, my, 1.6, '#ffffff');
    circle(c, -3, my + 0.3, 0.8, '#2a1030'); circle(c, 3.4, my + 0.3, 0.8, '#2a1030');
  }
}
// A gas bottle with a valve on top, drawn standing on (0, 0).
function drawTank(c, T, kind) {
  const w = T.w, h = T.h, x0 = -w / 2, by = -h * 0.5;
  c.fillStyle = '#5e626c'; c.fillRect(x0 + 3, -7, w - 6, 7);   // the foot ring
  fillRR(c, x0, -h + 9, w, h - 14, w / 2, T.col);               // round at both ends
  fillRR(c, x0 + 4, -h + 17, 4, h - 32, 2, 'rgba(255,255,255,0.45)');
  c.fillStyle = 'rgba(0,0,0,0.16)'; c.fillRect(w / 2 - 8, -h + 17, 5, h - 32);
  if (kind === 'gas') {
    c.fillStyle = '#d8402f'; c.fillRect(x0, by - 6, w, 12);
    text(c, 'GAS', 0, by + 0.5, { size: 8, color: '#ffffff' });
  } else {   // liquid nitrogen: blue band, a snowflake and frost on the metal
    c.fillStyle = '#2f8fd8'; c.fillRect(x0, by - 6, w, 12);
    snowflake(c, 0, by, 4.5, '#ffffff');
    c.fillStyle = 'rgba(255,255,255,0.75)';
    for (let k = 0; k < 6; k++) circle(c, x0 + 4 + hash(k * 3.1) * (w - 8), -h + 14 + hash(k * 7.7) * (h - 26), 1 + hash(k) * 1.2);
  }
  fillRR(c, -8, -h + 1, 16, 10, 3, '#8a909a');   // the collar that protects the valve
  c.fillStyle = '#4a4e58'; c.fillRect(-5, -h + 3, 10, 5);
  c.fillStyle = kind === 'gas' ? '#c9a040' : '#9aa4b0'; c.fillRect(-2, -h - 3, 4, 6);
  circle(c, 0, -h - 4, 3.2, kind === 'gas' ? '#d8402f' : '#3aa8ff');
}
// Bullet holes (and what leaks out of them) once a barrel has been hit.
function drawLeaks(c, b, hpK) {
  const n = hpK >= 1 ? 0 : hpK > 0.6 ? 1 : hpK > 0.3 ? 2 : 3, w = b.w, h = b.h;
  for (let i = 0; i < n; i++) {
    const hx = (hash(i * 3.3 + 1) - 0.5) * w * 0.55, hy = -h * (0.3 + hash(i * 5.1 + 2) * 0.4), side = hx >= 0 ? 1 : -1;
    circle(c, hx, hy, 2.2, '#1a1418');
    if (b.kind === 'zap') {   // sparks crackling out of the hole
      if (hash(Math.floor(G.t * 20) + i) < 0.6) {
        c.globalCompositeOperation = 'lighter';
        drawZap(c, hx, hy, hx + side * (8 + hash(i + G.t) * 8), hy - 6 + hash(i * 2 + Math.floor(G.t * 20)) * 12, Math.floor(G.t * 30) + i, 0.9);
        c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
      }
    } else if (b.kind === 'boom' || b.kind === 'gas' || b.kind === 'ice') {   // a jet of fire, or hissing gas
      const fire = b.kind === 'boom';
      if (fire) c.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 3; k++) {
        const ph = (G.t * (fire ? 3 : 2) + k / 3 + i * 0.3) % 1;
        c.globalAlpha = (1 - ph) * (fire ? 0.8 : 0.55);
        circle(c, hx + side * (4 + ph * 18), hy - ph * (fire ? 14 : 8), 2 + ph * (fire ? 3 : 5), fire ? (ph < 0.4 ? '#ffe08a' : '#ff7a2e') : '#ffffff');
      }
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    } else {   // a stream of oil, acid or slime pouring down
      const col = b.kind === 'oil' ? '#141018' : b.kind === 'acid' ? '#8cff4a' : '#e070f0';
      c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.moveTo(hx, hy); c.quadraticCurveTo(hx + side * 9, hy, hx + side * 11, 0); c.stroke();
      c.fillStyle = col; c.beginPath(); c.ellipse(hx + side * 11, 0, 6, 1.8, 0, 0, Math.PI * 2); c.fill();
    }
  }
}
function drawBarrelBody(c, b) {
  const hpK = b.hpK !== undefined ? b.hpK : b.hp / b.T.hp;
  if (b.T.shape === 'tank') drawTank(c, b.T, b.kind); else drawDrum(c, b.T, b.kind);
  drawLeaks(c, b, hpK);
  if (b.armed) {   // about to go: it glows
    c.globalCompositeOperation = 'lighter';
    fillRR(c, -b.w / 2, -b.h, b.w, b.h, 5, `rgba(255,90,40,${0.25 + 0.2 * Math.sin(G.t * 50)})`);
    c.globalCompositeOperation = 'source-over';
  }
  if (b.flash > 0) fillRR(c, -b.w / 2, -b.h, b.w, b.h, 5, `rgba(255,255,255,${Math.min(0.7, b.flash * 8)})`);
}
// flying = draw only the gas tanks flying around (they go in front of the zombies)
function drawBarrels(c, flying) {
  for (const b of G.barrels) {
    if (b.gone || b.fly !== flying) continue;
    if (flying) {
      c.save(); c.translate(b.cx, b.cy); c.rotate(b.rot || 0); c.translate(0, b.h / 2);
      drawBarrelBody(c, b);
      const L = 22 + Math.sin(G.t * 60) * 5, top = -b.h - 5;   // the jet out of the broken valve
      c.globalCompositeOperation = 'lighter';
      c.fillStyle = 'rgba(255,140,40,0.75)'; c.beginPath(); c.moveTo(-5, top); c.lineTo(5, top); c.lineTo(0, top - L); c.fill();
      c.fillStyle = 'rgba(255,240,190,0.9)'; c.beginPath(); c.moveTo(-2.5, top); c.lineTo(2.5, top); c.lineTo(0, top - L * 0.6); c.fill();
      c.globalCompositeOperation = 'source-over';
      c.restore();
      continue;
    }
    if (b.x + 80 < G.camX || b.x - 80 > G.camX + W) continue;
    const lift = b.drop > 0 ? b.drop * b.drop * 340 : 0;
    drawShadow(c, b.x, b.y - lift, b.w);
    c.save(); c.translate(b.x, b.y - lift);
    if (b.armed) c.translate(Math.sin(G.t * 70) * 1.5, 0);
    if (b.wob > 0) c.rotate(Math.sin(G.t * 45) * 0.07 * b.wob);
    drawBarrelBody(c, b);
    c.restore();
  }
}

// ---- Puddles ----------------------------------------------------------------------
// Burning oil: a black slick with flames dancing on it.
function drawFirePool(c, q, w, a) {
  c.globalAlpha = 0.85 * a;
  c.fillStyle = '#17121a'; c.beginPath(); c.ellipse(q.x, q.y, w / 2, 5, 0, 0, Math.PI * 2); c.fill();
  c.globalCompositeOperation = 'lighter';
  c.globalAlpha = 0.3 * a; c.fillStyle = '#ff7a2e';
  c.beginPath(); c.ellipse(q.x, q.y - 10, w / 2 + 10, 24, 0, 0, Math.PI * 2); c.fill();
  const n = Math.max(5, Math.round(w / 18));
  for (let i = 0; i < n; i++) {
    const fx = q.x + ((i + 0.5) / n - 0.5) * (w - 16) + (hash(i + q.x) - 0.5) * 8;
    const flick = 0.6 + 0.4 * Math.sin(G.t * (9 + hash(i * 3.1) * 6) + i * 1.7), fh = (28 + hash(i * 5.7 + q.x) * 34) * flick * (0.4 + 0.6 * a);
    c.globalAlpha = 0.85 * a;
    flameShape(c, fx, q.y, 8 + hash(i) * 5, fh, '#e8381a');
    flameShape(c, fx, q.y, 5 + hash(i) * 3, fh * 0.7, '#ff8a2a');
    flameShape(c, fx, q.y, 2.5 + hash(i) * 2, fh * 0.4, '#fff0a0');
  }
  c.globalCompositeOperation = 'source-over';
}
// Sticky slime: shiny pink goo with bubbles that stretch and pop.
function drawSlimePool(c, q, w, a) {
  c.globalAlpha = 0.9 * a;
  c.fillStyle = '#8a2fae'; c.beginPath(); c.ellipse(q.x, q.y, w / 2, 7, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#d65cf0'; c.beginPath(); c.ellipse(q.x, q.y - 1.5, Math.max(4, w / 2 - 12), 4, 0, 0, Math.PI * 2); c.fill();
  for (let i = 0; i < 9; i++) {
    const ph = (G.t * 0.7 + hash(i * 2.3 + q.x)) % 1, bx = q.x + (hash(i * 7.3 + q.x) - 0.5) * (w - 24);
    c.globalAlpha = a * (ph < 0.85 ? 0.9 : (1 - ph) * 6);
    circle(c, bx, q.y - 2 - ph * 5, 2 + ph * 4, '#ff9af2');
    circle(c, bx - 1 - ph, q.y - 3 - ph * 6.5, 0.8 + ph, '#ffffff');
  }
  c.globalAlpha = 0.6 * a; c.fillStyle = '#ffffff';
  c.beginPath(); c.ellipse(q.x - w * 0.18, q.y - 3, w * 0.12, 1.2, 0, 0, Math.PI * 2); c.fill();
}
// Zombies stuck in slime have pink goo stretching up their legs.
function drawSlimeFeet(c) {
  for (const z of G.zombies) {
    if (z.dead || !(z.sticky > 0) || z.T.fly) continue;
    const w = z.w * 0.8;
    c.fillStyle = '#b03ad8'; c.beginPath(); c.ellipse(z.x, z.y - 1, w / 2, 5, 0, 0, Math.PI * 2); c.fill();
    for (let i = 0; i < 4; i++) {
      const sx = z.x + (i / 3 - 0.5) * w * 0.8, sh = 6 + hash(i + z.uid) * 12 + Math.sin(G.t * 5 + i) * 2;
      fillRR(c, sx - 2.5, z.y - sh, 5, sh, 2.5, '#d65cf0');
    }
    circle(c, z.x - w * 0.2, z.y - 3, 1.5, 'rgba(255,255,255,.7)');
  }
}
