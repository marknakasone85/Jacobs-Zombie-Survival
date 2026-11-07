'use strict';
// Main game: input, bullets, coins, waves and levels, the shop, the HUD and the game loop.

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = W * RES; canvas.height = H * RES;
const $ = id => document.getElementById(id);
const IS_TOUCH = matchMedia('(pointer: coarse)').matches;
const MEDKIT = { price: 25, heal: 50 };

// Clean up the save in case it mentions guns or levels that don't exist (any more).
for (const prof of save.players) {
  prof.owned = [...new Set(prof.owned.filter(id => WMAP[id]))];
  if (!prof.owned.includes('shotgun')) prof.owned.unshift('shotgun');
  if (!prof.owned.includes(prof.equipped)) prof.equipped = 'shotgun';
  prof.armors = [...new Set((prof.armors || []).filter(id => ARMOR_MAP[id]))];
  if (!prof.armors.includes(prof.armor)) prof.armor = '';
  prof.boost = clamp(prof.boost || 0, 0, HEALTH_BOOSTS.length);
}
save.unlocked = clamp(save.unlocked, 1, LEVELS.length);
makeIcons(); makeGearIcons();
const ownedList = prof => WEAPONS.filter(w => prof.owned.includes(w.id)).map(w => w.id);

const PLAYING = ['playing', 'cleared', 'dying'];
const slotOfKey = k => (k === '0' ? 9 : +k - 1);   // keys 1-9 pick the first nine weapons, 0 picks the tenth
const zombiesLeft = () => (Net.isGuest ? G.netLeft || 0 : G.queue.length + aliveZombies() + (G.bossPending ? 1 : 0));
const tagHtml = p => (G.players.length > 1 || Net.active ? `<span class="ptag p${(p.id % 4) + 1}">${p.look.tag}</span>` : '');
function clearWorld() {
  for (const arr of [G.zombies, G.bullets, G.coins, G.particles, G.texts, G.beams]) arr.length = 0;
  G.boss = null; G.banner = null; G.shake = 0; G.hurtFlash = 0;
}

// ---- Input ----------------------------------------------------------------
addEventListener('keydown', e => {
  if (e.target && e.target.tagName === 'INPUT') { if (e.key === 'Enter') joinGame(); return; }   // typing a join code
  const k = e.key.toLowerCase();
  if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', '/'].includes(k)) e.preventDefault();
  const first = !keys[k];
  keys[k] = true;
  if (first && !e.repeat) onKey(k);
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouse.down = false; });
// Wi-Fi games keep going in the background (other people are playing!).
document.addEventListener('visibilitychange', () => { if (document.hidden && !Net.active) pauseGame(); });

function onKey(k) {
  Sound.init();
  if (k === 'm') { Sound.setMuted(!save.muted); toast(save.muted ? 'Sound off' : 'Sound on'); return; }
  if (Net.isGuest) {   // a Wi-Fi guest sends key presses to the host
    if (!PLAYING.includes(G.state)) return;
    const c = CONTROLS.solo;
    if (k === 'p' || k === 'escape') { pauseGame(); return; }
    if (c.jump.includes(k)) NetGame.press('jump');
    if (c.fire.includes(k)) NetGame.guestAim = 'keys';
    if (c.prev.includes(k)) NetGame.press('prev');
    if (c.next.includes(k)) NetGame.press('next');
    if (/^[0-9]$/.test(k)) NetGame.press('s' + slotOfKey(k));
    return;
  }
  if (G.state === 'playing' || G.state === 'cleared') {
    if (k === 'p' || k === 'escape') { pauseGame(); return; }
    for (const p of G.players) {
      const c = p.ctrl;
      if (c.jump.includes(k)) p.jumpBuf = 0.13;
      if (c.fire.includes(k)) p.aimMode = 'keys';
      if (c.prev.includes(k)) cycleWeapon(p, -1);
      if (c.next.includes(k)) cycleWeapon(p, 1);
      if (c.slots && /^[0-9]$/.test(k)) selectSlot(p, slotOfKey(k));
    }
  } else if (G.state === 'paused' && (k === 'p' || k === 'escape')) resumeGame();
}

function toGame(e) {
  const r = canvas.getBoundingClientRect();
  mouse.sx = (e.clientX - r.left) / r.width * W; mouse.sy = (e.clientY - r.top) / r.height * H;
}
const mousePlayer = () => G.players.find(p => p.ctrl.mouse && !p.remote);
canvas.addEventListener('pointerdown', e => {
  Sound.init();
  if (e.pointerType === 'touch') return;   // phones and tablets use the on-screen buttons (auto-aim)
  toGame(e); mouse.down = true; mouse.id = e.pointerId;
  if (Net.isGuest) { NetGame.guestAim = 'mouse'; return; }
  const p = mousePlayer(); if (p) p.aimMode = 'mouse';
});
// Only a click switches to mouse aiming, so bumping the mouse never spins a keyboard player around.
addEventListener('pointermove', e => { if (e.pointerType !== 'touch') toGame(e); });
// iPhone/iPad: sound may only start on a finished tap, and pinch or double-tap must not zoom the game.
addEventListener('touchend', () => Sound.init(), { passive: true });
addEventListener('click', () => Sound.init());
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('dblclick', e => e.preventDefault());
addEventListener('pointerup', e => { if (e.pointerId === mouse.id) mouse.down = false; });
addEventListener('pointercancel', e => { if (e.pointerId === mouse.id) mouse.down = false; });
canvas.addEventListener('contextmenu', e => e.preventDefault());
let wheelT = 0;
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const p = mousePlayer(), now = performance.now(), d = e.deltaY > 0 ? 1 : -1;
  if (!PLAYING.includes(G.state) || now - wheelT < 160) return;
  wheelT = now;
  if (Net.isGuest) NetGame.press(d > 0 ? 'next' : 'prev'); else if (p) cycleWeapon(p, d);
}, { passive: false });

// On-screen buttons for tablets (they control player 1, or you in a Wi-Fi game).
document.querySelectorAll('#touch [data-k]').forEach(b => {
  const k = b.dataset.k;
  b.addEventListener('pointerdown', e => {
    e.preventDefault(); Sound.init(); b.classList.add('on');
    const p = Net.isGuest ? null : G.players[0];
    if (k === 'swap') { if (Net.isGuest) NetGame.press('next'); else if (p) cycleWeapon(p, 1); return; }
    if (k === 'pause') { pauseGame(); return; }
    touch[k] = true;
    if (k === 'jump') { if (Net.isGuest) NetGame.press('jump'); else if (p) p.jumpBuf = 0.13; }
    if (k === 'fire') { if (Net.isGuest) NetGame.guestAim = 'keys'; else if (p) p.aimMode = 'keys'; }
  });
  const off = () => { b.classList.remove('on'); if (k in touch) touch[k] = false; };
  b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
});

function selectSlot(p, i) { const id = ownedList(p.prof)[i]; if (id && id !== p.weapon) equipPlayer(p, id); }
function cycleWeapon(p, d) {
  const list = ownedList(p.prof); if (list.length < 2) return;
  equipPlayer(p, list[(list.indexOf(p.weapon) + d + list.length) % list.length]);
}
function equipPlayer(p, id) {
  p.weapon = id; p.prof.equipped = id; p.cd = Math.min(p.cd, 0.15);
  Sound.play('swap', p.x);   // the gun bar / player panel already shows the new gun's name
}

