'use strict';
// The twist at the end of the last level (a level with  finale: true). When its last wave is beaten:
//   0 s    "IT'S NOT OVER!" Giant bosses and a flood of zombies come from both sides, and they keep coming.
//          Hang on: nobody can drop below 1 health while it lasts, because the air force is on its way.
//   8 s    "AIR SUPPORT INCOMING!" The flood gets even thicker, so there's plenty to blow up.
//   10 s   Two fighter jets roar past, dropping bombs...
//   11.4 s ...a stealth bomber drops a carpet of bombs on both sides of you (never right on you). SLOW MOTION!
//   15.2 s The jets come back the other way with more bombs.
//   16.4 s "HEAVY BOMBERS!" A squadron of three huge bombers flies over, carpet bombing everything. SLOW MOTION again.
//          The flood keeps coming the whole time (so there's always a crowd to blow up), until 20.6 s.
//   23 s   Two gunship helicopters fly in from both sides and shoot whatever is left.
//   Then the level is beaten for real, the gunships fly off and the rescue helicopter comes (js/rescue.js).
// G.finale = { t, x (where it started), jx (the jets' aim), bx (the stealth bomber's), hx (the heavy bombers'),
//              gx (where the gunships hover), endT, slow (how slow time runs: 1 = normal) }.
// Everything in the sky comes from those numbers and the clock, so Wi-Fi friends only need them (snapshot fn).

const FIN = {
  air: 8, jets: 10, bomber: 11.4, bomberEnd: 15.4, drop0: 11.9, drop1: 14.7, dropGap: 0.12, jets2: 15.2,
  heavy: 16.4, heavyEnd: 24, hdrop0: 17, hdrop1: 21.6, hdropGap: 0.15, floodEnd: 20.6, gun: 23.2, gunReady: 24.7, giveUp: 54,
  slow1: 12.6, slow2: 19.6,   // the two slow-motion moments (game time), and how long they last (real seconds) below
};
const SLOW = { k: 0.28, len1: 1.4, len2: 2.0 };
const JET_Y = 125, BOMBER_Y = 150, JET_SPEED = 1200, HEAVY_SPEED = 330, HEAVY_Y = [130, 164, 198], HEAVY_GAP = 170;   // low enough to fly under the scores at the top
const BOMB_Y = BOMBER_Y + 20, BOMB_G = 900, BOMB_FALL = Math.sqrt(2 * (GROUND - 16 - BOMB_Y) / BOMB_G), BOMBER_SPEED = 450;
const FLOOD = { walker: 95, runner: 50, dog: 30, tiny: 20, giant: 10, bombie: 8, thrower: 6 }, FLOOD_BOSSES = ['roadhulk', 'boss', 'roadhulk', 'boss', 'boss'];
const FLOOD_POOL = Object.entries(FLOOD).flatMap(([type, n]) => Array(n).fill(type));   // more of the same mix, to keep the flood coming

const finaleCenter = () => { const ps = alivePlayers().length ? alivePlayers() : G.players; return ps.length ? ps.reduce((n, p) => n + p.x, 0) / ps.length : G.camX + W / 2; };
const bomberX = (F, t) => F.bx + 900 - BOMBER_SPEED * (t - FIN.bomber);
const jetX = (F, pass, k, t) => pass ? F.bx + 900 - JET_SPEED * (t - FIN.jets2 - k * 0.45) : F.jx - 900 + JET_SPEED * (t - FIN.jets - k * 0.45);
const heavyX = (F, k, t) => F.hx - 1000 - k * HEAVY_GAP + HEAVY_SPEED * (t - FIN.heavy);

