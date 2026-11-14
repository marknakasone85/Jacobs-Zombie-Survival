'use strict';
// The newer bosses (their stats are in ZTYPES in js/zombies.js, and each level names its boss in js/levels.js):
//   Mr. Mower (Maple Street)     a grumpy zombie dad in a bathrobe on a ride-on mower. Revs up, then charges.
//   The Rat King (Downtown)      a giant sewer rat with a crown. Huge pounces.
//   The Yeti (Frozen Forest)     throws giant snowballs and stomps the ground.
//   King Bloat (Desert Gas Stop) spits goo and belly-flops. When he pops, four little bloaters burst out.
// Also here: the things bosses throw at you (G.shots).

const SHOT_KINDS = Object.assign(Object.create(null), {   // no prototype, like WMAP
  snow: { r: 13, dmg: 16, knock: 1.3 },   // the Yeti's snowballs
  goo: { r: 11, dmg: 14, knock: 1 },      // King Bloat's goo
});
const SHOT_IDS = Object.keys(SHOT_KINDS);
const SHOT_G = 980, THROW_WIND = 0.55;
const GRASS = ['#7ccf4a', '#5fae3a', '#a8e070'];

// ---- Throwing -------------------------------------------------------------------
// Stop, wind up (pose 1) and throw at whoever is closest, now and then.
function bossThrowAI(z, target, adx, dir, dt) {
  z.throwCd -= dt;
  if (z.throwT > 0) {
    z.throwT -= dt; z.vx = 0; z.pose = 1;
    if (z.throwT <= 0) { z.pose = 0; bossThrow(z, target); z.throwCd = rand(2.6, 4.2); }
    return;
  }
  if (z.onGround && z.throwCd <= 0 && adx > 140 && adx < 700) { z.throwT = THROW_WIND; z.facing = dir; Sound.zombie(z, 'screech'); }
}
// Lobs it in an arc so it comes down where the player is (or is about to be).
function bossThrow(z, target) {
  const kind = z.T.throws, S = SHOT_KINDS[kind];
  if (!S) return;
  const sx = z.x + z.facing * z.w * 0.3, sy = z.y - z.h * 0.92;
  const tx = target.x + (target.vx || 0) * 0.25, ty = target.y - 30, t = clamp(Math.abs(tx - sx) / 520, 0.5, 1.0);
  G.shots.push({ kind, x: sx, y: sy, vx: (tx - sx) / t, vy: (ty - sy - 0.5 * SHOT_G * t * t) / t, rot: 0, life: 3 });
  Sound.play('toss', z.x);
  if (kind === 'goo') goo(sx, sy, 6, z.facing);
}
function updateShots(dt) {
  for (let i = G.shots.length - 1; i >= 0; i--) {
    const q = G.shots[i], S = SHOT_KINDS[q.kind];
    q.life -= dt; q.vy += SHOT_G * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.rot += dt * 7 * (Math.sign(q.vx) || 1);
    let hit = false;
    for (const p of G.players) {
      if (p.dead || Math.abs(p.x - q.x) > p.w / 2 + S.r || q.y < p.y - p.h - S.r || q.y > p.y + S.r) continue;
      hurtPlayer(p, S.dmg, Math.sign(q.vx) || 1, S.knock); hit = true; break;
    }
    if (hit || q.y >= GROUND - 4 || q.life <= 0 || q.x < -50 || q.x > G.level.worldW + 50) { shotSplat(q); G.shots.splice(i, 1); }
  }
}
function shotSplat(q) {
  const y = Math.min(q.y, GROUND - 4);
  if (q.kind === 'snow') {   // POOF
    smoke(q.x, y, 9, 10, '#f0f6ff'); sparks(q.x, y, 14, -Math.PI / 2, 1.3, '#ffffff', 320);
    Sound.play('crack', q.x);
  } else {
    goo(q.x, y, 16, 0, 1.4); Sound.play('splat', q.x);
  }
}
function drawShots(c) {
  for (const q of G.shots) {
    c.save(); c.translate(q.x, q.y); c.rotate(q.rot || 0);
    if (q.kind === 'snow') {
      circle(c, 0, 0, 13, '#e2eef8'); circle(c, -2.5, -2.5, 9, '#f6fbff'); circle(c, -5, -5, 3, '#ffffff');
      c.fillStyle = 'rgba(120,150,190,0.35)'; c.beginPath(); c.arc(0, 0, 13, 0.4, Math.PI - 0.4); c.fill();
    } else {
      circle(c, 0, 0, 11, '#7aa82a'); circle(c, -1.5, -1.5, 8.5, '#9acd32'); circle(c, -4, -4, 2.6, '#e0ff9a');
      circle(c, 7, 6, 4, '#9acd32'); circle(c, -8, 5, 3, '#7aa82a');
    }
    c.restore();
  }
}

