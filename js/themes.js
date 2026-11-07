'use strict';
// Background art for the animal maps: the farm, the outback and the zoo.
// (The older maps are drawn in levels.js. These hook into the same functions:
//  bgData -> bg(), drawBackdrop -> backdrop(), drawWorldBack -> back(), drawWorldFront -> fog + front().)
//
// bg(bg, L, r)        work out where things go once (r = a random number maker that gives the same map every time)
// backdrop(c, L, camX, bg)   sky and far-away scenery, in screen space
// back(c, L, camX, bg, x0, x1, vis)   things just behind the players, in world space, plus the ground
// front(c, L, camX)   effects in front of everything (floating seeds, fireflies...)

// ---- little drawing helpers ----------------------------------------------
function cloudPuff(c, x, y, s) {
  c.fillStyle = 'rgba(255,255,255,0.92)';
  circle(c, x, y, 20 * s); circle(c, x + 24 * s, y - 9 * s, 27 * s); circle(c, x + 54 * s, y - 2 * s, 22 * s); circle(c, x + 76 * s, y + 4 * s, 14 * s);
  c.fillRect(x, y, 76 * s, 18 * s);
  c.fillStyle = 'rgba(200,220,240,0.5)'; c.fillRect(x - 4 * s, y + 12 * s, 84 * s, 6 * s);
}
function farmBarn(c, x, base, s = 1) {   // a red barn with a white X on the doors
  const w = 110 * s, h = 64 * s;
  c.fillStyle = '#a8382a'; c.fillRect(x, base - h, w, h);
  poly(c, [x - 6 * s, base - h, x + 16 * s, base - h - 30 * s, x + w / 2, base - h - 48 * s, x + w - 16 * s, base - h - 30 * s, x + w + 6 * s, base - h], '#5e2620');
  c.fillStyle = '#efe6d6'; c.fillRect(x + w * 0.3, base - h * 0.62, w * 0.4, h * 0.62);
  c.strokeStyle = '#a8382a'; c.lineWidth = 3 * s; c.beginPath();
  c.moveTo(x + w * 0.3, base - h * 0.62); c.lineTo(x + w * 0.7, base); c.moveTo(x + w * 0.7, base - h * 0.62); c.lineTo(x + w * 0.3, base); c.stroke();
  c.fillStyle = '#3a1a14'; c.fillRect(x + w * 0.42, base - h - 26 * s, w * 0.16, 16 * s);
}
function farmHouse(c, x, base, s = 1) {
  const w = 96 * s, h = 52 * s;
  c.fillStyle = '#e6dccb'; c.fillRect(x, base - h, w, h);
  poly(c, [x - 8 * s, base - h, x + w / 2, base - h - 34 * s, x + w + 8 * s, base - h], '#4e4258');
  c.fillStyle = '#6a7a9a'; for (const wx of [0.16, 0.42, 0.7]) c.fillRect(x + w * wx, base - h + 12 * s, 14 * s, 14 * s);
  c.fillStyle = '#8a6a4a'; c.fillRect(x - 4 * s, base - 16 * s, w + 8 * s, 4 * s);
}
function windmill(c, x, base, s = 1, col = '#8a8f96') {   // a farm windpump, spinning
  c.strokeStyle = col; c.lineWidth = 2.5 * s;
  c.beginPath(); c.moveTo(x - 14 * s, base); c.lineTo(x - 2 * s, base - 120 * s); c.moveTo(x + 14 * s, base); c.lineTo(x + 2 * s, base - 120 * s);
  for (let k = 1; k < 5; k++) { const y = base - k * 24 * s, hw = 14 * s * (1 - k / 5.5); c.moveTo(x - hw, y); c.lineTo(x + hw, y + 24 * s); c.moveTo(x + hw, y); c.lineTo(x - hw, y + 24 * s); }
  c.stroke();
  const hx = x, hy = base - 124 * s, a0 = G.t * 1.6;
  poly(c, [hx, hy - 3 * s, hx - 30 * s, hy - 8 * s, hx - 30 * s, hy + 6 * s, hx, hy + 3 * s], col);   // tail vane
  c.fillStyle = '#c8ccd2';
  for (let i = 0; i < 12; i++) {
    const a = a0 + i * Math.PI / 6, ca = Math.cos(a), sa = Math.sin(a);
    poly(c, [hx + ca * 4 * s, hy + sa * 4 * s, hx + Math.cos(a - 0.12) * 26 * s, hy + Math.sin(a - 0.12) * 26 * s, hx + Math.cos(a + 0.12) * 26 * s, hy + Math.sin(a + 0.12) * 26 * s]);
  }
  circle(c, hx, hy, 4 * s, '#5a5e64');
}
function sunflower(c, x, h, sway) {
  const tx = x + sway * 4, ty = GROUND - h;
  c.strokeStyle = '#3f7a2a'; c.lineWidth = 3; c.beginPath(); c.moveTo(x, GROUND); c.quadraticCurveTo(x, GROUND - h * 0.5, tx, ty); c.stroke();
  poly(c, [x, GROUND - h * 0.4, x + 12, GROUND - h * 0.5, x + 2, GROUND - h * 0.33], '#4f8a32');
  c.fillStyle = '#f6c31a';
  for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5; c.beginPath(); c.ellipse(tx + Math.cos(a) * 9, ty + Math.sin(a) * 9, 5, 2.6, a, 0, Math.PI * 2); c.fill(); }
  circle(c, tx, ty, 6.5, '#5a3a1a');
}
function hayRoll(c, x, r) {
  circle(c, x, GROUND - r, r, '#d6b45a');
  c.strokeStyle = '#b08e3a'; c.lineWidth = 1.5; c.beginPath();
  for (let k = r - 5; k > 3; k -= 6) { c.moveTo(x + k, GROUND - r); c.arc(x, GROUND - r, k, 0, Math.PI * 1.7); }
  c.stroke();
}
function scarecrow(c, x) {
  c.fillStyle = '#6a4a2a'; c.fillRect(x - 2, GROUND - 92, 4, 92); c.fillRect(x - 30, GROUND - 72, 60, 4);
  poly(c, [x - 16, GROUND - 76, x + 16, GROUND - 76, x + 12, GROUND - 40, x - 12, GROUND - 40], '#8a4a3a');   // shirt
  c.fillStyle = '#d6b45a'; for (const s of [-1, 1]) poly(c, [x + s * 30, GROUND - 74, x + s * 38, GROUND - 66, x + s * 30, GROUND - 68]);   // straw hands
  circle(c, x, GROUND - 86, 9, '#e0c890');
  poly(c, [x - 15, GROUND - 92, x + 15, GROUND - 92, x + 7, GROUND - 98, x + 5, GROUND - 108, x - 5, GROUND - 108, x - 7, GROUND - 98], '#5a3a22');   // hat
  c.fillStyle = '#1a1a1a'; c.fillRect(x - 4, GROUND - 88, 2, 2); c.fillRect(x + 2, GROUND - 88, 2, 2); c.fillRect(x - 3, GROUND - 82, 6, 1.5);
}
function gumTree(c, x, base, h, trunk, leaf) {   // a gum tree: pale twisty trunk and clumps of leaves
  c.strokeStyle = trunk; c.lineCap = 'round';
  c.lineWidth = h * 0.07; c.beginPath(); c.moveTo(x, base); c.quadraticCurveTo(x - h * 0.08, base - h * 0.5, x + h * 0.05, base - h * 0.75); c.stroke();
  c.lineWidth = h * 0.035; c.beginPath(); c.moveTo(x - h * 0.03, base - h * 0.5); c.quadraticCurveTo(x - h * 0.22, base - h * 0.7, x - h * 0.3, base - h * 0.82);
  c.moveTo(x + h * 0.03, base - h * 0.62); c.quadraticCurveTo(x + h * 0.22, base - h * 0.75, x + h * 0.3, base - h * 0.9); c.stroke();
  c.fillStyle = leaf;
  for (const [dx, dy, r] of [[-0.3, -0.86, 0.14], [0.3, -0.93, 0.15], [0.04, -0.98, 0.17], [-0.12, -0.8, 0.12], [0.18, -0.78, 0.11]]) {
    c.beginPath(); c.ellipse(x + dx * h, base + dy * h, r * h * 1.4, r * h * 0.8, 0, 0, Math.PI * 2); c.fill();
  }
}
function termiteMound(c, x, h, col = '#b45a30') {
  poly(c, [x - h * 0.3, GROUND, x - h * 0.16, GROUND - h * 0.6, x - h * 0.05, GROUND - h, x + h * 0.08, GROUND - h * 0.8, x + h * 0.14, GROUND - h * 0.5, x + h * 0.32, GROUND], col);
  c.fillStyle = 'rgba(0,0,0,0.15)'; poly(c, [x + h * 0.02, GROUND - h * 0.85, x + h * 0.14, GROUND - h * 0.5, x + h * 0.32, GROUND, x + h * 0.06, GROUND]);
}
function roadSign(c, x, label) {   // a yellow diamond warning sign with an animal on it
  c.fillStyle = '#6a6a6a'; c.fillRect(x - 2, GROUND - 74, 4, 74);
  poly(c, [x, GROUND - 112, x + 22, GROUND - 90, x, GROUND - 68, x - 22, GROUND - 90], '#1a1a1a');
  poly(c, [x, GROUND - 109, x + 19, GROUND - 90, x, GROUND - 71, x - 19, GROUND - 90], '#f2c21a');
  c.fillStyle = '#1a1a1a';   // a little kangaroo
  c.beginPath(); c.ellipse(x - 1, GROUND - 89, 4, 7, 0.4, 0, Math.PI * 2); c.fill();
  circle(c, x + 4, GROUND - 97, 2.6); c.fillRect(x - 8, GROUND - 82, 14, 2); poly(c, [x - 4, GROUND - 87, x - 14, GROUND - 80, x - 12, GROUND - 79]);
  if (label) text(c, label, x, GROUND - 60, { size: 7, color: '#1a1a1a' });
}
function palm(c, x, base, h, col) {
  c.strokeStyle = col; c.lineWidth = h * 0.05; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x, base); c.quadraticCurveTo(x + h * 0.15, base - h * 0.5, x + h * 0.06, base - h); c.stroke();
  c.fillStyle = col;
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.55, tx = x + h * 0.06, ty = base - h;
    c.beginPath(); c.moveTo(tx, ty);
    c.quadraticCurveTo(tx + Math.cos(a) * h * 0.3, ty + Math.sin(a) * h * 0.18 - h * 0.08, tx + Math.cos(a) * h * 0.42, ty + Math.sin(a) * h * 0.25 + h * 0.12);
    c.quadraticCurveTo(tx + Math.cos(a) * h * 0.25, ty + Math.sin(a) * h * 0.1, tx, ty + 3); c.fill();
  }
}
function zooSign(c, x, words) {
  c.fillStyle = '#4a3a2a'; c.fillRect(x - 3, GROUND - 96, 6, 96);
  words.forEach((wd, i) => {
    const y = GROUND - 92 + i * 18, dir = i % 2 ? -1 : 1;
    poly(c, [x, y, x + dir * 50, y, x + dir * 58, y + 7, x + dir * 50, y + 14, x, y + 14], ['#2a6a4a', '#8a5a2a', '#2a4a7a'][i % 3]);
    text(c, wd, x + dir * 27, y + 7.5, { size: 8, color: '#f4f0e0' });
  });
}

