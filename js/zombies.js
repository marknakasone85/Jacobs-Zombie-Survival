'use strict';
// Zombie types, how they chase you, what they drop, and how they look.
//   hp = health   speed = [slowest, fastest] walking speed   dmg = damage per bite
//   coins = [fewest, most] coins dropped   jump = how high they can jump to reach you on platforms
//   mass = how hard they are to knock back   atk = seconds between bites

const ZTYPES = {
  walker: { name: 'Walker', w: 30, h: 62, hp: 32, speed: [46, 70], dmg: 10, coins: [1, 2], jump: 500, mass: 1, atk: 0.9, eye: '#ffe14a', heart: 0.04,
    skins: ['#8fb573', '#7fa865', '#9cbf7a', '#86ad6e'], shirts: ['#5d6b8a', '#7a5a5a', '#6b6b4a', '#4a6b6b', '#8a7a5a', '#6a4a6a'] },
  runner: { name: 'Runner', w: 26, h: 58, hp: 20, speed: [145, 180], dmg: 7, coins: [2, 3], jump: 560, mass: 0.8, atk: 0.6, eye: '#ff4b3b', heart: 0.04,
    skins: ['#b5c97a', '#a8c46b'], shirts: ['#8a3a3a', '#3a3a3a', '#5a3a6a', '#2f4f6f'] },
  leaper: { name: 'Leaper', w: 28, h: 56, hp: 38, speed: [78, 95], dmg: 12, coins: [3, 4], jump: 820, mass: 0.9, atk: 0.8, eye: '#6ffcff', heart: 0.05,
    skins: ['#78b0a6', '#6fa39a'], shirts: ['#3a4a5a', '#2f3b2f', '#4a3a2a'] },
  brute: { name: 'Brute', w: 48, h: 84, hp: 190, speed: [32, 40], dmg: 24, coins: [7, 10], jump: 440, mass: 3, atk: 1.2, eye: '#ff9a2e', heart: 0.3,
    skins: ['#5f8f4e', '#6a9a55'], shirts: ['#4a3a2a', '#3a3a4a'] },
  boss: { name: 'Boss', boss: true, w: 80, h: 132, hp: 1100, speed: [40, 44], dmg: 30, coins: [45, 55], jump: 600, mass: 10, atk: 1.25, eye: '#ff2e2e', heart: 1,
    skins: ['#4f7f3e'], shirts: ['#2a1f1f'] },
  tiny: { name: 'Tiny', w: 22, h: 40, hp: 14, speed: [150, 195], dmg: 6, coins: [1, 2], jump: 540, mass: 0.5, atk: 0.5, eye: '#ffef6a', heart: 0.02,
    skins: ['#a8d48a', '#b8dc8f'], shirts: ['#e85a8a', '#5ab0ff', '#ffd23f', '#7CFC4A'] },
  giant: { name: 'Giant', w: 66, h: 112, hp: 480, speed: [26, 32], dmg: 32, coins: [14, 18], jump: 420, mass: 6, atk: 1.4, eye: '#ff6a2e', heart: 0.5,
    skins: ['#557f45', '#4f7a5a'], shirts: ['#3a2a1a', '#2a2a3a'] },
  // Bloaters pop in a goo explosion when they die. It hurts other zombies, and you if you're too close!
  bloater: { name: 'Bloater', w: 46, h: 66, hp: 60, speed: [40, 55], dmg: 12, coins: [4, 6], jump: 380, mass: 2, atk: 1, eye: '#d4ff3a', heart: 0.05,
    skins: ['#a8b84a', '#9aae3f'], shirts: ['#5a4a2a', '#4a3a3a'] },

  // ---- Zombie animals. body = how they move and look. skins = fur/wool/feathers, shirts = a second color.
  // Dogs are fast and pounce at you.
  dog: { name: 'Zombie Dog', body: 'dog', w: 40, h: 30, hp: 24, speed: [175, 215], dmg: 8, coins: [2, 3], jump: 600, mass: 0.7, atk: 0.55, eye: '#ff3b3b', heart: 0.04,
    skins: ['#7a7060', '#5f5a50', '#8a7a5a', '#9a9a8a'], shirts: ['#7fa865', '#8fb573'] },
  // Sheep paw the ground, then CHARGE in a straight line. Jump over them!
  sheep: { name: 'Zombie Sheep', body: 'sheep', w: 46, h: 42, hp: 80, speed: [55, 75], dmg: 14, coins: [3, 5], jump: 420, mass: 1.6, atk: 1, eye: '#ffef3a', heart: 0.06,
    skins: ['#c9c6ae', '#b5b89a', '#d2cbb0'], shirts: ['#2a2a26', '#3a3a30'] },
  // Kangaroos hop everywhere (even up onto platforms) and punch hard with their boxing gloves.
  roo: { name: 'Zombie Kangaroo', body: 'roo', w: 34, h: 78, hp: 95, speed: [120, 150], dmg: 16, coins: [4, 6], jump: 780, mass: 1.4, atk: 0.9, eye: '#ff7a2e', heart: 0.06,
    skins: ['#9a7a5a', '#8a6a4a', '#a88a62'], shirts: ['#d83a3a', '#3a6ad8'] },
  // Crows fly around above you and dive down to peck.
  crow: { name: 'Zombie Crow', body: 'crow', fly: true, w: 30, h: 22, hp: 14, speed: [130, 165], dmg: 6, coins: [1, 2], jump: 0, mass: 0.4, atk: 0.8, eye: '#ff2e2e', heart: 0.02,
    skins: ['#24222c', '#2e2a34'], shirts: ['#e8e0c8'] },
  // Bears are huge and tough. They rear up and swipe.
  bear: { name: 'Zombie Bear', body: 'bear', w: 78, h: 66, hp: 540, speed: [52, 64], dmg: 28, coins: [14, 18], jump: 430, mass: 5, atk: 1.3, eye: '#ffb02e', heart: 0.5,
    skins: ['#5a4232', '#4a3a2e', '#3a2e26'], shirts: ['#7fa865', '#6f985a'] },
  // ---- Animal bosses
  ram: { name: 'The Big Bad Ram', body: 'sheep', boss: true, w: 112, h: 98, hp: 1500, speed: [70, 78], dmg: 30, coins: [50, 60], jump: 560, mass: 10, atk: 1.2, eye: '#ff2e2e', heart: 1,
    skins: ['#9a9a80'], shirts: ['#1a1a16'] },
  kingroo: { name: 'King Roo', body: 'roo', boss: true, w: 66, h: 150, hp: 1700, speed: [150, 160], dmg: 32, coins: [55, 65], jump: 900, mass: 10, atk: 1.0, eye: '#ff2e2e', heart: 1,
    skins: ['#7a5a3a'], shirts: ['#ffd23f'] },
  grizz: { name: 'Big Grizz', body: 'bear', boss: true, w: 150, h: 124, hp: 2400, speed: [48, 54], dmg: 36, coins: [65, 75], jump: 560, mass: 12, atk: 1.25, eye: '#ff2e2e', heart: 1,
    skins: ['#3a2a20'], shirts: ['#6f985a'] },
};
// How hard each kind of animal knocks you back when it hits you.
const KNOCK = { sheep: 1.4, roo: 1.9, bear: 1.5 };
const PANTS = ['#3a3f5a', '#4a4038', '#2f3a2f', '#50463a', '#3a2f3f'];
const ZTYPE_NAMES = Object.keys(ZTYPES);