// ---- Bullets, rockets, lasers ---------------------------------------------
function updateBullets(dt) {
  const bs = G.bullets;
  for (let i = bs.length - 1; i >= 0; i--) {
    const b = bs[i]; let dead = false;
    b.life -= dt;
    if (b.kind === 'flame') { const k = Math.exp(-2.2 * dt); b.vx *= k; b.vy = b.vy * k - 90 * dt; }
    if (b.kind === 'bolt') b.vy += 650 * dt;   // crossbow bolts arc down
    const boom = b.kind === 'rocket' || b.kind === 'bolt';
    if (b.kind === 'rocket') {
      const sp = Math.hypot(b.vx, b.vy), ns = Math.min(1300, sp + 900 * dt);
      b.vx *= ns / sp; b.vy *= ns / sp;
      b.trail = (b.trail || 0) - dt;
      if (b.trail <= 0 && b.dist > b.hide) { b.trail = 0.015; const a = Math.atan2(b.vy, b.vx); addPart({ type: 'fire', x: b.x - Math.cos(a) * 10, y: b.y - Math.sin(a) * 10, vx: rand(-30, 30), vy: rand(-30, 30), g: 0, life: 0.22, size: 5 }); smoke(b.x - Math.cos(a) * 14, b.y - Math.sin(a) * 14, 1, 5, '#6a6474'); }
    }
    const stepLen = Math.hypot(b.vx, b.vy) * dt, steps = Math.max(1, Math.ceil(stepLen / 10));
    for (let s = 0; s < steps && !dead; s++) {
      b.x += b.vx * dt / steps; b.y += b.vy * dt / steps; b.dist += stepLen / steps;
      for (const z of G.zombies) {
        if (z.dead || b.hit.has(z)) continue;
        if (b.x > z.x - z.w / 2 && b.x < z.x + z.w / 2 && b.y > z.y - z.h && b.y < z.y) {
          if (boom) { explode(b.x, b.y, b.wp); dead = true; break; }
          b.hit.add(z);
          const dir = Math.sign(b.vx) || 1;
          if (b.kind === 'flame') {   // fire doesn't flash, it sets them burning
            hurtZombie(z, b.dmg, dir * b.knock, 0, false, false);
            if (Math.random() < 0.35) addPart({ type: 'fire', x: z.x + rand(-z.w / 2, z.w / 2), y: z.y - rand(0, z.h), vx: rand(-20, 20), vy: rand(-120, -50), g: 0, life: rand(0.25, 0.5), size: rand(4, 8) });
          } else if (b.kind === 'plasma') {
            hurtZombie(z, b.dmg, dir * b.knock, -60, true);
            sparks(b.x, b.y, 6, Math.atan2(b.vy, b.vx) + Math.PI, 0.9, '#8fffd0', 280);
          } else {
            hurtZombie(z, b.dmg, dir * b.knock, -40, true);
            goo(b.x, b.y, b.kind === 'slug' ? 6 : 3, dir);
          }
          if (--b.pierce <= 0) { dead = true; break; }
        }
      }
      if (!dead && b.y >= GROUND) {
        if (boom) explode(b.x, GROUND - 4, b.wp);
        else if (b.kind !== 'flame') sparks(b.x, GROUND - 1, 3, -Math.PI / 2, 1.2, b.kind === 'plasma' ? '#8fffd0' : '#ffd27a', 200);
        dead = true;
      }
    }
    if (!dead && b.life <= 0) { if (boom) explode(b.x, b.y, b.wp); dead = true; }
    if (!dead && (b.x < -60 || b.x > G.level.worldW + 60 || b.y < -200)) dead = true;
    if (dead) bs.splice(i, 1);
  }
}
function explode(x, y, wp) {
  for (const z of G.zombies) {
    if (z.dead) continue;
    const cx = clamp(x, z.x - z.w / 2, z.x + z.w / 2), cy = clamp(y, z.y - z.h, z.y), d = Math.hypot(cx - x, cy - y);
    if (d < wp.radius) { const f = 1 - (d / wp.radius) * 0.5; hurtZombie(z, wp.dmg * f, (Math.sign(z.x - x) || 1) * wp.knock * f, -320 * f, true); }
  }
  const s = wp.radius / 130;   // crossbow bolts make a smaller boom than rockets
  flashAt(x, y, 150 * s); fireBurst(x, y, Math.round(34 * s), 1.2 * s); smoke(x, y, Math.round(14 * s), 18 * s, '#3e3846'); ring(x, y, wp.radius, '#ffd27a', 0.4);
  sparks(x, y, 16, -Math.PI / 2, Math.PI, '#ffcf6a', 520 * s);
  G.shake = Math.max(G.shake, 14 * s);
  Sound.play('boom', x);
}
function rayBox(ox, oy, dx, dy, x0, y0, x1, y1) {
  let tmin = 0, tmax = Infinity;
  for (const [o, d, lo, hi] of [[ox, dx, x0, x1], [oy, dy, y0, y1]]) {
    if (Math.abs(d) < 1e-9) { if (o < lo || o > hi) return null; continue; }
    let t1 = (lo - o) / d, t2 = (hi - o) / d; if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmax < tmin) return null;
  }
  return tmin;
}
function fireLaser(p, sx, sy, mx, my, a, wp) {
  const dx = Math.cos(a), dy = Math.sin(a);
  let end = wp.range;
  if (dy > 0) end = Math.min(end, (GROUND - sy) / dy);
  for (const z of G.zombies) {
    if (z.dead) continue;
    const t = rayBox(sx, sy, dx, dy, z.x - z.w / 2, z.y - z.h, z.x + z.w / 2, z.y);
    if (t !== null && t <= end) { hurtZombie(z, wp.dmg, (Math.sign(dx) || 1) * wp.knock, -60, true); goo(sx + dx * t, sy + dy * t, 4, Math.sign(dx)); }
  }
  const ex = sx + dx * end, ey = sy + dy * end;
  G.beams.push({ x1: mx, y1: my, x2: ex, y2: ey, t: 0.16, max: 0.16 });
  sparks(ex, ey, 6, a + Math.PI, 0.8, '#7ff', 260);
}
function drawBullets(c) {
  for (const b of G.bullets) {
    if (b.dist < b.hide || b.kind === 'flame' || b.kind === 'plasma') continue;
    const a = Math.atan2(b.vy, b.vx);
    if (b.kind === 'rocket') {
      c.save(); c.translate(b.x, b.y); c.rotate(a);
      fillRR(c, -9, -2.5, 14, 5, 2, '#d8d8d8'); poly(c, [5, -2.5, 10, 0, 5, 2.5], '#d6452f'); poly(c, [-9, -2.5, -12, -5, -6, -2.5], '#888'); poly(c, [-9, 2.5, -12, 5, -6, 2.5], '#888');
      c.restore();
    } else if (b.kind === 'bolt') {   // crossbow bolt with a blinking explosive tip
      c.save(); c.translate(b.x, b.y); c.rotate(a);
      c.fillStyle = '#d8d0b8'; c.fillRect(-16, -1, 18, 2);
      poly(c, [-16, -1, -21, -4, -18, -1], '#e8e2d0'); poly(c, [-16, 1, -21, 4, -18, 1], '#e8e2d0');
      poly(c, [2, -3, 8, 0, 2, 3], Math.sin(G.t * 40) > 0 ? '#ff5a3a' : '#ffd23f');
      c.restore();
    } else {
      const len = b.kind === 'slug' ? 0.03 : 0.018;
      c.strokeStyle = b.kind === 'slug' ? '#ffffff' : '#ffe9a6'; c.lineWidth = b.kind === 'slug' ? 3 : b.kind === 'pellet' ? 2.2 : 2;
      c.beginPath(); c.moveTo(b.x - b.vx * len, b.y - b.vy * len); c.lineTo(b.x, b.y); c.stroke();
    }
  }
  c.globalCompositeOperation = 'lighter';
  for (const b of G.bullets) {
    if (b.kind !== 'flame' || b.dist < b.hide * 0.7) continue;
    const k = b.life / b.max;
    c.globalAlpha = clamp(k * 1.3, 0, 0.9);
    circle(c, b.x, b.y, 4 + (1 - k) * 15, k > 0.7 ? '#fff0a0' : k > 0.4 ? '#ff9a2e' : '#ff4d1f');
  }
  for (const b of G.bullets) {   // plasma balls glow
    if (b.kind !== 'plasma' || b.dist < b.hide) continue;
    c.globalAlpha = 0.35; c.strokeStyle = '#5fffb0'; c.lineWidth = 6;
    c.beginPath(); c.moveTo(b.x - b.vx * 0.03, b.y - b.vy * 0.03); c.lineTo(b.x, b.y); c.stroke();
    c.globalAlpha = 0.5; circle(c, b.x, b.y, 9, '#3fffa0');
    c.globalAlpha = 1; circle(c, b.x, b.y, 4, '#eafff4');
  }
  for (const bm of G.beams) {
    const k = bm.t / bm.max;
    c.globalAlpha = k * 0.45; c.strokeStyle = '#3ff'; c.lineWidth = 12 * k + 2;
    c.beginPath(); c.moveTo(bm.x1, bm.y1); c.lineTo(bm.x2, bm.y2); c.stroke();
    c.globalAlpha = k; c.strokeStyle = '#ffffff'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(bm.x1, bm.y1); c.lineTo(bm.x2, bm.y2); c.stroke();
  }
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
}

