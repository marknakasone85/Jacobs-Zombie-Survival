'use strict';
// The ending. After the last level a rescue helicopter flies in, drops a rope ladder, everybody climbs up,
// and it flies away with you hanging on: YOU SURVIVED! Then the "You Survived!" screen shows your coins.
// It's also on the level list (after you've beaten the last level) so you can watch it again.
// G.rescueT = seconds since it started, G.rescueX = where it happens. Wi-Fi friends get both from the host.

const RESCUE_TIME = 11.5, HELI_Y = 150;
const ease = k => k * k * (3 - 2 * k);

function startRescue() {
  setState('rescue'); hideOverlays();
  const ps = G.players.filter(p => !p.dead).length ? G.players.filter(p => !p.dead) : G.players;
  G.rescueT = 0; G.rescueX = ps.length ? ps.reduce((n, p) => n + p.x, 0) / ps.length : G.camX + W / 2;
  G.banner = null; G.shots.length = 0; G.bullets.length = 0; G.queue = []; G.bossPending = false; G.finale = null;
  for (const p of G.players) if (p.dead) revive(p, G.rescueX, 50);   // nobody gets left behind
}
// Watch it again from the level list.
function replayRescue() {
  startLevel(LEVELS.length - 1);
  G.zombies.length = 0;
  startRescue();
}
function updateRescue(dt) {
  const t0 = G.rescueT, t = (G.rescueT += dt);
  G.camX = lerp(G.camX, clamp(G.rescueX - W / 2, 0, Math.max(0, G.level.worldW - W)), Math.min(1, dt * 3));
  for (const p of G.players) { p.vx *= Math.exp(-4 * dt); p.x += p.vx * dt; p.firing = false; }
  updateFX(dt);
  G.shake = Math.max(0, G.shake - dt * 30);
  Sound.hold('rotor', 'rotor', t < RESCUE_TIME - 1, heliPos(t).x);
  if (t0 < 5 && t >= 5) Sound.play('levelup');
  if (t > 5 && Math.floor(t0 / 0.35) !== Math.floor(t / 0.35)) {   // fireworks!
    const x = G.camX + rand(80, W - 80), y = rand(50, 250), col = pick(['#ffd23f', '#ff5a6e', '#7CFC4A', '#5ab0ff', '#c78bff', '#ffffff']);
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2 + rand(-0.05, 0.05), sp = rand(200, 300);
      addPart({ type: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 160, drag: 1.2, life: rand(0.7, 1.1), size: 2.2, col });
    }
    ring(x, y, rand(60, 90), col, 0.5); flashAt(x, y, 70);
    Sound.play('boom', x);
  }
  if (t >= RESCUE_TIME) showWin();
}
// Where the helicopter is: flies in from the right, hovers over you, then flies off to the left.
function heliPos(t) {
  const rx = G.rescueX || 0;
  if (t < 3) { const k = ease(t / 3); return { x: rx + 900 * (1 - k), y: HELI_Y - 110 * (1 - k), tilt: -0.18 * (1 - k) }; }
  if (t < 7.2) return { x: rx + Math.sin(t * 1.5) * 6, y: HELI_Y + Math.sin(t * 2.2) * 4, tilt: Math.sin(t * 1.5) * 0.02 };
  const k = (t - 7.2) / 3.5;
  return { x: rx - 1100 * k * k, y: HELI_Y - 260 * k * k, tilt: -0.22 * Math.min(1, k * 3) };
}
const ladderLen = t => (t < 3 ? 0 : clamp((t - 3) / 0.8, 0, 1) * (GROUND - 70 - HELI_Y - 34));
const climbStart = i => 3.8 + i * 0.4;
// 0 = still in your truck (or on the ground), 1 = at the top of the ladder.
const climbK = (p, t) => clamp((t - climbStart(G.players.indexOf(p))) / 1.4, 0, 1);
const onLadder = (p, t) => G.state === 'rescue' && t >= climbStart(G.players.indexOf(p));