// The look of a zombie (also used by Wi-Fi guests to rebuild zombies from the host's updates).
// ci = which skin, shirt and pants colors. sz = how big this one is (they come in different sizes).
function makeZombieBody(type, ci, sz = 1) {
  const T = ZTYPES[type], skin = T.skins[ci[0]] || T.skins[0];
  return { type, T, ci, sz, w: T.w * sz, h: T.h * sz, skin, dark: shade(skin, -0.28), shirt: T.shirts[ci[1]] || T.shirts[0], pants: PANTS[ci[2]] || PANTS[0], eye: T.eye };
}

function spawnZombie(type) {
  const T = ZTYPES[type], L = G.level;
  // Zombies come in from just off the edge of the screen.
  let side = Math.random() < 0.5 ? -1 : 1;
  const edge = s => (s < 0 ? G.camX - 60 : G.camX + W + 60);
  let x = edge(side);
  if (x < 30 || x > L.worldW - 30) { side = -side; x = edge(side); }
  x = clamp(x, 30, L.worldW - 30);
  const y = T.fly ? GROUND - rand(150, 230) : GROUND;   // crows fly in
  const crowd = 1 + 0.35 * (Math.max(1, G.players.length) - 1);    // tougher with more players
  const ci = [randi(0, T.skins.length - 1), randi(0, T.shirts.length - 1), randi(0, PANTS.length - 1)];
  const sz = T.boss ? 1 : +rand(0.88, 1.14).toFixed(2);   // a bit bigger or smaller (bigger ones are tougher)
  const z = makeZombieBody(type, ci, sz);
  const hp = T.hp * L.hp * crowd * sz;
  Object.assign(z, {
    uid: ++G.uid, x, y, prevY: y, vx: 0, vy: 0, kbx: 0, pose: 0,
    chargeCd: rand(1.2, 2.6), chargeT: 0, windT: 0, hopCd: rand(0, 0.4), hopV: 0, wasAir: false, swoopCd: rand(1, 2.5), swoopT: 0,
    hp, maxHp: hp, speed: rand(T.speed[0], T.speed[1]) * L.speed,
    dmg: T.dmg, atkRate: T.atk, atkCd: 0.6, atkAnim: 0, jumpV: T.jump, jumpCd: rand(0.4, 1.4), stompCd: 3, stomping: false,
    mass: T.mass, facing: -side, onGround: true, onPlat: null, flash: 0, dead: false, deadT: 0,
    phase: rand(10), walkT: rand(10),
    voice: rand(0.88, 1.12), groanT: rand(0.6, 4),   // every zombie sounds a little different
  });
  if (T.boss) G.boss = z;
  G.zombies.push(z);
  if ((type === 'runner' || type === 'leaper') && Math.random() < 0.5) Sound.zombie(z, 'screech');
  else if (T.body && !T.boss && Math.random() < 0.4) Sound.zombie(z, 'groan');   // a bark, a baa, a caw...
  return z;
}