// ---- Special touches --------------------------------------------------------------
function bossExtras(z, dt) {
  if (z.T.body !== 'mower' || z.dead) return;
  const fast = z.chargeT > 0;
  if (z.onGround && Math.abs(z.vx) > 20 && Math.random() < dt * (fast ? 40 : 10)) {   // grass clippings fly out the side
    addPart({ type: 'goo', x: z.x - z.facing * 10, y: z.y - 6, vx: -z.facing * rand(60, 220), vy: rand(-280, -90), g: 1200, life: rand(0.4, 0.8), size: rand(1.5, 2.6), col: pick(GRASS), floor: true });
  }
  if ((z.windT > 0 || fast) && Math.random() < dt * 20) smoke(z.x - z.facing * 47, z.y - 74, 1, 6, '#6a6474');   // exhaust
}
// SPLOOOSH! A huge goo blast... and four little bloaters burst out of him.
function kingBloatPop(z) {
  const x = z.x, y = z.y - z.h * 0.5;
  goo(x, y, 60, 0, 2.4); ring(x, y, 200, '#c8f05a', 0.5); ring(x, y, 120, '#e8ff9a', 0.35); flashAt(x, y, 160);
  G.shake = Math.max(G.shake, 18);
  Sound.play('slime', x);
  for (const q of G.zombies) if (!q.dead && q !== z && Math.hypot(q.x - x, (q.y - q.h / 2) - y) < 200) hurtZombie(q, 120, (Math.sign(q.x - x) || 1) * 320, -220, true);
  for (const p of G.players) if (!p.dead && Math.hypot(p.x - x, (p.y - 32) - y) < 130) hurtPlayer(p, 16, Math.sign(p.x - x) || 1, 1.4);
  blastBarrels(x, y, 200);
  for (let i = 0; i < z.T.minis; i++) {   // the kill counter already counts them (waveSize)
    const b = spawnZombie('bloater');
    const off = i - (z.T.minis - 1) / 2;
    b.x = clamp(x + off * 34, 30, G.level.worldW - 30); b.y = z.y - 30; b.prevY = b.y;
    b.vy = -rand(420, 560); b.kbx = off * 170; b.onGround = false;
  }
}