function startFinale() {
  const x = finaleCenter();
  G.finale = { t: 0, x, jx: x, bx: x, hx: x, gx: x, endT: 0, slow: 1, boomed: 0, dropped: 0, shots: 0, gunT: 0 };
  const team = Math.max(1, G.players.length), more = 1 + 0.3 * (team - 1), q = [];
  for (const [type, n] of Object.entries(FLOOD)) for (let i = 0; i < Math.round(n * more); i++) q.push(type);
  G.queue = shuffle(q).concat(FLOOD_BOSSES);   // the bosses come first (the queue is used from the end)
  G.killGoal += G.queue.reduce((n, type) => n + brood(type), 0);   // the kill counter counts them all
  G.every = 0.07; G.maxAlive = IS_TOUCH ? 45 : 65; G.spawnT = 0.8; G.bossPending = false;
  for (const p of G.players) { if (p.dead) revive(p, x, p.maxHp); p.hp = p.maxHp; p.armor = p.maxArmor || 0; }
  banner("IT'S NOT OVER!", 'Here they ALL come... hang on!', 3.2, '#ff3a3a');
  G.shake = 16; Sound.play('wave'); Sound.zombie({ type: 'boss', voice: 0.9, x }, 'roar');
}
// Every bomb that falls, worked out the same way on every screen:
// { td = when it's dropped, x0, y0 = where, vx = how fast it drifts sideways, x = where it lands, hit = when }.
function bombList(F) {
  const key = `${F.jx}|${F.bx}|${F.hx}`;
  if (F._bombs && F._bombs.key === key) return F._bombs;
  const list = [];
  const add = (td, x0, y0, vx, cx) => {
    const fall = Math.sqrt(2 * (GROUND - 16 - y0) / BOMB_G), x = x0 + vx * fall;
    if (Math.abs(x - cx) >= 110) list.push({ td, x0, y0, vx, x, hit: td + fall });   // never right on top of you
  };
  for (let k = 0; k < 2; k++) for (let j = 0; j < 4; j++) {   // the jets: four bombs each, both times they come over
    const td1 = FIN.jets + k * 0.45 + 0.3 + j * 0.2; add(td1, jetX(F, 0, k, td1), JET_Y + k * 45 + 8, JET_SPEED * 0.4, F.jx);
    const td2 = FIN.jets2 + k * 0.45 + 0.3 + j * 0.2; add(td2, jetX(F, 1, k, td2), JET_Y + k * 45 + 8, -JET_SPEED * 0.4, F.bx);
  }
  for (let td = FIN.drop0; td <= FIN.drop1 + 1e-6; td += FIN.dropGap) add(td, bomberX(F, td), BOMB_Y, -BOMBER_SPEED * 0.5, F.bx);   // the stealth bomber
  for (let k = 0; k < 3; k++) for (let td = FIN.hdrop0 + k * 0.05; td <= FIN.hdrop1 + k * 0.5; td += FIN.hdropGap) {   // the heavy bombers
    add(td, heavyX(F, k, td) - 20, HEAVY_Y[k] + 14, HEAVY_SPEED * 0.5, F.hx);
  }
  list.sort((a, b) => a.td - b.td);
  list.byHit = list.slice().sort((a, b) => a.hit - b.hit);
  list.key = key; F._bombs = list;
  return list;
}
// Where a gunship is (side -1 = the one from the left, 1 = the right): flies in, hovers, then flies off.
function gunshipPos(F, side, t) {
  const hx = F.gx + side * 300, hy = 170;
  if (t < FIN.gun) return null;
  if (t < FIN.gunReady) { const k = ease((t - FIN.gun) / (FIN.gunReady - FIN.gun)); return { x: hx + side * 700 * (1 - k), y: hy - 120 * (1 - k), face: -side, tilt: 0.2 * (1 - k) }; }
  if (!F.endT || t < F.endT + 1.2) return { x: hx + Math.sin(t * 1.6 + side) * 10, y: hy + Math.sin(t * 2.1 + side) * 6, face: -side, tilt: 0 };
  const k = (t - F.endT - 1.2) / 2.5;
  return k > 1 ? null : { x: hx + side * 900 * k * k, y: hy - 300 * k * k, face: side, tilt: 0.2 * Math.min(1, k * 3) };
}

// Slow motion: time runs at SLOW.k for a moment (counted in real seconds), easing in and out.
// step() in js/game.js runs the world with dt * slowMo(dt). Wi-Fi friends get G.finale.slow in the snapshot.
function startSlowMo(len) { G.slowT = Math.max(G.slowT || 0, len); Sound.play('slowmo'); }
function slowMo(dt) {
  const F = G.finale;
  if (!F) { G.slowT = 0; return 1; }
  if (G.slowT > 0) G.slowT -= dt;
  const want = G.slowT > 0 ? SLOW.k : 1;
  F.slow = clamp(F.slow + (want - F.slow) * Math.min(1, dt * (want < F.slow ? 10 : 3)), SLOW.k, 1);
  return F.slow;
}