function updateZombies(dt) {
  const zs = G.zombies;
  for (const z of zs) {
    z.flash = Math.max(0, z.flash - dt);
    if (z.dead) {
      z.deadT += dt; z.vy += GRAV * dt; z.prevY = z.y; z.y += z.vy * dt; z.x += z.kbx * dt; z.kbx *= Math.exp(-5 * dt); land(z);
      continue;
    }
    z.atkCd -= dt; z.jumpCd -= dt; z.atkAnim = Math.max(0, z.atkAnim - dt);
    if (z.sticky > 0) z.sticky = Math.max(0, z.sticky - dt);
    if (z.shocked > 0) z.shocked = Math.max(0, z.shocked - dt);
    // Frozen solid by a Cryo Grenade, or zapped by an electric barrel: no walking, no biting (crows fall out of the sky).
    if (z.frozen > 0 || z.shocked > 0) {
      if (z.frozen > 0) {
        z.frozen -= dt;
        if (z.frozen <= 0) { z.frozen = 0; sparks(z.x, z.y - z.h * 0.5, 12, -Math.PI / 2, Math.PI, '#dff8ff', 260); Sound.play('crack', z.x); }
      }
      z.vy = Math.min(z.vy + GRAV * dt, 1400); z.prevY = z.y; z.y += z.vy * dt;
      z.x = clamp(z.x + z.kbx * dt, 10, G.level.worldW - 10); z.kbx *= Math.exp(-7 * dt);
      land(z);
      continue;
    }
    const target = nearestPlayer(z.x, z.y), body = z.T.body;
    if (z.T.fly) { updateFlyer(z, target, dt); zombieGroan(z, dt); continue; }
    let sp = z.speed * (0.8 + 0.25 * Math.sin(G.t * 3 + z.phase));
    if (target) {
      const dx = target.x - z.x, adx = Math.abs(dx), dir = dx >= 0 ? 1 : -1;
      const charging = z.chargeT > 0;
      if (adx > 4 && !charging) z.facing = dir;
      // Bite (or punch, swipe, headbutt) any player we're touching.
      for (const p of G.players) {
        if (p.dead) continue;
        const pdx = p.x - z.x, reach = z.w / 2 + p.w / 2 + 4;
        if (Math.abs(pdx) < reach && p.y - p.h < z.y && p.y > z.y - z.h) {
          if (z.chargeT > 0) {   // a charging sheep slams right into you
            hurtPlayer(p, Math.round(z.dmg * 1.3), z.facing, 1.8);
            z.chargeT = 0; z.pose = 0; z.chargeCd = rand(2, 3.4); z.kbx -= z.facing * 160; z.atkAnim = 0.35; z.atkCd = z.atkRate;
            Sound.zombie(z, 'attack');
            continue;
          }
          sp = 0;
          if (z.atkCd <= 0) { z.atkCd = z.atkRate; z.atkAnim = 0.35; Sound.zombie(z, 'attack'); hurtPlayer(p, z.dmg, pdx >= 0 ? 1 : -1, KNOCK[body] || 1); }
        }
      }
      z.vx = adx < 6 ? 0 : dir * sp;
      // Stuck in sticky slime (js/barrels.js): a slow wade, and no charging, hopping or jumping.
      const stuck = z.sticky > 0;
      if (stuck) { z.vx *= z.T.boss ? 0.45 : SLIME_SLOW; z.chargeT = z.windT = 0; z.pose = 0; }
      if (body === 'sheep' && !stuck) sheepCharge(z, target, adx, dir, dt);
      if (body === 'roo' && !stuck) rooHop(z, target, adx, dir, sp, dt);
      else if (!stuck && z.onGround && !(z.chargeT > 0) && !(z.windT > 0)) {
        if (target.y < z.y - 24 && adx < 170 && z.jumpCd <= 0) {
          // You're up on something: try to jump up after you.
          z.vy = -z.jumpV * rand(0.9, 1.05); z.onGround = false; z.jumpCd = rand(1.0, 2.2);
        } else if (z.type === 'leaper' && adx < 260 && adx > 60 && z.jumpCd <= 0 && Math.abs(target.y - z.y) < 40) {
          z.vy = -480; z.kbx += dir * 360; z.onGround = false; z.jumpCd = rand(2, 3.2);
          Sound.zombie(z, 'screech');
        } else if (body === 'dog' && adx < 230 && adx > 70 && z.jumpCd <= 0 && Math.abs(target.y - z.y) < 40) {
          z.vy = -360; z.kbx += dir * 430; z.onGround = false; z.jumpCd = rand(1.6, 2.6);   // POUNCE
          Sound.zombie(z, 'screech');
        } else if (z.T.boss && body !== 'sheep') {
          z.stompCd -= dt;
          if (z.stompCd <= 0 && adx < 600) { z.vy = -520; z.onGround = false; z.stomping = true; z.stompCd = rand(4, 6); }
        }
      }
    } else { z.vx = Math.sin(G.t + z.phase) * z.speed * 0.3; z.chargeT = z.windT = 0; z.pose = 0; }   // nobody left: shamble around
    z.vy = Math.min(z.vy + GRAV * dt, 1400);
    z.x = clamp(z.x + (z.vx + z.kbx) * dt, 10, G.level.worldW - 10);
    z.kbx *= Math.exp(-7 * dt);
    z.prevY = z.y; z.y += z.vy * dt;
    land(z);
    if (z.stomping && z.onGround) { z.stomping = false; bossStomp(z); }
    // King Roo shakes the ground when it lands from a big hop.
    if (body === 'roo' && z.T.boss && z.onGround && z.wasAir) { z.stompCd -= 1; if (z.stompCd <= 0) { bossStomp(z); z.stompCd = 3; } }
    z.wasAir = !z.onGround;
    z.walkT += dt * (Math.abs(z.vx) / 12 + 0.6);
    zombieGroan(z, dt);
  }
  // Push zombies apart a little so they look like a crowd instead of one blob.
  for (let i = 0; i < zs.length; i++) {
    const a = zs[i]; if (a.dead || a.T.fly) continue;
    for (let j = i + 1; j < zs.length; j++) {
      const b = zs[j]; if (b.dead || b.T.fly || Math.abs(a.y - b.y) > 30) continue;
      const d = b.x - a.x, min = (a.w + b.w) * 0.35;
      if (Math.abs(d) < min) {
        const push = (min - Math.abs(d)) * 0.5 * (d >= 0 ? 1 : -1), tot = a.mass + b.mass;
        a.x -= push * (b.mass / tot); b.x += push * (a.mass / tot);
      }
    }
  }
  for (let i = zs.length - 1; i >= 0; i--) if (zs[i].dead && zs[i].deadT > 1.7) zs.splice(i, 1);
  if (G.boss && G.boss.dead && !zs.includes(G.boss)) G.boss = null;
}
// Moan now and then (only the ones near the screen, so it doesn't turn into mush).
function zombieGroan(z, dt) {
  z.groanT -= dt;
  if (z.groanT > 0) return;
  z.groanT = z.type === 'brute' || z.T.boss ? rand(3.5, 7) : rand(3, 8);
  if (z.x > G.camX - 250 && z.x < G.camX + W + 250) Sound.zombie(z, 'groan');
}
// Sheep: stop and paw the ground (pose 1), then charge straight ahead (pose 2). It can't turn while charging!
function sheepCharge(z, target, adx, dir, dt) {
  z.chargeCd -= dt;
  if (z.windT > 0) {
    z.windT -= dt; z.vx = 0; z.pose = 1;
    if (z.windT <= 0) { z.chargeT = z.T.boss ? 1.7 : 1.25; z.pose = 2; Sound.zombie(z, 'screech'); }
    return;
  }
  if (z.chargeT > 0) {
    z.chargeT -= dt; z.pose = 2;
    z.vx = z.facing * (z.T.boss ? 430 : 340) * G.level.speed;
    if (Math.random() < dt * 18) dust(z.x - z.facing * z.w * 0.4, z.y, 1);
    if (z.chargeT <= 0 || z.x <= 14 || z.x >= G.level.worldW - 14) { z.chargeT = 0; z.pose = 0; z.chargeCd = rand(2.2, 3.6); }
    return;
  }
  z.pose = 0;
  if (z.onGround && z.chargeCd <= 0 && adx < 440 && adx > 60 && Math.abs(target.y - z.y) < 50) { z.windT = z.T.boss ? 0.7 : 0.55; z.facing = dir; }
}
// Kangaroos only move by hopping. Up on a platform? One huge jump.
function rooHop(z, target, adx, dir, sp, dt) {
  if (!z.onGround) { z.vx = z.hopV; return; }
  z.vx = 0; z.hopCd -= dt;
  if (z.hopCd > 0 || adx < 10) return;
  const up = target.y < z.y - 24 && adx < 240;
  z.vy = -(up ? z.jumpV : rand(380, 470) * (z.T.boss ? 1.15 : 1)); z.onGround = false;
  z.hopV = dir * sp * (up ? 1.1 : 1.9) * clamp(adx / 140, 0.25, 1);
  z.hopCd = z.T.boss ? rand(0.35, 0.6) : rand(0.08, 0.28);
  if (up || Math.random() < 0.15) Sound.zombie(z, 'screech');
}
// Crows: circle around above you, then dive down to peck (pose 2) and fly back up.
function updateFlyer(z, target, dt) {
  let gx, gy, fast = false;
  z.pose = 0;
  if (target) {
    const dx = target.x - z.x;
    z.swoopCd -= dt;
    if (z.swoopT > 0) {
      z.swoopT -= dt; z.pose = 2; fast = true;
      gx = target.x; gy = target.y - 34;
      if (z.swoopT <= 0) z.swoopCd = rand(1.4, 2.8);
    } else {
      const side = dx >= 0 ? -1 : 1;
      gx = target.x + side * 150 + Math.sin(G.t * 1.3 + z.phase) * 70;
      gy = Math.min(target.y, GROUND) - 150 + Math.sin(G.t * 2.1 + z.phase) * 28;
      if (z.swoopCd <= 0 && Math.abs(dx) < 340) { z.swoopT = 1.1; Sound.zombie(z, 'screech'); }
    }
    for (const p of G.players) {   // peck!
      if (p.dead) continue;
      if (Math.abs(p.x - z.x) < z.w / 2 + p.w / 2 && p.y - p.h < z.y && p.y > z.y - z.h && z.atkCd <= 0) {
        z.atkCd = z.atkRate; z.atkAnim = 0.35; Sound.zombie(z, 'attack'); hurtPlayer(p, z.dmg, p.x >= z.x ? 1 : -1);
        z.swoopT = 0; z.swoopCd = rand(1.4, 2.4); z.vy = -260;
      }
    }
  } else { gx = z.x + Math.sin(G.t * 0.7 + z.phase) * 120; gy = GROUND - 170; }
  const sp = z.speed * (fast ? 2 : 1);
  const wantX = clamp((gx - z.x) * 2.2, -sp, sp), wantY = clamp((gy - z.y) * 2.6, -sp, sp);
  const k = Math.min(1, dt * (fast ? 4 : 2.5));
  z.vx += (wantX - z.vx) * k; z.vy += (wantY - z.vy) * k;
  z.x = clamp(z.x + (z.vx + z.kbx) * dt, 10, G.level.worldW - 10);
  z.kbx *= Math.exp(-6 * dt);
  z.prevY = z.y; z.y = clamp(z.y + z.vy * dt, 60, GROUND - 2);
  if (Math.abs(z.vx) > 25) z.facing = z.vx > 0 ? 1 : -1;
  z.onGround = false;
  z.walkT += dt * 15;   // wing flaps
}

