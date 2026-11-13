'use strict';
// The civilians: move left/right, jump, drop through platforms and shoot. Up to 2 players.

const P_SPEED = 270, P_JUMP = 760, RESPAWN_TIME = 6;
const LOOKS = [
  { tag: 'P1', tagCol: '#ff7a59', shirt: '#e0533d', shirtD: '#b83e2c', stripe: 'rgba(255,255,255,.85)', jeans: '#3b5b92', jeansD: '#2f4a7a', hair: '#5a3a1e', skin: '#f1c27d', skinD: '#d9a766', shoe: '#ffffff', cap: null },
  { tag: 'P2', tagCol: '#5ab0ff', shirt: '#2fa37a', shirtD: '#23805f', stripe: '#ffd23f', jeans: '#4a4a5e', jeansD: '#3a3a4c', hair: '#1f1a17', skin: '#c68d5a', skinD: '#a8743f', shoe: '#ffd23f', cap: '#3a6fd8' },
  { tag: 'P3', tagCol: '#ffd23f', shirt: '#f2a93b', shirtD: '#c98422', stripe: '#3a2a20', jeans: '#2f3f5f', jeansD: '#243250', hair: '#c9772f', skin: '#f6d2a8', skinD: '#ddb084', shoe: '#e8413a', cap: null },
  { tag: 'P4', tagCol: '#c78bff', shirt: '#8a5ad8', shirtD: '#6a3fb0', stripe: '#7CFC4A', jeans: '#3a3a3a', jeansD: '#2a2a2a', hair: '#e8e0d0', skin: '#8d5a3a', skinD: '#70442a', shoe: '#ffffff', cap: '#2a2a2a' },
];

// o.ctrl / o.prof / o.remote are used for Wi-Fi players (their buttons come over the network).
function makePlayer(i, x, o = {}) {
  const ctrl = o.ctrl || (G.numPlayers === 1 ? CONTROLS.solo : i === 0 ? CONTROLS.p1 : CONTROLS.p2);
  const prof = o.prof || save.players[i];
  return {
    id: i, look: LOOKS[i % LOOKS.length], ctrl, prof, remote: o.remote || null, aimMode: 'keys',
    x, y: GROUND, prevY: GROUND, vx: 0, vy: 0, w: 24, h: 64,
    hp: maxHpOf(prof), maxHp: maxHpOf(prof), dead: false, deadT: 0, inv: 0,
    armorId: armorOf(prof) ? prof.armor : '', armor: armorOf(prof), maxArmor: armorOf(prof),   // js/gear.js
    onGround: true, onPlat: null, dropT: 0, jumpBuf: 0, coyote: 0, jumpCut: true,
    facing: 1, aim: 0, target: null, cd: 0, recoil: 0, flashT: 0, walkT: 0, nadeCd: 0, throwT: 0,
    weapon: prof.owned.includes(prof.equipped) ? prof.equipped : 'shotgun',
  };
}
const alivePlayers = () => G.players.filter(p => !p.dead);
function shoulder(p) { return { x: p.x + p.facing * 3, y: p.y - 44 }; }
// The arm angle as the (possibly mirrored) body sees it.
function localAim(p) { return p.facing > 0 ? p.aim : Math.atan2(Math.sin(Math.PI - p.aim), Math.cos(Math.PI - p.aim)); }
function nearestPlayer(x, y) {
  let best = null, bd = Infinity;
  for (const p of G.players) { if (p.dead) continue; const d = Math.abs(p.x - x) + Math.abs(p.y - y) * 0.5; if (d < bd) { bd = d; best = p; } }
  return best;
}