// ---- the themes -----------------------------------------------------------
const THEMES = {
  // ZOMBIE FARM: a sunny morning in the country. The farm animals have turned!
  farm: {
    fog: [255, 240, 200, 0.07],
    bg(bg, L, r) {
      bg.clouds = Array.from({ length: 7 }, () => ({ x: r() * (W + 400) - 200, y: 40 + r() * 140, s: 0.6 + r() * 0.8 }));
      bg.farms = []; for (let x = 60; x < L.worldW * 0.18 + W + 300; x += 460 + r() * 320) bg.farms.push({ x, barn: r() < 0.55, mill: r() < 0.6 });
      bg.bales = []; for (let x = 200; x < L.worldW - 120; x += 280 + r() * 300) bg.bales.push({ x, r: 18 + r() * 10 });
      bg.flowers = []; for (let x = 80; x < L.worldW - 60; x += 46 + r() * 70) if (r() < 0.55) bg.flowers.push({ x, h: 46 + r() * 34 });
      bg.scare = [620, 1800, 2950].filter(x => x < L.worldW - 80);
    },
    backdrop(c, L, camX, bg) {
      const g = c.createLinearGradient(0, 0, 0, GROUND);
      g.addColorStop(0, '#3f8fd8'); g.addColorStop(0.55, '#9fd0ef'); g.addColorStop(1, '#f6e7b5');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      const sx = 790 - camX * 0.02; glow(c, sx, 92, 200, '255,244,190', 0.6); circle(c, sx, 92, 42, '#fff7cf');
      for (const cl of bg.clouds) cloudPuff(c, ((cl.x - camX * 0.04 + G.t * 7 * cl.s) % (W + 400) + W + 400) % (W + 400) - 200, cl.y, cl.s);
      ridge(c, camX, 0.05, 350, 28, 0.006, '#8cc483', 1);
      ridge(c, camX, 0.1, 382, 18, 0.011, '#6dae66', 3);
      for (const f of bg.farms) {
        const x = f.x - camX * 0.18; if (x < -300 || x > W + 300) continue;
        if (f.barn) farmBarn(c, x, GROUND - 46, 0.8); else farmHouse(c, x, GROUND - 46, 0.8);
        if (f.mill) windmill(c, x + 140, GROUND - 46, 0.75);
      }
      ridge(c, camX, 0.25, 424, 5, 0.02, '#5a9a4f', 5);
      const off = camX * 0.42;   // a field of corn
      c.fillStyle = '#5f8a32'; c.fillRect(0, GROUND - 50, W, 50);
      for (let x = -(off % 11) - 11; x < W + 11; x += 11) {
        const k = hash(Math.floor((x + off) / 11)), h = 40 + k * 22, sw = Math.sin(G.t * 1.5 + (x + off) * 0.02) * 2;
        c.strokeStyle = k > 0.5 ? '#6f9a3a' : '#5a8530'; c.lineWidth = 2.2;
        c.beginPath(); c.moveTo(x, GROUND - 8); c.lineTo(x + sw, GROUND - 8 - h); c.stroke();
        poly(c, [x + sw * 0.5, GROUND - 8 - h * 0.55, x + 9, GROUND - 8 - h * 0.7, x + 1, GROUND - 8 - h * 0.48], '#7aa844');
        circle(c, x + sw, GROUND - 10 - h, 2.2, '#e4c450');
      }
    },
    back(c, L, camX, bg, x0, x1, vis) {
      c.fillStyle = '#5f9a45'; c.fillRect(x0, GROUND - 14, x1 - x0, 14);
      c.fillStyle = '#79b456'; for (let gx = Math.floor(x0 / 8) * 8; gx < x1; gx += 8) { const h = 3 + hash(gx) * 6; c.fillRect(gx, GROUND - 14 - h, 2, h); }
      c.fillStyle = '#8a6a48';   // a wooden fence all the way along
      for (let px = Math.floor(x0 / 70) * 70; px < x1 + 70; px += 70) c.fillRect(px, GROUND - 58, 5, 50);
      c.fillRect(x0, GROUND - 52, x1 - x0, 4); c.fillRect(x0, GROUND - 32, x1 - x0, 4);
      for (const f of bg.flowers) if (vis(f.x)) sunflower(c, f.x, f.h, Math.sin(G.t * 1.2 + f.x));
      for (const b of bg.bales) if (vis(b.x)) hayRoll(c, b.x, b.r);
      for (const s of bg.scare) if (vis(s)) scarecrow(c, s);
      c.fillStyle = '#8a6a44'; c.fillRect(x0, GROUND, x1 - x0, 14);   // dirt track
      c.fillStyle = '#a8845a'; c.fillRect(x0, GROUND, x1 - x0, 2);
      c.fillStyle = '#6a5034'; c.fillRect(x0, GROUND + 14, x1 - x0, H - GROUND);
      c.fillStyle = '#5a4228'; c.fillRect(x0, GROUND + 30, x1 - x0, 3); c.fillRect(x0, GROUND + 52, x1 - x0, 3);   // tractor ruts
      c.fillStyle = '#9a8060'; for (let sx = Math.floor(x0 / 40) * 40; sx < x1; sx += 40) if (hash(sx) > 0.6) circle(c, sx + hash(sx * 3) * 20, GROUND + 20 + hash(sx * 7) * 50, 2.5);
    },
    front(c, L, camX) {   // dandelion fluff drifting by
      c.fillStyle = 'rgba(255,255,255,0.8)';
      for (let i = 0; i < 26; i++) {
        const span = W + 60, x = camX + ((((hash(i) * span + G.t * (16 + hash(i + 3) * 18)) % span) + span) % span) - 30;
        const y = 120 + hash(i + 7) * 320 + Math.sin(G.t * 0.9 + i) * 16;
        circle(c, x, y, 1.2 + hash(i + 1) * 1.2);
      }
    },
  },

  // THE OUTBACK: red dirt, gum trees and a blazing sun. Kangaroo country!
  outback: {
    fog: [255, 170, 110, 0.12],
    bg(bg, L, r) {
      bg.hills = []; for (let x = -100; x < L.worldW * 0.1 + W + 300; x += 260 + r() * 260) bg.hills.push({ x, w: 160 + r() * 200, h: 30 + r() * 50 });
      bg.farGums = []; for (let x = -40; x < L.worldW * 0.3 + W + 100; x += 90 + r() * 160) bg.farGums.push({ x, h: 50 + r() * 40 });
      bg.gums = []; for (let x = 160; x < L.worldW - 160; x += 420 + r() * 380) bg.gums.push({ x, h: 120 + r() * 60 });
      bg.mounds = []; for (let x = 300; x < L.worldW - 100; x += 300 + r() * 420) bg.mounds.push({ x, h: 34 + r() * 30 });
      bg.pumps = [900, 2400].filter(x => x < L.worldW - 100);
      bg.signs = [480, 1650, 2800].filter(x => x < L.worldW - 80);
    },
    backdrop(c, L, camX, bg) {
      const g = c.createLinearGradient(0, 0, 0, GROUND);
      g.addColorStop(0, '#2f7fd0'); g.addColorStop(0.5, '#8fc4e8'); g.addColorStop(1, '#f4d6a0');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      const sx = 220 - camX * 0.02; glow(c, sx, 74, 220, '255,250,210', 0.7); circle(c, sx, 74, 36, '#fffbe6');
      const rx = 640 - camX * 0.04, rb = GROUND - 44;   // a giant red rock far away
      c.fillStyle = '#b4502e'; c.beginPath(); c.moveTo(rx - 200, rb); c.quadraticCurveTo(rx - 190, rb - 90, rx - 120, rb - 96); c.lineTo(rx + 110, rb - 100); c.quadraticCurveTo(rx + 190, rb - 92, rx + 210, rb); c.closePath(); c.fill();
      c.strokeStyle = '#94402a'; c.lineWidth = 3; c.beginPath();
      for (let k = -150; k <= 150; k += 38) { c.moveTo(rx + k, rb - 94); c.quadraticCurveTo(rx + k + 6, rb - 50, rx + k - 4, rb); }
      c.stroke();
      for (const h of bg.hills) { const x = h.x - camX * 0.1; if (x > W + 300 || x + h.w < -300) continue; poly(c, [x, GROUND - 30, x + 20, GROUND - 30 - h.h, x + h.w - 20, GROUND - 30 - h.h, x + h.w, GROUND - 30], '#a24c2c'); }
      ridge(c, camX, 0.14, 432, 6, 0.02, '#b85a32', 2);
      for (const t of bg.farGums) { const x = t.x - camX * 0.3; if (x > -60 && x < W + 60) gumTree(c, x, GROUND - 18, t.h, '#8a7a6a', '#6a7a4a'); }
      ridge(c, camX, 0.3, 452, 3, 0.03, '#c4663a', 6);
    },
    back(c, L, camX, bg, x0, x1, vis) {
      for (const t of bg.gums) if (vis(t.x, 140)) gumTree(c, t.x, GROUND, t.h, '#e8e0d4', '#7a8a52');
      for (const p of bg.pumps) if (vis(p, 160)) windmill(c, p, GROUND, 1, '#6a6a70');
      for (const m of bg.mounds) if (vis(m.x)) termiteMound(c, m.x, m.h);
      for (const s of bg.signs) if (vis(s)) roadSign(c, s, 'NEXT 20 KM');
      for (let gx = Math.floor(x0 / 46) * 46; gx < x1; gx += 46) {   // spiky spinifex grass
        if (hash(gx) < 0.45) continue;
        const hx = gx + hash(gx * 2) * 20; c.strokeStyle = '#c8b25a'; c.lineWidth = 1.4; c.beginPath();
        for (let k = -4; k <= 4; k++) { c.moveTo(hx, GROUND); c.lineTo(hx + k * 3, GROUND - 10 - hash(gx + k) * 10); }
        c.stroke();
      }
      c.fillStyle = '#c0602e'; c.fillRect(x0, GROUND, x1 - x0, 12);
      c.fillStyle = '#d87a42'; c.fillRect(x0, GROUND, x1 - x0, 2);
      c.fillStyle = '#8e4022'; c.fillRect(x0, GROUND + 12, x1 - x0, H - GROUND);
      c.fillStyle = '#a85030'; for (let sx = Math.floor(x0 / 30) * 30; sx < x1; sx += 30) if (hash(sx) > 0.5) { rr(c, sx + hash(sx * 3) * 16, GROUND + 22 + hash(sx * 5) * 48, 8, 4, 2); c.fill(); }
      c.fillStyle = '#e8d8c0'; for (let bx = Math.floor(x0 / 400) * 400; bx < x1; bx += 400) if (hash(bx) > 0.5) { c.fillRect(bx + 100, GROUND + 30, 14, 3); circle(c, bx + 100, GROUND + 31, 3); circle(c, bx + 114, GROUND + 31, 3); }   // old bones
    },
    front(c, L, camX) {   // hot dusty air
      c.fillStyle = 'rgba(255,200,140,0.5)';
      for (let i = 0; i < 20; i++) {
        const span = W + 60, x = camX + ((((hash(i * 2) * span + G.t * (30 + hash(i + 4) * 40)) % span) + span) % span) - 30;
        circle(c, x, GROUND - 10 - hash(i + 9) * 120 + Math.sin(G.t * 2 + i) * 6, 1 + hash(i) * 1.5);
      }
    },
  },

  // ZOMBIE ZOO: the zoo at night. Every cage is open...
  zoo: {
    fog: [130, 170, 210, 0.12],
    bg(bg, L, r) {
      bg.palms = []; for (let x = -40; x < L.worldW * 0.15 + W + 200; x += 70 + r() * 120) bg.palms.push({ x, h: 80 + r() * 60 });
      bg.cages = []; for (let x = 0; x < L.worldW * 0.38 + W + 200; x += 340 + r() * 260) bg.cages.push({ x, w: 120 + r() * 80, h: 90 + r() * 40, dome: r() < 0.4 });
      bg.bushes = []; for (let x = 40; x < L.worldW - 40; x += 120 + r() * 160) bg.bushes.push({ x, w: 40 + r() * 40 });
      bg.signs = []; const words = [['BEARS', 'BIRDS', 'EXIT'], ['ROOS', 'SHEEP'], ['LIONS', 'CAFE', 'ZOO MAP']];
      for (let x = 420, i = 0; x < L.worldW - 100; x += 760, i++) bg.signs.push({ x, words: words[i % 3] });
    },
    backdrop(c, L, camX, bg) {
      const g = c.createLinearGradient(0, 0, 0, GROUND);
      g.addColorStop(0, '#081220'); g.addColorStop(0.6, '#142a3c'); g.addColorStop(1, '#2a4256');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      drawStars(c, 0.6);
      const mx = 760 - camX * 0.02; glow(c, mx, 96, 170, '220,235,255', 0.3); circle(c, mx, 96, 46, '#eef2f8'); circle(c, mx - 14, 88, 8, '#d8dee8'); circle(c, mx + 12, 106, 6, '#d8dee8');
      ridge(c, camX, 0.06, 392, 14, 0.01, '#0e2224', 1);
      for (const p of bg.palms) { const x = p.x - camX * 0.15; if (x > -90 && x < W + 90) palm(c, x, GROUND - 40, p.h, '#0c1c1e'); }
      const ax = 560 - camX * 0.15, ab = GROUND - 40;   // the zoo's front gate
      c.fillStyle = '#16262c'; c.fillRect(ax - 130, ab - 150, 26, 150); c.fillRect(ax + 104, ab - 150, 26, 150);
      c.strokeStyle = '#16262c'; c.lineWidth = 16; c.beginPath(); c.arc(ax, ab - 150, 117, Math.PI, 0); c.stroke();
      text(c, 'ZOO', ax, ab - 205, { size: 30, color: '#2c4450' });
      for (const k of bg.cages) {   // big cages and a bird dome
        const x = k.x - camX * 0.38; if (x > W + 220 || x + k.w < -220) continue;
        const top = GROUND - 22 - k.h;
        c.strokeStyle = '#1e343c'; c.lineWidth = 2; c.beginPath();
        if (k.dome) { c.arc(x + k.w / 2, GROUND - 22, k.w / 2, Math.PI, 0); for (let i = 1; i < 6; i++) { const bx = x + k.w * i / 6; c.moveTo(bx, GROUND - 22); c.lineTo(bx, GROUND - 22 - Math.sqrt(Math.max(0, (k.w / 2) ** 2 - (bx - x - k.w / 2) ** 2))); } }
        else { c.rect(x, top, k.w, k.h); for (let bx = x + 10; bx < x + k.w; bx += 10) { if (hash(bx) < 0.18) continue; c.moveTo(bx, top); c.lineTo(bx, GROUND - 22); } }   // some bars are bent away
        c.stroke();
      }
      ridge(c, camX, 0.42, 450, 4, 0.03, '#10201e', 4);
    },
    back(c, L, camX, bg, x0, x1, vis) {
      for (const b of bg.bushes) if (vis(b.x)) { c.fillStyle = '#1c3428'; circle(c, b.x, GROUND - 14, b.w * 0.45); circle(c, b.x + b.w * 0.4, GROUND - 10, b.w * 0.35); circle(c, b.x - b.w * 0.4, GROUND - 8, b.w * 0.3); }
      for (const s of bg.signs) if (vis(s.x, 120)) zooSign(c, s.x, s.words);
      for (let i = 0, x = 260; x < L.worldW; i++, x += 560) if (vis(x, 160)) drawLamp(c, x, i, '200,230,255');
      c.fillStyle = '#2a4a32'; c.fillRect(x0, GROUND - 4, x1 - x0, 6);
      c.fillStyle = '#56565e'; c.fillRect(x0, GROUND, x1 - x0, 16);   // the zoo path
      c.fillStyle = '#6a6a72'; c.fillRect(x0, GROUND, x1 - x0, 2);
      c.fillStyle = '#48484f'; for (let tx = Math.floor(x0 / 32) * 32; tx < x1; tx += 32) c.fillRect(tx, GROUND + 2, 1.5, 14);
      c.fillStyle = '#26262c'; c.fillRect(x0, GROUND + 16, x1 - x0, H - GROUND);
      c.fillStyle = '#3a3a42';   // paw prints everywhere...
      for (let px = Math.floor(x0 / 54) * 54; px < x1; px += 54) {
        if (hash(px) < 0.4) continue;
        const y = GROUND + 30 + hash(px * 3) * 40; circle(c, px, y, 3.5); circle(c, px - 4, y - 5, 1.5); circle(c, px, y - 6.5, 1.5); circle(c, px + 4, y - 5, 1.5);
      }
    },
    front(c, L, camX) {   // fireflies
      c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 16; i++) {
        const span = W + 60, x = camX + ((((hash(i * 5) * span + Math.sin(G.t * 0.4 + i) * 60) % span) + span) % span) - 30;
        const y = GROUND - 30 - hash(i + 2) * 200 + Math.sin(G.t * 1.3 + i * 2) * 14, a = 0.5 + Math.sin(G.t * 3 + i) * 0.5;
        glow(c, x, y, 7, '190,255,140', 0.5 * a); circle(c, x, y, 1.3, `rgba(220,255,180,${a})`);
      }
      c.globalCompositeOperation = 'source-over';
    },
  },
};

