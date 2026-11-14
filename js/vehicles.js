'use strict';
// The driving level (a level with  vehicle: true  in js/levels.js, like Highway Escape).
// Every player drives their own pickup truck and stands in the back with all their guns:
//   left/right  drive (the truck turns round when you change direction)   jump  the truck hops
//   down  drop off a wreck   fire  shoot at zombies in front OR behind (auto-aim looks both ways)
// Driving into zombies runs them over: the faster you go, the harder they fly. Big ones and bosses
// stop the truck dead, so shoot those. Driving into a barrel sets it off!
// Also here: the highway's backgrounds (THEMES.highway).

const TRUCK = {
  w: 118, h: 100,     // size (the zombies bite the truck, and you)
  bed: 30,            // how high the truck bed is: you stand on it
  max: 560,           // top speed (walking is 270)
  accel: 950, brake: 1900, roll: 420,   // speeding up, braking, and slowing down when you let go
  jump: 640,          // hop
  ram: 130,           // the slowest speed that still runs zombies over
};
const TRUCK_COLS = ['#c8372b', '#2f6fd8', '#3aa860', '#e8a020'];   // one color for each player
const riderX = p => p.x - (p.vface || 1) * 22;   // you stand in the truck bed, behind the cab

function enterTruck(p) { p.veh = true; p.vface = p.facing || 1; p.w = TRUCK.w; p.h = TRUCK.h; }

function driveTruck(p, dt) {
  const move = (held(p, 'right') ? 1 : 0) - (held(p, 'left') ? 1 : 0);
  if (move) {
    p.vx += move * (p.vx * move < 0 ? TRUCK.brake : TRUCK.accel) * dt * (p.onGround ? 1 : 0.4);
    p.vface = move;
  } else if (p.onGround) p.vx = approach(p.vx, 0, TRUCK.roll * dt);
  p.vx = clamp(p.vx, -TRUCK.max, TRUCK.max);
  p.coyote = p.onGround ? 0.09 : p.coyote - dt;
  p.jumpBuf -= dt;
  if (p.jumpBuf > 0 && p.coyote > 0) {
    p.vy = -TRUCK.jump; p.onGround = false; p.coyote = 0; p.jumpBuf = 0;
    dust(p.x - 40, p.y, 4); dust(p.x + 40, p.y, 4); Sound.play('jump', p.x);
  }
  if (held(p, 'down') && p.onGround && p.onPlat) { p.dropT = 0.25; p.onGround = false; p.onPlat = null; }
  p.dropT -= dt;
  p.vy = Math.min(p.vy + GRAV * dt, 1400);
  const lo = 70, hi = G.level.worldW - 70;
  p.x += p.vx * dt;
  if (p.x < lo || p.x > hi) { p.x = clamp(p.x, lo, hi); p.vx = 0; }
  p.prevY = p.y; p.y += p.vy * dt;
  const wasGround = p.onGround, fall = p.vy;
  land(p);
  if (p.onGround && !wasGround && fall > 500) { dust(p.x - 40, p.y, 5); dust(p.x + 40, p.y, 5); Sound.play('land', p.x); G.shake = Math.max(G.shake, 4); }
  p.walkT += dt * p.vx / 15;   // the wheels turning
  if (p.onGround && Math.abs(p.vx) > 300 && Math.random() < dt * 8) dust(p.x - p.vface * 55, p.y, 1, '#8a8496');
  ramZombies(p);
}
// Run them over! Only what's in front of the truck (the way it's moving) gets hit.
function ramZombies(p) {
  const sp = Math.abs(p.vx), dir = Math.sign(p.vx);
  if (sp < TRUCK.ram) return;
  for (const z of G.zombies) {
    if (z.dead || z.T.fly || z.ramCd > 0) continue;
    const dx = z.x - p.x;
    if (Math.abs(dx) > TRUCK.w / 2 + z.w / 2 - 4 || dx * dir < -10 || z.y < p.y - 60 || z.y - z.h > p.y) continue;
    z.ramCd = 0.45;
    const heavy = z.T.boss || z.mass >= 5;
    hurtZombie(z, 30 + sp * 0.18, dir * (heavy ? 120 : 260 + sp * 0.9), heavy ? 0 : -(260 + sp * 0.5), true);
    goo(z.x, z.y - z.h * 0.5, 8, dir);
    G.shake = Math.max(G.shake, heavy ? 9 : 4);
    Sound.play('thud', z.x);
    if (heavy) { p.vx = -dir * 160; return; }   // like driving into a wall: the truck bounces back
    p.vx *= 0.93;
  }
  for (const b of G.barrels) {
    if (b.gone || b.fly || b.drop > 0 || b.armed) continue;
    if (Math.abs(b.x - p.x) < TRUCK.w / 2 + b.w / 2 && (b.x - p.x) * dir > -10 && Math.abs(b.y - p.y) < 40) hitBarrel(b, 99, dir);
  }
}