function updatePlayer(p, dt) {
  if (p.dead) {
    p.deadT += dt;
    p.vy = Math.min(p.vy + GRAV * dt, 1400); p.prevY = p.y; p.y += p.vy * dt; p.x += p.vx * dt; p.vx *= Math.exp(-4 * dt); land(p);
    // In 2 players you pop back in next to your friend.
    const buddy = G.players.find(q => q !== p && !q.dead);
    if (buddy && p.deadT > RESPAWN_TIME) revive(p, buddy.x - buddy.facing * 30, 60);
    return;
  }
  const move = (held(p, 'right') ? 1 : 0) - (held(p, 'left') ? 1 : 0);
  p.vx = approach(p.vx, move * P_SPEED, (p.onGround ? 2600 : 1500) * dt);
  // Holding fire with a zombie in your sights keeps you facing it, so you can walk backwards while shooting.
  const lockedOn = held(p, 'fire') && p.target && !p.target.dead;
  if (move && p.aimMode !== 'mouse' && !lockedOn) p.facing = move;

  p.coyote = p.onGround ? 0.09 : p.coyote - dt;
  p.jumpBuf -= dt;
  if (p.jumpBuf > 0 && p.coyote > 0) {
    p.vy = -P_JUMP; p.onGround = false; p.coyote = 0; p.jumpBuf = 0; p.jumpCut = false;
    dust(p.x, p.y, 5); Sound.play('jump', p.x);
  }
  if (!held(p, 'jump') && p.vy < -220 && !p.jumpCut) { p.vy *= 0.5; p.jumpCut = true; } // short hop if you let go
  if (held(p, 'down') && p.onGround && p.onPlat) { p.dropT = 0.25; p.onGround = false; p.onPlat = null; }
  p.dropT -= dt;

  p.vy = Math.min(p.vy + GRAV * dt, 1400);
  p.x = clamp(p.x + p.vx * dt, 44, G.level.worldW - 44);
  p.prevY = p.y; p.y += p.vy * dt;
  const wasGround = p.onGround, fall = p.vy;
  land(p);
  if (p.onGround && !wasGround && fall > 650) { dust(p.x, p.y, 6); Sound.play('land', p.x); }
  if (p.onGround && Math.abs(p.vx) > 30) p.walkT += dt * Math.abs(p.vx) / 22;

  updateAim(p, dt);
  p.cd -= dt;
  const clicking = p.remote ? p.remote.md : p.ctrl.mouse && mouse.down;
  const shooting = (held(p, 'fire') || clicking) && G.state !== 'dying';
  p.firing = shooting;
  if (shooting) tryShoot(p);
  // The flamethrowers roar and the minigun motor whines for as long as you hold fire. The laser sword always hums.
  Sound.hold('flame' + p.id, p.weapon === 'incin' ? 'inferno' : 'flame', shooting && isFlame(WMAP[p.weapon].kind), p.x);
  Sound.hold('motor' + p.id, 'motor', shooting && p.weapon === 'minigun', p.x);
  Sound.hold('hum' + p.id, 'hum', p.weapon === 'saber', p.x);
  p.inv -= dt; p.recoil = Math.max(0, p.recoil - dt * 9); p.flashT -= dt; p.swingT = Math.max(0, (p.swingT || 0) - dt);
  p.nadeCd -= dt; p.throwT = Math.max(0, (p.throwT || 0) - dt);
}

// Mouse players aim at the mouse. Keyboard players auto-aim at the closest zombie in front of them.
function updateAim(p, dt) {
  const wp = WMAP[p.weapon], sh = shoulder(p);
  p.target = null;
  if (p.aimMode === 'mouse') {
    const wx = p.remote ? p.remote.mx : mouse.sx + G.camX, wy = p.remote ? p.remote.my : mouse.sy;
    p.aim = Math.atan2(wy - sh.y, wx - sh.x);
    if (Math.abs(wx - p.x) > 4) p.facing = wx >= p.x ? 1 : -1;
    return;
  }
  let best = null, bd = Infinity;
  const range = Math.min(720, wRange(wp));
  for (const z of G.zombies) {
    if (z.dead) continue;
    const dx = z.x - sh.x; if (dx * p.facing < -4) continue;
    const dy = (z.y - z.h * 0.5) - sh.y, d = Math.hypot(dx, dy);
    if (d > range || Math.abs(Math.atan2(dy, Math.abs(dx))) > (z.T.fly ? 1.25 : 0.8)) continue;   // crows can be high up
    if (d < bd) { bd = d; best = z; }
  }
  const target = best ? Math.atan2((best.y - best.h * 0.5) - sh.y, best.x - sh.x) : (p.facing > 0 ? 0 : Math.PI);
  if (Math.cos(p.aim) * p.facing < 0) p.aim = target; else p.aim = angLerp(p.aim, target, Math.min(1, dt * 16));
  p.target = best;
}