// ---- Coins and hearts -----------------------------------------------------
function addFloatCoin(x, y, val) { G.coins.push({ kind: 'coin', val, x, y, baseY: y, vx: 0, vy: 0, t: 0, spin: rand(6), float: true }); }
function sprinkleCoins(n) {   // new coins show up around the map for every wave
  const spots = shuffle(mapCoinSpots(G.level));
  let added = 0;
  for (const s of spots) {
    if (added >= n) break;
    if (s.val > 1 || G.coins.some(c => Math.abs(c.x - s.x) < 14 && Math.abs(c.y - s.y) < 14)) continue;
    addFloatCoin(s.x, s.y, 1); added++;
  }
}
// Coins fly into you like a black hole sucking in stuff: they spiral around faster and faster
// until they get swallowed. Dropped coins come from anywhere; coins lying around the map once you get close.
const MAP_COIN_PULL = 230;
function updatePickups(dt) {
  const cs = G.coins;
  for (let i = cs.length - 1; i >= 0; i--) {
    const c = cs[i]; c.t += dt; c.spin += dt * 6;
    const p = nearestPlayer(c.x, c.y);
    c.pull = false;
    if (p) {
      const dx = p.x - c.x, dy = (p.y - 34) - c.y, d = Math.hypot(dx, dy) || 1;
      const heart = c.kind === 'heart', wants = !heart || p.hp < p.maxHp;
      if (wants && d < 24 && c.t > 0.15) { collect(c, p); cs.splice(i, 1); continue; }
      const range = heart ? 150 : c.float ? MAP_COIN_PULL : 1e9;
      if (wants && d < range && c.t > (c.float ? 0 : 0.35)) {
        c.pull = true; c.float = false;
        if (c.swirl === undefined) c.swirl = Math.random() < 0.5 ? 1 : -1;
        const near = clamp(1 - d / 500, 0, 1);
        const pull = 1400 + near * 4200, spin = 900 * (0.3 + near);
        c.vx += (dx / d * pull - dy / d * c.swirl * spin) * dt;      // in towards you...
        c.vy += (dy / d * pull + dx / d * c.swirl * spin) * dt;      // ...and around you (the spiral)
        const k = Math.exp(-(2.5 + near * 5) * dt); c.vx *= k; c.vy *= k;
        const sp = Math.hypot(c.vx, c.vy); if (sp > 1100) { c.vx *= 1100 / sp; c.vy *= 1100 / sp; }
        c.x += c.vx * dt; c.y += c.vy * dt;
        continue;
      }
    }
    if (c.float) { c.y = c.baseY + Math.sin(G.t * 3 + c.x * 0.05) * 3; continue; }
    c.vy += GRAV * 0.8 * dt; c.x = clamp(c.x + c.vx * dt, 10, G.level.worldW - 10); c.y += c.vy * dt;
    const floor = c.kind === 'heart' ? GROUND - 10 : GROUND - 7;
    if (c.y > floor) { c.y = floor; c.vy *= -0.42; c.vx *= 0.75; if (Math.abs(c.vy) < 50) c.vy = 0; }
    if (c.t > 18 && !G.collectAll) cs.splice(i, 1);
  }
}
function collect(c, p) {
  if (c.kind === 'heart') {
    p.hp = Math.min(p.maxHp, p.hp + c.val);
    addText(c.x, c.y - 12, `+${c.val}`, '#5ee06a', 15);
    for (let i = 0; i < 5; i++) addPart({ type: 'plus', x: p.x + rand(-14, 14), y: p.y - rand(20, 60), vx: 0, vy: -50, g: 0, life: 0.7, col: '#5ee06a' });
    Sound.play('heal');
    return;
  }
  p.prof.coins += c.val; G.run.coins[p.id] += c.val; p.coinPulse = 1;
  addText(c.x, c.y - 12, `+${c.val}`, '#FFD23F', c.val >= 10 ? 19 : 13);
  if (c.val >= 10) ring(c.x, c.y, 34, '#FFD23F');
  Sound.play('coin');
}
// A golden whirlpool around anyone who is sucking in coins.
function drawVortex(c) {
  for (const p of G.players) {
    if (p.dead) continue;
    let n = 0;
    for (const k of G.coins) if (k.pull && k.kind === 'coin' && Math.abs(k.x - p.x) < 320 && Math.abs(k.y - p.y) < 320) n++;
    if (!n) continue;
    const a = Math.min(0.55, 0.15 + n * 0.05), cx = p.x, cy = p.y - 34;
    c.save(); c.globalCompositeOperation = 'lighter';
    glow(c, cx, cy, 46, '255,210,80', a * 0.6);
    c.translate(cx, cy); c.lineCap = 'round';
    for (let arm = 0; arm < 3; arm++) {
      c.rotate(Math.PI * 2 / 3);
      c.globalAlpha = a; c.strokeStyle = '#ffd23f'; c.lineWidth = 2.5;
      c.beginPath();
      for (let s = 0; s <= 1.001; s += 0.1) { const ang = -G.t * 7 + s * 3.2, r = 38 - s * 30; s === 0 ? c.moveTo(Math.cos(ang) * r, Math.sin(ang) * r) : c.lineTo(Math.cos(ang) * r, Math.sin(ang) * r); }
      c.stroke();
    }
    c.restore();
  }
}
function drawPickups(c) {
  drawVortex(c);
  for (const k of G.coins) {
    if (!k.float && !k.pull && k.t > 15 && !G.collectAll && Math.floor(k.t * 8) % 2) continue;  // blinking = about to vanish
    if (k.pull && k.kind === 'coin') {   // a little golden streak behind coins being sucked in
      c.globalAlpha = 0.45; c.strokeStyle = '#ffd23f'; c.lineWidth = 3; c.lineCap = 'round';
      c.beginPath(); c.moveTo(k.x - k.vx * 0.04, k.y - k.vy * 0.04); c.lineTo(k.x, k.y); c.stroke();
      c.globalAlpha = 1; c.lineCap = 'butt';
    }
    if (k.kind === 'heart') {
      const s = 16 + Math.sin(G.t * 6) * 1.5;
      glow(c, k.x, k.y, 22, '255,90,110', 0.35);
      c.fillStyle = '#ff5a6e'; heartPath(c, k.x, k.y - s / 2, s); c.fill();
      c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.arc(k.x - s * 0.22, k.y - s * 0.22, s * 0.1, 0, Math.PI * 2); c.fill();
    } else {
      const big = k.val >= 5, r = k.val >= 10 ? 11 : big ? 8 : 6;
      if (k.val >= 10) glow(c, k.x, k.y, 30, '255,220,90', 0.35 + Math.sin(G.t * 5) * 0.1);
      drawCoin(c, k.x, k.y, r, Math.cos(k.spin), big);
    }
  }
}

// ---- Levels and waves -----------------------------------------------------
function startLevel(i) {
  if (Net.isGuest) return;   // only the host starts levels in a Wi-Fi game
  G.levelIndex = i; G.level = LEVELS[i]; G.platforms = buildPlatforms(G.level);
  clearWorld();
  G.numPlayers = Net.isHost ? 1 : save.numPlayers;
  G.run = { kills: 0, coins: [0, 0, 0, 0] };
  const sx = G.level.worldW * 0.35;
  if (Net.isHost) { G.players = NetGame.buildPlayers(sx); for (const s of Object.values(NetGame.slots)) s.ready = false; }
  else { G.players = []; for (let k = 0; k < G.numPlayers; k++) G.players.push(makePlayer(k, sx + k * 60)); }
  for (const s of mapCoinSpots(G.level)) addFloatCoin(s.x, s.y, s.val);
  G.camX = camTarget();
  hideOverlays();
  startWave(0);
}
function startWave(k) {
  const L = G.level, wv = L.waves[k];
  G.waveIndex = k;
  G.queue = [];
  // More players = more zombies (so 4 friends together still get a real fight).
  const team = Math.max(1, G.players.length), more = 1 + 0.3 * (team - 1);
  for (const [type, n] of Object.entries(wv.mix)) for (let i = 0; i < Math.round(n * more); i++) G.queue.push(type);
  shuffle(G.queue);
  G.spawnT = 1.6; G.every = wv.every; G.maxAlive = Math.round(wv.max * (1 + 0.15 * (team - 1)));
  G.bossPending = !!wv.boss; G.bossAt = Math.floor(G.queue.length / 2);
  G.collectAll = false; G.levelDone = false;
  for (const p of G.players) p.armor = p.maxArmor || 0;   // armor is repaired for every wave
  if (k > 0) sprinkleCoins(5);
  setState('playing');
  if (k === 0) banner(`LEVEL ${G.levelIndex + 1}`, `${L.name}  ·  Wave 1 of ${L.waves.length}`, 2.8);
  else banner(`WAVE ${k + 1}`, wv.boss ? 'Something BIG is coming...' : `of ${L.waves.length}`, 2.4);
  Sound.play('wave');
}
const aliveZombies = () => G.zombies.reduce((n, z) => n + (z.dead ? 0 : 1), 0);
function updateSpawning(dt) {
  G.spawnT -= dt;
  if (G.queue.length && G.spawnT <= 0 && aliveZombies() < G.maxAlive) {
    spawnZombie(G.queue.pop());
    G.spawnT = G.every * rand(0.55, 1.35) / (1 + 0.2 * (G.players.length - 1));
    if (G.queue.length && Math.random() < 0.18 && aliveZombies() < G.maxAlive) spawnZombie(G.queue.pop());
  }
  if (G.bossPending && G.queue.length <= G.bossAt) {
    G.bossPending = false; G.shake = 12;
    const boss = spawnZombie(G.level.bossType || 'boss');
    banner((G.level.boss || 'Boss zombie').toUpperCase(), 'Hit it with everything you have!', 2.4, '#ff5a5a');
    Sound.zombie(boss, 'roar');
  }
  if (!G.queue.length && !G.bossPending && aliveZombies() === 0) waveCleared();
}
function waveCleared() {
  const L = G.level, last = G.waveIndex === L.waves.length - 1;
  const bonus = 8 + G.levelIndex * 4 + G.waveIndex * 3 + (last ? 15 : 0);
  for (const p of G.players) {
    p.prof.coins += bonus; G.run.coins[p.id] = (G.run.coins[p.id] || 0) + bonus; p.coinPulse = 1;
    if (p.dead) { const buddy = alivePlayers()[0]; revive(p, buddy ? buddy.x - 30 : p.x, 50); }
    else p.hp = Math.min(p.maxHp, p.hp + 25);
  }
  G.collectAll = true; G.clearT = 3; G.levelDone = last;
  if (last) {
    save.unlocked = Math.max(save.unlocked, Math.min(LEVELS.length, G.levelIndex + 2));
    if (!save.beaten.includes(G.levelIndex)) save.beaten.push(G.levelIndex);
    if (Net.isHost) NetGame.levelWon(G.levelIndex);
  }
  writeSave();
  setState('cleared');
  banner(last ? 'LEVEL COMPLETE!' : `WAVE ${G.waveIndex + 1} CLEARED!`, `+${bonus} bonus coins${G.players.length > 1 ? ' each' : ''}   +25 health`, 2.8, '#FFD23F');
  Sound.play(last ? 'levelup' : 'clear');
}
function afterClear() {
  for (const c of G.coins) {   // dropped coins still flying go to whoever is closest
    if (c.kind !== 'coin' || c.float) continue;
    const p = nearestPlayer(c.x, c.y) || G.players[0];
    if (!p) continue;
    p.prof.coins += c.val; G.run.coins[p.id] = (G.run.coins[p.id] || 0) + c.val;
  }
  G.coins = G.coins.filter(c => c.float);   // coins around the map stay for the next wave
  G.collectAll = false;
  writeSave();
  if (G.levelDone) {
    if (G.levelIndex === LEVELS.length - 1) showWin();
    else openShop({ level: G.levelIndex + 1, wave: 0 });
  } else openShop({ level: G.levelIndex, wave: G.waveIndex + 1 });
}