// ---- Drawing ------------------------------------------------------------------------
// The truck in two layers so you stand inside it: front = false is the inside of the bed (behind you),
// front = true is everything else (in front of your legs).
function drawTruck(c, p, front) {
  const col = p.dead ? '#4a4650' : TRUCK_COLS[p.id % TRUCK_COLS.length], dark = shade(col, -0.32), light = shade(col, 0.18);
  c.save(); c.translate(p.x, p.y + (p.onGround && Math.abs(p.vx) > 200 ? Math.sin(G.t * 30) * 0.8 : 0)); c.scale(p.vface || 1, 1);
  if (!front) { fillRR(c, -58, -54, 56, 28, 3, shade(col, -0.55)); c.restore(); return; }
  if (!p.dead) {   // headlights shining ahead
    c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(255,240,180,0.09)';
    c.beginPath(); c.moveTo(60, -44); c.lineTo(250, -78); c.lineTo(250, -8); c.closePath(); c.fill();
    c.globalCompositeOperation = 'source-over';
  }
  fillRR(c, -62, -36, 124, 22, 6, dark);                       // the chassis
  fillRR(c, -60, -54, 60, 30, 4, col);                         // the truck bed's side
  c.fillStyle = light; c.fillRect(-58, -54, 56, 3);
  c.fillStyle = 'rgba(0,0,0,0.2)'; c.fillRect(-56, -46, 23, 14); c.fillRect(-30, -46, 25, 14);   // armor plates
  c.fillStyle = '#c8c8d0'; for (const [rx, ry] of [[-54, -44], [-36, -44], [-54, -35], [-36, -35], [-28, -44], [-8, -44], [-28, -35], [-8, -35]]) c.fillRect(rx, ry, 2, 2);
  fillRR(c, -4, -80, 40, 56, 9, col);                          // the cab
  fillRR(c, 28, -54, 32, 30, 7, col);                          // the hood
  c.fillStyle = light; c.fillRect(30, -54, 26, 3);
  fillRR(c, 4, -74, 26, 19, 4, '#16202c');                     // tinted window with bars
  c.fillStyle = 'rgba(160,210,255,0.25)'; c.fillRect(6, -72, 6, 15);
  c.strokeStyle = '#5a5e68'; c.lineWidth = 2; c.beginPath(); for (const bx of [12, 19, 26]) { c.moveTo(bx, -74); c.lineTo(bx, -55); } c.stroke();
  fillRR(c, 57, -50, 7, 28, 2, '#5a5e68');                     // bull bar with spikes for zombies
  for (const sy of [-46, -37, -28]) poly(c, [64, sy - 3, 74, sy, 64, sy + 3], '#d8dce4');
  circle(c, 58, -46, 3.5, p.dead ? '#555' : '#fff6b0');         // headlight
  fillRR(c, -66, -40, 5, 10, 1.5, '#3a3a40');                  // tail pipe
  const wheel = x => {
    circle(c, x, -16, 16, '#18181c'); circle(c, x, -16, 7.5, '#9a9aa4');
    c.strokeStyle = '#5a5a64'; c.lineWidth = 2; c.beginPath();
    for (let i = 0; i < 4; i++) { const a = (p.walkT || 0) + i * Math.PI / 2; c.moveTo(x, -16); c.lineTo(x + Math.cos(a) * 7, -16 + Math.sin(a) * 7); }
    c.stroke(); circle(c, x, -16, 2.5, '#3a3a40');
  };
  wheel(-36); wheel(38);
  if (p.dead) {   // a wrecked truck smokes
    for (let k = 0; k < 4; k++) { const ph = (G.t * 0.7 + k / 4) % 1; c.globalAlpha = (1 - ph) * 0.5; circle(c, 40 + ph * 10, -60 - ph * 50, 6 + ph * 12, '#3a3640'); }
    c.globalAlpha = 1;
  }
  c.restore();
}