function bossStomp(z) {
  G.shake = Math.max(G.shake, 12);
  dust(z.x - 30, z.y, 8); dust(z.x + 30, z.y, 8);
  ring(z.x, z.y - 4, 230, '#c8f0a0', 0.45);
  Sound.play('stomp', z.x);
  if (Math.random() < 0.5) Sound.zombie(z, 'groan');
  for (const p of G.players) {
    if (!p.dead && p.onGround && Math.abs(p.x - z.x) < 240 && Math.abs(p.y - z.y) < 10) {
      hurtPlayer(p, 14, p.x >= z.x ? 1 : -1);
      p.vy = -520;
    }
  }
}

function hurtZombie(z, dmg, kx, ky, showNum = true, flash = true) {
  if (z.dead) return;
  if (z.frozen > 0) dmg *= FROZEN_HURT;   // frozen zombies take extra damage (js/grenades.js)
  z.hp -= dmg;
  if (flash) z.flash = 0.07;
  z.kbx += kx / z.mass;
  if (ky && !z.T.boss) z.vy += ky / z.mass;
  if (showNum) hitNum(z.uid, z.x, z.y - z.h - 8, dmg);   // js/fx.js: hits close together add up
  if (dmg >= 200) hitStop(0.06);
  if (z.hp <= 0) killZombie(z, kx);
  else Sound.zombie(z, 'hit');
}
function killZombie(z, kx) {
  z.dead = true; z.deadT = 0;
  z.kbx += Math.sign(kx || 1) * 120; z.vy = -180;
  G.run.kills++;
  z.chargeT = z.windT = 0; z.pose = 0;
  goo(z.x, z.y - z.h * 0.5, z.T.boss ? 60 : 14, Math.sign(kx || 1), z.T.boss ? 2 : 1);
  Sound.zombie(z, z.T.boss ? 'roar' : 'die');
  dropCoins(z.x, z.y - z.h * 0.5, randi(z.T.coins[0], z.T.coins[1]));
  if (Math.random() < z.T.heart) G.coins.push({ kind: 'heart', val: 25, x: z.x, y: z.y - z.h * 0.6, vx: rand(-80, 80), vy: -380, t: 0, spin: 0 });
  if (z.type === 'bloater') bloaterPop(z);
  if (z.T.boss) {
    G.shake = 20; flashAt(z.x, z.y - 60, 200); fireBurst(z.x, z.y - 60, 30, 1.4); hitStop(0.14);
    banner(`${(G.level.boss || 'Boss').toUpperCase()} IS DOWN!`, 'Grab all those coins!', 2.4, '#FFD23F');
    Sound.play('boom', z.x);
  }
}
// SPLAT! A bloater bursts and the goo hurts everything nearby (it can set off other bloaters too).
function bloaterPop(z) {
  const x = z.x, y = z.y - z.h * 0.5;
  goo(x, y, 30, 0, 1.6); ring(x, y, 110, '#c8f05a', 0.45); flashAt(x, y, 90);
  G.shake = Math.max(G.shake, 9);
  Sound.play('splat', x);
  for (const q of G.zombies) if (!q.dead && q !== z && Math.hypot(q.x - x, (q.y - q.h / 2) - y) < 110) hurtZombie(q, 55, (Math.sign(q.x - x) || 1) * 300, -200, true);
  for (const p of G.players) if (!p.dead && Math.hypot(p.x - x, (p.y - 32) - y) < 85) hurtPlayer(p, 12, Math.sign(p.x - x) || 1);
  blastBarrels(x, y, 110);   // and barrels (js/barrels.js)
}
// Spills coins out of a zombie. Bigger piles come out as some 5-coins.
function dropCoins(x, y, total) {
  while (total > 0) {
    const val = total >= 5 && Math.random() < 0.7 ? 5 : 1;
    total -= val;
    G.coins.push({ kind: 'coin', val, x, y, vx: rand(-160, 160), vy: rand(-420, -220), t: 0, spin: rand(6) });
  }
}