function hurtPlayer(p, dmg, dir, knock = 1) {   // knock = how far you get thrown (kangaroo punches send you flying)
  if (p.dead || p.inv > 0 || G.state === 'cleared') return;
  // Armor takes the hit first (it's repaired at the start of every wave).
  const soak = Math.min(p.armor || 0, dmg), toHp = dmg - soak;
  p.armor = (p.armor || 0) - soak;
  p.hp -= toHp; p.inv = 0.8;
  p.vx = dir * 320 * knock; p.vy = -280 * Math.sqrt(knock); p.onGround = false; p.jumpCut = true;
  G.shake = Math.max(G.shake, toHp ? 8 : 4); G.hurtFlash = toHp ? 0.35 : G.hurtFlash;
  if (!p.remote) padRumble(toHp ? 0.7 : 0.3, 0.5, 150, p.id);   // the hurt player's controller buzzes
  if (soak) {
    sparks(p.x, p.y - 40, 8, -Math.PI / 2, 1.4, '#8fd4ff', 260);
    addText(p.x - (toHp ? 12 : 0), p.y - 74, `-${soak}`, '#8fd4ff', 15);
    Sound.play('clang', p.x);
    if (p.armor <= 0) { addText(p.x, p.y - 92, 'ARMOR BROKEN!', '#8fd4ff', 13); ring(p.x, p.y - 36, 50, '#8fd4ff', 0.3); }
  }
  if (toHp) sparks(p.x, p.y - 36, 8, -Math.PI / 2, 1.4, '#ff6a5a', 260);
  if (toHp) addText(p.x + (soak ? 12 : 0), p.y - 74, `-${toHp}`, '#ff6a5a', 15);
  if (toHp && p.hp > 0) Sound.play('hurt', p.x, p.id);
  if (p.hp <= 0) {
    p.hp = 0; p.dead = true; p.deadT = 0;
    Sound.play('die', p.x, p.id);
    if (!alivePlayers().length) { setState('dying'); G.dyingT = 0; }
    else banner(`${p.look.tag} IS DOWN!`, `Back in ${RESPAWN_TIME} seconds. Stay alive!`, 2, '#ff7a59');
  }
}
function revive(p, x, hp) {
  Object.assign(p, { dead: false, deadT: 0, hp, armor: p.maxArmor || 0, inv: 2, x: clamp(x, 44, G.level.worldW - 44), y: GROUND - 300, prevY: GROUND - 300, vx: 0, vy: 0, onGround: false, onPlat: null });
  ring(p.x, p.y, 40, p.look.tagCol);
}