function camTarget() {
  const alive = alivePlayers(), ps = alive.length ? alive : G.players;
  if (!ps.length) return G.camX;
  let cx = 0; for (const p of ps) cx += p.x + (G.players.length === 1 ? p.facing * 60 : 0);
  cx /= ps.length;
  return clamp(cx - W / 2, 0, Math.max(0, G.level.worldW - W));
}
function updateCamera(dt) {
  G.camX = lerp(G.camX, camTarget(), Math.min(1, dt * 5));
  // Everybody shares one screen, so nobody can run too far ahead of the others.
  const alive = alivePlayers(), gap = W - 90;
  if (alive.length < 2) return;
  for (const p of alive) {
    let lo = -Infinity, hi = Infinity;
    for (const q of alive) if (q !== p) { lo = Math.max(lo, q.x - gap); hi = Math.min(hi, q.x + gap); }
    if (lo <= hi) p.x = clamp(p.x, lo, hi);
  }
}

function update(dt) {
  for (const p of G.players) updatePlayer(p, dt);
  if (G.state === 'playing') updateSpawning(dt);
  updateZombies(dt);
  updateBullets(dt);
  updatePickups(dt);
  updateFX(dt);
  updateCamera(dt);
  if (G.level.theme === 'city') for (const x of bgData(G.level).barrels) if (x > G.camX - 40 && x < G.camX + W + 40 && Math.random() < dt * 30) addPart({ type: 'fire', x: x + rand(-8, 8), y: GROUND - 32, vx: rand(-15, 15), vy: rand(-140, -60), g: 0, life: rand(0.3, 0.6), size: rand(4, 8) });
  G.shake = Math.max(0, G.shake - dt * 30);
  G.hurtFlash = Math.max(0, G.hurtFlash - dt);
  for (const p of G.players) p.coinPulse = Math.max(0, (p.coinPulse || 0) - dt * 3);
  if (G.state === 'cleared') { G.clearT -= dt; if (G.clearT <= 0) afterClear(); }
  if (G.state === 'dying') { G.dyingT += dt; if (G.dyingT > 1.8) showGameOver(); }
  // A Wi-Fi player who left took the last living civilian with them.
  if (G.state === 'playing' && G.players.length && !alivePlayers().length) { setState('dying'); G.dyingT = 0; }
}