// ---- Drawing --------------------------------------------------------------
function zLeg(c, x, y, ang, pants, foot, bw) {
  c.save(); c.translate(x, y); c.rotate(ang);
  fillRR(c, -3.5 * bw, 0, 7 * bw, 21, 2.5, pants);
  fillRR(c, -3.5 * bw, 19, 7 * bw + 4, 5, 2, foot);
  c.restore();
}
function zArm(c, x, y, ang, skin, sleeve, bw) {
  c.save(); c.translate(x, y); c.rotate(ang);
  fillRR(c, -2, -3.5 * bw, 9, 7 * bw, 3, sleeve);
  fillRR(c, 5, -3 * bw, 18, 6 * bw, 3 * bw, skin);
  c.fillStyle = skin;
  c.fillRect(21, -3 * bw, 4.5, 1.6 * bw); c.fillRect(21, -0.7 * bw, 5, 1.6 * bw); c.fillRect(21, 1.5 * bw, 4, 1.4 * bw);
  c.restore();
}
function drawZombie(c, z) {
  if (z.T.body) { drawAnimal(c, z); return; }
  const s = z.h / 62, big = z.type === 'brute' || z.type === 'boss' || z.type === 'giant';
  const bw = big ? 1.4 : z.type === 'bloater' ? 1.5 : z.type === 'runner' ? 0.85 : z.type === 'tiny' ? 0.95 : 1;
  const fl = z.flash > 0;
  const skin = fl ? '#ffffff' : z.skin, dark = fl ? '#eeeeee' : z.dark, shirt = fl ? '#ffffff' : z.shirt, pants = fl ? '#eeeeee' : z.pants;
  c.save(); c.translate(z.x, z.y);
  if (z.dead) { c.rotate(-z.facing * Math.min(1, z.deadT * 3) * 1.45); c.globalAlpha = clamp((1.7 - z.deadT) / 0.6, 0, 1); }
  c.scale(z.facing * s, s);
  const walk = z.dead ? 0 : Math.sin(z.walkT);
  zLeg(c, -3 * bw, -26, walk * 0.45, pants, dark, bw);
  zLeg(c, 3 * bw, -26, -walk * 0.45, pants, dark, bw);
  c.save(); c.translate(0, -25);
  c.rotate((z.type === 'runner' ? 0.3 : z.type === 'leaper' ? 0.22 : 0.08) + Math.sin(G.t * 2 + z.phase) * 0.03);
  const atk = z.atkAnim > 0 ? Math.sin((1 - z.atkAnim / 0.35) * Math.PI) : 0;
  zArm(c, -1 * bw, -21, -0.04 + Math.sin(z.walkT + 1) * 0.08 - atk * 0.9, dark, shirt, bw);
  const tw = 9 * bw;
  poly(c, [-tw, -26, tw, -26, tw, -3, tw * 0.55, 1, tw * 0.15, -3, -tw * 0.25, 2, -tw * 0.6, -2, -tw, 1], shirt);
  poly(c, [tw * 0.05, -17, tw * 0.6, -13, tw * 0.15, -9], skin);
  c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(-tw, -26, tw * 0.5, 27);
  if (z.type === 'boss' || z.type === 'giant') for (let i = 0; i < 3; i++) poly(c, [-tw + 2, -24 + i * 8, -tw - 9, -30 + i * 8, -tw + 1, -18 + i * 8], z.type === 'boss' ? '#d8d0b8' : '#8a8a7a');
  if (z.type === 'bloater') {   // a big wobbly belly that glows when it's about to pop
    const wob = 1 + Math.sin(G.t * 6 + z.phase) * 0.05, belly = fl ? '#ffffff' : '#c8d86a';
    circle(c, 4, -11, 14 * wob, belly);
    c.fillStyle = fl ? '#eeeeee' : '#8a9a3a';
    for (const [bx, by, br] of [[-2, -16, 2.4], [8, -6, 2], [3, -19, 1.6], [10, -14, 1.8]]) circle(c, bx, by, br);
    if (!z.dead && z.hp < z.maxHp * 0.5) { c.globalAlpha = 0.3 + Math.sin(G.t * 14) * 0.2; circle(c, 4, -11, 17 * wob, '#e8ff7a'); c.globalAlpha = 1; }
  }
  // head
  c.save(); c.translate(3, -34); c.rotate(0.14 + Math.sin(G.t * 3 + z.phase) * 0.08);
  fillRR(c, -8, -9, 17, 18, 7, skin);
  c.fillStyle = dark; c.fillRect(-7, -9, 9, 4); c.fillRect(-8, -3, 3, 5);
  if (z.type === 'runner') poly(c, [-8, -7, -5, -14, -2, -8, 1, -15, 3, -8, 6, -13, 8, -6], '#2a2a2a');
  if (z.type === 'brute') { c.strokeStyle = '#2a1a1a'; c.lineWidth = 1; c.beginPath(); c.moveTo(-5, -6); c.lineTo(4, -8); for (let i = -4; i <= 3; i += 2.5) { c.moveTo(i, -9); c.lineTo(i + 0.5, -5); } c.stroke(); }
  if (!z.dead) {
    const ga = c.globalAlpha;
    c.globalAlpha = ga * 0.35; circle(c, 5, -2, 3.6, z.eye); circle(c, 0.5, -2.5, 3, z.eye);
    c.globalAlpha = ga; circle(c, 5, -2, 1.7, z.eye); circle(c, 0.5, -2.5, 1.3, z.eye);
  } else {
    c.strokeStyle = '#1a1a1a'; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(3.5, -3.5); c.lineTo(6.5, -0.5); c.moveTo(6.5, -3.5); c.lineTo(3.5, -0.5); c.stroke();
  }
  c.fillStyle = '#2a0f12'; c.fillRect(1, 3, 7, 3);
  c.fillStyle = '#e8e0c8'; c.fillRect(2, 3, 1.5, 1.5); c.fillRect(5, 3, 1.5, 1.5);
  c.restore();
  zArm(c, 2 * bw, -21, -0.06 + Math.sin(z.walkT) * 0.08 - atk * 1.15, skin, shirt, bw);
  c.restore();
  c.restore();
}
function drawZombieBars(c) {
  for (const z of G.zombies) {
    if (z.dead || z.T.boss || z.hp >= z.maxHp) continue;
    const w = z.w + 10, x = z.x - w / 2, y = z.y - z.h - 16;
    fillRR(c, x - 1, y - 1, w + 2, 6, 3, 'rgba(0,0,0,.55)');
    fillRR(c, x, y, w * clamp(z.hp / z.maxHp, 0, 1), 4, 2, '#ff5a5a');
  }
}

