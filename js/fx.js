'use strict';
// Particles (zombie goo, sparks, smoke, fire), floating numbers, banners and toasts.

const MAX_PARTS = 900;
function addPart(p) { if (G.particles.length < MAX_PARTS) { p.max = p.life; G.particles.push(p); } }

function goo(x, y, n, dir = 0, big = 1) {
  for (let i = 0; i < n; i++) addPart({ type: 'goo', x, y, vx: dir * rand(40, 240) + rand(-80, 80), vy: rand(-340, -60), g: 1400, life: rand(0.4, 0.9), size: rand(1.8, 4.2) * big, col: pick(['#7bd64a', '#5fae3a', '#9be36a', '#4c8f2e']), floor: true });
}
function sparks(x, y, n, ang, spread, col = '#ffd27a', speed = 300) {
  for (let i = 0; i < n; i++) { const a = ang + rand(-spread, spread), s = rand(0.4, 1) * speed; addPart({ type: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 500, life: rand(0.12, 0.3), size: rand(1, 2), col }); }
}
function smoke(x, y, n, size = 10, col = '#46404f') {
  for (let i = 0; i < n; i++) addPart({ type: 'smoke', x: x + rand(-size, size), y: y + rand(-size, size), vx: rand(-40, 40), vy: rand(-70, -20), g: 0, life: rand(0.6, 1.3), size: rand(size * 0.6, size * 1.2), col });
}
function fireBurst(x, y, n, power = 1) {
  for (let i = 0; i < n; i++) { const a = rand(Math.PI * 2), s = rand(40, 320) * power; addPart({ type: 'fire', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, g: -200, drag: 3, life: rand(0.25, 0.6), size: rand(6, 14) * power }); }
}
function dust(x, y, n, col = '#b4aabe') {
  for (let i = 0; i < n; i++) addPart({ type: 'dust', x: x + rand(-8, 8), y: y - 2, vx: rand(-90, 90), vy: rand(-50, -10), g: 0, drag: 4, life: rand(0.3, 0.6), size: rand(3, 6), col });
}
function ring(x, y, r, col = '#fff', life = 0.35) { addPart({ type: 'ring', x, y, vx: 0, vy: 0, g: 0, life, size: r, col }); }
function flashAt(x, y, r) { addPart({ type: 'flash', x, y, vx: 0, vy: 0, g: 0, life: 0.14, size: r }); }
function addText(x, y, str, col = '#fff', size = 14) {
  G.texts.push({ x, y, str, col, size, life: 0.8, max: 0.8, vy: -60 });
  if (G.texts.length > 70) G.texts.shift();
}
// Damage numbers. Hits on the same zombie close together add up into one number that counts up,
// so a Minigun burst shows "340" instead of a tower of "11"s. uid = which zombie was hit.
function hitNum(uid, x, y, dmg) {
  if (typeof uid !== 'number' || ![x, y, dmg].every(Number.isFinite)) return;
  let t = G.texts.find(q => q.uid === uid && q.hold < 0.45);
  if (!t) {
    t = { uid, total: 0, x, y, str: '', col: '#fff', size: 14, life: 0.8, max: 0.8, vy: -60, hold: 0, pop: 0 };
    G.texts.push(t);
    if (G.texts.length > 70) G.texts.shift();
  }
  t.total += dmg; t.str = String(Math.round(t.total));
  t.x = x; t.y = y; t.vy = -60; t.life = t.max; t.hold = 0; t.pop = 1;
  [t.col, t.size] = t.total >= 200 ? ['#ff9a3d', 24] : t.total >= 50 ? ['#FFD23F', 20] : ['#fff', 14];
}
// A tiny freeze on a really big hit (Sniper, Rocket, High Explosive, a boss going down) makes it feel heavy.
// Not in Wi-Fi games: there the other players would see it as the connection stuttering.
function hitStop(t) {
  if (Net.active || (G.hitStopCd > 0 && t <= G.hitStop)) return;
  G.hitStop = Math.max(G.hitStop, t); G.hitStopCd = 0.4;
  padRumble(1, 0.7, 200);   // js/gamepad.js
}
function banner(title, sub, dur = 2.4, color = '#7CFC4A') { G.banner = { title, sub, t: 0, dur, color }; }
function toast(msg) { G.toast = { msg, t: 0 }; }

// Shorter numbers = smaller Wi-Fi messages. Objects are copied so later changes don't leak in.
function netRound(a) {
  if (typeof a === 'number') return Math.round(a * 100) / 100;
  if (a && typeof a === 'object') { const o = {}; for (const k in a) o[k] = typeof a[k] === 'number' ? Math.round(a[k] * 100) / 100 : a[k]; return o; }
  return a;
}
// Wrap the effect makers so a Wi-Fi host can record them (see Rec in util.js).
// Only the outermost call is recorded (goo() calls addPart() inside, for example).
for (const name of ['goo', 'sparks', 'smoke', 'fireBurst', 'dust', 'ring', 'flashAt', 'addText', 'hitNum', 'addPart', 'banner', 'toast']) {
  const orig = window[name];
  window[name] = function (...args) {
    const rec = Rec.on && Rec.depth === 0;
    if (rec) Rec.push('fx', name, args.map(netRound));
    Rec.depth++;
    try { return orig.apply(this, args); } finally { Rec.depth--; }
  };
}
const FX_NAMES = new Set(['goo', 'sparks', 'smoke', 'fireBurst', 'dust', 'ring', 'flashAt', 'addText', 'hitNum', 'addPart', 'banner', 'toast']);