// ---- Drawing --------------------------------------------------------------
function render() {
  const c = ctx, L = G.level;
  c.setTransform(RES, 0, 0, RES, 0, 0);
  drawBackdrop(c, L, G.camX);
  c.save();
  if (G.shake > 0) c.translate(rand(-G.shake, G.shake), rand(-G.shake, G.shake));
  c.translate(-G.camX, 0);
  drawWorldBack(c, L, G.camX);
  drawPlatforms(c);
  drawPickups(c);
  if (G.state !== 'title' && G.state !== 'lobby') {
    for (const z of G.zombies) if (!z.dead) drawShadow(c, z.x, z.y, z.w);
    for (const p of G.players) if (!p.dead) drawShadow(c, p.x, p.y, 26);
    for (const z of G.zombies) if (z.dead) drawZombie(c, z);
    for (const z of G.zombies) if (!z.dead) drawZombie(c, z);
    for (const p of G.players) drawPlayer(c, p);
    drawZombieBars(c);
    drawAimMarkers(c);
    drawBullets(c);
  }
  drawParticles(c);
  drawTexts(c);
  drawWorldFront(c, L, G.camX);
  c.restore();
  drawVignette(c);
  if (G.state !== 'title' && G.state !== 'lobby' && G.players.length) drawHUD(c);
  drawBanner(c); drawToast(c);
}
function drawAimMarkers(c) {
  for (const p of G.players) {
    const z = p.target; if (!z || z.dead || p.dead || p.aimMode === 'mouse') continue;
    const x0 = z.x - z.w / 2 - 5, x1 = z.x + z.w / 2 + 5, y0 = z.y - z.h - 5, y1 = z.y + 3, s = 7;
    c.strokeStyle = G.players.length > 1 ? p.look.tagCol : 'rgba(255,90,90,.85)'; c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x0, y0 + s); c.lineTo(x0, y0); c.lineTo(x0 + s, y0);
    c.moveTo(x1 - s, y0); c.lineTo(x1, y0); c.lineTo(x1, y0 + s);
    c.moveTo(x0, y1 - s); c.lineTo(x0, y1); c.lineTo(x0 + s, y1);
    c.moveTo(x1 - s, y1); c.lineTo(x1, y1); c.lineTo(x1, y1 - s);
    c.stroke();
  }
}
function drawVignette(c) {
  const g = c.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.5)');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  const low = G.state === 'playing' && G.players.some(p => !p.dead && p.hp < 30) ? 0.18 + Math.sin(G.t * 6) * 0.08 : 0;
  const a = Math.max(G.hurtFlash, low);
  if (a > 0) {
    const r = c.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.95);
    r.addColorStop(0, 'rgba(255,0,0,0)'); r.addColorStop(1, `rgba(220,20,20,${a})`);
    c.fillStyle = r; c.fillRect(0, 0, W, H);
  }
}
// One panel per player: health, coins and (with friends) their gun. 3-4 players get smaller panels in a row.
function drawPlayerPanel(c, p, x, w, compact, isMe) {
  const y = 12, h = compact ? 58 : 70, multi = G.players.length > 1;
  fillRR(c, x, y, w, h, 12, 'rgba(10,6,24,0.62)');
  if (isMe) { c.strokeStyle = p.look.tagCol; c.lineWidth = 2; rr(c, x + 1, y + 1, w - 2, h - 2, 11); c.stroke(); }
  if (multi) text(c, p.look.tag, x + 20, y + 19, { size: 14, color: p.look.tagCol });
  else { c.fillStyle = '#ff5a6e'; heartPath(c, x + 20, y + 10, 18); c.fill(); }
  const bx = x + 38, bw = w - 52, f = clamp(p.hp / p.maxHp, 0, 1);
  fillRR(c, bx, y + 11, bw, 16, 8, '#2a2040');
  if (f > 0) fillRR(c, bx, y + 11, Math.max(16, bw * f), 16, 8, f > 0.5 ? '#5ee06a' : f > 0.25 ? '#f2c94c' : '#ff5a5a');
  c.fillStyle = 'rgba(255,255,255,.22)'; c.fillRect(bx + 6, y + 13, Math.max(0, bw * f - 12), 3);
  text(c, p.dead ? 'DOWN' : String(Math.ceil(p.hp)), bx + bw / 2, y + 19.5, { size: 11, stroke: 'rgba(0,0,0,.6)', lw: 3 });
  if (p.maxArmor > 0) {   // the blue armor bar (it takes the hits first)
    const af = clamp(p.armor / p.maxArmor, 0, 1), ah = compact ? 6 : 9, ay = y + 30;
    fillRR(c, bx, ay, bw, ah, ah / 2, '#1a2440');
    if (af > 0) fillRR(c, bx, ay, Math.max(ah, bw * af), ah, ah / 2, '#5ab8ff');
    if (!compact) {
      text(c, af > 0 ? `ARMOR ${Math.ceil(p.armor)}` : 'ARMOR BROKEN', bx + bw / 2, ay + ah / 2 + 0.5, { size: 7.5, stroke: 'rgba(0,0,0,.6)', lw: 2.5, color: af > 0 ? '#ffffff' : '#9ab0d0' });
      poly(c, [x + 14, ay - 1, x + 26, ay - 1, x + 26, ay + 4, x + 20, ay + ah + 1, x + 14, ay + 4], '#5ab8ff');   // little shield
    }
  }
  const pulse = 1 + (p.coinPulse || 0) * 0.3, cy = compact ? y + 42 : y + 49;
  drawCoin(c, x + 21, cy, (compact ? 8 : 9) * pulse, 1);
  text(c, String(p.prof.coins), x + 36, cy + 1, { size: compact ? 15 : 18, align: 'left', color: '#FFD23F', stroke: 'rgba(0,0,0,.5)', lw: 3 });
  if (isMe && multi) text(c, 'YOU', x + w - (compact ? 84 : 104), cy + 1, { size: 9, color: p.look.tagCol });
  if (multi) { if (compact) c.drawImage(ICON[p.weapon], x + w - 72, y + 30, 60, 24); else c.drawImage(ICON[p.weapon], x + w - 92, y + 34, 80, 32); }
}
function drawPlayerPanels(c) {
  const ps = G.players, n = ps.length, me = Net.isGuest ? Net.id : Net.isHost ? 0 : -1;
  if (n <= 2) ps.forEach((p, i) => drawPlayerPanel(c, p, i === 0 ? 14 : W - 14 - 250, 250, false, p.id === me && Net.active));
  else {
    const w = 214, gap = 8, x0 = (W - (n * w + (n - 1) * gap)) / 2;
    ps.forEach((p, i) => drawPlayerPanel(c, p, x0 + i * (w + gap), w, true, p.id === me));
  }
}
function drawWeaponBar(c, p) {
  const list = ownedList(p.prof), gap = 6, sh = 40, sw = Math.min(66, Math.floor((W - 60) / list.length) - gap);
  const total = list.length * sw + (list.length - 1) * gap;
  const x0 = IS_TOUCH ? W - total - 16 : (W - total) / 2, y0 = IS_TOUCH ? 96 : H - sh - 14;
  list.forEach((id, i) => {
    const x = x0 + i * (sw + gap), sel = id === p.weapon;
    fillRR(c, x, y0, sw, sh, 8, sel ? 'rgba(255,210,63,.2)' : 'rgba(10,6,24,.6)');
    c.lineWidth = sel ? 2 : 1; c.strokeStyle = sel ? '#FFD23F' : 'rgba(255,255,255,.15)'; rr(c, x, y0, sw, sh, 8); c.stroke();
    c.drawImage(ICON[id], x + 4, y0 + 9, sw - 8, (sw - 8) * 0.4);
    if (!IS_TOUCH && i < 10) text(c, String((i + 1) % 10), x + 8, y0 + 9, { size: 9, color: sel ? '#FFD23F' : '#a99fcc' });
  });
  const name = WMAP[p.weapon].name.toUpperCase();
  if (!IS_TOUCH) text(c, name, W / 2, y0 - 10, { size: 11, color: '#FFD23F', stroke: 'rgba(0,0,0,.6)', lw: 3 });
}
function drawHUD(c) {
  const L = G.level, crowded = G.players.length > 2, ty = crowded ? 94 : 30;
  drawPlayerPanels(c);
  const left = zombiesLeft();
  text(c, `WAVE ${G.waveIndex + 1}/${L.waves.length}`, W / 2, ty, { size: 30, font: SPOOKY, color: '#7CFC4A', stroke: 'rgba(8,4,16,.85)', lw: 6 });
  text(c, `LEVEL ${G.levelIndex + 1}: ${L.name.toUpperCase()}  ·  ${left} ZOMBIE${left === 1 ? '' : 'S'} LEFT`, W / 2, ty + 27, { size: 10, color: '#e4dcff', stroke: 'rgba(8,4,16,.85)', lw: 3 });
  if (Net.active) {   // the join code is always on screen so late friends can join
    const where = Net.isHost && Net.address ? `  ·  ${Net.address.replace(/^https?:\/\//, '')}` : '';
    text(c, Net.lost || Net.busy ? 'WI-FI: RECONNECTING...' : `WI-FI  ·  CODE ${Net.code}${where}`, 14, H - 14, { size: 10, align: 'left', color: Net.lost ? '#ff7a7a' : 'rgba(230,220,255,.75)', stroke: 'rgba(0,0,0,.6)', lw: 3 });
  }
  if (G.boss && !G.boss.dead) {
    const bw = 360, bx = (W - bw) / 2, by = ty + 42;
    fillRR(c, bx - 4, by - 4, bw + 8, 24, 9, 'rgba(10,6,24,.75)');
    fillRR(c, bx, by, bw * clamp(G.boss.hp / G.boss.maxHp, 0, 1), 16, 7, '#e8413a');
    text(c, (L.boss || 'Boss zombie').toUpperCase(), W / 2, by + 8.5, { size: 11, stroke: 'rgba(0,0,0,.7)', lw: 3 });
  }
  if (G.players.length === 1) {
    drawWeaponBar(c, G.players[0]);
    if (!IS_TOUCH) text(c, `P ${Net.active ? 'menu' : 'pause'}   M sound${save.muted ? ' (off)' : ''}`, W - 16, 24, { size: 9, align: 'right', color: 'rgba(230,220,255,.6)' });
  }
  // Arrows for zombies coming from off the screen.
  let offL = 0, offR = 0;
  for (const z of G.zombies) { if (z.dead) continue; if (z.x < G.camX - 8) offL++; else if (z.x > G.camX + W + 8) offR++; }
  const pulse = 0.6 + Math.sin(G.t * 8) * 0.4;
  c.globalAlpha = pulse;
  if (offL) { poly(c, [8, GROUND - 40, 24, GROUND - 52, 24, GROUND - 28], '#ff5a5a'); text(c, String(offL), 36, GROUND - 40, { size: 13, align: 'left', color: '#ff5a5a', stroke: 'rgba(0,0,0,.6)', lw: 3 }); }
  if (offR) { poly(c, [W - 8, GROUND - 40, W - 24, GROUND - 52, W - 24, GROUND - 28], '#ff5a5a'); text(c, String(offR), W - 36, GROUND - 40, { size: 13, align: 'right', color: '#ff5a5a', stroke: 'rgba(0,0,0,.6)', lw: 3 }); }
  c.globalAlpha = 1;
}

// ---- Menus and the shop (HTML on top of the canvas) ------------------------
function showOverlay(id) { document.querySelectorAll('.overlay').forEach(o => o.classList.toggle('show', o.id === id)); }
function hideOverlays() { showOverlay(null); }
function blurAll() { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); }
function button(label, cls, onClick, disabled = false) {
  const b = document.createElement('button');
  b.className = 'btn ' + cls; b.innerHTML = label; b.disabled = disabled;
  b.addEventListener('click', () => { blurAll(); Sound.init(); onClick(); });
  return b;
}
const profs = () => save.players.slice(0, save.numPlayers);
const pTag = i => (save.numPlayers > 1 ? `<span class="ptag p${i + 1}">P${i + 1}</span>` : '');