// ---- Zombie animals -------------------------------------------------------
// Each one is drawn facing right with its feet at (0, 0), at its normal size (BASE_H tall), then scaled.
const BASE_H = { dog: 30, sheep: 42, roo: 78, crow: 22, bear: 66 };
function zEye(c, x, y, r, col, dead) {
  if (dead) {
    c.strokeStyle = '#1a1a1a'; c.lineWidth = 1.1;
    c.beginPath(); c.moveTo(x - r, y - r); c.lineTo(x + r, y + r); c.moveTo(x + r, y - r); c.lineTo(x - r, y + r); c.stroke();
    return;
  }
  const ga = c.globalAlpha;
  c.globalAlpha = ga * 0.35; circle(c, x, y, r * 2.1, col);
  c.globalAlpha = ga; circle(c, x, y, r, col);
}
function ribs(c, x, y, n, h, col = 'rgba(40,20,20,0.55)') {
  c.strokeStyle = col; c.lineWidth = 1; c.beginPath();
  for (let i = 0; i < n; i++) { c.moveTo(x + i * 3, y); c.lineTo(x + i * 3 + 1, y + h); }
  c.stroke();
}
function drawAnimal(c, z) {
  const b = z.T.body, s = z.h / BASE_H[b], fl = z.flash > 0;
  const col = { fur: fl ? '#ffffff' : z.skin, dark: fl ? '#eeeeee' : z.dark, two: fl ? '#ffffff' : z.shirt, fl };
  c.save(); c.translate(z.x, z.y);
  if (z.dead) { c.rotate(-z.facing * Math.min(1, z.deadT * 3) * 1.45); c.globalAlpha = clamp((1.7 - z.deadT) / 0.6, 0, 1); }
  c.scale(z.facing * s, s);
  const atk = z.atkAnim > 0 ? Math.sin((1 - z.atkAnim / 0.35) * Math.PI) : 0;
  ({ dog: drawDog, sheep: drawSheep, roo: drawRoo, crow: drawCrow, bear: drawBear })[b](c, z, col, atk);
  c.restore();
}
function dogLeg(c, x, y, ang, color, len = 14) {
  c.save(); c.translate(x, y); c.rotate(ang);
  fillRR(c, -2.1, 0, 4.2, len, 2, color); fillRR(c, -2.2, len - 2, 6, 3, 1.5, color);
  c.restore();
}
function drawDog(c, z, k, atk) {
  const run = z.dead ? 0 : Math.sin(z.walkT * 1.4), air = !z.onGround && !z.dead;
  const wag = Math.sin(G.t * 10 + z.phase);
  c.strokeStyle = k.dark; c.lineWidth = 3; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-14, -19); c.quadraticCurveTo(-20, -23 + wag * 2, -25, -26 + wag * 3); c.stroke();   // tail
  dogLeg(c, -11, -15, air ? -0.95 : run * 0.65, k.dark);
  dogLeg(c, 10, -16, air ? 0.95 : -run * 0.65, k.dark);
  c.fillStyle = k.fur; c.beginPath(); c.ellipse(0, -19, 16, 7.5, -0.05, 0, Math.PI * 2); c.fill();
  c.fillStyle = k.dark; c.beginPath(); c.ellipse(-2, -24, 11, 2.5, -0.05, 0, Math.PI * 2); c.fill();   // fur along the back
  c.fillStyle = k.two; c.beginPath(); c.ellipse(-1, -17, 6.5, 4, 0, 0, Math.PI * 2); c.fill();          // rotten bare patch
  ribs(c, -5, -20, 3, 5);
  dogLeg(c, -8, -15, air ? -1.05 : -run * 0.65, k.fur);
  dogLeg(c, 12, -16, air ? 1.05 : run * 0.65, k.fur);
  c.save(); c.translate(15, -23); c.rotate(-0.12 + atk * 0.3 + (air ? 0.25 : 0) + Math.sin(G.t * 4 + z.phase) * 0.05);
  poly(c, [0, -4, 2, -12, 6, -5], k.dark);                       // ear
  fillRR(c, -3, -6, 12, 10, 4, k.fur);                           // head
  fillRR(c, 7, -3, 10, 5.5, 2.5, k.fur);                         // snout
  circle(c, 17, -1.6, 1.7, '#141414');                           // nose
  c.save(); c.translate(8, 2.5); c.rotate(0.12 + atk * 0.65);    // jaw opens to bite
  fillRR(c, 0, -1, 9, 3, 1.5, k.dark);
  c.fillStyle = '#e8e0c8'; c.fillRect(2, -2, 1.3, 1.8); c.fillRect(5, -2, 1.3, 1.8); c.fillRect(7.5, -2, 1.3, 1.8);
  c.restore();
  c.fillStyle = '#e8e0c8'; c.fillRect(10, 1.5, 1.3, 1.8); c.fillRect(13, 1.5, 1.3, 1.8);   // top teeth
  zEye(c, 6, -2.5, 1.5, z.eye, z.dead);
  c.restore();
}
function drawSheep(c, z, k, atk) {
  const walk = z.dead ? 0 : Math.sin(z.walkT * 1.2), wind = z.pose === 1, charge = z.pose === 2;
  const shake = wind ? Math.sin(G.t * 40) * 1.2 : 0, lean = charge ? 0.12 : wind ? -0.08 : 0;
  c.save(); c.rotate(lean); c.translate(shake, 0);
  const legC = k.fl ? '#eeeeee' : '#262420';
  for (const [x, ph, near] of [[-13, 0, 0], [8, 1, 0], [-9, 1, 1], [12, 0, 1]]) {
    const a = (ph ? walk : -walk) * (charge ? 0.8 : 0.45) + (wind && x > 0 ? Math.sin(G.t * 18) * 0.4 : 0);   // pawing the ground
    dogLeg(c, x, -15, a, near ? legC : '#18160f', 15);
  }
  const W1 = k.fur, W2 = k.fl ? '#ffffff' : shade(z.skin, -0.12);
  for (const [x, y, r] of [[-17, -19, 7], [-12, -26, 9], [-3, -30, 10], [7, -29, 10], [14, -23, 8], [-9, -17, 9], [1, -18, 10], [11, -17, 8]]) circle(c, x, y, r, W2);
  for (const [x, y, r] of [[-15, -21, 6], [-11, -27, 7.5], [-3, -31, 8.5], [7, -30, 8.5], [13, -25, 6.5], [-6, -21, 8], [4, -22, 8]]) circle(c, x, y, r, W1);
  if (!k.fl) { circle(c, -6, -20, 4, '#7fa865'); circle(c, 6, -33, 2.4, '#8a2a2a'); circle(c, -14, -27, 2, '#6a7a4a'); }   // rotten patches
  ribs(c, -9, -23, 3, 5);
  const hy = charge ? -16 : wind ? -21 : -26;
  c.save(); c.translate(19, hy); c.rotate(charge ? 0.85 : wind ? 0.4 : 0.22);
  const face = k.fl ? '#ffffff' : z.shirt;
  c.fillStyle = face; c.beginPath(); c.ellipse(2, 1, 5.8, 8.5, -0.5, 0, Math.PI * 2); c.fill();   // long face
  c.fillStyle = W1; circle(c, -2, -6, 4.2); circle(c, 2, -8, 3.6);                               // wool on top
  c.fillStyle = face; c.beginPath(); c.ellipse(-4, -2, 4.5, 1.8, 0.4, 0, Math.PI * 2); c.fill();   // ear
  c.lineCap = 'round';   // a curly horn (with a dark edge so it stands out)
  for (const [col, lw] of [['#6a5030', z.T.boss ? 3.4 : 3.4], [k.fl ? '#ffffff' : '#d8c08a', z.T.boss ? 2 : 2]]) {
    c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.arc(-1, -3, z.T.boss ? 6 : 5, -2.8, 1.5); c.stroke();
  }
  zEye(c, 3, -2, 1.4, z.eye, z.dead);
  c.fillStyle = '#1a0a0a'; c.fillRect(4, 6 - atk, 4, 1.5 + atk * 2);   // mouth
  c.restore();
  c.restore();
}
function drawRoo(c, z, k, atk) {
  const air = !z.onGround && !z.dead, sq = air ? 0 : 1;
  c.fillStyle = k.dark;   // big thick tail, resting on the ground
  c.beginPath(); c.moveTo(-5, -28); c.quadraticCurveTo(-24, -18 + (air ? -6 : 0), -42, air ? -10 : -2); c.lineTo(-38, air ? -6 : 2); c.quadraticCurveTo(-18, -8, -3, -16); c.closePath(); c.fill();
  const leg = (x, color) => {   // thigh, then a long foot (pointing down and back in a hop)
    c.fillStyle = color; c.beginPath(); c.ellipse(x - 2, -20 + sq * 2, 9, 13, -0.5, 0, Math.PI * 2); c.fill();
    c.save(); c.translate(x - 4, -8); c.rotate(air ? 0.9 : 0);
    fillRR(c, -3, -2, 6, 10, 3, color); fillRR(c, -2, 6, 22, 5, 2.5, color);
    c.restore();
  };
  leg(-1, k.dark);
  c.save(); c.translate(2, -42); c.rotate(air ? 0.45 : 0.25);   // body leaning forward
  c.fillStyle = k.fur; c.beginPath(); c.ellipse(0, 0, 11, 19, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = k.fl ? '#ffffff' : shade(z.skin, 0.18); c.beginPath(); c.ellipse(4, 3, 6, 13, 0, 0, Math.PI * 2); c.fill();   // belly
  if (!k.fl) { c.fillStyle = '#7fa865'; c.beginPath(); c.ellipse(-4, -4, 4, 6, 0.3, 0, Math.PI * 2); c.fill(); }
  ribs(c, -6, -7, 3, 6);
  c.restore();
  leg(3, k.fur);
  const glove = k.fl ? '#ffffff' : z.shirt;   // punch!
  for (const [ox, oy, ext] of [[0, 0, atk * 12], [4, 4, Math.max(0, atk - 0.3) * 10]]) {
    const sx = 10 + ox, sy = -54 + oy, gx = sx + 7 + ext, gy = sy + 7 - ext * 0.2;
    c.strokeStyle = k.fur; c.lineWidth = 3.5; c.lineCap = 'round'; c.beginPath(); c.moveTo(sx, sy); c.lineTo(gx, gy); c.stroke();
    circle(c, gx + 2, gy, 5, glove); c.fillStyle = k.fl ? '#ffffff' : '#f2f2f2'; c.fillRect(gx - 3, gy - 3, 2.2, 6);
  }
  c.save(); c.translate(9, -66); c.rotate(0.2 + Math.sin(G.t * 3 + z.phase) * 0.06);
  for (const ex of [-5, -1.5]) { c.fillStyle = ex < -2 ? k.dark : k.fur; c.beginPath(); c.ellipse(ex, -9, 2.6, 7.5, -0.35, 0, Math.PI * 2); c.fill(); }   // tall ears
  c.fillStyle = k.fur; c.beginPath(); c.ellipse(0, 0, 6.5, 6, 0, 0, Math.PI * 2); c.fill();
  fillRR(c, 3, -1, 10, 6, 3, k.fur);
  circle(c, 13, 0.5, 1.6, '#141414');
  c.fillStyle = '#1a0a0a'; c.fillRect(7, 4, 5, 1.4 + atk);
  zEye(c, 3, -1.5, 1.4, z.eye, z.dead);
  if (z.type === 'kingroo') poly(c, [-5, -6, -5, -13, -2, -9, 1, -14, 4, -9, 6, -13, 6, -6], '#ffd23f');   // a crown!
  c.restore();
}
function drawCrow(c, z, k, atk) {
  const flap = z.dead ? 0.5 : Math.sin(z.walkT), dive = z.pose === 2;
  c.translate(0, -11); c.rotate(dive ? 0.5 : z.dead ? 0 : -0.06);
  const wing = (dx, color, amp) => {
    c.save(); c.translate(dx, -2); c.rotate(-0.3 + flap * amp);
    poly(c, [0, 0, -4, -13, -12, -17, -17, -13, -14, -9, -19, -6, -9, 0], color);
    c.restore();
  };
  wing(3, k.dark, 0.8);
  poly(c, [-9, -1, -20, -5, -22, 0, -20, 4, -9, 3], k.fur);   // tail feathers
  c.fillStyle = k.fur; c.beginPath(); c.ellipse(0, 0, 11, 6.5, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = k.fl ? '#ffffff' : z.shirt; c.lineWidth = 1; c.beginPath();   // bare bones showing through
  c.moveTo(-6, 1); c.lineTo(5, 1); for (let x = -4; x <= 4; x += 3) { c.moveTo(x, 1); c.lineTo(x - 1, 4); }
  c.stroke();
  circle(c, 10, -3, 5.5, k.fur);
  poly(c, [14, -5, 22 + atk * 2, -2, 14, 0], k.fl ? '#ffffff' : '#7a7464');   // beak
  zEye(c, 12, -4.5, 1.3, z.eye, z.dead);
  c.strokeStyle = k.fl ? '#ffffff' : '#5a5448'; c.lineWidth = 1.2;
  c.beginPath(); c.moveTo(-1, 5); c.lineTo(-3, 9); c.moveTo(2, 5); c.lineTo(1, 9); c.stroke();   // dangling feet
  wing(1, k.fur, 1);
}
function drawBear(c, z, k, atk) {
  const walk = z.dead ? 0 : Math.sin(z.walkT * 0.9), rear = z.dead ? 0 : Math.max(atk, !z.onGround ? 0.6 : 0);
  c.save(); c.translate(-24, 0); c.rotate(-rear * 0.5); c.translate(24, 0);   // rears up on its back legs
  const leg = (x, a, color) => { c.save(); c.translate(x, -24); c.rotate(a); fillRR(c, -6, 0, 12, 25, 5, color); fillRR(c, -6, 20, 15, 6, 3, color); c.restore(); };
  leg(-24, walk * 0.4, k.dark); leg(18, -walk * 0.4 - rear * 0.8, k.dark);
  c.fillStyle = k.fur; c.beginPath(); c.ellipse(-2, -34, 32, 20, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(14, -44, 16, 12, -0.3, 0, Math.PI * 2); c.fill();   // shoulder hump
  if (!k.fl) {
    c.fillStyle = z.shirt; c.beginPath(); c.ellipse(-10, -30, 10, 7, 0.1, 0, Math.PI * 2); c.fill();   // rotten patch
    ribs(c, -16, -34, 4, 7);
    if (z.type === 'grizz') { c.strokeStyle = '#2a1a14'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -46); c.lineTo(10, -30); c.moveTo(5, -48); c.lineTo(15, -32); c.stroke(); }   // claw scars
  }
  leg(-18, -walk * 0.4, k.fur); leg(24, walk * 0.4 - rear * 1.2, k.fur);
  if (rear > 0.2) {   // a swiping paw full of claws
    c.save(); c.translate(32, -20 - rear * 6); c.rotate(-0.6 + atk * 1.4);
    fillRR(c, -5, -5, 12, 11, 5, k.fur);
    c.strokeStyle = k.fl ? '#ffffff' : '#efe6d0'; c.lineWidth = 1.6; c.beginPath();
    for (let i = -3; i <= 3; i += 3) { c.moveTo(7, i); c.lineTo(12, i + 1.5); }
    c.stroke(); c.restore();
  }
  c.save(); c.translate(32, -42); c.rotate(-0.08 + rear * 0.25 + Math.sin(G.t * 2.4 + z.phase) * 0.04);
  circle(c, -7, -11, 4.6, k.dark); circle(c, 3, -12, 4.6, k.fur);   // round ears
  circle(c, 0, 0, 13, k.fur);
  fillRR(c, 7, -3, 13, 10, 5, k.fl ? '#ffffff' : shade(z.skin, 0.2));
  circle(c, 19, -1, 2.4, '#141414');
  c.fillStyle = '#1a0a0a'; c.fillRect(8, 5, 11, 2 + atk * 4);   // roaring mouth
  c.fillStyle = '#efe6d0'; c.fillRect(9, 5, 1.6, 2.2); c.fillRect(16, 5, 1.6, 2.2);
  zEye(c, 6, -4, 1.8, z.eye, z.dead);
  c.restore();
  c.restore();
}
