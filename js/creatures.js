'use strict';
// The Beach & Mall update's creatures (their stats are in ZTYPES in js/zombies.js):
//   Zombie Penguin   waddles up, then flops on its belly and SLIDES at you (Frozen Forest)
//   Rattlesnake      low down: coils up, rattles, then STRIKES (Desert Gas Stop)
//   Zombie Spider    drops down from above on a thread of silk, then scuttles and pounces (Graveyard)
//   Zombie Crab      scuttles in quick bursts and pinches; Zombie Seagull swoops like a crow (Zombie Beach)
//   Mannequin        only moves when nobody is looking at it (Shopping Mall; drawn by drawZombie + js/specials.js)
//   Captain Crab     the beach boss: a giant crab in a pirate hat that throws coconuts and scuttles at you
//   The Mega Mascot  the mall boss: a giant zombie in a fluffy pink bunny costume that hops and belly-flops
// The charging, hopping and pouncing use the same code as the sheep, kangaroos and dogs (js/zombies.js).

const SPIDER_DROP = 110;   // how fast a spider comes down its thread

// ---- Spiders --------------------------------------------------------------------------------
// A spider starts high up, somewhere near one of you, and lets itself down on its thread (pose 3).
function spiderStart(z) {
  const ps = alivePlayers(), p = ps.length ? pick(ps) : null;
  if (p) z.x = clamp(p.x + pick([-1, 1]) * rand(90, 320), 30, G.level.worldW - 30);
  z.y = z.prevY = 70; z.vy = 0; z.dropping = true; z.pose = 3; z.onGround = false;
}
function spiderDrop(z, dt) {
  z.pose = 3; z.prevY = z.y;
  z.y += SPIDER_DROP * dt;
  z.x = clamp(z.x + (z.kbx + Math.sin(G.t * 2 + z.phase) * 10) * dt, 10, G.level.worldW - 10); z.kbx *= Math.exp(-6 * dt);
  z.walkT += dt * 2;
  for (const p of G.players) {   // it landed right on your head!
    if (p.dead || Math.abs(p.x - z.x) > p.w / 2 + 8 || z.y < p.y - p.h || z.y > p.y - p.h + 24) continue;
    hurtPlayer(p, z.dmg, Math.sign(p.x - z.x) || 1, 0.6);
    z.dropping = false; z.pose = 0; z.vy = -220; z.kbx = (Math.sign(z.x - p.x) || 1) * 160; z.onGround = false;
    Sound.zombie(z, 'attack');
    return;
  }
  const floor = surfaceBelow(z.x, z.prevY);
  if (z.y >= floor) { z.y = floor; z.vy = 0; z.dropping = false; z.pose = 0; z.onGround = true; z.jumpCd = 0.3; dust(z.x, z.y, 3); Sound.zombie(z, 'screech'); }
}

// ---- Mannequins -----------------------------------------------------------------------------
// true = somebody is looking at it, so it stands still (pose 3) and only gravity moves it.
function statueStill(z, dt) {
  const watched = G.players.some(p => !p.dead && Math.abs(z.x - p.x) < 700 && (Math.sign(z.x - p.x) || 1) === p.facing);
  if (!watched) { if (z.pose === 3) z.pose = 0; return false; }
  z.pose = 3; z.vx = 0; z.chargeT = z.windT = 0;
  z.vy = Math.min(z.vy + GRAV * dt, 1400); z.prevY = z.y; z.y += z.vy * dt;
  z.x = clamp(z.x + z.kbx * dt, 10, G.level.worldW - 10); z.kbx *= Math.exp(-7 * dt);
  land(z);
  return true;
}