const CONTROL_HELP = {
  1: [['<span class="kc">←</span><span class="kc">→</span> or <span class="kc">A</span><span class="kc">D</span>', 'Move'],
    ['<span class="kc">↑</span> or <span class="kc">W</span>', 'Jump'],
    ['<span class="kc">↓</span> or <span class="kc">S</span>', 'Drop off a platform'],
    ['<span class="kc wide">SPACE</span> or <span class="kc wide">CLICK</span>', 'Shoot (click aims with the mouse)'],
    ['<span class="kc">1</span>–<span class="kc">0</span> <span class="kc">Q</span><span class="kc">E</span>', 'Switch gun'],
    ['<span class="kc">P</span> <span class="kc">M</span>', 'Pause, sound on/off']],
  2: [['<span class="ptag p1">P1</span> <span class="kc">A</span><span class="kc">D</span> <span class="kc">W</span> <span class="kc">S</span>', 'Move, jump, drop'],
    ['<span class="ptag p1">P1</span> <span class="kc">F</span> or <span class="kc wide">CLICK</span>', 'Shoot'],
    ['<span class="ptag p1">P1</span> <span class="kc">Q</span><span class="kc">E</span> <span class="kc">1</span>–<span class="kc">0</span>', 'Switch gun'],
    ['<span class="ptag p2">P2</span> <span class="kc">←</span><span class="kc">→</span> <span class="kc">↑</span> <span class="kc">↓</span>', 'Move, jump, drop'],
    ['<span class="ptag p2">P2</span> <span class="kc wide">ENTER</span> or <span class="kc">/</span>', 'Shoot'],
    ['<span class="ptag p2">P2</span> <span class="kc">,</span><span class="kc">.</span>', 'Switch gun']],
};
let titleMode = String(save.numPlayers);   // '1', '2' or 'net'
function renderTitle() {
  document.querySelectorAll('#modeRow button').forEach(b => b.classList.toggle('active', b.dataset.n === titleMode));
  const net = titleMode === 'net';
  $('localBox').style.display = net ? 'none' : '';
  $('netBox').style.display = net ? '' : 'none';
  if (net) {
    const ok = Net.available();
    // Only the computer that shares the game can host, so other devices just see JOIN.
    const here = ['localhost', '127.0.0.1', '[::1]', '::1'].includes(location.hostname) || !ok;
    $('hostCol').style.display = here ? '' : 'none';
    $('hostNote').style.display = here ? 'none' : 'block';
    $('hostBtn').disabled = !ok; $('joinBtn').disabled = !ok; $('joinCode').disabled = !ok;
    $('netHelp').style.display = ok ? 'none' : '';
    $('netWallet').innerHTML = `Your coins: <i class="coin"></i><b>${save.players[0].coins}</b>`;
    return;
  }
  $('controls').innerHTML = CONTROL_HELP[save.numPlayers].map(([k, what]) => `<div>${k}<em>${what}</em></div>`).join('');
  $('wallets').innerHTML = profs().map((p, i) => `<span>${pTag(i)}<i class="coin"></i><b>${p.coins}</b> coins</span>`).join('');
  const box = $('levelList'); box.innerHTML = '';
  LEVELS.forEach((L, i) => {
    const locked = i >= save.unlocked, beaten = save.beaten.includes(i);
    const b = document.createElement('button');
    b.className = 'lvl' + (locked ? ' locked' : '') + (beaten ? ' beaten' : '');
    b.disabled = locked;
    b.innerHTML = `<span class="lnum">${locked ? '🔒' : 'LEVEL ' + (i + 1)}</span><span class="lname">${L.name}</span><span class="lblurb">${locked ? `Beat ${LEVELS[i - 1].name} to unlock` : L.blurb}</span>${beaten ? '<span class="lcheck">✓ Survived</span>' : ''}`;
    b.addEventListener('click', () => { blurAll(); Sound.init(); startLevel(i); });
    box.appendChild(b);
  });
}
function toTitle(mode) {
  if (mode) titleMode = mode;
  setState('title');
  G.level = LEVELS[save.unlocked - 1]; G.platforms = buildPlatforms(G.level);
  clearWorld();
  G.players = [];
  for (const s of mapCoinSpots(G.level)) addFloatCoin(s.x, s.y, s.val);
  writeSave();
  $('netErr').textContent = '';
  renderTitle(); showOverlay('title');
}
async function hostGame() {
  $('netErr').textContent = ''; $('hostBtn').disabled = true;
  try { await NetGame.host(); } catch (e) { $('netErr').textContent = e.message; Net.leave(); }
  finally { $('hostBtn').disabled = false; }
}
async function joinGame() {
  const code = $('joinCode').value.trim();
  if (!/^\d{4}$/.test(code)) { $('netErr').textContent = "Type the 4-number code from the host's screen."; return; }
  $('netErr').textContent = ''; $('joinBtn').disabled = true;
  try { blurAll(); await NetGame.join(code); } catch (e) { $('netErr').textContent = e.message; Net.leave(); }
  finally { $('joinBtn').disabled = false; }
}
// The "back" button on the shop, game over and win screens.
function menuAction() {
  if (Net.isGuest) leaveWifi();
  else if (Net.isHost) NetGame.toLobby();
  else toTitle();
}
const menuLabel = () => (Net.isGuest ? 'LEAVE GAME' : Net.isHost ? 'BACK TO LOBBY' : 'MAIN MENU');

