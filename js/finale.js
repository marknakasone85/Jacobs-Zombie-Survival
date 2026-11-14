'use strict';
// The twist at the end of the last level (a level with  finale: true). When its last wave is beaten:
//   0 s    "IT'S NOT OVER!" Giant bosses and a flood of zombies come from both sides. Hang on: nobody can
//          drop below 1 health while it lasts, because the air force is on its way.
//   10 s   "AIR SUPPORT INCOMING!", then two fighter jets roar past...
//   13.6 s ...then a stealth bomber drops a carpet of bombs on both sides of you (never right on you).
//   18.5 s Two gunship helicopters fly in from both sides and shoot whatever is left.
//   Then the level is beaten for real, the gunships fly off and the rescue helicopter comes (js/rescue.js).
// G.finale = { t, x (where it started), bx (where the bombs go), gx (where the gunships hover), endT }.
// Everything in the sky comes from those numbers and the clock, so Wi-Fi friends only need them (snapshot fn).

const FIN = { air: 10, jets: 12.3, bomber: 13.6, bomberEnd: 17.6, drop0: 14.1, drop1: 16.9, dropGap: 0.14, gun: 18.5, gunReady: 20, giveUp: 46 };
const JET_Y = 125, BOMBER_Y = 150;   // low enough to fly under the scores at the top
const BOMB_Y = BOMBER_Y + 20, BOMB_G = 900, BOMB_FALL = Math.sqrt(2 * (GROUND - 16 - BOMB_Y) / BOMB_G), BOMBER_SPEED = 450;
const FLOOD = { walker: 70, runner: 40, dog: 25, tiny: 15, giant: 8 }, FLOOD_BOSSES = ['roadhulk', 'boss', 'roadhulk', 'boss', 'boss'];

const finaleCenter = () => { const ps = alivePlayers().length ? alivePlayers() : G.players; return ps.length ? ps.reduce((n, p) => n + p.x, 0) / ps.length : G.camX + W / 2; };
const bomberX = (F, t) => F.bx + 900 - BOMBER_SPEED * (t - FIN.bomber);

function startFinale() {
  const x = finaleCenter();
  G.finale = { t: 0, x, bx: x, gx: x, endT: 0, boomed: 0, dropped: 0, shots: 0, gunT: 0 };
  const team = Math.max(1, G.players.length), more = 1 + 0.3 * (team - 1), q = [];
  for (const [type, n] of Object.entries(FLOOD)) for (let i = 0; i < Math.round(n * more); i++) q.push(type);
  G.queue = shuffle(q).concat(FLOOD_BOSSES);   // the bosses come first (the queue is used from the end)
  G.killGoal += G.queue.length;                // the kill counter counts them all
  G.every = 0.07; G.maxAlive = IS_TOUCH ? 45 : 65; G.spawnT = 0.8; G.bossPending = false;
  for (const p of G.players) { if (p.dead) revive(p, x, p.maxHp); p.hp = p.maxHp; p.armor = p.maxArmor || 0; }
  banner("IT'S NOT OVER!", 'Here they ALL come... hang on!', 3.2, '#ff3a3a');
  G.shake = 16; Sound.play('wave'); Sound.zombie({ type: 'boss', voice: 0.9, x }, 'roar');
}
// Where each bomb falls (worked out the same way on every screen).
function bombList(F) {
  if (F._bombs && F._bombs.bx === F.bx) return F._bombs;
  const list = [];
  for (let td = FIN.drop0; td <= FIN.drop1 + 1e-6; td += FIN.dropGap) {
    const x0 = bomberX(F, td), x = x0 - BOMBER_SPEED * 0.5 * BOMB_FALL;
    if (Math.abs(x - F.bx) < 110) continue;   // never right on top of you
    list.push({ td, x0, x, hit: td + BOMB_FALL });
  }
  list.bx = F.bx; F._bombs = list;
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

function updateFinale(dt) {
  const F = G.finale, t0 = F.t, t = (F.t += dt), at = k => t0 < k && t >= k;
  if (at(FIN.air)) { banner('AIR SUPPORT INCOMING!', 'Stay where you are!', 2.2, '#5ab0ff'); Sound.play('radio'); }
  for (let k = 0; k < 2; k++) if (at(FIN.jets + k * 0.45)) Sound.play('jet', F.x);
  if (at(FIN.bomber)) { F.bx = finaleCenter(); G.killGoal -= G.queue.length; G.queue = []; Sound.play('bomber', F.bx); }   // the flood stops (the counter forgets the ones that never came): here come the bombs
  const bombs = bombList(F);
  while (F.dropped < bombs.length && t >= bombs[F.dropped].td) { if (F.dropped % 3 === 0) Sound.play('whistle', bombs[F.dropped].x0); F.dropped++; }
  while (F.boomed < bombs.length && t >= bombs[F.boomed].hit) bombBoom(bombs[F.boomed++]);
  if (at(FIN.gun)) F.gx = finaleCenter();
  if (t >= FIN.gun && (!F.endT || t < F.endT + 3.5)) Sound.hold('gunships', 'rotor', true, F.gx);
  if (t >= FIN.gunReady && !F.endT) gunshipsFire(F, dt);
  if (!F.endT && t > FIN.gunReady + 0.5 && !G.queue.length && aliveZombies() === 0) { F.endT = t; waveCleared(); }   // really over now
  if (!F.endT && t > FIN.giveUp) for (const z of G.zombies) if (!z.dead) killZombie(z, 1);   // just in case one is stuck somewhere
}
function bombBoom(b) {
  const x = b.x, y = GROUND - 16;
  blastZombies(x, y, 170, 4000, 520);
  blastBarrels(x, y, 170);
  flashAt(x, y, 230); fireBurst(x, y, 40, 1.6); smoke(x, y - 10, 14, 24, '#3e3846'); ring(x, y, 170, '#ffb347', 0.45);
  dust(x - 30, GROUND, 5); dust(x + 30, GROUND, 5);
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
    hurtZombie(best, 55, Math.sign(tx - gx) * 80, -40, true);
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
  for (let k = 0; k < 2; k++) { const u = (t - FIN.jets - k * 0.45) / 1.5; if (u >= 0 && u <= 1) drawJet(c, F.x - 900 + 1800 * u, JET_Y + k * 45); }
  if (t >= FIN.bomber && t <= FIN.bomberEnd) drawBomber(c, bomberX(F, t), BOMBER_Y);
  for (const b of bombList(F)) {
    if (t < b.td || t >= b.hit) continue;
    const u = t - b.td;
    drawBomb(c, b.x0 - BOMBER_SPEED * 0.5 * u, BOMB_Y + 0.5 * BOMB_G * u * u, Math.atan2(BOMB_G * u, -BOMBER_SPEED * 0.5));
  }
  for (const side of [-1, 1]) { const g = gunshipPos(F, side, t); if (g) drawGunship(c, g.x, g.y, g.face, g.tilt); }
}
// A fighter jet (twin tails, afterburner), flying right.
function drawJet(c, x, y) {
  c.save(); c.translate(x, y);
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