function tryShoot(p) {
  const wp = WMAP[p.weapon];
  if (p.cd > 0) return;
  p.cd = wp.cd;
  if (wp.kind === 'melee') { meleeSwing(p, wp); return; }
  const sh = shoulder(p), a = p.aim, L = 14 + wp.len;
  const sx = sh.x + Math.cos(a) * 6, sy = sh.y + Math.sin(a) * 6 - 1.5;    // bullets start inside the gun so zombies in your face get hit
  const mx = sh.x + Math.cos(a) * L, my = sh.y + Math.sin(a) * L - 1.5;   // the muzzle
  if (wp.kind === 'laser') fireLaser(p, sx, sy, mx, my, a, wp);
  else {
    for (let i = 0; i < wp.pellets; i++) {
      let aa = a;
      if (wp.kind === 'pellet') aa += ((i / (wp.pellets - 1)) - 0.5) * 2 * wp.spread + rand(-0.04, 0.04);
      else aa += rand(-wp.spread, wp.spread);
      const jitter = wp.kind === 'pellet' || isFlame(wp.kind);
      const sp = wp.speed * (jitter ? rand(0.82, 1.12) : 1), life = wp.life * (jitter ? rand(0.8, 1.15) : 1);
      G.bullets.push({ x: sx, y: sy, vx: Math.cos(aa) * sp + (isFlame(wp.kind) ? p.vx * 0.5 : 0), vy: Math.sin(aa) * sp, life, max: life, dist: 0, hide: L - 8,
        dmg: wp.dmg, pierce: wp.pierce, hit: new Set(), kind: wp.kind, knock: wp.knock, wp, owner: p });
    }
  }
  if (!isFlame(wp.kind)) { p.flashT = 0.06; sparks(mx, my, wp.kind === 'pellet' ? 5 : 2, a, 0.35, '#ffd27a', 260); }
  if (wp.kind === 'rocket') smoke(sh.x - Math.cos(a) * 24, sh.y - Math.sin(a) * 24, 5, 7, '#8a8090');
  p.recoil = 1;
  G.shake = Math.max(G.shake, wp.shake);
  if (wp.kick && p.onGround) p.vx -= Math.cos(a) * wp.kick;
  if (wp.kind === 'pellet' || wp.kind === 'bullet' || wp.kind === 'slug') {
    const shell = wp.kind === 'pellet';
    addPart({ type: 'shell', x: sh.x + Math.cos(a) * 16, y: sh.y + Math.sin(a) * 16 - 2, vx: -p.facing * rand(60, 160), vy: rand(-280, -160), g: 1500, life: 1.2,
      size: shell ? 3.5 : 2.4, col: shell ? '#d94a3a' : '#d9a83a', rot: rand(6), vr: rand(-20, 20), bounce: 0.35 });
  }
  if (!isFlame(wp.kind)) Sound.play(wp.sfx, p.x);
}

// Swords and hammers hit every zombie right in front of you in one big swing.
function meleeSwing(p, wp) {
  p.swingT = p.swingDur = wp.swing;
  const dir = p.facing, hit = new Set();
  for (const z of G.zombies) {
    if (z.dead) continue;
    const dx = (z.x - p.x) * dir;
    if (dx + z.w / 2 > -12 && dx - z.w / 2 < wp.reach && z.y - z.h < p.y + 6 && z.y > p.y - p.h - 34) {
      hit.add(z);
      const hx = z.x - dir * z.w * 0.3, hy = Math.max(z.y - z.h * 0.7, p.y - 52);
      hurtZombie(z, wp.dmg, dir * wp.knock, -wp.lift, true);
      goo(hx, hy, 6, dir);
      sparks(hx, hy, 5, dir > 0 ? 0 : Math.PI, 0.8, wp.id === 'saber' ? '#9fffc0' : '#fff2c0', 300);
    }
  }
  if (wp.quake && p.onGround) {   // the war hammer shakes the ground around where it lands
    const qx = p.x + dir * 50;
    for (const z of G.zombies) {
      if (z.dead || hit.has(z) || !z.onGround || Math.abs(z.y - p.y) > 8 || Math.abs(z.x - qx) > wp.quake) continue;
      hit.add(z); hurtZombie(z, wp.dmg * 0.35, (Math.sign(z.x - qx) || dir) * 260, -260, true);
    }
    dust(qx, p.y, 10); ring(qx, p.y - 2, wp.quake, '#e8d8b0', 0.4);
  }
  for (const b of G.barrels) {   // whack a barrel and it goes off (js/barrels.js)
    if (b.gone || b.fly || b.drop > 0) continue;
    const dx = (b.x - p.x) * dir;
    if (dx + b.w / 2 > -12 && dx - b.w / 2 < wp.reach && b.y - b.h < p.y + 6 && b.y > p.y - p.h - 34) hitBarrel(b, wp.dmg, dir);
  }
  addPart({ type: 'slash', x: p.x + dir * 6, y: p.y - 44, vx: 0, vy: 0, g: 0, life: 0.18, size: wp.reach, dir, col: wp.id === 'saber' ? '#7fffa0' : wp.id === 'hammer' ? '#e8d8b0' : '#ffffff' });
  G.shake = Math.max(G.shake, hit.size ? wp.shake : wp.shake * 0.3);
  Sound.play(wp.sfx, p.x);
  if (hit.size) Sound.play(wp.hitSfx, p.x);
}

