'use strict';
// The Sewer update's zombies and their tricks (their stats are in ZTYPES in js/zombies.js):
//   Bomb Carrier  hugs a big cartoon bomb. When it gets close it lights the fuse... BOOM! The blast hurts you
//                 AND the zombies, so shoot it first, while it's in a crowd. Bombs set each other off.
//   Junk Thrower  stops and throws bricks, tin cans and old boots (the throw is bossThrowAI in js/bosses.js).
//   Riot Zombie   its shield stops bullets from the front. Shoot it from behind (jump over!), use explosives,
//                 lasers or a truck, or keep shooting until the shield breaks.
//   Screamer      stops and SCREAMS, and every zombie near it goes wild for a few seconds (faster, with red steam).
//   Sewer Rat, Zombie Bat, Baby Gator, and Slime Blobs that split in two when they pop.
//   The Sludge Monster: the Sewer Escape boss, a giant slime blob that splits into four slime blobs.

const BOMB = { fuse: 0.85, delay: 0.14, r: 130, hurt: 22, reach: 105 };   // r = blast size for zombies, reach = for players
const SCREAM = { every: [5, 7.5], dur: 1.1, r: 340, rage: 5, fast: 1.5 };   // rage = seconds they stay wild, fast = how much faster

// ---- Bomb Carrier -------------------------------------------------------------------------
// Close to you? Light the fuse, hold the bomb up high, and stand still.
function bombieAI(z, target, adx) {
  if (z.fuse > 0) { z.vx = 0; z.pose = 1; return; }
  if (target && adx < z.w / 2 + target.w / 2 + 34 && Math.abs(target.y - z.y) < 80) {
    z.fuse = BOMB.fuse; z.pose = 1; z.vx = 0;
    Sound.play('fuse', z.x);
  }
}
// true = the fuse ran out and it blew up.
function burnFuse(z, dt) {
  z.fuse -= dt;
  if (z.fuse > 0) return false;
  z.fuse = 0; z.boomT = 0.001;
  killZombie(z, z.facing);
  return true;
}
// BOOM. It hurts every zombie nearby (and sets off other bombs and barrels), and you, if you're too close.
function bombieBlast(z) {
  z.boomT = 0;
  const x = z.x, y = z.y - z.h * 0.45;
  flashAt(x, y, 170); fireBurst(x, y, 30, 1.1); smoke(x, y, 12, 18, '#3e3846'); ring(x, y, BOMB.r, '#ffd27a', 0.4);
  sparks(x, y, 16, -Math.PI / 2, Math.PI, '#ffcf6a', 520);
  G.shake = Math.max(G.shake, 12);
  Sound.play('boom', x);
  blastZombies(x, y, BOMB.r, 60 + 45 * G.level.hp, 420);
  blastBarrels(x, y, BOMB.r);
  for (const p of G.players) if (!p.dead && Math.hypot(p.x - x, (p.y - 32) - y) < BOMB.reach) hurtPlayer(p, BOMB.hurt, Math.sign(p.x - x) || 1, 1.6);
}

// ---- Riot Zombie ---------------------------------------------------------------------------
// A hit on the front of the shield: CLANG. Explosions, lasers and trucks go round it (G.noShield).
function shieldHit(z, dmg, kx) {
  z.shield -= dmg; z.shieldFlash = 0.08;
  z.kbx += (kx / z.mass) * 0.6;
  const sx = z.x + z.facing * z.w * 0.5, sy = z.y - z.h * rand(0.35, 0.75);
  sparks(sx, sy, 4, z.facing > 0 ? 0 : Math.PI, 0.9, '#e8f0ff', 260);
  Sound.play('clang', sx);
  if (z.shield > 0) return;
  z.shield = 0; z.speed *= 1.35;   // no shield: now it's angry, and faster
  for (let i = 0; i < 12; i++) addPart({ type: 'goo', x: sx, y: z.y - z.h * rand(0.15, 0.85), vx: z.facing * rand(60, 260), vy: rand(-320, -80), g: 1400, life: rand(0.5, 0.9), size: rand(2, 4), col: pick(['#a8c4dc', '#d8e8f4', '#6a8aa8']), floor: true });
  addText(z.x, z.y - z.h - 18, 'SHIELD BROKEN!', '#bfe0ff', 13);
  Sound.play('crack', sx);
}