function updateFinale(dt) {
  const F = G.finale, t0 = F.t, t = (F.t += dt), at = k => t0 < k && t >= k;
  if (at(FIN.air)) {   // here comes the air force: and the flood gets even thicker, so there's plenty to blow up
    banner('AIR SUPPORT INCOMING!', 'Stay where you are!', 2.2, '#5ab0ff'); Sound.play('radio');
    G.every = 0.035; G.maxAlive = IS_TOUCH ? 50 : 80;
  }
  if (at(FIN.jets)) F.jx = finaleCenter();
  if (at(FIN.bomber)) { F.bx = finaleCenter(); Sound.play('bomber', F.bx); }
  for (const [start, cx] of [[FIN.jets, F.jx], [FIN.jets2, F.bx]]) for (let k = 0; k < 2; k++) if (at(start + k * 0.45)) Sound.play('jet', cx);
  if (at(FIN.slow1)) startSlowMo(SLOW.len1);
  if (t < FIN.floodEnd && G.queue.length < 40) {   // keep the flood coming (the kill counter counts the new ones too)
    const more = Array.from({ length: 30 }, () => pick(FLOOD_POOL));
    G.queue = more.concat(G.queue);   // in front: the queue is used from the end, so the bosses still come first
    G.killGoal += more.length;
  }
  if (at(FIN.floodEnd)) { G.killGoal -= G.queue.reduce((n, type) => n + brood(type), 0); G.queue = []; }   // the flood stops (the counter forgets the ones that never came)
  if (at(FIN.heavy)) {   // the heavy bombers arrive
    F.hx = finaleCenter();
    banner('HEAVY BOMBERS!', 'Carpet bombing... cover your ears!', 2.4, '#ffb347'); Sound.play('radio');
    Sound.play('bomber', F.hx - 600); Sound.play('bomber', F.hx - 900);
  }
  if (at(FIN.slow2)) startSlowMo(SLOW.len2);
  const bombs = bombList(F);
  while (F.dropped < bombs.length && t >= bombs[F.dropped].td) { if (F.dropped % 4 === 0) Sound.play('whistle', bombs[F.dropped].x0); F.dropped++; }
  while (F.boomed < bombs.byHit.length && t >= bombs.byHit[F.boomed].hit) bombBoom(bombs.byHit[F.boomed++]);
  if (at(FIN.gun)) F.gx = finaleCenter();
  if (t >= FIN.gun && (!F.endT || t < F.endT + 3.5)) Sound.hold('gunships', 'rotor', true, F.gx);
  if (t >= FIN.gunReady && !F.endT) gunshipsFire(F, dt);
  if (!F.endT && t > FIN.gunReady + 0.5 && !G.queue.length && aliveZombies() === 0) { F.endT = t; waveCleared(); }   // really over now
  if (!F.endT && t > FIN.giveUp) for (const z of G.zombies) if (!z.dead) killZombie(z, 1);   // just in case one is stuck somewhere
}
function bombBoom(b) {
  const x = b.x, y = GROUND - 16, slow = G.finale && G.finale.slow < 0.8;
  blastZombies(x, y, 170, 4000, 520);
  blastBarrels(x, y, 170);
  flashAt(x, y, 230); fireBurst(x, y, IS_TOUCH ? 18 : 34, 1.6); smoke(x, y - 10, IS_TOUCH ? 5 : 10, 24, '#3e3846'); ring(x, y, 170, '#ffb347', slow ? 0.9 : 0.45);
  if (!IS_TOUCH) { dust(x - 30, GROUND, 4); dust(x + 30, GROUND, 4); }
  G.shake = Math.max(G.shake, 20);
  Sound.play('bigboom', x);
}
// The gunships shoot tracers at the nearest zombie, and a rocket now and then.
function gunshipsFire(F, dt) {
  F.gunT -= dt;
  if (F.gunT > 0) return;
  F.gunT = 0.09;
  for (const side of [-1, 1]) {
    const g = gunshipPos(F, side, F.t); if (!g) continue;
    const gx = g.x + g.face * 52, gy = g.y + 16;
    let best = null, bd = 1600;
    for (const z of G.zombies) { if (z.dead) continue; const d = Math.hypot(z.x - gx, z.y - z.h / 2 - gy); if (d < bd) { bd = d; best = z; } }
    if (!best) continue;
    const tx = best.x + rand(-6, 6), ty = best.y - best.h * rand(0.3, 0.7);
    addPart({ type: 'tracer', x: gx, y: gy, x2: tx, y2: ty, vx: 0, vy: 0, g: 0, life: 0.07 });
    G.noShield = true; hurtZombie(best, 55, Math.sign(tx - gx) * 80, -40, true); G.noShield = false;   // through riot shields too
    sparks(tx, ty, 3, Math.atan2(gy - ty, gx - tx), 0.6, '#ffe08a', 220);
    F.shots++;
    if (F.shots % 4 === 0) Sound.play('mini', gx);
    if (F.shots % 14 === (side > 0 ? 7 : 0)) {   // a rocket
      const d = Math.hypot(tx - gx, ty - gy) || 1;
      G.bullets.push({ x: gx, y: gy, vx: (tx - gx) / d * 700, vy: (ty - gy) / d * 700, life: 1.6, max: 1.6, dist: 99, hide: 0, dmg: 400, pierce: 1, hit: new Set(), kind: 'rocket', knock: 300, wp: { radius: 120, dmg: 450, knock: 320 } });
      Sound.play('rocket', gx);
    }
  }
}