// A military utility helicopter (Black Hawk style), nose to the left, with its side door open for the ladder.
function drawHeli(c, x, y, tilt) {
  c.save(); c.translate(x, y); c.rotate(tilt);
  c.globalCompositeOperation = 'lighter';   // searchlight
  c.fillStyle = 'rgba(255,250,210,0.08)'; c.beginPath(); c.moveTo(-14, 24); c.lineTo(14, 24); c.lineTo(110, GROUND - y + 10); c.lineTo(-110, GROUND - y + 10); c.closePath(); c.fill();
  c.globalCompositeOperation = 'source-over';
  fillRR(c, 34, -13, 98, 11, 5, '#3a4630');                          // tail boom
  poly(c, [118, -11, 132, -42, 140, -42, 132, -9], '#3a4630');       // tail fin
  fillRR(c, 112, -5, 26, 4, 2, '#2e3826');                           // tail wing
  c.fillStyle = 'rgba(40,40,50,0.6)'; c.beginPath(); c.ellipse(136, -30, 3, 15 * Math.abs(Math.sin(G.t * 50)) + 2, 0, 0, Math.PI * 2); c.fill();   // tail rotor
  c.fillStyle = '#4a5838'; c.beginPath();                            // body
  c.moveTo(-62, 6); c.quadraticCurveTo(-68, -14, -48, -22); c.lineTo(30, -26); c.lineTo(46, -12); c.lineTo(42, 14); c.lineTo(-50, 18); c.closePath(); c.fill();
  fillRR(c, -22, -38, 54, 15, 6, '#3a4630');                          // engines on top
  c.fillStyle = '#22281c'; c.fillRect(28, -36, 9, 6);                 // exhaust
  poly(c, [-59, 0, -47, -18, -28, -18, -30, 0], '#6a9ab8');          // cockpit windows
  c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(-44, -15, 9, 2);
  fillRR(c, -14, -17, 30, 30, 3, '#141810');                          // the open side door
  text(c, 'RESCUE', 72, -7, { size: 7, color: '#e8e8e8' });
  c.strokeStyle = '#2a2a2a'; c.lineWidth = 2.5; c.beginPath();        // landing wheels
  c.moveTo(-40, 16); c.lineTo(-42, 26); c.moveTo(24, 14); c.lineTo(26, 26); c.moveTo(118, -4); c.lineTo(120, 4); c.stroke();
  circle(c, -42, 27, 4, '#1a1a1a'); circle(c, 26, 27, 4, '#1a1a1a'); circle(c, 120, 5, 2.5, '#1a1a1a');
  c.fillStyle = '#2a2a2a'; c.fillRect(-3, -48, 6, 11);               // rotor mast and spinning blades
  c.fillStyle = 'rgba(200,200,210,0.18)'; c.beginPath(); c.ellipse(0, -48, 132, 7, 0, 0, Math.PI * 2); c.fill();
  for (const a of [G.t * 40, G.t * 40 + Math.PI / 2]) { const w = 130 * Math.cos(a); fillRR(c, Math.min(0, w), -50, Math.abs(w), 4, 2, 'rgba(50,50,60,0.85)'); }
  const blink = Math.floor(G.t * 3) % 2;
  circle(c, 140, -42, 2.5, blink ? '#ff4040' : '#5a1010'); circle(c, -50, 16, 2.5, blink ? '#5aff5a' : '#103a10');
  c.restore();
}
// A civilian climbing the ladder (drawn like a player, with the legs going).
function drawClimber(c, p, x, y, t) {
  const keep = { x: p.x, y: p.y, veh: p.veh, onGround: p.onGround, vx: p.vx, walkT: p.walkT, facing: p.facing, aim: p.aim, inv: p.inv, dead: p.dead, recoil: p.recoil, flashT: p.flashT };
  Object.assign(p, { x, y, veh: false, onGround: true, vx: 80, walkT: t * 9 + p.id, facing: 1, aim: -0.9, inv: 0, dead: false, recoil: 0, flashT: 0 });
  drawCivilian(c, p);
  Object.assign(p, keep);
}
// In world space, after the players.
function drawRescue(c) {
  const t = G.rescueT || 0, h = heliPos(t), len = ladderLen(t);
  const lx = h.x + 8, ly = h.y + 30;
  if (len > 0) {   // the rope ladder
    const sway = Math.sin(t * 2.4) * (t > 7.2 ? 14 : 4);
    c.strokeStyle = '#c8a870'; c.lineWidth = 2; c.beginPath();
    c.moveTo(lx - 8, ly); c.quadraticCurveTo(lx - 8 + sway * 0.5, ly + len / 2, lx - 8 + sway, ly + len);
    c.moveTo(lx + 8, ly); c.quadraticCurveTo(lx + 8 + sway * 0.5, ly + len / 2, lx + 8 + sway, ly + len); c.stroke();
    c.lineWidth = 2.5; c.beginPath();
    for (let d = 10; d < len; d += 13) { const s = sway * (d / len); c.moveTo(lx - 8 + s, ly + d); c.lineTo(lx + 8 + s, ly + d); }
    c.stroke();
    for (const p of G.players) {   // everybody climbing up
      if (!onLadder(p, t)) continue;
      const k = climbK(p, t), i = G.players.indexOf(p), top = 40 + i * 16;
      const d = lerp(len, top + 40, ease(k)), s = sway * (d / len);
      drawClimber(c, p, lx + s + (i % 2 ? 6 : -6), ly + d + 18, t);
    }
  }
  drawHeli(c, h.x, h.y, h.tilt);
}
// In screen space, on top of everything.
function drawRescueText(c) {
  const t = G.rescueT || 0;
  if (t < 5) return;
  const k = clamp((t - 5) / 0.5, 0, 1), s = 0.4 + 0.6 * (1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2));   // pops in with a bounce
  c.save(); c.translate(W / 2, H * 0.36); c.scale(s, s);
  glow(c, 0, 0, 260, '124,252,74', 0.18);
  text(c, 'YOU SURVIVED!', 0, 0, { size: 72, font: SPOOKY, color: '#7CFC4A', stroke: 'rgba(8,4,16,.9)', lw: 10 });
  c.restore();
  c.globalAlpha = clamp((t - 5.6) / 0.6, 0, 1);
  text(c, G.players.length > 1 ? 'The rescue helicopter got you all out of Zombie City!' : 'The rescue helicopter got you out of Zombie City!', W / 2, H * 0.36 + 58, { size: 16, color: '#ffffff', stroke: 'rgba(8,4,16,.85)', lw: 5 });
  c.globalAlpha = 1;
}