// ---- Screamer ------------------------------------------------------------------------------
function screamAI(z, target, adx, dir, dt) {
  z.screamCd -= dt;
  if (z.screamT > 0) {
    z.screamT -= dt; z.vx = 0; z.pose = 1;
    z.ringT -= dt;
    if (z.ringT <= 0) { z.ringT = 0.24; ring(z.x + z.facing * 6, z.y - z.h * 0.86, rand(55, 85), '#ff8aa8', 0.45); }
    if (z.screamT <= 0) z.pose = 0;
    return;
  }
  if (!target || !z.onGround || z.screamCd > 0 || adx > 520) return;
  z.screamT = SCREAM.dur; z.ringT = 0; z.screamCd = rand(SCREAM.every[0], SCREAM.every[1]); z.facing = dir; z.pose = 1; z.vx = 0;
  Sound.play('scream', z.x);
  G.shake = Math.max(G.shake, 4);
  let n = 0;
  for (const q of G.zombies) {
    if (q.dead || q === z || q.T.boss || Math.abs(q.x - z.x) > SCREAM.r || Math.abs(q.y - z.y) > 220) continue;
    q.rage = SCREAM.rage; n++;
  }
  if (n >= 3) addText(z.x, z.y - z.h - 20, 'THEY GO WILD!', '#ff7a98', 14);
}
// A red glow and puffs of red steam over a zombie that's gone wild (drawn in world space, before the zombie).
function drawRage(c, z) {
  const x = z.x + z.facing * z.w * 0.1, y = z.y - z.h, k = (G.t * 2.5 + z.phase) % 1;
  c.globalAlpha = 0.25; circle(c, x, y + Math.min(14, z.h * 0.2), Math.max(9, Math.min(22, z.w * 0.5)), '#ff2a2a');
  for (const [dx, u] of [[-5, k], [6, (k + 0.5) % 1]]) { c.globalAlpha = (1 - u) * 0.8; circle(c, x + dx + Math.sin(u * 6 + z.phase) * 2, y - 4 - u * 20, 2.5 + u * 4, '#ff5a3a'); }
  c.globalAlpha = 1;
}

// ---- Slime blobs -----------------------------------------------------------------------------
// Pop! The blob splits into smaller ones that bounce out (the kill counter already counts them: brood in js/zombies.js).
function splitZombie(z) {
  const n = z.T.minis, x = z.x, big = z.T.boss;
  goo(x, z.y - z.h * 0.5, big ? 50 : 12, 0, big ? 2.2 : 1.2);
  if (big) { ring(x, z.y - z.h * 0.5, 190, '#b8f07a', 0.5); flashAt(x, z.y - z.h * 0.5, 150); G.shake = Math.max(G.shake, 16); }
  Sound.play('slime', x);
  for (let i = 0; i < n; i++) {
    const b = spawnZombie(z.T.mini), off = i - (n - 1) / 2;
    b.x = clamp(x + off * z.w * 0.3, 30, G.level.worldW - 30); b.y = z.y - 10; b.prevY = b.y;
    b.vy = -rand(380, 520); b.kbx = off * (big ? 260 : 220) + rand(-40, 40); b.onGround = false; b.hopV = 0; b.hopCd = rand(0.3, 0.6);
  }
}
function slimeLand(z) {
  if (z.x < G.camX - 40 || z.x > G.camX + W + 40) return;
  if (z.T.boss) { goo(z.x, z.y - 4, 10, 0, 1.6); Sound.play('slime', z.x); }
  else if (Math.random() < 0.5) goo(z.x, z.y - 3, 2, 0, z.h / 36);
}