// ---- The highway's backgrounds -------------------------------------------------------
// Night, the burning city far behind, light poles, a guard rail, overhead road signs and burnt-out cars.
const HIGHWAY_SIGNS = [['RESCUE ZONE', '8 MI  →'], ['ZOMBIES AHEAD', 'DO NOT STOP'], ['RESCUE ZONE', '4 MI  →'], ['EXIT 13', 'SAFE ZONE  →'], ['HELIPAD', '1 MI  →']];
THEMES.highway = {
  fog: [255, 140, 80, 0.07],
  bg(bg, L, r) {
    bg.far = genCity(r, L.worldW * 0.06 + W + 300, 110, 250);
    bg.fires = []; for (let x = 60; x < L.worldW * 0.06 + W + 300; x += 180 + r() * 260) bg.fires.push({ x, s: 0.6 + r() * 0.8 });
    bg.trees = []; for (let x = -40; x < L.worldW * 0.3 + W + 200; x += 40 + r() * 60) bg.trees.push({ x, h: 30 + r() * 40 });
    bg.wrecks = []; for (let x = 300; x < L.worldW - 200; x += 520 + r() * 520) bg.wrecks.push({ x, col: pickR(r, ['#3a3236', '#2e3440', '#3e3628']), fire: r() < 0.45 });
  },
  backdrop(c, L, camX, bg) {
    const g = c.createLinearGradient(0, 0, 0, GROUND);
    g.addColorStop(0, '#070818'); g.addColorStop(0.55, '#1e1430'); g.addColorStop(0.85, '#5a2430'); g.addColorStop(1, '#a8462a');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    drawStars(c, 0.7);
    const mx = 160 - camX * 0.02; glow(c, mx, 80, 100, '230,230,255', 0.2); circle(c, mx, 80, 26, '#e8e6f4');
    for (const f of bg.fires) {   // the city you're escaping, on fire
      const x = f.x - camX * 0.06; if (x < -200 || x > W + 200) continue;
      glow(c, x, GROUND - 110, 130 * f.s, '255,110,40', 0.3);
      for (let k = 0; k < 3; k++) { const ph = (G.t * 0.08 + k / 3 + f.x) % 1; c.globalAlpha = (1 - ph) * 0.35; circle(c, x + ph * 40, GROUND - 160 - ph * 160, (16 + ph * 40) * f.s, '#1a1218'); }
      c.globalAlpha = 1;
    }
    drawCityLayer(c, bg.far, camX * 0.06, '#120c1c', ['rgba(255,150,90,0.35)', 'rgba(255,210,140,0.5)'], 5, 7);
    ridge(c, camX, 0.18, GROUND - 52, 12, 0.012, '#160f20', 2);
    c.fillStyle = '#100c18';
    for (const t of bg.trees) {   // a dark tree line
      const x = t.x - camX * 0.3; if (x < -40 || x > W + 40) continue;
      poly(c, [x - 12, GROUND - 40, x, GROUND - 40 - t.h, x + 12, GROUND - 40], '#100c18');
    }
  },
  back(c, L, camX, bg, x0, x1, vis) {
    c.fillStyle = '#1a1620'; c.fillRect(x0, GROUND - 40, x1 - x0, 16);   // the far side of the road
    for (const w of bg.wrecks) {   // burnt-out cars on the other side of the barrier
      if (!vis(w.x, 120)) continue;
      fillRR(c, w.x - 40, GROUND - 52, 80, 18, 5, w.col); fillRR(c, w.x - 22, GROUND - 64, 40, 14, 5, w.col);
      c.fillStyle = '#0c0a10'; c.fillRect(w.x - 18, GROUND - 61, 14, 8); c.fillRect(w.x + 1, GROUND - 61, 14, 8);
      circle(c, w.x - 24, GROUND - 34, 8, '#0c0a10'); circle(c, w.x + 24, GROUND - 34, 8, '#0c0a10');
      if (w.fire) { c.globalCompositeOperation = 'lighter'; for (let k = 0; k < 3; k++) flameShape(c, w.x - 10 + k * 10, GROUND - 60, 5, 14 + Math.sin(G.t * 9 + k * 2 + w.x) * 5, 'rgba(255,120,40,0.7)'); c.globalCompositeOperation = 'source-over'; }
    }
    for (let x = Math.floor(x0 / 420) * 420 + 210; x < x1 + 60; x += 420) {   // light poles
      c.fillStyle = '#3a3a46'; c.fillRect(x - 2, GROUND - 210, 4, 186); c.fillRect(x - 2, GROUND - 210, 34, 4);
      fillRR(c, x + 24, GROUND - 212, 16, 6, 2, '#2a2a34');
      c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(255,220,150,0.06)';
      c.beginPath(); c.moveTo(x + 26, GROUND - 206); c.lineTo(x + 38, GROUND - 206); c.lineTo(x + 90, GROUND - 24); c.lineTo(x - 26, GROUND - 24); c.closePath(); c.fill();
      c.globalCompositeOperation = 'source-over';
      circle(c, x + 32, GROUND - 204, 3, '#ffe6a8');
    }
    for (let i = 0, x = 1100; x < L.worldW - 400; i++, x += 1900) {   // big green signs over the road
      if (!vis(x, 300)) continue;
      c.fillStyle = '#4a4a56'; c.fillRect(x - 4, GROUND - 250, 8, 226); c.fillRect(x + 276, GROUND - 250, 8, 226); c.fillRect(x - 4, GROUND - 250, 288, 8);
      const [a, b] = HIGHWAY_SIGNS[i % HIGHWAY_SIGNS.length];
      fillRR(c, x + 40, GROUND - 244, 200, 56, 6, '#1e6a3a'); c.strokeStyle = '#e8f0e8'; c.lineWidth = 2; rr(c, x + 44, GROUND - 240, 192, 48, 4); c.stroke();
      text(c, a, x + 140, GROUND - 226, { size: 13, color: '#ffffff' }); text(c, b, x + 140, GROUND - 205, { size: 12, color: '#ffffff' });
    }
    c.fillStyle = '#6a6a76';   // the guard rail
    for (let x = Math.floor(x0 / 60) * 60; x < x1; x += 60) c.fillRect(x, GROUND - 40, 4, 18);
    c.fillStyle = '#9a9aa8'; c.fillRect(x0, GROUND - 40, x1 - x0, 5);
    c.fillStyle = '#2a2830'; c.fillRect(x0, GROUND - 24, x1 - x0, H - GROUND + 24);   // the road
    c.fillStyle = '#e8e4d8'; c.fillRect(x0, GROUND - 22, x1 - x0, 2);
    c.fillStyle = '#e8c840'; for (let x = Math.floor(x0 / 90) * 90; x < x1; x += 90) c.fillRect(x, GROUND + 34, 48, 4);   // lane lines
    c.fillStyle = '#1e1c24'; c.fillRect(x0, GROUND + 2, x1 - x0, 3);
  },
};