// ---- The shop -------------------------------------------------------------
// In 2 players and Wi-Fi games everyone shops together: you see everyone's wallet,
// and each player buys with their own coins.
function openShop(next) {
  G.next = next; setState('shop');
  renderShop(); showOverlay('shop');
}
function startFromShop() {
  if (Net.isGuest) return;
  const n = G.next;
  if (n.wave === 0 || !G.players.length) startLevel(n.level);
  else { for (const s of Object.values(NetGame.slots)) s.ready = false; hideOverlays(); startWave(n.wave); }
}
const playerOf = id => G.players.find(p => p.id === id);
function profOf(id) {
  if (!Net.isHost) return save.players[id];
  const p = playerOf(id);
  return p ? p.prof : NetGame.slots[id] && NetGame.slots[id].prof;
}
function shopEquip(id, wid) {
  const prof = profOf(id); if (!prof || !prof.owned.includes(wid)) return;
  prof.equipped = wid;
  const p = playerOf(id); if (p) p.weapon = wid;
  if (id === 0 || !Net.isHost) Sound.play('swap');
  writeSave(); renderShop();
}
function shopBuy(id, wp) {
  const prof = profOf(id);
  if (!prof || prof.coins < wp.price || prof.owned.includes(wp.id)) { if (!Net.isHost || id === 0) Sound.play('nope'); return; }
  prof.coins -= wp.price; prof.owned.push(wp.id);
  Sound.play('buy');
  shopEquip(id, wp.id);
}
// Sell a gun back for coins. You can't sell the starter shotgun.
function shopSell(id, wp) {
  const prof = profOf(id);
  if (!prof || !wp.price || !prof.owned.includes(wp.id)) { if (!Net.isHost || id === 0) Sound.play('nope'); return; }
  prof.coins += Math.round(wp.price * SELL_BACK);
  prof.owned = prof.owned.filter(w => w !== wp.id);
  Sound.play('coin');
  if (prof.equipped === wp.id) shopEquip(id, 'shotgun');
  else { writeSave(); renderShop(); }
}
// Armor: buy (and put it on), wear one you own, or sell it back.
function gearChanged(id) { const p = playerOf(id); if (p) applyGear(p); writeSave(); renderShop(); }
function shopArmor(id, kind, aid) {
  const prof = profOf(id), a = ARMOR_MAP[aid];
  const nope = () => { if (!Net.isHost || id === 0) Sound.play('nope'); };
  if (!prof || !a) return nope();
  prof.armors = prof.armors || [];
  if (kind === 'buy') {
    if (prof.coins < a.price || prof.armors.includes(aid)) return nope();
    prof.coins -= a.price; prof.armors.push(aid); prof.armor = aid; Sound.play('buy');
  } else if (kind === 'wear') {
    if (!prof.armors.includes(aid)) return nope();
    prof.armor = aid; Sound.play('swap');
  } else if (kind === 'sell') {
    if (!prof.armors.includes(aid)) return nope();
    prof.coins += Math.round(a.price * SELL_BACK); prof.armors = prof.armors.filter(x => x !== aid);
    if (prof.armor === aid) {   // put on the best set you still have
      const left = ARMORS.filter(x => prof.armors.includes(x.id));
      prof.armor = left.length ? left[left.length - 1].id : '';
    }
    Sound.play('coin');
  }
  gearChanged(id);
}
// A bigger health bar, for good.
function shopBoost(id) {
  const prof = profOf(id), next = prof && HEALTH_BOOSTS[prof.boost || 0];
  if (!next || prof.coins < next.price) { if (!Net.isHost || id === 0) Sound.play('nope'); return; }
  prof.coins -= next.price; prof.boost = (prof.boost || 0) + 1;
  Sound.play('levelup');
  gearChanged(id);
}
function shopMedkit(id) {
  const prof = profOf(id), p = playerOf(id);
  if (!prof || !p || prof.coins < MEDKIT.price || p.hp >= p.maxHp || !G.next || G.next.wave === 0) { if (!Net.isHost || id === 0) Sound.play('nope'); return; }
  prof.coins -= MEDKIT.price; p.hp = Math.min(p.maxHp, p.hp + MEDKIT.heal);
  Sound.play('heal'); writeSave(); renderShop();
}
// A click in the shop: Wi-Fi guests ask the host, everyone else does it right here.
// kind: buy equip sell medkit (guns) · armorBuy armorWear armorSell (thing = an armor set) · boost
function shopAct(kind, id, thing) {
  if (Net.isGuest) { Net.send({ t: kind, w: thing && thing.id }, 'host', true); Sound.play('click'); return; }
  if (kind === 'buy') shopBuy(id, thing); else if (kind === 'equip') shopEquip(id, thing.id); else if (kind === 'sell') shopSell(id, thing);
  else if (kind === 'armorBuy') shopArmor(id, 'buy', thing.id); else if (kind === 'armorWear') shopArmor(id, 'wear', thing.id); else if (kind === 'armorSell') shopArmor(id, 'sell', thing.id);
  else if (kind === 'boost') shopBoost(id); else shopMedkit(id);
}
function shopView() {
  const data = Net.isGuest ? NetGame.shopData || {} : { next: G.next, ready: Net.isHost ? NetGame.readyIds() : [] };
  let people;
  if (Net.active) {
    const me = Net.isHost ? 0 : Net.id;
    people = G.players.map(p => ({ id: p.id, tag: p.look.tag, coins: p.prof.coins, owned: p.prof.owned.slice(), weapon: p.weapon, hp: Math.ceil(p.hp), maxHp: p.maxHp, inRun: true, mine: p.id === me,
      armors: (p.prof.armors || []).slice(), armor: p.armorId || '', boost: p.prof.boost || 0 }));
  } else {
    people = profs().map((prof, i) => {
      const p = G.players[i];
      return { id: i, tag: LOOKS[i].tag, coins: prof.coins, owned: prof.owned.slice(), weapon: p ? p.weapon : prof.equipped, hp: p ? Math.ceil(p.hp) : maxHpOf(prof), maxHp: p ? p.maxHp : maxHpOf(prof), inRun: !!p, mine: true,
        armors: (prof.armors || []).slice(), armor: armorOf(prof) ? prof.armor : '', boost: prof.boost || 0 };
    });
  }
  return { next: data.next || { level: G.levelIndex, wave: 0 }, ready: data.ready || [], people, guests: Net.isHost ? NetGame.guestSlots().length : 0, myReady: NetGame.ready, role: Net.role };
}
const statBar = (label, v, col) => `<div class="stat"><span>${label}</span><i style="--v:${Math.round(clamp(v, 0.04, 1) * 100)}%;--c:${col}"></i></div>`;
function renderShop(quiet = false) {
  const v = shopView(), key = JSON.stringify(v);
  if (quiet && key === renderShop.key) return;   // nothing changed: don't rebuild (keeps clicks working)
  renderShop.key = key;
  const n = v.next, L = LEVELS[n.level] || LEVELS[0], many = v.people.length > 1;
  const tagOf = pe => `<span class="ptag p${(pe.id % 4) + 1}">${pe.tag}</span>`;
  $('shopSub').textContent = n.wave === 0 ? `Next up: Level ${n.level + 1}, ${L.name}` : `Next up: ${L.name}, wave ${n.wave + 1} of ${L.waves.length}`;
  $('shopWallets').innerHTML = v.people.map(pe => `<div class="wallet${pe.mine && Net.active ? ' me' : ''}">${many ? tagOf(pe) : ''}<i class="coin"></i>${pe.coins}</div>`).join('');
  const mine = v.people.filter(pe => pe.mine);
  const grid = $('shopGrid'); grid.innerHTML = '';
  const section = (title, sub) => { const h = document.createElement('div'); h.className = 'shopsec'; h.innerHTML = `${title}<span>${sub}</span>`; grid.appendChild(h); };
  const price = n => `<span class="price"><i class="coin"></i>${n}</span>`;
  const card = (cls, img, name, priceHtml, desc, extra = '') => {
    const el = document.createElement('div'); el.className = 'card' + cls;
    el.innerHTML = `<img src="${img}" alt=""><div class="cname">${name}${priceHtml}</div><div class="cdesc">${desc}</div>${extra}`;
    grid.appendChild(el); return el;
  };
  const owners = (el, list, has, uses, word) => {   // which teammates already have this
    const others = v.people.filter(pe => !pe.mine && has(pe));
    if (!others.length) return;
    const o = document.createElement('div'); o.className = 'owners';
    o.innerHTML = others.map(pe => tagOf(pe) + (uses(pe) ? '✓ ' : ' ')).join('') + (others.length === 1 ? word[0] : word[1]);
    el.appendChild(o);
  };
  // one row of buttons: each of "my" players gets their own (2 players on one computer = 2 sets)
  const buttons = (el, make) => {
    const row = document.createElement('div'); row.className = 'buyrow';
    for (const pe of mine) {
      const tag = many && mine.length > 1 ? pe.tag + ' ' : '';
      for (const b of make(pe, tag)) { if (many) b.classList.add('p' + ((pe.id % 4) + 1)); row.appendChild(b); }
    }
    el.appendChild(row);
  };
  const need = (pe, cost, tag, label, act) => {
    const short = pe.coins < cost;
    return button(short ? `${tag}NEED ${cost - pe.coins} MORE` : `${tag}${label}`, 'small gold', act, short);
  };
  const sell = (tag, n, act) => button(`${tag}SELL +${Math.round(n * SELL_BACK)}`, 'small sell', act);

  section('Guns', 'Changed your mind? Sell a gun back and get all your coins back.');
  for (const wp of WEAPONS) {
    const el = card(mine.some(pe => pe.weapon === wp.id) ? ' equipped' : '', ICON_URL[wp.id], wp.name, wp.price ? price(wp.price) : '<span class="price free">STARTER</span>', wp.desc,
      `<div class="stats">${statBar('Damage', Math.sqrt(wp.dmg * wp.pellets / 120), '#ff7a59')}${statBar('Speed', Math.sqrt(1 / wp.cd / 33), '#5ab0ff')}${statBar('Range', wRange(wp) / 1500, '#7CFC4A')}</div>`);
    owners(el, v.people, pe => pe.owned.includes(wp.id), pe => pe.weapon === wp.id, ['has it', 'have it']);
    buttons(el, (pe, tag) => {
      if (!pe.owned.includes(wp.id)) return [need(pe, wp.price, tag, 'BUY', () => shopAct('buy', pe.id, wp))];
      const first = pe.weapon === wp.id ? button(`${tag}✓ EQUIPPED`, 'small eq', () => {}, true) : button(`${tag}EQUIP`, 'small alt', () => shopAct('equip', pe.id, wp));
      return wp.price ? [first, sell(tag, wp.price, () => shopAct('sell', pe.id, wp))] : [first];
    });
  }

  section('Armor', 'Your blue ARMOR bar takes the hits before your health does. It is repaired every wave.');
  for (const a of ARMORS) {
    const el = card(mine.some(pe => pe.armor === a.id) ? ' equipped' : '', ARMOR_URL[a.id], a.name, price(a.price), a.desc,
      `<div class="stats">${statBar('Armor', a.armor / 250, '#8fd4ff')}</div>`);
    owners(el, v.people, pe => (pe.armors || []).includes(a.id), pe => pe.armor === a.id, ['has it', 'have it']);
    buttons(el, (pe, tag) => {
      if (!(pe.armors || []).includes(a.id)) return [need(pe, a.price, tag, 'BUY', () => shopAct('armorBuy', pe.id, a))];
      const first = pe.armor === a.id ? button(`${tag}✓ WEARING`, 'small eq', () => {}, true) : button(`${tag}WEAR`, 'small alt', () => shopAct('armorWear', pe.id, a));
      return [first, sell(tag, a.price, () => shopAct('armorSell', pe.id, a))];
    });
  }

  section('Health', 'Make your health bar bigger for good, or patch yourself up between waves.');
  {   // health boost: 100 -> 200 -> 300 health
    const me1 = mine[0], next = HEALTH_BOOSTS[me1 ? me1.boost : 0], from = me1 ? maxHpOf({ boost: me1.boost }) : 100;
    const el = card('', BOOST_URL, next ? next.name : 'Health Boost', next ? price(next.price) : '<span class="price free">MAXED</span>',
      next ? `Your health bar grows from ${from} to ${next.maxHp}, for good. ${me1 && me1.boost === 0 ? `Then ${HEALTH_BOOSTS[1].name} (${HEALTH_BOOSTS[1].maxHp}) for ${HEALTH_BOOSTS[1].price}.` : ''}` : `You have the biggest health bar there is: ${from}!`,
      `<div class="stats">${statBar('Health', from / 300, '#5ee06a')}</div>`);
    buttons(el, (pe, tag) => {
      const nb = HEALTH_BOOSTS[pe.boost];
      if (!nb) return [button(`${tag}✓ ${maxHpOf({ boost: pe.boost })} HEALTH`, 'small eq', () => {}, true)];
      return [need(pe, nb.price, tag, `BUY (${nb.maxHp} HEALTH)`, () => shopAct('boost', pe.id))];
    });
  }
  {   // med kit: heal up between waves
    const el = card('', MEDKIT_URL, 'Med Kit', price(MEDKIT.price), `Heals ${MEDKIT.heal} health right now. You get full health at the start of every level anyway.`);
    buttons(el, (pe, tag) => {
      const usable = n.wave > 0 && pe.inRun && pe.hp < pe.maxHp;
      const label = !usable ? `${tag}FULL HEALTH` : pe.coins < MEDKIT.price ? `${tag}NEED ${MEDKIT.price - pe.coins} MORE` : `${tag}HEAL (${pe.hp} HP)`;
      return [button(label, 'small gold', () => shopAct('medkit', pe.id), !usable || pe.coins < MEDKIT.price)];
    });
  }
  // Start / ready
  const go = n.wave === 0 ? `PLAY LEVEL ${n.level + 1}: ${L.name.toUpperCase()} ▶` : `START WAVE ${n.wave + 1} ▶`;
  $('startBtn').style.display = Net.isGuest ? 'none' : '';
  $('readyBtn').style.display = Net.isGuest ? '' : 'none';
  $('startBtn').textContent = go;
  $('readyBtn').textContent = v.myReady ? '✓ READY!' : "I'M READY";
  $('readyBtn').classList.toggle('gold', !v.myReady);
  $('shopNote').textContent = Net.isGuest ? 'The host starts the next wave. Press READY when you are done shopping.'
    : Net.isHost && v.guests ? `${v.ready.length} of ${v.guests} friend${v.guests === 1 ? '' : 's'} ready` : '';
  $('shopMenuBtn').textContent = menuLabel();
}