// ---- Pictures ----------------------------------------------------------------------------------
// The human ones are drawn by drawZombie (js/zombies.js), which calls these for the extra bits.
// In the body's frame: x forwards, y up from the hips, tw = half the body's width.
function gearBody(c, z, tw, fl) {
  if (fl) return;
  if (z.type === 'riot') {   // a police uniform: belt, badge and shoulder patch
    c.fillStyle = '#16192a'; c.fillRect(-tw, -6, tw * 2, 3);
    circle(c, tw * 0.35, -19, 2.2, '#e8c040'); circle(c, tw * 0.35, -19, 1, '#a07a20');
  } else if (z.type === 'thrower') {   // a hi-vis vest with silver stripes, and a sack of junk on the back
    c.fillStyle = '#e8ecef'; c.fillRect(-tw, -19, tw * 2, 2.2); c.fillRect(-tw, -10, tw * 2, 2.2);
    c.fillStyle = '#8a6a3a'; c.beginPath(); c.ellipse(-tw - 4, -16, 7, 10, -0.2, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#6a4e2a'; c.fillRect(-tw - 7, -27, 6, 3);
    c.fillStyle = '#b8705a'; c.fillRect(-tw - 9, -31, 7, 4);   // a brick sticking out
    c.fillStyle = '#a8a4b0'; c.fillRect(-tw - 2, -30, 4, 5);    // and a tin can
  } else if (z.type === 'bombie') {   // burn marks
    c.fillStyle = 'rgba(20,16,16,0.45)'; circle(c, -tw * 0.4, -14, 3); circle(c, tw * 0.5, -6, 2.4); circle(c, -tw * 0.1, -22, 2);
  } else if (z.type === 'screamer') {   // a long, torn dress
    poly(c, [-tw, -2, tw, -2, tw + 3, 14, tw - 2, 11, tw * 0.4, 16, -tw * 0.1, 12, -tw * 0.6, 17, -tw - 2, 12], z.shirt);
  } else if (z.type === 'mannequin') {   // a joint at the waist, and a price tag on a string
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(-tw, -3, tw * 2, 1.5);
    c.strokeStyle = '#ddd'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(tw * 0.6, -4); c.lineTo(tw * 0.9, 4); c.stroke();
    fillRR(c, tw * 0.6, 4, 6, 4, 1, '#ffffff'); c.fillStyle = '#d83a2a'; c.fillRect(tw * 0.6 + 1, 5.5, 4, 1);
  }
}
// In the head's frame (the face looks to the right).
function gearHead(c, z, fl) {
  const W1 = fl ? '#ffffff' : null;
  if (z.type === 'riot') {   // a riot helmet with a see-through visor
    c.fillStyle = W1 || '#1e2438'; c.beginPath(); c.ellipse(0.5, -6, 10, 7.5, 0, Math.PI, 0); c.fill();
    c.fillRect(-9.5, -6.5, 19.5, 3);
    c.fillStyle = 'rgba(170,210,240,0.4)'; c.fillRect(-1, -4, 11, 9);
    c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(6, -3, 1.5, 6);
  } else if (z.type === 'thrower') {   // a yellow hard hat
    c.fillStyle = W1 || '#f2c21b'; c.beginPath(); c.ellipse(0.5, -8, 9, 6.5, 0, Math.PI, 0); c.fill();
    c.fillRect(-9, -9, 21, 2.6);
    c.fillStyle = W1 || '#d8a810'; c.fillRect(-1, -14, 3, 5);
  } else if (z.type === 'bombie') {   // a red bandana
    fillRR(c, -8.5, -9.5, 17.5, 4.5, 2, W1 || '#d83a2a');
    poly(c, [-8, -7, -14, -9, -13, -4], W1 || '#b82a1a'); poly(c, [-8, -6, -13, -2, -10, -1], W1 || '#d83a2a');
  } else if (z.type === 'mannequin' && z.pose !== 3 && !fl) {   // moving: cracks in its plastic face
    c.strokeStyle = 'rgba(60,40,30,0.7)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(-4, -8); c.lineTo(-1, -3); c.lineTo(-3, 1); c.moveTo(7, -7); c.lineTo(5, -4); c.stroke();
  } else if (z.type === 'screamer') {   // long stringy hair, and a HUGE mouth when it screams
    c.strokeStyle = fl ? '#ffffff' : '#1e1a22'; c.lineWidth = 2.2; c.lineCap = 'round'; c.beginPath();
    for (let i = 0; i < 6; i++) { const hx = -8 + i * 2.6; c.moveTo(hx, -9); c.quadraticCurveTo(hx - 4, 2, hx - 6 + Math.sin(G.t * 2 + i + z.phase) * 1.5, 16 - i); }
    c.stroke(); c.lineCap = 'butt';
    if (z.pose === 1 && !z.dead) {
      c.fillStyle = '#1a0508'; c.beginPath(); c.ellipse(4.5, 5, 3.6, 6, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#8a1a2a'; c.beginPath(); c.ellipse(4.5, 8, 2, 2.4, 0, 0, Math.PI * 2); c.fill();
    }
  }
}
// The front arm's angle: hugging the bomb (up high when the fuse is lit), or winding up a throw.
function gearArm(z, atk) {
  const walk = -0.06 + Math.sin(z.walkT) * 0.08 - atk * 1.15;
  if (z.dead) return walk;
  if (z.type === 'bombie') return z.pose === 1 ? -1.55 + Math.sin(G.t * 30) * 0.05 : 0.15;
  if (z.type === 'thrower' && z.pose === 1) return -2.5;
  if (z.type === 'riot') return 0.1;   // holding the shield
  if (z.type === 'mannequin' && z.pose === 3) return -1.3;   // posing like a model in a shop window
  return walk;
}
function gearHand(c, z, bw, a, fl) {
  if (z.dead) return;
  const hx = 2 * bw + Math.cos(a) * 24, hy = -21 + Math.sin(a) * 24;
  if (z.type === 'bombie') drawBombieBomb(c, hx + 2, hy + 4, z.pose === 1, fl);
  else if (z.type === 'thrower' && z.pose === 1) { c.save(); c.translate(hx, hy); c.rotate(a); drawJunk(c, 'brick'); c.restore(); }
}
// A big round cartoon bomb with a fuse. lit = the fuse is burning down fast (and it flashes red).
function drawBombieBomb(c, x, y, lit, fl) {
  const r = 11, blink = lit && Math.floor(G.t * 14) % 2;
  circle(c, x, y, r + 1.4, fl ? '#ffffff' : '#8a8a9a');   // a light edge so it shows up in the dark
  circle(c, x, y, r, fl ? '#ffffff' : blink ? '#c82a1a' : '#24242e');
  circle(c, x - 3, y - 3, 2.6, 'rgba(255,255,255,0.35)');
  fillRR(c, x - 3, y - r - 3, 6, 4, 1, fl ? '#eeeeee' : '#5a5a66');
  c.strokeStyle = '#c8a870'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x, y - r - 3); c.quadraticCurveTo(x + 3, y - r - 9, x + 7, y - r - 8); c.stroke();
  const sx = x + 7, sy = y - r - 8, n = lit ? 7 : 4, len = lit ? 7 : 4;   // the spark at the end of the fuse
  c.globalCompositeOperation = 'lighter';
  circle(c, sx, sy, lit ? 4 : 2.5, 'rgba(255,200,80,0.6)');
  c.strokeStyle = '#ffe680'; c.lineWidth = 1; c.beginPath();
  for (let i = 0; i < n; i++) { const an = G.t * 9 + i * (Math.PI * 2 / n), l = len * (0.6 + 0.4 * Math.sin(G.t * 40 + i)); c.moveTo(sx, sy); c.lineTo(sx + Math.cos(an) * l, sy + Math.sin(an) * l); }
  c.stroke();
  c.globalCompositeOperation = 'source-over';
}
// Bricks, tin cans and old boots, centred on (0, 0). The Junk Thrower throws them (G.shots, js/bosses.js).
function drawJunk(c, kind) {
  if (kind === 'brick') {
    fillRR(c, -9, -5, 18, 10, 1.5, '#b05a42');
    c.strokeStyle = '#7a3a2a'; c.lineWidth = 1; c.beginPath(); c.moveTo(-9, 0); c.lineTo(9, 0); c.moveTo(-2, -5); c.lineTo(-2, 0); c.moveTo(4, 0); c.lineTo(4, 5); c.stroke();
  } else if (kind === 'can') {
    fillRR(c, -5, -8, 10, 16, 2, '#b8bcc8'); c.fillStyle = '#d8402f'; c.fillRect(-5, -4, 10, 7);
    c.fillStyle = '#ffffff'; c.fillRect(-3, -1.5, 6, 1.5); c.fillStyle = '#8a8e98'; c.fillRect(-5, -8, 10, 1.5);
  } else {   // an old boot
    fillRR(c, -6, -9, 9, 15, 2, '#5a3a24'); fillRR(c, -6, 2, 16, 6, 3, '#5a3a24');
    c.fillStyle = '#2a1a10'; c.fillRect(-6, 6, 16, 2.4);
    c.strokeStyle = '#c8b890'; c.lineWidth = 0.8; c.beginPath(); for (let y = -6; y < 2; y += 3) { c.moveTo(-3, y); c.lineTo(2, y + 1); } c.stroke();
  }
}
// The riot shield, in front of the zombie (in its facing frame, feet at 0). It cracks as it takes hits.
function drawRiotShield(c, z) {
  const k = clamp(z.shield / (z.maxShield || 1), 0, 1), fl = z.shieldFlash > 0;
  const x = 12, top = -60, h = 56, w = 9;
  fillRR(c, x, top, w, h, 3, fl ? 'rgba(255,255,255,0.9)' : 'rgba(150,190,225,0.55)');
  c.strokeStyle = fl ? '#ffffff' : '#2a3450'; c.lineWidth = 1.6; rr(c, x, top, w, h, 3); c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.75)'; c.fillRect(x + 1.5, top + 10, w - 3, 3);   // a white band
  c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(x + 1.5, top + 3, 1.6, h - 6);  // shine
  c.strokeStyle = 'rgba(30,40,60,0.85)'; c.lineWidth = 0.9; c.beginPath();
  if (k < 0.7) { c.moveTo(x + 2, top + 22); c.lineTo(x + 5, top + 28); c.lineTo(x + 3, top + 34); c.lineTo(x + 7, top + 40); }
  if (k < 0.4) { c.moveTo(x + 7, top + 6); c.lineTo(x + 4, top + 14); c.lineTo(x + 7, top + 20); c.moveTo(x + 5, top + 28); c.lineTo(x + 8, top + 31); c.moveTo(x + 3, top + 34); c.lineTo(x + 1, top + 48); }
  c.stroke();
}
// A zombie bat (facing right, feet at 0). pose 2 = swooping down.
function drawBat(c, z, k, atk) {
  const flap = z.dead ? -0.2 : Math.sin(z.walkT * 1.7), dive = z.pose === 2;
  c.translate(0, -10); c.rotate(dive ? 0.45 : z.dead ? 0 : Math.sin(G.t * 9 + z.phase) * 0.08);
  const wing = (col, amp, off) => {   // a leathery wing: + = up, - = down
    const f = flap * amp + off;
    c.fillStyle = col; c.beginPath();
    c.moveTo(3, -1); c.lineTo(-1, -15 * f - 1); c.lineTo(-14, -12 * f - 3);
    c.quadraticCurveTo(-11, -6 * f, -9, -3 * f);
    c.quadraticCurveTo(-7, -3 * f, -6, -0.5 * f + 1);
    c.quadraticCurveTo(-3, -0.5 * f, -1, 2);
    c.closePath(); c.fill();
  };
  wing(k.dark, 0.9, 0.1);
  c.fillStyle = k.fur; c.beginPath(); c.ellipse(0, 0, 7, 4.5, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = k.fl ? '#ffffff' : z.shirt; c.lineWidth = 0.8; c.beginPath(); c.moveTo(-4, 0.5); c.lineTo(3, 0.5); c.stroke();   // bones showing
  circle(c, 6, -2, 4, k.fur);
  poly(c, [3.5, -4, 4, -10, 6.5, -5], k.fur); poly(c, [6.5, -5, 8.5, -10, 9, -4], k.fur);   // big ears
  c.fillStyle = '#f0ead8'; poly(c, [7, 1, 7.8, 3.6, 8.6, 1]); poly(c, [8.8, 1, 9.4, 3.2, 10, 1]);   // fangs
  c.fillStyle = '#1a0a0a'; c.fillRect(7, 0.4, 3.4, 0.9 + atk * 1.5);
  zEye(c, 7.5, -2.6, 1.1, z.eye, z.dead);
  c.strokeStyle = k.fl ? '#ffffff' : '#5a4a50'; c.lineWidth = 1; c.beginPath(); c.moveTo(-5, 3); c.lineTo(-8, 6); c.moveTo(-3, 3.5); c.lineTo(-5, 7); c.stroke();   // little feet
  wing(k.fur, 1, 0);
}
// A slime blob (facing right, feet at 0): squashed flat on the floor, stretched tall in the air, wobbling.
// The Sludge Monster has junk floating inside it. pose 1 = about to spit goo.
function drawSlimeBlob(c, z, k, atk) {
  const boss = z.T.boss, air = !z.onGround && !z.dead, ph = G.t * 5 + z.phase;
  const sq = air ? 0.84 : 1.1 + Math.sin(ph) * 0.05, rx = 21 * sq, hh = 36 / sq;
  const body = (r, h, col) => {
    c.fillStyle = col; c.beginPath(); c.moveTo(-r, 0);
    c.bezierCurveTo(-r * 1.08, -h * 0.72, -r * 0.55, -h, 0, -h);
    c.bezierCurveTo(r * 0.55, -h, r * 1.08, -h * 0.72, r, 0);
    for (let i = 0; i <= 6; i++) { const x = r - (i / 6) * 2 * r; c.lineTo(x, i % 2 ? 2.2 : 0); }   // a drippy bottom edge
    c.closePath(); c.fill();
  };
  c.globalAlpha *= 0.92;
  body(rx, hh, k.fl ? '#ffffff' : z.dark);
  body(rx - 1.6, hh - 1.6, k.fur);
  c.globalAlpha /= 0.92;
  if (!k.fl) {
    c.fillStyle = z.shirt; c.globalAlpha *= 0.35; c.beginPath(); c.ellipse(-2, -hh * 0.38, rx * 0.5, hh * 0.28, 0, 0, Math.PI * 2); c.fill(); c.globalAlpha /= 0.35;   // a dark core
    if (boss) {   // junk floating inside: an old boot, a fish skeleton and a tyre
      c.globalAlpha *= 0.6;
      fillRR(c, -14, -16, 5, 7, 1, '#4a3020'); fillRR(c, -14, -11, 8, 3, 1.5, '#4a3020');
      c.strokeStyle = '#e8e0c8'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(-6, -27); c.lineTo(4, -27);
      for (let x = -4; x < 3; x += 2) { c.moveTo(x, -29); c.lineTo(x, -25); } c.stroke();
      poly(c, [4, -27, 7, -29.5, 7, -24.5], '#e8e0c8');
      c.strokeStyle = '#1a1a1a'; c.lineWidth = 1.6; c.beginPath(); c.arc(9, -12, 3.2, 0, Math.PI * 2); c.stroke();
      c.globalAlpha /= 0.6;
    }
    c.fillStyle = 'rgba(255,255,255,0.35)';   // bubbles rising inside, and a shine
    for (let i = 0; i < 3; i++) { const u = (G.t * 0.5 + i / 3 + z.phase) % 1; circle(c, -rx * 0.5 + i * rx * 0.45, -hh * (0.1 + u * 0.6), 1 + i * 0.4); }
    c.beginPath(); c.ellipse(-rx * 0.45, -hh * 0.7, rx * 0.18, hh * 0.1, -0.6, 0, Math.PI * 2); c.fill();
  }
  const ey = -hh * 0.62;   // two goggly eyes (one bigger), and a gooey grin
  for (const [ex, er] of [[4, 4.2], [12, 3.2]]) {
    circle(c, ex, ey, er, k.fl ? '#ffffff' : '#f4fff0');
    if (z.dead) zEye(c, ex, ey, er * 0.4, '#1a1a1a', true);
    else circle(c, ex + 1.2, ey + 0.6, er * 0.45, '#1a1a1a');
  }
  const open = z.dead ? 0.5 : Math.max(atk, z.pose === 1 ? 1 : 0.25);
  c.fillStyle = '#1a3a10'; c.beginPath(); c.ellipse(9, -hh * 0.32, 6, 1.5 + open * 4, 0.1, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#f0ead8'; for (const tx of [5, 8, 11]) poly(c, [tx, -hh * 0.32 - 1.5 - open * 3.5, tx + 1.2, -hh * 0.32 + 0.5 - open * 2, tx + 2.4, -hh * 0.32 - 1.5 - open * 3.5]);
  if (z.pose === 1 && boss && !z.dead) { circle(c, 9, -hh * 0.32, 3.4, '#9acd32'); circle(c, 8, -hh * 0.32 - 1, 1.2, '#e0ff9a'); }
}