// ---- Platforms on the animal maps ------------------------------------------
Object.assign(PLATFORM_TOP, { haybales: 54, tractor: 88, barn: 132, coop: 72, ute: 60, watertank: 112, termite: 78, shack: 96, cage: 104, kiosk: 116, rockpile: 90, train: 66, statue: 124 });
Object.assign(PLATFORM_ART, {
  haybales(c, p) {   // square hay bales stacked up
    const x = p.x, w = p.w, t = p.top, rowH = (GROUND - t) / 2;
    for (let row = 0; row < 2; row++) {
      const y = t + row * rowH, inset = row === 0 ? 10 : 0, bw = (w - inset * 2) / (row === 0 ? 2 : 3);
      for (let k = 0; k < (row === 0 ? 2 : 3); k++) {
        const bx = x + inset + k * bw;
        fillRR(c, bx + 1, y, bw - 2, rowH - 1, 3, '#dcbc5e');
        c.fillStyle = '#c4a04a'; for (let sy = y + 5; sy < y + rowH - 3; sy += 5) c.fillRect(bx + 3, sy, bw - 6, 1);
        c.fillStyle = '#8a6a2a'; c.fillRect(bx + bw * 0.3, y, 2, rowH - 1); c.fillRect(bx + bw * 0.7, y, 2, rowH - 1);
      }
    }
    if (p.w > 0) { c.fillStyle = '#efd47a'; c.fillRect(x + 10, t, w - 20, 2); }
  },
  tractor(c, p) {   // a green tractor with a sun roof you can stand on
    const x = p.x, w = p.w, t = p.top;
    c.fillStyle = '#2a2a2a'; c.fillRect(x + 8, t + 6, 4, 36); c.fillRect(x + 56, t + 6, 4, 36);
    fillRR(c, x + 4, t + 40, w - 4, 26, 6, '#3a8a3a');
    fillRR(c, x + 60, t + 48, w - 56, 20, 5, '#4aa04a');
    c.fillStyle = '#2a2a2a'; c.fillRect(x + w - 30, t + 30, 5, 20);   // exhaust pipe
    circle(c, x + 30, GROUND - 24, 24, '#161616'); circle(c, x + 30, GROUND - 24, 11, '#e8c23a');
    circle(c, x + w - 18, GROUND - 13, 13, '#161616'); circle(c, x + w - 18, GROUND - 13, 6, '#e8c23a');
    c.fillStyle = '#7ab8d8'; c.globalAlpha = 0.5; c.fillRect(x + 14, t + 10, 40, 28); c.globalAlpha = 1;
    // a long flat roof, so you can stand on all of it
    fillRR(c, x - 4, t, w + 8, 7, 3, '#e8c23a');
  },
  barn(c, p) {   // a red barn with a flat hayloft roof
    const x = p.x, w = p.w, t = p.top;
    c.fillStyle = '#a8382a'; c.fillRect(x, t + 8, w, GROUND - t - 8);
    c.fillStyle = '#8e2e22'; for (let bx = x + 12; bx < x + w; bx += 12) c.fillRect(bx, t + 8, 2, GROUND - t - 8);
    fillRR(c, x - 8, t, w + 16, 10, 3, '#5e2620');
    c.fillStyle = '#efe6d6'; c.fillRect(x + w * 0.28, GROUND - 64, w * 0.44, 64); c.fillRect(x + w * 0.38, t + 22, w * 0.24, 26);
    c.strokeStyle = '#a8382a'; c.lineWidth = 4; c.beginPath();
    c.moveTo(x + w * 0.28, GROUND - 64); c.lineTo(x + w * 0.72, GROUND); c.moveTo(x + w * 0.72, GROUND - 64); c.lineTo(x + w * 0.28, GROUND); c.stroke();
    c.fillStyle = '#3a1a14'; c.fillRect(x + w * 0.41, t + 25, w * 0.18, 20);
    c.fillStyle = '#e4c450'; c.fillRect(x + w * 0.43, t + 37, w * 0.14, 8);   // hay in the loft
  },
  coop(c, p) {   // a chicken coop on legs
    const x = p.x, w = p.w, t = p.top;
    c.fillStyle = '#6a4a2a'; c.fillRect(x + 6, t + 40, 5, GROUND - t - 40); c.fillRect(x + w - 11, t + 40, 5, GROUND - t - 40);
    c.fillStyle = '#d8c8a8'; c.fillRect(x + 2, t + 6, w - 4, 36);
    c.fillStyle = '#c0b090'; for (let bx = x + 10; bx < x + w - 4; bx += 10) c.fillRect(bx, t + 6, 1.5, 36);
    fillRR(c, x - 6, t, w + 12, 8, 3, '#7a3a2a');
    fillRR(c, x + w * 0.4, t + 16, 16, 20, 7, '#3a2a1a');
    poly(c, [x + w * 0.4 + 6, t + 36, x + w * 0.4 + 30, GROUND, x + w * 0.4 + 40, GROUND, x + w * 0.4 + 14, t + 36], '#8a6a4a');   // little ramp
    c.fillStyle = '#f6f0e0'; c.beginPath(); c.ellipse(x + 20, GROUND - 6, 7, 5, 0, 0, Math.PI * 2); c.fill();   // a scared egg
  },
  ute(c, p) {   // an outback pickup truck with a roof rack
    const x = p.x, w = p.w, t = p.top, col = p.color || '#d8d4c8';
    c.fillStyle = '#3a3a3a'; for (const rx of [x + 6, x + w * 0.5, x + w - 10]) c.fillRect(rx, t + 4, 4, 12);
    fillRR(c, x - 4, t, w + 8, 6, 2, '#5a5a5a');
    fillRR(c, x + w * 0.52, t + 14, w * 0.42, 22, 6, col);
    c.fillStyle = '#2a3440'; c.fillRect(x + w * 0.56, t + 18, w * 0.3, 12);
    fillRR(c, x - 6, t + 34, w + 18, GROUND - t - 44, 6, col);
    c.fillStyle = '#c0602e'; c.fillRect(x - 6, GROUND - 24, w + 18, 6);   // red dust
    c.fillStyle = '#2a2a2a'; c.fillRect(x + w + 8, t + 38, 6, 16);   // roo bar
    for (const wx of [x + 20, x + w - 18]) { circle(c, wx, GROUND - 11, 12, '#121216'); circle(c, wx, GROUND - 11, 5, '#8a8a90'); }
  },
  watertank(c, p) {   // a round corrugated water tank on a stand
    const x = p.x, w = p.w, t = p.top, tankBot = t + 64;
    c.fillStyle = '#5a5a5e'; for (const lx of [x + 8, x + w - 12]) c.fillRect(lx, tankBot, 4, GROUND - tankBot);
    c.fillRect(x + 8, tankBot + 20, w - 16, 3);
    fillRR(c, x, t + 4, w, tankBot - t - 4, 6, '#a8b0b4');
    c.fillStyle = '#8a9296'; for (let bx = x + 6; bx < x + w - 2; bx += 6) c.fillRect(bx, t + 6, 2, tankBot - t - 8);
    poly(c, [x - 4, t + 6, x + w / 2, t - 2, x + w + 4, t + 6], '#7a8286');
    c.fillStyle = 'rgba(160,80,40,0.35)'; c.fillRect(x, tankBot - 14, w, 10);
  },
  termite(c, p) { termiteMound(c, p.x + p.w / 2, GROUND - p.top + 8, '#b85c32'); c.fillStyle = '#c86a3a'; rr(c, p.x + p.w * 0.2, p.top, p.w * 0.6, 8, 4); c.fill(); },
  shack(c, p) {   // a tin shack with a flat roof
    const x = p.x, w = p.w, t = p.top;
    c.fillStyle = '#9aa0a4'; c.fillRect(x + 4, t + 8, w - 8, GROUND - t - 8);
    c.fillStyle = '#80868a'; for (let bx = x + 8; bx < x + w - 4; bx += 7) c.fillRect(bx, t + 8, 2, GROUND - t - 8);
    c.fillStyle = 'rgba(170,80,40,0.45)'; c.fillRect(x + 4, t + 8, w * 0.3, 20); c.fillRect(x + w * 0.6, GROUND - 30, w * 0.36, 30);   // rust
    fillRR(c, x - 6, t, w + 12, 9, 2, '#6a7074');
    fillRR(c, x + w * 0.62, GROUND - 52, 24, 52, 2, '#5a4a3a');
    fillRR(c, x + 14, t + 24, 26, 18, 2, '#2a3440');
  },
  cage(c, p) {   // a zoo transport cage with its door hanging open
    const x = p.x, w = p.w, t = p.top;
    c.fillStyle = 'rgba(30,40,46,0.6)'; c.fillRect(x, t, w, GROUND - t);
    c.fillStyle = '#6a7a84'; c.fillRect(x, t, w, 7); c.fillRect(x, GROUND - 8, w, 8); c.fillRect(x, t, 6, GROUND - t); c.fillRect(x + w - 6, t, 6, GROUND - t);
    c.fillStyle = '#8a9aa4'; for (let bx = x + 14; bx < x + w - 10; bx += 12) c.fillRect(bx, t + 7, 3, GROUND - t - 15);
    c.save(); c.translate(x + w - 6, t + 10); c.rotate(0.9);   // the door is open...
    c.strokeStyle = '#8a9aa4'; c.lineWidth = 2.5; c.strokeRect(0, 0, 40, GROUND - t - 22); c.restore();
    text(c, 'DANGER', x + w / 2, t + 20, { size: 9, color: '#ffd23f' });
  },
  kiosk(c, p) {   // a snack kiosk with a striped roof
    const x = p.x, w = p.w, t = p.top;
    c.fillStyle = '#c8b898'; c.fillRect(x + 6, t + 24, w - 12, GROUND - t - 24);
    fillRR(c, x + 14, t + 34, w - 28, 26, 3, '#2a3440'); glow(c, x + w / 2, t + 46, 60, '255,220,150', 0.25);
    c.fillStyle = '#8a6a4a'; c.fillRect(x + 6, t + 60, w - 12, 6);
    for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#f4f0e0' : '#2a8a5a'; c.fillRect(x - 6 + i * (w + 12) / 8, t + 6, (w + 12) / 8 + 0.5, 16); }
    fillRR(c, x - 8, t, w + 16, 8, 3, '#1e6a44');
    text(c, 'SNACKS', x + w / 2, t + 76, { size: 9, color: '#5a3a22' });
  },
  rockpile(c, p) {   // big boulders from the bear enclosure
    const x = p.x, w = p.w, t = p.top;
    c.fillStyle = '#5a6066'; c.beginPath(); c.ellipse(x + w * 0.28, GROUND - 32, w * 0.3, 34, 0, Math.PI, 0); c.fill();
    c.fillStyle = '#6a7076'; c.beginPath(); c.ellipse(x + w * 0.7, GROUND - 26, w * 0.32, 30, 0, Math.PI, 0); c.fill();
    fillRR(c, x, t, w, GROUND - t - 30, 16, '#7a8086');
    c.fillStyle = '#8a9096'; c.fillRect(x + 12, t, w - 24, 3);
    c.fillStyle = '#4a5056'; c.fillRect(x + w * 0.3, t + 14, 18, 3); c.fillRect(x + w * 0.62, t + 30, 22, 3);
    c.fillStyle = '#2a4a32'; circle(c, x + 10, t + 4, 6); circle(c, x + w - 14, t + 6, 5);   // moss
  },
  train(c, p) {   // a zoo train carriage (with zebra stripes)
    const x = p.x, w = p.w, t = p.top;
    c.fillStyle = '#2a2a2a'; c.fillRect(x + 6, t + 6, 4, 18); c.fillRect(x + w - 10, t + 6, 4, 18);
    fillRR(c, x - 4, t, w + 8, 7, 3, '#c83a3a');
    fillRR(c, x, t + 24, w, GROUND - t - 36, 5, '#f2ecd8');
    c.fillStyle = '#1a1a1a'; for (let bx = x + 8; bx < x + w - 6; bx += 16) poly(c, [bx, t + 24, bx + 6, t + 24, bx + 10, GROUND - 12, bx + 4, GROUND - 12]);
    for (const wx of [x + 16, x + w - 16]) { circle(c, wx, GROUND - 10, 10, '#161616'); circle(c, wx, GROUND - 10, 4, '#c83a3a'); }
  },
  statue(c, p) {   // an elephant statue on a stone block (stand on its back!)
    const x = p.x, w = p.w, t = p.top;
    fillRR(c, x - 10, GROUND - 36, w + 20, 36, 3, '#6a6a72');
    text(c, 'ELLIE', x + w / 2, GROUND - 18, { size: 10, color: '#3a3a42' });
    const ex = x + w / 2, by = GROUND - 36;
    c.fillStyle = '#8a8e96';
    for (const lx of [-w * 0.32, -w * 0.12, w * 0.12, w * 0.3]) c.fillRect(ex + lx - 7, t + 30, 14, by - t - 30);
    c.beginPath(); c.ellipse(ex, t + 30, w * 0.5, 30, 0, Math.PI, Math.PI * 2); c.fill();
    c.fillRect(ex - w * 0.5, t + 28, w, 12);
    circle(c, ex + w * 0.5, t + 30, 20);
    c.strokeStyle = '#8a8e96'; c.lineWidth = 9; c.lineCap = 'round'; c.beginPath(); c.moveTo(ex + w * 0.62, t + 38); c.quadraticCurveTo(ex + w * 0.72, by - 10, ex + w * 0.6, by - 4); c.stroke();   // trunk
    c.fillStyle = '#7a7e86'; c.beginPath(); c.ellipse(ex + w * 0.4, t + 30, 12, 16, 0.2, 0, Math.PI * 2); c.fill();   // ear
    circle(c, ex + w * 0.55, t + 24, 2, '#2a2a30');
  },
});