// ---- Pause, game over, winning --------------------------------------------
function pauseGame() {
  if (Net.active) { if (PLAYING.includes(G.state)) openNetMenu(); return; }   // Wi-Fi games never pause
  if (G.state !== 'playing' && G.state !== 'cleared') return;
  G.pausedFrom = G.state; setState('paused'); writeSave(); showOverlay('pause');
}
function resumeGame() { if (G.state !== 'paused') return; setState(G.pausedFrom); hideOverlays(); }
function openNetMenu() {
  $('nmEnd').style.display = Net.isHost ? '' : 'none';
  $('nmLobby').textContent = menuLabel();
  showOverlay('netmenu');
}
function showGameOver() {
  if (!Net.isGuest) { setState('over'); writeSave(); }
  const L = G.level || LEVELS[0];
  $('oWave').textContent = `${G.waveIndex + 1}/${L.waves.length}`;
  $('oKills').textContent = (G.run && G.run.kills) || 0;
  $('oCoins').innerHTML = G.players.map(p => `${tagHtml(p)}${(G.run && G.run.coins[p.id]) || 0}`).join(' ');
  $('oLevel').textContent = `Level ${G.levelIndex + 1}: ${L.name}. ${Net.active ? 'Everyone keeps' : 'You keep'} every coin you grabbed!`;
  $('againBtn').style.display = Net.isGuest ? 'none' : '';
  $('oShopBtn').style.display = Net.isGuest ? 'none' : '';
  $('oWait').style.display = Net.isGuest ? '' : 'none';
  $('oMenuBtn').textContent = menuLabel();
  showOverlay('over');
}
function showWin() {
  if (!Net.isGuest) { setState('win'); writeSave(); }
  const people = Net.active ? G.players.map(p => [tagHtml(p), p.prof.coins]) : profs().map((p, i) => [pTag(i), p.coins]);
  $('wCoins').innerHTML = people.map(([t, c]) => `<span>${t}<i class="coin"></i><b>${c}</b></span>`).join('');
  $('wMenuBtn').textContent = menuLabel();
  $('wWait').style.display = Net.isGuest ? '' : 'none';
  showOverlay('win');
}
// Wi-Fi guests unlock the levels they beat with their friends too.
function markBeaten(i) {
  save.unlocked = Math.max(save.unlocked, Math.min(LEVELS.length, i + 2));
  if (!save.beaten.includes(i)) save.beaten.push(i);
  writeSave();
}

// Buttons that are always on the page.
document.querySelectorAll('#modeRow button').forEach(b => b.addEventListener('click', () => {
  blurAll(); Sound.init(); Sound.play('click');
  titleMode = b.dataset.n;
  if (titleMode !== 'net') { save.numPlayers = +titleMode; writeSave(); }
  $('netErr').textContent = '';
  renderTitle();
}));
const wire = (id, fn) => $(id).addEventListener('click', () => { blurAll(); Sound.init(); fn(); });
wire('tShopBtn', () => openShop({ level: save.unlocked - 1, wave: 0 }));
// Reset asks "are you sure?" on the page itself (press twice), because pop-up boxes don't work in the Claude Artifact.
let resetArmedUntil = 0;
function disarmReset() { resetArmedUntil = 0; $('resetBtn').textContent = 'Reset progress'; $('resetBtn').classList.remove('armed'); }
wire('resetBtn', () => {
  if (performance.now() < resetArmedUntil) { disarmReset(); resetSave(); toTitle(); return; }
  resetArmedUntil = performance.now() + 4000;
  $('resetBtn').textContent = 'Press again to erase all coins, guns and levels';
  $('resetBtn').classList.add('armed');
  setTimeout(() => { if (resetArmedUntil && performance.now() >= resetArmedUntil) disarmReset(); }, 4100);
});
wire('hostBtn', hostGame);
wire('joinBtn', joinGame);
wire('lLeave', () => leaveWifi());
wire('startBtn', startFromShop);
wire('readyBtn', () => { NetGame.ready = !NetGame.ready; Net.send({ t: 'ready', v: NetGame.ready }, 'host', true); renderShop(); });
wire('shopMenuBtn', menuAction);
wire('resumeBtn', resumeGame);
wire('restartBtn', () => startLevel(G.levelIndex));
wire('quitBtn', toTitle);
wire('againBtn', () => startLevel(G.levelIndex));
wire('oShopBtn', () => openShop({ level: G.levelIndex, wave: 0 }));
wire('oMenuBtn', menuAction);
wire('wMenuBtn', menuAction);
wire('nmBack', hideOverlays);
wire('nmLobby', menuAction);
wire('nmEnd', () => leaveWifi());
$('joinCode').addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4); });

// ---- Game loop ------------------------------------------------------------
// A Wi-Fi host must keep running even when its window is hidden or covered (browsers stop
// animating hidden tabs), so a tiny background timer keeps the game ticking.
let lastTick = performance.now(), rafPending = false, ticker = null;
function step(dt) {
  G.t += dt;
  if (Net.isGuest) NetGame.guestTick(dt);
  else if (PLAYING.includes(G.state)) update(dt);
  else if (G.state === 'title' || G.state === 'lobby') {
    G.camX = (Math.sin(G.t * 0.06) * 0.5 + 0.5) * Math.max(0, G.level.worldW - W);
    for (const c of G.coins) { c.spin += dt * 6; if (c.float) c.y = c.baseY + Math.sin(G.t * 3 + c.x * 0.05) * 3; }
    updateFX(dt);
  }
  if (Net.isHost) NetGame.hostTick(dt);
}
function tick(now) {
  // Slow frames (or the background timer) are caught up in small steps so the game never runs in slow motion.
  const elapsed = Math.min(0.1, Math.max(0, (now - lastTick) / 1000)); lastTick = now;
  const steps = Math.max(1, Math.ceil(elapsed / 0.034));
  for (let i = 0; i < steps; i++) step(elapsed / steps);
  render();
  Sound.endFrame();
  $('touch').classList.toggle('show', IS_TOUCH && (G.numPlayers === 1 || Net.active) && (G.state === 'playing' || G.state === 'cleared'));
  document.body.classList.toggle('ingame', PLAYING.includes(G.state));
}
function loop(now) { rafPending = false; tick(now); schedule(); }
function schedule() { if (!rafPending) { rafPending = true; requestAnimationFrame(loop); } }
function startHostTicker() {
  if (ticker) return;
  try {
    ticker = new Worker(URL.createObjectURL(new Blob(['setInterval(function () { postMessage(0); }, 16);'], { type: 'text/javascript' })));
    ticker.onmessage = () => { const now = performance.now(); if (now - lastTick > 40) tick(now); };
  } catch (e) { ticker = null; }
}
function stopHostTicker() { if (ticker) { ticker.terminate(); ticker = null; } }
toTitle();
schedule();