// ---- Pictures (facing right, feet at (0, 0)) ----------------------------------------
// Mr. Mower. pose 1 = revving up (shaking, smoke), pose 2 = charging (flames out of the exhaust!).
function drawMower(c, z, k, atk) {
  const fl = k.fl, charge = z.pose === 2 && !z.dead, rev = z.pose === 1 && !z.dead;
  const spin = z.dead ? 0 : G.t * (charge ? 28 : Math.abs(z.vx) > 10 ? 9 : 0);
  const red = fl ? '#ffffff' : '#d8402f', redDark = fl ? '#eeeeee' : '#a02a20', black = fl ? '#eeeeee' : '#1e1e24', steel = fl ? '#dddddd' : '#6a6e78';
  const robe = k.two, skin = k.fur;
  c.save(); c.translate(0, rev ? Math.sin(G.t * 70) * 1.3 : charge ? Math.sin(G.t * 40) * 0.8 : 0);
  fillRR(c, -42, -17, 86, 9, 4, fl ? '#eeeeee' : '#3a3a42');   // the cutting deck
  fillRR(c, -50, -74, 6, 30, 2, steel);                         // exhaust pipe
  if (charge) {
    c.globalCompositeOperation = 'lighter';
    flameShape(c, -47, -72, 5, 16 + Math.sin(G.t * 50) * 5, 'rgba(255,120,30,0.85)');
    flameShape(c, -47, -72, 2.5, 9, 'rgba(255,240,170,0.9)');
    c.globalCompositeOperation = 'source-over';
  }
  fillRR(c, -50, -48, 64, 32, 9, red);   // the body under the seat
  fillRR(c, 6, -42, 50, 26, 9, red);     // the hood
  c.fillStyle = redDark; c.fillRect(-50, -24, 106, 5);
  c.fillStyle = fl ? '#ffffff' : '#ffd23f'; c.fillRect(14, -37, 32, 3);
  circle(c, 54, -33, 4.5, fl ? '#ffffff' : '#fff6b0');   // headlight
  const wheel = (x, r) => {
    circle(c, x, -r, r, black); circle(c, x, -r, r * 0.5, fl ? '#ffffff' : '#b8b8c0');
    c.strokeStyle = fl ? '#dddddd' : '#55555e'; c.lineWidth = 2; c.beginPath();
    for (let i = 0; i < 3; i++) { const a = spin + i * 2.09; c.moveTo(x + Math.cos(a) * r * 0.5, -r + Math.sin(a) * r * 0.5); c.lineTo(x + Math.cos(a) * r * 0.92, -r + Math.sin(a) * r * 0.92); }
    c.stroke();
  };
  wheel(-30, 18); wheel(38, 12);
  fillRR(c, -44, -62, 30, 15, 5, black); fillRR(c, -48, -86, 9, 38, 4, black);   // seat
  c.strokeStyle = steel; c.lineWidth = 3; c.beginPath(); c.moveTo(20, -42); c.lineTo(8, -70); c.stroke();
  c.save(); c.translate(8, -72); c.rotate(-0.45); c.strokeStyle = black; c.lineWidth = 3; c.beginPath(); c.ellipse(0, 0, 9, 3.5, 0, 0, Math.PI * 2); c.stroke(); c.restore();
  // the driver: a grumpy zombie dad in a pink bathrobe and fuzzy blue slippers
  fillRR(c, -32, -66, 36, 12, 6, robe);
  fillRR(c, -3, -63, 9, 20, 4, skin);
  fillRR(c, -5, -47, 17, 8, 4, fl ? '#ffffff' : '#7ab0e8');
  c.save(); c.translate(-26, -62); c.rotate(0.12 + (charge ? 0.22 : 0));
  fillRR(c, -11, -42, 28, 44, 11, robe);
  c.fillStyle = fl ? '#ffffff' : shade(z.shirt, -0.25); c.fillRect(-11, -12, 28, 4);   // the robe's belt
  poly(c, [5, -42, 13, -42, 9, -27], skin);
  c.save(); c.translate(8, -33); c.rotate(0.5 - atk * 0.9);   // arm on the steering wheel
  fillRR(c, -3, -5, 17, 10, 5, robe); fillRR(c, 12, -4, 19, 8, 4, skin); c.restore();
  c.save(); c.translate(6, -52); c.rotate(-0.05 + Math.sin(G.t * 3 + z.phase) * 0.06);
  fillRR(c, -11, -13, 23, 25, 10, skin);
  c.strokeStyle = fl ? '#ffffff' : '#2a2a2a'; c.lineWidth = 1.6; c.beginPath();   // his comb-over
  for (let i = 0; i < 3; i++) { c.moveTo(-10, -5 - i * 2.5); c.quadraticCurveTo(0, -17 - i, 11, -9 - i * 1.5); }
  c.stroke();
  zEye(c, 3, -2, 1.8, z.eye, z.dead); zEye(c, 11, -2.5, 1.6, z.eye, z.dead);
  c.strokeStyle = black; c.lineWidth = 1.5; c.beginPath(); c.arc(3, -2, 4.4, 0, Math.PI * 2); c.moveTo(15.4, -2.5); c.arc(11, -2.5, 4.4, 0, Math.PI * 2); c.moveTo(7.4, -2.2); c.lineTo(6.6, -2.2); c.stroke();   // big glasses
  const shout = 3 + atk * 4 + (charge || rev ? 3 : 0);
  fillRR(c, 2, 5, 11, shout, 2, '#2a0f12');
  c.fillStyle = '#e8e0c8'; c.fillRect(3.5, 5, 2, 1.6); c.fillRect(8, 5, 2, 1.6);
  c.restore();
  c.restore();
  c.restore();
}
// The Rat King: a long pink tail, mangy fur, buck teeth, and a little gold crown.
function drawRat(c, z, k, atk) {
  const fl = k.fl, walk = z.dead ? 0 : Math.sin(z.walkT * 1.3), air = !z.onGround && !z.dead;
  const pink = fl ? '#ffffff' : z.shirt, fur = k.fur, dark = k.dark;
  c.lineCap = 'round';
  for (let i = 0; i < 14; i++) {   // the tail, thinner towards the end
    const p = t => [-52 - t * 80, -26 - Math.sin(t * 4 + G.t * 5 + z.phase) * 12 * t + t * 14], t0 = i / 14;
    const [x0, y0] = p(t0), [x1, y1] = p((i + 1) / 14);
    c.strokeStyle = pink; c.lineWidth = 7 * (1 - t0) + 1.5; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
  }
  c.lineCap = 'butt';
  const leg = (x, a, col) => { c.save(); c.translate(x, -18); c.rotate(a); fillRR(c, -5, 0, 10, 18, 4, col); fillRR(c, -4, 15, 13, 5, 2.5, pink); c.restore(); };
  leg(-36, walk * 0.5 - (air ? 0.7 : 0), dark); leg(26, -walk * 0.5 + (air ? 0.7 : 0), dark);
  c.fillStyle = fur; c.beginPath(); c.ellipse(-6, -36, 54, 27, -0.05, 0, Math.PI * 2); c.fill();
  if (!fl) {
    c.fillStyle = dark; c.beginPath(); c.ellipse(-26, -40, 13, 8, 0.2, 0, Math.PI * 2); c.fill();   // mangy patch
    ribs(c, -8, -42, 5, 10);
    for (let i = 0; i < 6; i++) circle(c, -44 + i * 13, -60 + Math.abs(i - 2.5) * 1.6, 3, dark);   // a bumpy spine
  }
  leg(-26, -walk * 0.5 - (air ? 0.7 : 0), fur); leg(36, walk * 0.5 + (air ? 0.7 : 0), fur);
  c.save(); c.translate(44, -40); c.rotate(-0.05 - atk * 0.2 + Math.sin(G.t * 3 + z.phase) * 0.05);
  circle(c, -6, -18, 11, fur); circle(c, -6, -18, 7, pink);   // ear
  c.fillStyle = fur; c.beginPath();
  c.moveTo(-14, -14); c.quadraticCurveTo(10, -18, 40, -2); c.quadraticCurveTo(44, 2, 38, 6); c.quadraticCurveTo(10, 16, -14, 12); c.closePath(); c.fill();
  circle(c, 41, 0, 4, pink);   // nose
  c.strokeStyle = fl ? '#ffffff' : '#d8d0c0'; c.lineWidth = 0.8; c.beginPath();
  for (const a of [-0.35, -0.05, 0.25]) { c.moveTo(34, 1); c.lineTo(34 + 22 * Math.cos(a), 1 + 22 * Math.sin(a)); }
  c.stroke();
  c.fillStyle = '#2a0f12'; c.fillRect(18, 6, 18, 2 + atk * 6);   // mouth
  c.fillStyle = fl ? '#ffffff' : '#f0d878'; c.fillRect(29, 6, 3.2, 6.5); c.fillRect(32.8, 6, 3.2, 6.5);   // buck teeth
  zEye(c, 16, -6, 3, z.eye, z.dead);
  c.save(); c.translate(-2, -25); c.rotate(-0.25);   // the crown
  poly(c, [-12, 0, -12, -12, -6, -5, 0, -15, 6, -5, 12, -12, 12, 0], fl ? '#ffffff' : '#f0c030');
  circle(c, 0, -3.5, 2.2, fl ? '#ffffff' : '#e8413a'); circle(c, -7.5, -3, 1.4, fl ? '#ffffff' : '#4ab0ff'); circle(c, 7.5, -3, 1.4, fl ? '#ffffff' : '#4ab0ff');
  c.restore();
  c.restore();
}
// The Yeti: a big shaggy snow monster with horns. pose 1 = about to throw a snowball.
function drawYeti(c, z, k, atk) {
  const fl = k.fl, walk = z.dead ? 0 : Math.sin(z.walkT * 0.8), throwing = z.pose === 1 && !z.dead;
  const fur = k.fur, back = k.dark, skin = fl ? '#ffffff' : z.shirt;
  const leg = (x, a, col) => { c.save(); c.translate(x, -44); c.rotate(a); fillRR(c, -11, 0, 22, 40, 10, col); fillRR(c, -12, 35, 31, 10, 5, skin); c.restore(); };
  const arm = (x, y, a, col, ball) => {
    c.save(); c.translate(x, y); c.rotate(a);
    fillRR(c, -10, -10, 54, 20, 10, col); fillRR(c, 38, -11, 20, 22, 10, skin);
    if (ball) { circle(c, 52, 0, 13, '#e2eef8'); circle(c, 50, -2, 9, '#f6fbff'); }
    c.restore();
  };
  leg(-14, walk * 0.35, back);
  arm(-22, -106, 1.45 - walk * 0.15, back, false);
  const tuft = (cx, cy, rx, ry, n, col) => {   // shaggy fur: little points all round an oval
    c.fillStyle = col; c.beginPath();
    for (let i = 0; i <= n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2, r = i % 2 ? 1.12 : 0.96; c.lineTo(cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r); }
    c.closePath(); c.fill();
    if (!fl) { c.strokeStyle = 'rgba(100,130,170,0.6)'; c.lineWidth = 1.6; c.stroke(); }   // so the white head stands out from the white body
  };
  tuft(0, -84, 42, 46, 16, fur);
  if (!fl) { c.fillStyle = 'rgba(120,150,180,0.18)'; c.beginPath(); c.ellipse(8, -76, 22, 28, 0, 0, Math.PI * 2); c.fill(); }
  leg(14, -walk * 0.35, fur);
  if (throwing) arm(18, -106, -2.3, fur, true);   // the snowball goes up behind its head
  c.save(); c.translate(6, -128); c.rotate(Math.sin(G.t * 2 + z.phase) * 0.05 + (throwing ? -0.12 : 0));
  c.strokeStyle = fl ? '#ffffff' : '#e8dcc0'; c.lineWidth = 5; c.lineCap = 'round';   // horns
  c.beginPath(); c.arc(-14, -14, 9, Math.PI * 0.9, Math.PI * 1.6); c.moveTo(16, -22); c.arc(19, -14, 9, Math.PI * 1.4, Math.PI * 2.1); c.stroke();
  c.lineCap = 'butt';
  tuft(0, 0, 22, 21, 10, fur);
  c.fillStyle = skin; c.beginPath(); c.ellipse(6, 4, 15, 13, 0, 0, Math.PI * 2); c.fill();   // face
  c.strokeStyle = fl ? '#ffffff' : '#2a3448'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(-4, -5); c.lineTo(5, -2); c.moveTo(18, -5); c.lineTo(10, -2); c.stroke();   // angry brows
  zEye(c, 1, 0, 2.4, z.eye, z.dead); zEye(c, 13, 0, 2.4, z.eye, z.dead);
  const open = 4 + atk * 8 + (throwing ? 4 : 0);
  fillRR(c, -2, 8, 17, open, 3, '#1a0a14');
  poly(c, [0, 8, 2.5, 8, 1.2, 12], '#ffffff'); poly(c, [10, 8, 12.5, 8, 11.2, 12], '#ffffff');   // fangs
  c.restore();
  if (!throwing) arm(18, -106, 1.25 + walk * 0.15 - atk * 1.3, fur, false);
}
// King Bloat's head extras (drawn inside drawZombie's head): a tiny crown, and goo when he's about to spit.
function kingBloatHead(c, z, fl) {
  c.save(); c.translate(2, -9); c.rotate(-0.2);
  poly(c, [-6, 0, -6, -6, -3, -2.5, 0, -7.5, 3, -2.5, 6, -6, 6, 0], fl ? '#ffffff' : '#f0c030');
  circle(c, 0, -1.6, 1.2, fl ? '#ffffff' : '#e8413a');
  c.restore();
  if (z.pose === 1 && !z.dead) { circle(c, 5, 5, 4.2, '#9acd32'); circle(c, 4, 4, 1.4, '#e0ff9a'); }
}
// The Sewer Gator (New York City): a giant zombie alligator. pose 1 = jaws wide open (about to lunge), pose 2 = lunging.
function drawGator(c, z, k, atk) {
  const fl = k.fl, walk = z.dead ? 0 : Math.sin(z.walkT * 1.2), sway = Math.sin(G.t * 3 + z.phase);
  const open = z.dead ? 0.1 : Math.max(atk, z.pose === 1 ? 0.65 + Math.sin(G.t * 20) * 0.12 : z.pose === 2 ? 0.45 : 0.1);
  const skin = k.fur, dark = k.dark, belly = fl ? '#ffffff' : z.shirt;
  c.fillStyle = dark; c.beginPath();   // the long tail
  c.moveTo(-60, -40); c.quadraticCurveTo(-120, -34 + sway * 6, -178, -14 + sway * 12); c.quadraticCurveTo(-118, -10, -60, -14); c.closePath(); c.fill();
  for (let i = 0; i < 8; i++) { const u = i / 8, x = -70 - u * 100, y = -38 + u * 18 + sway * 8 * u; poly(c, [x - 5, y + 2, x, y - 7 + u * 3, x + 5, y + 2], dark); }   // spiky ridge
  const leg = (x, a, col) => { c.save(); c.translate(x, -18); c.rotate(a); fillRR(c, -6, 0, 12, 18, 5, col); for (const tx of [-5, 0, 5]) poly(c, [tx - 2, 16, tx + 2, 16, tx + 4, 21], fl ? '#ffffff' : '#e8e0c8'); c.restore(); };
  leg(-42, walk * 0.5, dark); leg(28, -walk * 0.5, dark);
  c.fillStyle = skin; c.beginPath(); c.ellipse(-6, -30, 72, 25, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = belly; c.beginPath(); c.ellipse(-6, -13, 62, 8, 0, 0, Math.PI * 2); c.fill();
  if (!fl) {
    for (let i = 0; i < 10; i++) circle(c, -62 + i * 12, -50 + Math.abs(i - 4.5) * 0.9, 4, dark);   // bumpy scales
    c.fillStyle = shade(z.skin, -0.45); c.beginPath(); c.ellipse(-24, -30, 15, 9, 0.2, 0, Math.PI * 2); c.fill();   // rotten patch
    ribs(c, -30, -34, 5, 9, 'rgba(230,220,190,0.6)');
  }
  leg(-30, -walk * 0.5, skin); leg(42, walk * 0.5, skin);
  c.save(); c.translate(56, -32);
  c.fillStyle = '#3a0a10'; poly(c, [0, -2, 64, -2 - open * 34, 62, 4 + open * 22], '#3a0a10');   // inside the mouth
  c.save(); c.rotate(open * 0.32);   // the lower jaw
  poly(c, [0, 2, 66, 2, 70, 7, 0, 12], skin);
  c.fillStyle = fl ? '#ffffff' : '#f0ead8'; for (let x = 10; x < 64; x += 8) poly(c, [x, 2, x + 3, -4, x + 6, 2]);
  c.restore();
  c.save(); c.rotate(-open * 0.42);   // the upper jaw, eye and nostrils
  poly(c, [0, -14, 64, -8, 74, -3, 70, 2, 0, 3], skin);
  c.fillStyle = fl ? '#ffffff' : '#f0ead8'; for (let x = 8; x < 66; x += 8) poly(c, [x, 1, x + 3, 7, x + 6, 1]);
  circle(c, 14, -14, 7, dark); zEye(c, 15, -15, 3, z.eye, z.dead);
  circle(c, 68, -6, 1.6, '#1a1a1a');
  c.restore();
  c.restore();
}
// The Road Hulk (Highway Escape) is drawn like a huge zombie (drawZombie) with road-warrior gear on top:
function roadHulkBody(c, tw, fl) {   // studs down the leather vest and a chain across the chest
  const metal = fl ? '#ffffff' : '#c0c4cc';
  for (let i = 0; i < 6; i++) { circle(c, -tw + 2, -24 + i * 4.2, 0.9, metal); circle(c, tw - 2, -24 + i * 4.2, 0.9, metal); }
  c.strokeStyle = metal; c.lineWidth = 1.1;
  for (let i = 0; i < 7; i++) { const u = i / 6; c.beginPath(); c.ellipse(-tw * 0.8 + u * tw * 1.6, -22 + u * 16, 1.6, 1, 0.6, 0, Math.PI * 2); c.stroke(); }
}
function roadHulkHead(c, fl) {   // a red mohawk and goggles pushed up on his forehead
  poly(c, [-7, -8, -6, -15, -3, -9, -1, -17, 1, -9, 4, -16, 6, -8], fl ? '#ffffff' : '#e8402a');
  c.fillStyle = fl ? '#eeeeee' : '#2a2420'; c.fillRect(-8, -7.5, 17, 2.6);
  for (const gx of [1.5, 6.5]) { circle(c, gx, -6.2, 2.4, fl ? '#ffffff' : '#5a4a3a'); circle(c, gx, -6.2, 1.5, fl ? '#ffffff' : '#ffb84a'); }
}
function roadHulkPad(c, bw, fl) {   // a spiked metal shoulder pad
  c.save(); c.translate(2 * bw, -21);
  for (const a of [-1.9, -1.4, -0.9]) poly(c, [Math.cos(a - 0.25) * 6, Math.sin(a - 0.25) * 6, Math.cos(a) * 13, Math.sin(a) * 13, Math.cos(a + 0.25) * 6, Math.sin(a + 0.25) * 6], fl ? '#ffffff' : '#d8dce4');
  c.fillStyle = fl ? '#ffffff' : '#8a8e98'; c.beginPath(); c.ellipse(0, -1, 7.5, 5.5, -0.3, 0, Math.PI * 2); c.fill();
  c.fillStyle = fl ? '#eeeeee' : '#6a6e78'; c.fillRect(-5, -1, 10, 1.4);
  c.restore();
}