// ---- Drawing (world space, over the zombies) ----------------------------------------
function drawFinale(c) {
  const F = G.finale; if (!F) return;
  const t = F.t;
  for (let k = 0; k < 2; k++) {
    const u1 = (t - FIN.jets - k * 0.45) / 1.5; if (u1 >= 0 && u1 <= 1) drawJet(c, jetX(F, 0, k, t), JET_Y + k * 45, 1);
    const u2 = (t - FIN.jets2 - k * 0.45) / 1.5; if (u2 >= 0 && u2 <= 1) drawJet(c, jetX(F, 1, k, t), JET_Y + k * 45, -1);
  }
  if (t >= FIN.bomber && t <= FIN.bomberEnd) drawBomber(c, bomberX(F, t), BOMBER_Y);
  if (t >= FIN.heavy && t <= FIN.heavyEnd) for (let k = 2; k >= 0; k--) drawHeavyBomber(c, heavyX(F, k, t), HEAVY_Y[k] + Math.sin(t * 1.3 + k) * 3);
  for (const b of bombList(F)) {
    if (t < b.td || t >= b.hit) continue;
    const u = t - b.td;
    drawBomb(c, b.x0 + b.vx * u, b.y0 + 0.5 * BOMB_G * u * u, Math.atan2(BOMB_G * u, b.vx));
  }
  for (const side of [-1, 1]) { const g = gunshipPos(F, side, t); if (g) drawGunship(c, g.x, g.y, g.face, g.tilt); }
  if (F.slow < 0.95) {   // slow motion: the world goes a little golden
    c.fillStyle = `rgba(255,220,150,${(1 - F.slow) * 0.12})`; c.fillRect(G.camX - 40, 0, W + 80, H);
  }
}
// A fighter jet (twin tails, afterburner). dir 1 = flying right, -1 = left.
function drawJet(c, x, y, dir = 1) {
  c.save(); c.translate(x, y); c.scale(dir, 1);
  c.globalCompositeOperation = 'lighter';
  const L = 34 + Math.sin(G.t * 60) * 6;
  c.fillStyle = 'rgba(255,140,40,0.8)'; c.beginPath(); c.moveTo(-70, -5); c.lineTo(-70 - L, 0); c.lineTo(-70, 5); c.fill();
  c.fillStyle = 'rgba(255,240,190,0.9)'; c.beginPath(); c.moveTo(-70, -2.5); c.lineTo(-70 - L * 0.55, 0); c.lineTo(-70, 2.5); c.fill();
  c.globalCompositeOperation = 'source-over';
  poly(c, [-50, -8, -70, -32, -61, -32, -38, -8], '#6e7682');               // the far tail
  poly(c, [84, 0, 52, -7, 10, -10, -40, -10, -72, -6, -72, 5, -40, 8, 44, 7], '#8a929e');   // body
  poly(c, [-46, -8, -64, -28, -56, -28, -34, -8], '#7a828e');               // the near tail
  c.fillStyle = '#26344e'; c.beginPath(); c.ellipse(42, -9, 17, 5.5, 0, 0, Math.PI * 2); c.fill();   // cockpit
  c.fillStyle = 'rgba(255,255,255,0.4)'; c.beginPath(); c.ellipse(46, -11, 6, 1.6, 0, 0, Math.PI * 2); c.fill();
  poly(c, [16, 3, -42, 3, -30, 13], '#6a727e');                              // wing
  fillRR(c, -22, 10, 32, 3.5, 1.5, '#dcdcdc'); poly(c, [10, 10, 15, 11.7, 10, 13.5], '#d6452f');   // a missile under the wing
  c.fillStyle = '#5a626e'; c.fillRect(-4, -2, 22, 7);                        // air intake
  c.restore();
}
// A stealth bomber: a big flying wing, seen from below as it goes over, flying left.
function drawBomber(c, x, y) {
  c.save(); c.translate(x, y); c.scale(1.45, 0.5);
  poly(c, [-62, 0, 50, -130, 62, -110, 40, -70, 64, -36, 40, 0, 64, 36, 40, 70, 62, 110, 50, 130], '#23252c');
  c.strokeStyle = 'rgba(255,255,255,0.08)'; c.lineWidth = 2; c.beginPath(); c.moveTo(-40, 0); c.lineTo(44, -100); c.moveTo(-40, 0); c.lineTo(44, 100); c.stroke();
  for (const ey of [-26, 26]) { c.fillStyle = '#30333c'; c.beginPath(); c.ellipse(-10, ey, 26, 12, 0, 0, Math.PI * 2); c.fill(); }   // engines
  c.restore();
  if (Math.floor(G.t * 2) % 2) { circle(c, x + 70, y - 62, 2.5, '#ff4040'); circle(c, x + 70, y + 62, 2.5, '#5aff5a'); }   // wingtip lights
}
// A huge eight-engine heavy bomber seen from the side, flying right, with its bomb bay open.
function drawHeavyBomber(c, x, y) {
  c.save(); c.translate(x, y); c.scale(0.85, 0.85);
  const body = '#6a7064', dark = '#4e5450', light = '#8a9084';
  poly(c, [-40, -4, -150, -30, -136, -32, -20, -10], dark);                  // the far wing, sweeping back
  for (const ex of [-70, -112]) fillRR(c, ex, -24, 26, 7, 3.5, '#3e4440');   // its engine pods
  poly(c, [-118, -6, -150, -64, -126, -64, -100, -8], body);                 // the tall tail fin
  c.fillStyle = body; c.beginPath();                                          // the long body
  c.moveTo(140, 2); c.quadraticCurveTo(140, -12, 118, -13); c.lineTo(-120, -9); c.lineTo(-138, -4); c.lineTo(-120, 6); c.lineTo(118, 9); c.quadraticCurveTo(138, 9, 140, 2); c.fill();
  c.fillStyle = light; c.fillRect(-110, -9, 220, 3);
  c.fillStyle = '#26344e'; for (const wx of [114, 104, 94]) c.fillRect(wx, -11, 7, 4);   // cockpit windows
  c.fillStyle = '#1a1c1e'; c.fillRect(-36, 5, 52, 5);                                 // the open bomb bay
  poly(c, [-130, -2, -158, 4, -150, 8, -122, 4], dark);                       // tail wing
  poly(c, [20, 4, -96, 26, -82, 30, 34, 10], light);                          // the near wing
  for (const ex of [-12, -58]) { fillRR(c, ex, 18 + (ex < -30 ? 8 : 0), 30, 8, 4, '#3e4440'); c.fillStyle = '#1e2020'; c.fillRect(ex + 26, 19 + (ex < -30 ? 8 : 0), 4, 6); }   // its engine pods
  c.globalCompositeOperation = 'lighter';
  c.fillStyle = 'rgba(200,200,210,0.12)';
  for (let i = 0; i < 4; i++) { const u = (G.t * 2 + i / 4) % 1; circle(c, -150 - u * 120, -2 + Math.sin(i) * 6, 6 + u * 10); }   // smoke trails
  c.globalCompositeOperation = 'source-over';
  c.restore();
  if (Math.floor(G.t * 2) % 2) circle(c, x - 128, y - 54, 2.5, '#ff4040');   // the light on its tail
}
function drawBomb(c, x, y, rot) {
  c.save(); c.translate(x, y); c.rotate(rot);
  fillRR(c, -11, -4, 20, 8, 4, '#3a3e48'); c.fillStyle = '#ffd23f'; c.fillRect(2, -4, 2, 8);
  poly(c, [-11, -4, -16, -8, -14, 0], '#2a2e36'); poly(c, [-11, 4, -16, 8, -14, 0], '#2a2e36');
  c.restore();
}
// An attack gunship: tandem cockpits, stub wings with rocket pods, a chin gun. face = which way the nose points.
function drawGunship(c, x, y, face, tilt) {
  c.save(); c.translate(x, y); c.scale(face, 1); c.rotate(tilt);
  fillRR(c, -124, -11, 92, 9, 4, '#3e4a2c');                                  // tail boom
  poly(c, [-120, -9, -132, -38, -124, -38, -110, -9], '#3e4a2c');             // tail fin
  c.fillStyle = 'rgba(40,40,50,0.6)'; c.beginPath(); c.ellipse(-128, -26, 3, 14 * Math.abs(Math.sin(G.t * 50)) + 2, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#4a5834'; c.beginPath();                                     // the narrow body
  c.moveTo(58, 4); c.quadraticCurveTo(62, -10, 42, -16); c.lineTo(-30, -20); c.lineTo(-46, -4); c.lineTo(-30, 10); c.lineTo(42, 12); c.closePath(); c.fill();
  c.fillStyle = '#7ab0d0'; c.beginPath(); c.ellipse(32, -13, 13, 8, 0, 0, Math.PI * 2); c.fill();   // front cockpit
  c.beginPath(); c.ellipse(9, -20, 13, 9, 0, 0, Math.PI * 2); c.fill();                              // back cockpit (higher)
  fillRR(c, -28, -30, 36, 12, 5, '#3e4a2c'); c.fillStyle = '#2a3020'; c.fillRect(-30, -26, 4, 6);    // engines
  fillRR(c, -16, 2, 36, 5, 2, '#3a4428');                                     // stub wing
  fillRR(c, -12, 7, 24, 9, 4, '#2a3020'); for (const ry of [9.5, 13.5]) circle(c, 12, ry, 1.6, '#555');   // rocket pod
  fillRR(c, 4, 3, 22, 3, 1.5, '#d0d0d0');                                    // missile
  c.fillStyle = '#1a1a1a'; c.fillRect(36, 10, 5, 6); c.fillRect(39, 14, 18, 3);   // chin gun
  c.strokeStyle = '#2a2a2a'; c.lineWidth = 2; c.beginPath(); c.moveTo(-20, 10); c.lineTo(-22, 22); c.moveTo(30, 12); c.lineTo(30, 22); c.stroke();
  circle(c, -22, 23, 3.5, '#1a1a1a'); circle(c, 30, 23, 3.5, '#1a1a1a');    // wheels
  c.fillStyle = '#2a2a2a'; c.fillRect(-3, -40, 6, 10);                       // rotor
  c.fillStyle = 'rgba(200,200,210,0.18)'; c.beginPath(); c.ellipse(0, -40, 118, 6, 0, 0, Math.PI * 2); c.fill();
  for (const a of [G.t * 42, G.t * 42 + Math.PI / 2]) { const w = 116 * Math.cos(a); fillRR(c, Math.min(0, w), -42, Math.abs(w), 4, 2, 'rgba(50,50,60,0.85)'); }
  c.restore();
}