// ---- Drawing --------------------------------------------------------------
function pLeg(c, x, y, ang, jeans, shoe, pad) {
  c.save(); c.translate(x, y); c.rotate(ang);
  fillRR(c, -4, 0, 8, 22, 3, jeans);
  if (pad) fillRR(c, -5, 7, 10, 7, 3, pad);   // armor knee pads
  fillRR(c, -4, 19, 12, 6, 2.5, shoe);
  c.fillStyle = '#9aa0ad'; c.fillRect(-4, 24, 12, 1.5);
  c.restore();
}
function muzzleFlash(c, x, y, kind) {
  const s = kind === 'pellet' ? 1.4 : kind === 'slug' || kind === 'rocket' ? 1.6 : 1;
  c.save(); c.translate(x, y); c.globalCompositeOperation = 'lighter';
  if (kind === 'laser') { circle(c, 3, 0, 8, 'rgba(90,255,255,.8)'); circle(c, 3, 0, 4, '#fff'); }
  else { poly(c, [0, -5 * s, 9 * s, -1.5 * s, 18 * s, 0, 9 * s, 1.5 * s, 0, 5 * s, 4 * s, 0], '#ffd36b'); circle(c, 3 * s, 0, 4.5 * s, '#fff4c0'); }
  c.restore();
}
function drawPlayer(c, p) {
  const wp = WMAP[p.weapon], k = p.look, A = ARMOR_LOOK[p.armorId] || null;   // A = the armor you're wearing (js/gear.js)
  const shirtD = A ? A.bodyD : k.shirtD, sleeve = A ? A.sleeve : k.skin, hand = (A && A.glove) || k.skin;
  const jeans = (A && A.pants) || k.jeans, jeansD = (A && A.pantsD) || k.jeansD, shoe = (A && A.boot) || k.shoe, pad = A && A.pad;
  if (p.dead && p.deadT > 2.2) {           // waiting to respawn: show a little ghost countdown
    const left = Math.ceil(RESPAWN_TIME - p.deadT);
    if (G.players.some(q => q !== p && !q.dead) && left > 0) {
      c.globalAlpha = 0.6; text(c, `${k.tag} back in ${left}`, p.x, p.y - 30, { size: 12, color: k.tagCol, stroke: 'rgba(0,0,0,.7)', lw: 3 }); c.globalAlpha = 1;
    }
    return;
  }
  c.save(); c.translate(p.x, p.y);
  if (p.dead) { c.rotate(-p.facing * Math.min(1, p.deadT * 2.6) * 1.45); c.globalAlpha = clamp((2.2 - p.deadT) / 0.6, 0, 1); }
  else if (p.inv > 0 && Math.floor(p.inv * 16) % 2 === 0) c.globalAlpha = 0.45;
  c.scale(p.facing, 1);
  const moving = p.onGround && Math.abs(p.vx) > 25, air = !p.onGround;
  const sw = moving ? Math.sin(p.walkT) * 0.65 : 0;
  const bob = moving ? -Math.abs(Math.cos(p.walkT)) * 2 : 0;
  if (A && A.back) A.back(c);
  pLeg(c, -2, -26 + bob, air ? 0.55 : sw, jeansD, shoe, pad && shade(pad, -0.2));
  pLeg(c, 3, -26 + bob, air ? -0.3 : -sw, jeans, shoe, pad);
  c.translate(0, bob);
  let la = localAim(p);
  const rec = wp.kind === 'melee' ? 0 : p.recoil * 5;
  if (wp.kind === 'melee') {   // swing from over your head down to the front, or rest it on your shoulder
    if (p.swingT > 0) { const k = 1 - p.swingT / (p.swingDur || wp.swing); la = -2.1 + (1 - (1 - k) * (1 - k)) * 3.0; }
    else la = -0.95 + Math.sin(G.t * 2 + p.id) * 0.04;
  }
  // throwing a grenade: the back arm swings over your head (js/grenades.js)
  if (p.throwT > 0) drawThrowArm(c, p, shirtD, A ? shade(sleeve, -0.2) : k.skinD, hand);
  // back arm reaching forward to hold the gun
  else if (wp.grip) {
    c.save(); c.translate(3, -44); c.rotate(la);
    const bx = -5 * Math.cos(la) - Math.sin(la), by = 5 * Math.sin(la) - Math.cos(la);
    c.lineCap = 'round';
    c.strokeStyle = shirtD; c.lineWidth = 7; c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + 4, by + 0.5); c.stroke();
    c.strokeStyle = A ? shade(sleeve, -0.2) : k.skinD; c.lineWidth = 5; c.beginPath(); c.moveTo(bx + 3, by); c.lineTo(14 - rec + wp.grip, 1.5); c.stroke();
    c.restore();
  }
  // body
  c.fillStyle = k.skin; c.fillRect(-2, -55, 6, 5);
  if (A) A.torso(c);
  else {
    fillRR(c, -9, -51, 19, 28, 6, k.shirt);
    c.fillStyle = k.shirtD; c.fillRect(-9, -42, 4, 17);
    c.fillStyle = k.stripe; c.fillRect(-9, -43, 19, 3);
    c.fillStyle = '#3a2a20'; c.fillRect(-9, -26, 19, 3);
  }
  // head
  c.save(); c.translate(1, -54); c.rotate(clamp(la * 0.3, -0.28, 0.28));
  circle(c, 0, -7, 10, k.skin);
  circle(c, -3.5, -6, 2.6, k.skinD);
  c.fillStyle = k.hair; c.beginPath(); c.arc(0, -8, 10.6, Math.PI * 0.92, Math.PI * 2.08); c.closePath(); c.fill();
  c.fillRect(-10, -9, 5, 7);
  if (k.cap && !(A && A.helmet)) { fillRR(c, -10, -19, 20, 8, 4, k.cap); fillRR(c, 4, -13.5, 12, 3.5, 1.5, k.cap); }
  if (p.dead) { c.strokeStyle = '#1d1d24'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(4.5, -9); c.lineTo(7.5, -6); c.moveTo(7.5, -9); c.lineTo(4.5, -6); c.stroke(); }
  else circle(c, 6, -7, 1.5, '#1d1d24');
  c.fillStyle = k.hair; c.fillRect(3.5, -11.5, 5, 1.6);
  c.fillStyle = '#9a4a3a'; c.fillRect(5, -2.5, 3.5, 1.4);
  if (A && A.head) A.head(c);
  c.restore();
  // front arm and gun
  c.save(); c.translate(3, -44); c.rotate(la);
  fillRR(c, -4, -4.5, 10, 9, 4, A ? A.sleeve : k.shirt);
  if (A && A.shoulder) A.shoulder(c);
  fillRR(c, 4, -3, 12 - rec, 6, 3, sleeve);
  c.save(); c.translate(14 - rec, 1);
  drawGun(c, p.weapon, G.t, p.cd <= 0.08);
  if (wp.grip) circle(c, wp.grip, wp.id === 'minigun' ? -9 : 1.5, 3.2, hand);
  if (p.flashT > 0 && !isFlame(wp.kind)) muzzleFlash(c, wp.len + 2, -2.5, wp.kind);
  c.restore();
  circle(c, 14 - rec, 1.5, 3.4, hand);
  c.restore();
  c.restore();
  // name tag when there's more than one player
  if (G.players.length > 1 && !p.dead) {
    const ty = p.y - 84 + Math.sin(G.t * 4 + p.id) * 1.5;
    poly(c, [p.x - 5, ty + 6, p.x + 5, ty + 6, p.x, ty + 11], p.look.tagCol);
    text(c, p.look.tag, p.x, ty - 2, { size: 11, color: p.look.tagCol, stroke: 'rgba(0,0,0,.7)', lw: 3 });
  }
}