// ---- Pictures (facing right, feet at (0, 0), at BASE_H size) --------------------------------------
// A penguin. pose 1 = crouching to dive, pose 2 = sliding on its belly.
function drawPenguin(c, z, k, atk) {
  const slide = z.pose === 2 && !z.dead, crouch = z.pose === 1 && !z.dead;
  const black = k.fur, white = k.fl ? '#ffffff' : z.shirt, orange = k.fl ? '#ffffff' : '#f0a020';
  c.save();
  if (slide) { c.translate(-16, -11); c.rotate(1.5); }   // flat on its belly, head first
  else { c.rotate((z.dead ? 0 : Math.sin(z.walkT * 1.5) * 0.12) + (crouch ? 0.35 : 0)); poly(c, [-8, 0, -1, 0, -4, -4], orange); poly(c, [2, 0, 9, 0, 5, -4], orange); }
  c.fillStyle = black; c.beginPath(); c.ellipse(0, -15, 11, 16, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = white; c.beginPath(); c.ellipse(3.5, -13, 7, 12, 0, 0, Math.PI * 2); c.fill();   // white tummy
  if (!k.fl) { circle(c, 5, -9, 2.6, '#7fa865'); ribs(c, 1, -17, 3, 5); }                         // rotten patch
  c.save(); c.translate(-3, -21); c.rotate(slide ? -1.1 : 0.25 + Math.sin(G.t * 8 + z.phase) * 0.15 + atk * 0.8);
  fillRR(c, -2.5, 0, 5, 14, 2.5, black); c.restore();                                           // flipper
  circle(c, 2, -30, 7.5, black);
  circle(c, 5.5, -29.5, 3.2, white);
  poly(c, [8, -31, 16 + atk * 2, -29, 8, -27], orange);                                        // beak
  zEye(c, 6, -31.5, 1.3, z.eye, z.dead);
  c.restore();
}
// A rattlesnake. pose 1 = coiled up and rattling, pose 2 = striking.
function drawSnake(c, z, k, atk) {
  const coil = z.pose === 1 && !z.dead, strike = z.pose === 2 && !z.dead;
  const pts = [];
  if (coil) {
    for (let i = 0; i <= 14; i++) { const a = i * 0.62, r = 10 - i * 0.45; pts.push([-10 + Math.cos(a) * r * 1.5, -4 + Math.sin(a) * r * 0.45]); }
    pts.push([-2, -9], [4, -15], [8, -17]);
  } else {
    for (let i = 0; i <= 18; i++) { const u = i / 18; pts.push([-44 + u * (strike ? 64 : 52), -4 - Math.sin(u * 9 - z.walkT * (z.dead ? 0 : 2)) * (strike ? 1.2 : 3.5) * (1 - u * 0.4)]); }
  }
  c.lineCap = 'round';
  for (let i = 1; i < pts.length; i++) {   // the body: thin at the tail, thick near the head, with a diamond pattern
    const u = i / pts.length;
    c.strokeStyle = i % 3 === 0 && !k.fl ? z.shirt : k.fur; c.lineWidth = 2.5 + u * 4;
    c.beginPath(); c.moveTo(pts[i - 1][0], pts[i - 1][1]); c.lineTo(pts[i][0], pts[i][1]); c.stroke();
  }
  c.lineCap = 'butt';
  const [tx, ty] = pts[0], shake = coil ? Math.sin(G.t * 70) * 1.5 : 0;   // the rattle on its tail
  for (let i = 0; i < 4; i++) fillRR(c, tx - 4 - i * 3 + shake, ty - 2 - (coil ? i * 2 : 0), 3.5, 4, 1.2, k.fl ? '#ffffff' : '#e8d8a8');
  const [hx, hy] = pts[pts.length - 1], [px, py] = pts[pts.length - 2], a = Math.atan2(hy - py, hx - px);
  c.save(); c.translate(hx, hy); c.rotate(a);
  const open = z.dead ? 0 : Math.max(atk, strike ? 1 : 0);
  if (!z.dead && !open && Math.sin(G.t * 6 + z.phase) > 0.6) { c.strokeStyle = '#d82a3a'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(5, 0); c.lineTo(10, 0); c.lineTo(12, -1.5); c.moveTo(10, 0); c.lineTo(12, 1.5); c.stroke(); }   // flicking tongue
  c.save(); c.rotate(open * 0.5); fillRR(c, -1, 0, 8, 2.5, 1.2, k.dark); c.restore();   // lower jaw
  c.save(); c.rotate(-open * 0.5);
  c.fillStyle = k.fur; c.beginPath(); c.ellipse(1, -0.5, 6.5, 3.8, 0, 0, Math.PI * 2); c.fill();
  if (open) { c.fillStyle = '#ffffff'; poly(c, [4, 2, 5, 5, 6, 2]); }   // a fang
  zEye(c, 2.5, -2, 1.1, z.eye, z.dead);
  c.restore();
  c.restore();
}
// A big zombie spider. pose 3 = still coming down its thread (curled up legs, and the thread up to the sky).
function drawSpider(c, z, k, atk) {
  const hang = z.pose === 3 && !z.dead, s = z.h / BASE_H.spider;
  if (hang) {   // the silk thread, all the way up
    c.strokeStyle = 'rgba(235,235,245,0.75)'; c.lineWidth = 1 / s;
    c.beginPath(); c.moveTo(-6, -22); c.lineTo(-6, -z.y / s); c.stroke();
  }
  const walk = z.dead ? 0 : z.walkT * (hang ? 0.3 : 2.2), body = k.fur;
  const leg = (bx, i, side, col) => {   // side 1 = near legs, -1 = far legs; i = which pair
    const ph = Math.sin(walk + i * 1.6 + (side > 0 ? 0 : Math.PI)) * (hang ? 2 : 4);
    const dir = i < 2 ? 1 : -1, kx = bx + dir * (8 + i % 2 * 4), ky = hang ? -28 : -22 - (i % 2) * 2, fx = bx + dir * (hang ? 10 : 16 + i % 2 * 5) + ph, fy = hang ? -16 : 0;
    c.strokeStyle = col; c.lineWidth = 2.2; c.beginPath(); c.moveTo(bx, -12); c.lineTo(kx, ky); c.lineTo(fx, fy); c.stroke();
  };
  c.lineCap = 'round';
  for (let i = 0; i < 4; i++) leg(-2 + i * 2, i, -1, k.dark);
  c.fillStyle = body; c.beginPath(); c.ellipse(-9, -14, 11, 9, -0.2, 0, Math.PI * 2); c.fill();   // the big back part
  if (!k.fl) {   // a glowing green skull on its back
    c.fillStyle = z.shirt; circle(c, -10, -16, 3.6); c.fillRect(-12, -14, 4, 3);
    circle(c, -11.3, -16.5, 1, '#1a1a1a'); circle(c, -8.7, -16.5, 1, '#1a1a1a');
  }
  circle(c, 4, -12, 6.5, body);   // head
  for (const [ex, ey] of [[7, -14], [9, -12.5], [5.5, -15.5], [8.5, -10.5]]) zEye(c, ex, ey, 1, z.eye, z.dead);
  c.strokeStyle = k.fl ? '#ffffff' : '#e8e0c8'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(9, -9); c.lineTo(11 + atk * 2, -6); c.moveTo(7, -8.5); c.lineTo(8.5 + atk * 2, -5.5); c.stroke();   // fangs
  for (let i = 0; i < 4; i++) leg(0 + i * 2, i, 1, body);
  c.lineCap = 'butt';
}
// A zombie crab (and Captain Crab, with his pirate hat and eye patch). pose 1 = claws up (about to throw or charge), pose 2 = charging.
function drawCrab(c, z, k, atk) {
  const boss = z.T.boss, up = z.pose === 1 && !z.dead, run = z.pose === 2 && !z.dead;
  const walk = z.dead ? 0 : z.walkT * (run ? 4 : 2.6), shell = k.fur, dark = k.dark, belly = k.fl ? '#ffffff' : z.shirt;
  c.lineCap = 'round';
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {   // six legs
    const bx = side * (6 + i * 4), ph = Math.sin(walk + i * 2 + side) * 3;
    c.strokeStyle = dark; c.lineWidth = 2.2; c.beginPath(); c.moveTo(bx, -9); c.lineTo(bx + side * 8, -13 + Math.abs(ph)); c.lineTo(bx + side * 12 + ph, 0); c.stroke();
  }
  c.fillStyle = belly; c.beginPath(); c.ellipse(0, -8, 15, 4, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = shell; c.beginPath(); c.ellipse(0, -11, 18, 8.5, 0, Math.PI, 0); c.lineTo(18, -9); c.quadraticCurveTo(0, -4, -18, -9); c.closePath(); c.fill();   // the shell
  if (!k.fl) { c.fillStyle = '#7fa865'; circle(c, -7, -14, 2.4); circle(c, 9, -13, 1.6); c.fillStyle = 'rgba(255,255,255,0.2)'; c.beginPath(); c.ellipse(-4, -16, 7, 2, -0.1, 0, Math.PI * 2); c.fill(); }
  const claw = side => {   // a big pincer on an arm; it snaps open and shut
    const open = z.dead ? 0.1 : Math.max(atk, 0.25 + Math.abs(Math.sin(G.t * (run ? 14 : 5) + z.phase + side)) * 0.4);
    const ax = side * 15, ay = -13, cx = side * (up ? 20 : 24), cy = up ? -34 : -22 - Math.abs(Math.sin(walk * 0.5)) * 2;
    c.strokeStyle = shell; c.lineWidth = 3.5; c.beginPath(); c.moveTo(ax, ay); c.quadraticCurveTo(ax + side * 10, ay - 2, cx, cy); c.stroke();
    c.save(); c.translate(cx, cy); c.rotate(side > 0 ? -0.5 : Math.PI + 0.5);
    c.fillStyle = shell; c.beginPath(); c.ellipse(4, 0, 6, 4.5, 0, 0, Math.PI * 2); c.fill();
    poly(c, [8, -1, 16, -3 - open * 6, 15, 0], shell); poly(c, [8, 1, 15, 3 + open * 4, 14, 1], dark);
    c.restore();
    if (boss && up && side > 0 && !z.dead) { circle(c, cx + 2, cy - 8, 6, '#6a4a2a'); circle(c, cx, cy - 10, 1.2, '#2a1a0a'); }   // a coconut, ready to throw
  };
  claw(-1); claw(1);
  for (const side of [-1, 1]) {   // eyes on stalks
    c.strokeStyle = dark; c.lineWidth = 1.6; c.beginPath(); c.moveTo(side * 4, -17); c.lineTo(side * 5, -24); c.stroke();
    circle(c, side * 5, -25, 2.6, '#f4f0e8');
    if (boss && side < 0) { c.fillStyle = '#1a1a1a'; circle(c, side * 5, -25, 3); c.strokeStyle = '#1a1a1a'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(-9, -28); c.lineTo(2, -23); c.stroke(); }   // eye patch
    else zEye(c, side * 5 + 0.6, -25, 1.3, z.eye, z.dead);
  }
  c.fillStyle = '#3a0a0a'; c.fillRect(-3, -9.5, 6, 1.4 + atk * 2);   // mouth
  if (boss) {   // a pirate hat with a skull on it
    c.save(); c.translate(0, -29);
    poly(c, [-14, 0, -10, -8, 0, -11, 10, -8, 14, 0, 0, -3], k.fl ? '#ffffff' : '#1e1a22');
    circle(c, 0, -6, 2.2, '#f4f0e8'); c.fillStyle = '#1e1a22'; c.fillRect(-1.4, -6.5, 1, 1); c.fillRect(0.4, -6.5, 1, 1);
    c.restore();
  }
  c.lineCap = 'butt';
}
// A zombie seagull (like the crow: circles above you and dives to peck). pose 2 = diving.
function drawGull(c, z, k, atk) {
  const flap = z.dead ? 0.5 : Math.sin(z.walkT), dive = z.pose === 2;
  c.translate(0, -11); c.rotate(dive ? 0.5 : z.dead ? 0 : -0.06);
  const grey = k.fl ? '#ffffff' : z.shirt;
  const wing = (dx, color, amp) => {
    c.save(); c.translate(dx, -2); c.rotate(-0.3 + flap * amp);
    poly(c, [0, 0, -4, -12, -14, -17, -20, -14, -10, -2], color);
    poly(c, [-14, -17, -20, -14, -17, -12], k.fl ? '#ffffff' : '#1a1a1a');   // black wing tip
    c.restore();
  };
  wing(3, grey, 0.8);
  poly(c, [-9, -1, -19, -3, -19, 3, -9, 3], k.fur);   // tail
  c.fillStyle = k.fur; c.beginPath(); c.ellipse(0, 0, 11, 6, 0, 0, Math.PI * 2); c.fill();
  if (!k.fl) { circle(c, -3, 2, 2.4, '#9ab07a'); ribs(c, -1, -2, 2, 4); }   // rotten patch
  circle(c, 10, -3, 5, k.fur);
  poly(c, [14, -4, 22 + atk * 2, -2.5, 14, -1], k.fl ? '#ffffff' : '#f0c020');   // yellow beak with a red spot
  circle(c, 19, -2, 0.9, '#d82a2a');
  zEye(c, 12, -4.5, 1.2, z.eye, z.dead);
  c.strokeStyle = k.fl ? '#ffffff' : '#e0a040'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-1, 5); c.lineTo(-3, 9); c.moveTo(2, 5); c.lineTo(1, 9); c.stroke();
  wing(1, grey, 1);
}
// The Mega Mascot: a giant zombie in a fluffy pink bunny costume. A torn sleeve shows the zombie arm,
// and a zombie face looks out of the costume's mouth.
function drawMascot(c, z, k, atk) {
  const air = !z.onGround && !z.dead, fl = k.fl, pink = k.fur, white = fl ? '#ffffff' : z.shirt, dark = k.dark;
  const sq = air ? 0.94 : 1.04 + Math.sin(G.t * 4 + z.phase) * 0.02, walk = z.dead ? 0 : Math.sin(z.walkT * 0.8);
  c.save(); c.scale(1 / sq, sq);
  for (const side of [-1, 1]) { c.fillStyle = side < 0 ? dark : pink; c.beginPath(); c.ellipse(side * 18 + 6, -8, 20, 9, 0, 0, Math.PI * 2); c.fill(); }   // big fluffy feet
  c.fillStyle = pink; c.beginPath(); c.ellipse(0, -55, 34, 42, 0, 0, Math.PI * 2); c.fill();   // body
  c.fillStyle = white; c.beginPath(); c.ellipse(6, -50, 20, 26, 0, 0, Math.PI * 2); c.fill();   // tummy patch
  if (!fl) {   // a stitched-on heart and some rips with stuffing coming out
    c.fillStyle = '#e84a6a'; c.beginPath(); c.moveTo(8, -46); c.bezierCurveTo(0, -56, -4, -46, 8, -38); c.bezierCurveTo(20, -46, 16, -56, 8, -46); c.fill();
    c.strokeStyle = '#8a3a4a'; c.lineWidth = 1.2; c.beginPath(); for (let i = 0; i < 4; i++) { c.moveTo(-24 + i * 4, -70); c.lineTo(-22 + i * 4, -66); } c.stroke();
    circle(c, -20, -32, 4, '#f4f0e8'); circle(c, -17, -30, 3, '#f4f0e8');
  }
  const up = air ? 1 : atk;
  c.save(); c.translate(-26, -78); c.rotate(0.9 - up * 1.8 + walk * 0.1); fillRR(c, -7, 0, 14, 36, 7, dark); c.restore();   // the far arm
  c.save(); c.translate(28, -78); c.rotate(-0.4 - up * 1.6 - walk * 0.1);   // the near arm: the sleeve is torn, and a zombie arm sticks out
  fillRR(c, -7, 0, 14, 24, 7, pink); fillRR(c, -4, 22, 9, 18, 4, fl ? '#ffffff' : '#7fa865');
  c.fillStyle = fl ? '#ffffff' : '#7fa865'; for (let i = 0; i < 3; i++) c.fillRect(-3 + i * 3, 39, 2, 5);
  c.restore();
  c.save(); c.translate(4, -112); c.rotate(Math.sin(G.t * 2 + z.phase) * 0.06 - (air ? 0.1 : 0));
  c.fillStyle = pink;   // ears (one flops over)
  c.save(); c.translate(-12, -24); c.rotate(-0.15); fillRR(c, -7, -40, 14, 42, 7, pink); fillRR(c, -3.5, -34, 7, 30, 3.5, fl ? '#ffffff' : '#ffd0e0'); c.restore();
  c.save(); c.translate(12, -24); c.rotate(0.9 + Math.sin(G.t * 3) * 0.1); fillRR(c, -7, -36, 14, 38, 7, pink); fillRR(c, -3.5, -30, 7, 26, 3.5, fl ? '#ffffff' : '#ffd0e0'); c.restore();
  circle(c, 0, 0, 30, pink);
  for (const ex of [-11, 13]) circle(c, ex, -8, 5.5, '#1a1a1a');   // big button eyes
  if (!fl) { circle(c, -12.5, -9.5, 1.6, '#ffffff'); c.strokeStyle = '#1a1a1a'; c.lineWidth = 1; c.beginPath(); c.moveTo(13, -3); c.lineTo(15, 4); c.stroke(); }   // one hangs by a thread
  circle(c, 1, 2, 3, '#e84a6a');   // nose
  c.fillStyle = '#1a0a10'; c.beginPath(); c.ellipse(1, 13, 12, 6 + atk * 4, 0, 0, Math.PI * 2); c.fill();   // the mouth hole...
  c.fillStyle = fl ? '#ffffff' : '#7fa865'; c.beginPath(); c.ellipse(1, 14, 8, 4 + atk * 3, 0, 0, Math.PI * 2); c.fill();   // ...with a zombie face inside
  zEye(c, -2, 13, 1.4, z.eye, z.dead); zEye(c, 4, 13, 1.4, z.eye, z.dead);
  c.strokeStyle = '#8a3a4a'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-16, 8); c.quadraticCurveTo(1, 26, 18, 8); c.stroke();   // the costume's big stitched grin
  c.restore();
  c.restore();
}