function updateFX(dt) {
  const ps = G.particles;
  for (let i = ps.length - 1; i >= 0; i--) {
    const p = ps[i];
    p.life -= dt;
    if (p.life <= 0) { ps[i] = ps[ps.length - 1]; ps.pop(); continue; }
    p.vy += p.g * dt;
    if (p.drag) { const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy *= k; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.rot !== undefined) p.rot += p.vr * dt;
    if ((p.floor || p.bounce) && p.y > GROUND - 1) {
      p.y = GROUND - 1; p.vy *= -(p.bounce || 0.15); p.vx *= 0.55;
      if (Math.abs(p.vy) < 30) p.vy = 0;
      if (p.vr) p.vr *= 0.5;
    }
  }
  for (let i = G.texts.length - 1; i >= 0; i--) {
    const t = G.texts[i]; t.life -= dt;
    if (t.hold !== undefined) { t.hold += dt; t.pop = Math.max(0, t.pop - dt * 6); }
    if (!(t.hold < 0.12)) { t.y += t.vy * dt; t.vy *= Math.exp(-2 * dt); }   // a number still being hit stays on the zombie
    if (t.life <= 0) G.texts.splice(i, 1);
  }
  for (let i = G.beams.length - 1; i >= 0; i--) { G.beams[i].t -= dt; if (G.beams[i].t <= 0) G.beams.splice(i, 1); }
  if (G.banner) { G.banner.t += dt; if (G.banner.t > G.banner.dur) G.banner = null; }
  if (G.toast) { G.toast.t += dt; if (G.toast.t > 1.4) G.toast = null; }
}

function drawParticles(c) {
  for (const p of G.particles) {
    const a = p.life / p.max;
    switch (p.type) {
      case 'goo': c.globalAlpha = Math.min(1, a * 2.5); circle(c, p.x, p.y, p.size, p.col); break;
      case 'spark':
        c.globalAlpha = a; c.strokeStyle = p.col; c.lineWidth = p.size;
        c.beginPath(); c.moveTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); c.lineTo(p.x, p.y); c.stroke(); break;
      case 'smoke': c.globalAlpha = a * 0.45; circle(c, p.x, p.y, p.size * (1 + (1 - a) * 1.4), p.col); break;
      case 'dust': c.globalAlpha = a * 0.5; circle(c, p.x, p.y, p.size * (1 + (1 - a)), p.col); break;
      case 'shell':
        c.globalAlpha = Math.min(1, a * 3); c.save(); c.translate(p.x, p.y); c.rotate(p.rot);
        c.fillStyle = p.col; c.fillRect(-p.size, -p.size * 0.45, p.size * 2, p.size * 0.9); c.restore(); break;
      case 'ring':
        c.globalAlpha = a; c.strokeStyle = p.col; c.lineWidth = 3 * a + 1;
        c.beginPath(); c.arc(p.x, p.y, p.size * (1.15 - a), 0, Math.PI * 2); c.stroke(); break;
      case 'slash': {   // the swoosh of a melee swing
        const r = p.size * (0.85 + (1 - a) * 0.25);
        c.globalAlpha = a * 0.8; c.strokeStyle = p.col; c.lineCap = 'round'; c.lineWidth = 7 * a + 1;
        c.beginPath();
        if (p.dir > 0) c.arc(p.x, p.y, r, -1.5, 0.9); else c.arc(p.x, p.y, r, Math.PI - 0.9, Math.PI + 1.5);
        c.stroke(); c.lineCap = 'butt';
        break;
      }
      case 'plus':
        c.globalAlpha = a; c.fillStyle = p.col; c.fillRect(p.x - 1.5, p.y - 5, 3, 10); c.fillRect(p.x - 5, p.y - 1.5, 10, 3); break;
    }
  }
  c.globalAlpha = 1;
  // Glowing things are added on top so they light up whatever is behind them.
  c.globalCompositeOperation = 'lighter';
  for (const p of G.particles) {
    const a = p.life / p.max;
    if (p.type === 'fire') {
      c.globalAlpha = a * 0.9;
      circle(c, p.x, p.y, p.size * (0.4 + a * 0.8), a > 0.65 ? '#fff0a0' : a > 0.35 ? '#ffa23a' : '#ff4d1f');
    } else if (p.type === 'flash') {
      c.globalAlpha = a;
      const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      g.addColorStop(0, 'rgba(255,255,230,1)'); g.addColorStop(1, 'rgba(255,200,120,0)');
      c.fillStyle = g; c.fillRect(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
    }
  }
  c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
}

function drawTexts(c) {
  for (const t of G.texts) {
    c.globalAlpha = clamp(t.life / t.max * 2, 0, 1);
    text(c, t.str, t.x, t.y, { size: t.size * (1 + 0.35 * (t.pop || 0)), color: t.col, stroke: 'rgba(10,5,20,.8)', lw: 3 });
  }
  c.globalAlpha = 1;
}

function drawBanner(c) {
  const b = G.banner; if (!b) return;
  const a = Math.min(1, b.t * 4, (b.dur - b.t) * 2.5);
  const pop = 1 + Math.max(0, 0.25 - b.t) * 1.4;
  c.save(); c.globalAlpha = clamp(a, 0, 1); c.translate(W / 2, H * 0.3); c.scale(pop, pop);
  text(c, b.title, 0, 0, { size: 66, font: SPOOKY, color: b.color, stroke: 'rgba(8,4,16,.88)', lw: 9 });
  if (b.sub) text(c, b.sub, 0, 50, { size: 17, color: '#fff', stroke: 'rgba(8,4,16,.85)', lw: 5 });
  c.restore();
}
function drawToast(c) {
  const t = G.toast; if (!t) return;
  c.globalAlpha = clamp(Math.min(t.t * 6, (1.4 - t.t) * 3), 0, 1);
  text(c, t.msg, W / 2, H - 92, { size: 16, color: '#FFD23F', stroke: 'rgba(8,4,16,.85)', lw: 5 });
  c.globalAlpha = 1;
}
