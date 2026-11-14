'use strict';
// Backgrounds for two maps (they hook into THEMES like js/themes.js):
//   beach  Zombie Beach on a sunny day: the sea, an island, a sailboat, a pier, palm trees, umbrellas, sandcastles
//   mall   The Shopping Mall at midnight: two floors of shops with neon signs, a glass roof with the moon, shiny tiles
// Plus their platforms: lifeguard (tower), hut (ice cream shack), boat (a beached boat),
//                       fountain, display (a big shop display) and carousel (a merry-go-round).

// ---- Zombie Beach ----------------------------------------------------------------------
function beachPalm(c, x, base, h, lean) {   // a palm tree with a brown trunk and green leaves
  const tx = x + lean * h, ty = base - h;
  c.strokeStyle = '#8a6a44'; c.lineWidth = h * 0.06; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x, base); c.quadraticCurveTo(x + lean * h * 0.2, base - h * 0.5, tx, ty); c.stroke();
  c.strokeStyle = 'rgba(60,40,20,0.35)'; c.lineWidth = 1.5; c.beginPath();
  for (let k = 0.1; k < 0.95; k += 0.09) { const u = k, px = x + (lean * h * 0.4 * u + lean * h * 0.6 * u * u), py = base - h * u; c.moveTo(px - h * 0.03, py); c.lineTo(px + h * 0.03, py - 3); }
  c.stroke(); c.lineCap = 'butt';
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.5 + Math.sin(G.t * 1.2 + x + i) * 0.04, len = h * (0.38 + (i % 2) * 0.08);
    c.fillStyle = i % 2 ? '#3a9a4a' : '#2e8040'; c.beginPath(); c.moveTo(tx, ty);
    c.quadraticCurveTo(tx + Math.cos(a) * len * 0.6, ty + Math.sin(a) * len * 0.4 - h * 0.06, tx + Math.cos(a) * len, ty + Math.sin(a) * len * 0.5 + h * 0.14);
    c.quadraticCurveTo(tx + Math.cos(a) * len * 0.5, ty + Math.sin(a) * len * 0.2, tx, ty + 4); c.fill();
  }
  for (const [cx, cy] of [[-5, 5], [4, 6], [0, 9]]) circle(c, tx + cx, ty + cy, 4, '#6a4a2a');   // coconuts
}
THEMES.beach = {
  fog: [255, 236, 200, 0.05],
  bg(bg, L, r) {
    bg.clouds = Array.from({ length: 7 }, () => ({ x: r() * (W + 400) - 200, y: 40 + r() * 110, s: 0.5 + r() * 0.6 }));
    bg.palms = []; for (let x = 140; x < L.worldW - 100; x += 360 + r() * 340) bg.palms.push({ x, h: 150 + r() * 70, lean: (r() - 0.5) * 0.5 });
    bg.umbrellas = []; for (let x = 420; x < L.worldW - 100; x += 480 + r() * 400) bg.umbrellas.push({ x, c: pickR(r, ['#ff5a6e', '#5ab0ff', '#ffd23f', '#7CFC4A', '#c78bff']) });
    bg.castles = []; for (let x = 600; x < L.worldW - 100; x += 800 + r() * 700) bg.castles.push(x);
    bg.boards = []; for (let x = 980; x < L.worldW - 100; x += 1000 + r() * 600) bg.boards.push({ x, c: pickR(r, ['#ff5a6e', '#5ab0ff', '#ffd23f']) });
    bg.signs = [1500, 3300].filter(x => x < L.worldW - 100);
  },
  backdrop(c, L, camX, bg) {
    const HZ = 300, g = c.createLinearGradient(0, 0, 0, HZ);
    g.addColorStop(0, '#2f86de'); g.addColorStop(0.6, '#8ccaf2'); g.addColorStop(1, '#dff2ff');
    c.fillStyle = g; c.fillRect(0, 0, W, HZ + 2);
    const sx = 760 - camX * 0.02; glow(c, sx, 95, 190, '255,250,210', 0.6); circle(c, sx, 95, 38, '#fff8d0');
    for (const cl of bg.clouds) cloudPuff(c, ((cl.x - camX * 0.04 + G.t * 6 * cl.s) % (W + 400) + W + 400) % (W + 400) - 200, cl.y, cl.s);
    const sea = c.createLinearGradient(0, HZ, 0, GROUND - 20);
    sea.addColorStop(0, '#1a6cb8'); sea.addColorStop(1, '#3ec0d8');
    c.fillStyle = sea; c.fillRect(0, HZ, W, GROUND - 20 - HZ);
    const ix = ((520 - camX * 0.03) % (W + 600) + W + 600) % (W + 600) - 300;   // a little island far away
    c.fillStyle = '#5a9a6a'; c.beginPath(); c.ellipse(ix, HZ + 2, 70, 14, 0, Math.PI, 0); c.fill();
    palm(c, ix + 10, HZ - 6, 46, '#3a6a4a');
    const bx = ((G.t * 9 - camX * 0.05) % (W + 300) + W + 300) % (W + 300) - 150;   // a sailboat
    poly(c, [bx - 16, HZ + 8, bx + 16, HZ + 8, bx + 11, HZ + 14, bx - 11, HZ + 14], '#ffffff'); poly(c, [bx, HZ - 22, bx, HZ + 6, bx + 14, HZ + 6], '#ffffff'); poly(c, [bx - 2, HZ - 16, bx - 2, HZ + 6, bx - 12, HZ + 6], '#ff7a6a');
    c.fillStyle = 'rgba(255,255,255,0.55)';   // sparkles on the water
    for (let i = 0; i < 26; i++) { const x = ((i * 137 - camX * (0.08 + (i % 4) * 0.04) + Math.sin(G.t + i) * 6) % W + W) % W, y = HZ + 10 + (i % 7) * 17; c.fillRect(x, y, 10 + (i % 3) * 6, 1.6); }
    const po = camX * 0.3;   // a wooden pier going out to sea
    for (let k = -1; k < 3; k++) {
      const px = ((1200 * k - po) % 2400 + 2400) % 2400 - 300; if (px > W + 50) continue;
      c.fillStyle = '#6a5038'; for (let x = px; x < px + 340; x += 34) c.fillRect(x, HZ + 30, 5, 70);
      c.fillStyle = '#8a6a4a'; c.fillRect(px - 10, HZ + 22, 360, 9);
      c.fillStyle = '#c84a3a'; c.fillRect(px + 290, HZ - 6, 40, 28); poly(c, [px + 284, HZ - 6, px + 310, HZ - 22, px + 336, HZ - 6], '#7a2a20');   // a hut at the end
      c.fillStyle = '#4a3a2a'; for (let x = px + 20; x < px + 280; x += 60) { c.fillRect(x, HZ - 6, 2, 28); circle(c, x + 1, HZ - 8, 3, '#fff2b0'); }   // lamp posts
    }
    c.fillStyle = '#7ad8e8'; c.fillRect(0, GROUND - 46, W, 14);   // waves rolling onto the beach
    c.fillStyle = 'rgba(255,255,255,0.85)';
    for (let x = -60; x < W + 60; x += 46) { const ph = G.t * 1.2 + x * 0.05, wx = x - ((camX * 0.6) % 46); c.beginPath(); c.ellipse(wx, GROUND - 40 + Math.sin(ph) * 2, 20, 3, 0, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#e6c88e'; c.fillRect(0, GROUND - 34, W, 40);   // wet sand
    c.fillStyle = '#f2dcaa'; c.fillRect(0, GROUND - 22, W, 30);
  },
  back(c, L, camX, bg, x0, x1, vis) {
    for (const p of bg.palms) if (vis(p.x, 160)) beachPalm(c, p.x, GROUND - 4, p.h, p.lean);
    for (const s of bg.signs) if (vis(s, 80)) {   // a warning sign
      c.fillStyle = '#6a5038'; c.fillRect(s - 3, GROUND - 92, 6, 92);
      fillRR(c, s - 58, GROUND - 120, 116, 40, 4, '#f4f0e0'); c.strokeStyle = '#d83a2a'; c.lineWidth = 3; rr(c, s - 55, GROUND - 117, 110, 34, 3); c.stroke();
      text(c, 'BEACH CLOSED', s, GROUND - 106, { size: 11, color: '#d83a2a' }); text(c, 'ZOMBIES!', s, GROUND - 92, { size: 10, color: '#1a1a1a' });
    }
    for (const u of bg.umbrellas) if (vis(u.x, 70)) {   // umbrellas and towels
      fillRR(c, u.x - 30, GROUND - 6, 56, 6, 2, u.c); c.fillStyle = 'rgba(255,255,255,0.6)'; c.fillRect(u.x - 20, GROUND - 6, 6, 6); c.fillRect(u.x - 4, GROUND - 6, 6, 6);
      c.fillStyle = '#e8e4dc'; c.fillRect(u.x + 18, GROUND - 92, 3, 92);
      for (let i = 0; i < 6; i++) poly(c, [u.x + 19, GROUND - 106, u.x + 19 - 48 + i * 16, GROUND - 82, u.x + 19 - 48 + (i + 1) * 16, GROUND - 82], i % 2 ? '#ffffff' : u.c);
    }
    for (const x of bg.castles) if (vis(x, 40)) {   // sandcastles
      c.fillStyle = '#e0c080'; c.fillRect(x - 22, GROUND - 18, 44, 18); c.fillRect(x - 26, GROUND - 30, 14, 30); c.fillRect(x + 12, GROUND - 30, 14, 30); c.fillRect(x - 7, GROUND - 38, 14, 38);
      c.fillStyle = '#c8a868'; for (const tx of [-26, -18, 12, 20, -7, 1]) c.fillRect(x + tx, (tx === -7 || tx === 1 ? GROUND - 42 : GROUND - 34), 6, 4);
      c.fillStyle = '#d83a2a'; c.fillRect(x - 1, GROUND - 56, 2, 16); poly(c, [x + 1, GROUND - 56, x + 12, GROUND - 52, x + 1, GROUND - 48]);
    }
    for (const b of bg.boards) if (vis(b.x, 30)) { c.save(); c.translate(b.x, GROUND); c.rotate(0.12); fillRR(c, -9, -84, 18, 88, 9, b.c); c.fillStyle = '#ffffff'; c.fillRect(-1.5, -80, 3, 80); c.restore(); }   // surfboards
    // The sand you fight on, with shells and footprints.
    const sg = c.createLinearGradient(0, GROUND, 0, H); sg.addColorStop(0, '#f0d49a'); sg.addColorStop(1, '#d8b878');
    c.fillStyle = sg; c.fillRect(x0, GROUND, x1 - x0, H - GROUND);
    c.fillStyle = '#e2c486'; c.fillRect(x0, GROUND, x1 - x0, 3);
    for (let x = Math.floor(x0 / 50) * 50; x < x1; x += 50) {
      const k = hash(x * 0.37);
      if (k < 0.25) { c.fillStyle = k < 0.12 ? '#f8e8e0' : '#f0b8a8'; c.beginPath(); c.ellipse(x + k * 40, GROUND + 14 + k * 120, 4, 3, 0, Math.PI, 0); c.fill(); }   // shells
      else if (k > 0.8) { c.fillStyle = 'rgba(160,120,70,0.25)'; c.beginPath(); c.ellipse(x, GROUND + 30 + (k - 0.8) * 150, 4, 2, 0, 0, Math.PI * 2); c.ellipse(x + 14, GROUND + 26 + (k - 0.8) * 150, 4, 2, 0, 0, Math.PI * 2); c.fill(); }   // footprints
    }
  },
};

// ---- The Shopping Mall ---------------------------------------------------------------------
const MALL_SHOPS = [['PIZZA', '#ff8a3a'], ['GAME ZONE', '#5ab0ff'], ['SHOES', '#ff5a9a'], ['TOY TOWN', '#ffd23f'], ['BURGERS', '#ff6a4a'],
  ['BOOKS', '#7CFC4A'], ['CANDY', '#ff9ae8'], ['PETS', '#9ad0ff'], ['SPORTS', '#ffb347']];
const rgbOf = hex => hex.slice(1).match(/../g).map(h => parseInt(h, 16)).join(',');
function mallSign(c, x, y, i, flick) {   // a glowing neon shop sign
  const [name, col] = MALL_SHOPS[i % MALL_SHOPS.length];
  fillRR(c, x - 60, y - 13, 120, 26, 5, '#120e20');
  c.globalAlpha = flick; glow(c, x, y, 90, rgbOf(col), 0.18);
  text(c, name, x, y + 1, { size: 13, color: col }); c.globalAlpha = 1;
}
THEMES.mall = {
  fog: [210, 190, 255, 0.06],
  bg(bg, L, r) {
    bg.upper = []; for (let x = -100, i = 0; x < L.worldW * 0.35 + W + 300; x += 220, i++) bg.upper.push({ x, k: Math.floor(r() * 9), lit: r() < 0.7 });
    bg.shops = []; for (let x = 40; x < L.worldW - 100; x += 340) bg.shops.push({ x, k: Math.floor(r() * 9), shut: r() < 0.25, sale: r() < 0.4 });
    bg.plants = []; for (let x = 230; x < L.worldW - 100; x += 680) bg.plants.push(x);
    bg.lights = []; for (let x = 170; x < L.worldW; x += 340) bg.lights.push({ x, bad: r() < 0.2 });
  },
  backdrop(c, L, camX, bg) {
    c.fillStyle = '#18142c'; c.fillRect(0, 0, W, H);
    const sky = c.createLinearGradient(0, 0, 0, 70);   // the glass roof, with the night sky and the moon
    sky.addColorStop(0, '#0a0a24'); sky.addColorStop(1, '#2a2a5a');
    c.fillStyle = sky; c.fillRect(0, 0, W, 70);
    circle(c, 640 - camX * 0.04, 34, 16, '#f0f0ff'); circle(c, 646 - camX * 0.04, 30, 14, '#2a2a5a');   // a crescent moon
    c.fillStyle = '#3a3456'; c.fillRect(0, 66, W, 10);
    for (let x = -((camX * 0.1) % 80); x < W; x += 80) c.fillRect(x, 0, 4, 70);   // roof frames
    const off = camX * 0.35;   // the upper floor: shops behind a glass railing
    c.fillStyle = '#26203c'; c.fillRect(0, 76, W, 186);
    for (const u of bg.upper) {
      const x = u.x - off; if (x < -230 || x > W + 30) continue;
      const [, col] = MALL_SHOPS[u.k];
      c.fillStyle = u.lit ? `rgba(${rgbOf(col)},0.28)` : '#1a1630'; c.fillRect(x + 14, 128, 192, 104);
      c.fillStyle = '#3a3456'; c.fillRect(x, 92, 10, 170); c.fillRect(x + 10, 120, 200, 8);
      mallSign(c, x + 110, 106, u.k, u.lit ? 1 : 0.35);
    }
    c.fillStyle = 'rgba(180,200,255,0.12)'; c.fillRect(0, 226, W, 30);   // the glass railing
    c.fillStyle = '#8a86a8'; c.fillRect(0, 224, W, 3);
    c.fillStyle = '#3a3456'; c.fillRect(0, 256, W, 14);                  // the upper floor's edge
    c.fillStyle = '#1e1a32'; c.fillRect(0, 270, W, GROUND - 270);       // the ground floor's back wall
    for (let x = -((camX * 0.6) % 520); x < W; x += 520) {               // hanging SALE banners
      c.strokeStyle = '#6a6688'; c.lineWidth = 1; c.beginPath(); c.moveTo(x + 40, 270); c.lineTo(x + 40, 282); c.moveTo(x + 120, 270); c.lineTo(x + 120, 282); c.stroke();
      fillRR(c, x + 30, 282, 100, 30, 3, '#d83a5a'); text(c, 'MEGA SALE', x + 80, 297, { size: 11, color: '#ffffff' });
    }
  },
  back(c, L, camX, bg, x0, x1, vis) {
    for (const s of bg.shops) if (vis(s.x + 150, 200)) {   // shop fronts on the ground floor
      const x = s.x, top = GROUND - 190, [, col] = MALL_SHOPS[s.k];
      c.fillStyle = '#2e2846'; c.fillRect(x, top - 30, 300, 220);
      if (s.shut) {   // a closed shop: the shutter is down
        c.fillStyle = '#4a4660'; c.fillRect(x + 20, top + 10, 260, 170);
        c.fillStyle = '#3a3650'; for (let y = top + 16; y < GROUND - 10; y += 8) c.fillRect(x + 20, y, 260, 2);
      } else {
        const gl = c.createLinearGradient(0, top + 10, 0, GROUND); gl.addColorStop(0, `rgba(${rgbOf(col)},0.35)`); gl.addColorStop(1, `rgba(${rgbOf(col)},0.12)`);
        c.fillStyle = gl; c.fillRect(x + 20, top + 10, 260, 170);
        c.fillStyle = 'rgba(20,16,36,0.6)';   // things on display: a stand and a mannequin-shaped shadow
        c.fillRect(x + 50, GROUND - 60, 70, 50); circle(c, x + 200, GROUND - 120, 10); c.fillRect(x + 192, GROUND - 110, 16, 60); c.fillRect(x + 194, GROUND - 50, 5, 40); c.fillRect(x + 201, GROUND - 50, 5, 40);
        c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 40, top + 20); c.lineTo(x + 90, top + 90); c.moveTo(x + 220, top + 30); c.lineTo(x + 260, top + 80); c.stroke();   // glass shine
        if (s.sale) { fillRR(c, x + 150, top + 24, 70, 28, 3, '#ffd23f'); text(c, 'SALE', x + 185, top + 39, { size: 13, color: '#d83a2a' }); }
      }
      c.fillStyle = '#4a4466'; c.fillRect(x - 6, top - 34, 22, 224); c.fillRect(x + 294, top - 34, 12, 224);   // pillars
      mallSign(c, x + 150, top - 14, s.k, s.shut ? 0.3 : hash(Math.floor(G.t * 6) + s.x) > 0.04 ? 1 : 0.4);
    }
    for (const x of bg.plants) if (vis(x, 40)) {   // big potted plants
      fillRR(c, x - 18, GROUND - 34, 36, 34, 4, '#8a6a4a');
      for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.4; c.fillStyle = i % 2 ? '#3a8a4a' : '#2e7040'; c.beginPath(); c.ellipse(x + Math.cos(a) * 18, GROUND - 46 + Math.sin(a) * 24, 7, 18, a + Math.PI / 2, 0, Math.PI * 2); c.fill(); }
    }
    c.globalCompositeOperation = 'lighter';   // light from the ceiling lamps (one keeps flickering)
    for (const l of bg.lights) if (vis(l.x, 120)) {
      const on = !l.bad || Math.sin(G.t * 19 + l.x) * Math.sin(G.t * 5.7 + l.x) > -0.4;
      if (on) { c.fillStyle = 'rgba(255,245,220,0.05)'; poly(c, [l.x - 12, 272, l.x + 12, 272, l.x + 90, GROUND, l.x - 90, GROUND]); }
    }
    c.globalCompositeOperation = 'source-over';
    for (let x = Math.floor(x0 / 48) * 48, i = Math.floor(x0 / 48); x < x1; x += 48, i++) {   // shiny floor tiles
      c.fillStyle = i % 2 ? '#cfc6e0' : '#bdb4d0'; c.fillRect(x, GROUND, 48, 24);
      c.fillStyle = i % 2 ? '#b8afcc' : '#c8c0da'; c.fillRect(x, GROUND + 24, 48, 24);
    }
    c.fillStyle = '#a8a0c0'; c.fillRect(x0, GROUND + 48, x1 - x0, H - GROUND - 48);
    c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(x0, GROUND, x1 - x0, 2);
    c.fillStyle = 'rgba(255,255,255,0.08)'; for (let x = Math.floor(x0 / 170) * 170; x < x1; x += 170) poly(c, [x, GROUND + 4, x + 40, GROUND + 4, x + 10, H, x - 30, H]);   // reflections
  },
};

// ---- Platforms -----------------------------------------------------------------------------
Object.assign(PLATFORM_TOP, { lifeguard: 118, hut: 96, boat: 58, fountain: 52, display: 90, carousel: 130 });
Object.assign(PLATFORM_ART, {
  lifeguard(c, p) {   // a lifeguard tower: you stand on its deck
    const x = p.x, w = p.w, t = p.top;
    c.strokeStyle = '#d8d0c0'; c.lineWidth = 5; c.beginPath();
    c.moveTo(x + 10, t + 4); c.lineTo(x + 2, GROUND); c.moveTo(x + w - 10, t + 4); c.lineTo(x + w - 2, GROUND);
    c.moveTo(x + 8, t + 40); c.lineTo(x + w - 6, GROUND - 6); c.stroke();
    c.lineWidth = 3; c.beginPath(); for (let y = t + 20; y < GROUND; y += 16) { c.moveTo(x + w + 6, y); c.lineTo(x + w + 20, y); } c.moveTo(x + w + 6, t); c.lineTo(x + w + 6, GROUND); c.moveTo(x + w + 20, t); c.lineTo(x + w + 20, GROUND); c.stroke();   // ladder
    fillRR(c, x - 4, t, w + 8, 8, 2, '#c8a878');
    c.fillStyle = '#4ab0d8'; c.fillRect(x + 6, t - 48, w - 12, 6); poly(c, [x - 6, t - 48, x + w / 2, t - 66, x + w + 6, t - 48], '#d83a2a');   // roof
    c.fillStyle = '#e8e0d0'; c.fillRect(x + 6, t - 44, 5, 44); c.fillRect(x + w - 11, t - 44, 5, 44);
    fillRR(c, x + w / 2 - 12, t + 12, 24, 24, 3, '#ffffff'); c.fillStyle = '#d83a2a'; c.fillRect(x + w / 2 - 3, t + 15, 6, 18); c.fillRect(x + w / 2 - 9, t + 21, 18, 6);   // red cross
  },
  hut(c, p) {   // an ice cream shack with a striped awning: you stand on its roof
    const x = p.x, w = p.w, t = p.top;
    fillRR(c, x, t, w, GROUND - t, 3, '#f4e8d0');
    c.fillStyle = '#e8d8b8'; for (let y = t + 10; y < GROUND; y += 12) c.fillRect(x, y, w, 1.5);
    fillRR(c, x - 4, t - 4, w + 8, 8, 3, '#5ab0e8');
    c.fillStyle = '#2a2430'; c.fillRect(x + 16, t + 30, w - 32, 34);
    for (let i = 0; i < 8; i++) { const sx = x + 8 + i * (w - 16) / 8; poly(c, [sx, t + 22, sx + (w - 16) / 8, t + 22, sx + (w - 16) / 8 - 3, t + 36, sx - 3, t + 36], i % 2 ? '#ffffff' : '#ff6a8a'); }
    text(c, 'ICE CREAM', x + w / 2, t + 13, { size: 12, color: '#d83a5a' });
    c.fillStyle = '#e8b878'; poly(c, [x + w - 30, t + 58, x + w - 18, t + 92, x + w - 6, t + 58]); circle(c, x + w - 18, t + 54, 9, '#ff9ac8');   // a giant cone
  },
  boat(c, p) {   // a fishing boat pulled up on the sand
    const x = p.x, w = p.w, t = p.top;
    c.fillStyle = '#3a6aa8'; c.beginPath(); c.moveTo(x - 10, t); c.lineTo(x + w + 18, t - 6); c.quadraticCurveTo(x + w + 4, GROUND - 8, x + w - 30, GROUND - 2); c.lineTo(x + 20, GROUND - 2); c.quadraticCurveTo(x - 4, GROUND - 14, x - 10, t); c.fill();
    c.fillStyle = '#ffffff'; c.fillRect(x - 6, t + 10, w + 18, 5);
    c.fillStyle = '#d83a2a'; c.fillRect(x, GROUND - 16, w, 6);
    text(c, 'LUCKY', x + w / 2, t + 26, { size: 11, color: '#ffffff' });
    fillRR(c, x - 10, t - 3, w + 28, 5, 2, '#8a6a4a');
  },
  fountain(c, p) {   // a round fountain: stand on its edge
    const x = p.x, w = p.w, t = p.top, cx = x + w / 2;
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 9; i++) { const u = (G.t * 0.9 + i / 9) % 1, a = (i - 4) * 0.12; c.fillStyle = `rgba(150,200,255,${0.35 * (1 - u)})`; circle(c, cx + Math.sin(a) * u * 70, t - 60 + u * u * 70 - Math.sin(u * Math.PI) * 20, 3 + u * 2); }
    c.fillStyle = 'rgba(150,200,255,0.3)'; c.fillRect(cx - 3, t - 64, 6, 62);
    c.globalCompositeOperation = 'source-over';
    fillRR(c, x, t, w, GROUND - t, 6, '#8a86a0');
    c.fillStyle = '#4a8ac8'; c.fillRect(x + 8, t + 4, w - 16, 10);
    c.fillStyle = 'rgba(255,255,255,0.4)'; c.fillRect(x + 14, t + 6, 30, 2); c.fillRect(x + w - 50, t + 9, 24, 2);
    c.fillStyle = '#6a6680'; for (let bx = x + 10; bx < x + w - 10; bx += 26) c.fillRect(bx, t + 20, 2, GROUND - t - 24);
    fillRR(c, cx - 10, t - 20, 20, 20, 4, '#9a96b0');
  },
  display(c, p) {   // a big shop display with a GIANT sneaker on it
    const x = p.x, w = p.w, t = p.top;
    fillRR(c, x, t, w, GROUND - t, 4, '#2a2646'); c.fillStyle = '#ffd23f'; c.fillRect(x, t, w, 5);
    text(c, 'NEW!', x + w / 2, t + 28, { size: 16, color: '#ffd23f' });
    c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(x + 8, t + 44, w - 16, 3);
    const sx = x + w / 2 - 34, sy = t - 4;   // the giant sneaker (behind you when you stand there)
    c.globalAlpha = 0.9;
    fillRR(c, sx, sy - 18, 64, 16, 7, '#ff5a6a'); fillRR(c, sx + 2, sy - 6, 68, 6, 3, '#ffffff'); fillRR(c, sx + 4, sy - 30, 28, 16, 6, '#ff5a6a');
    c.fillStyle = '#ffffff'; for (let i = 0; i < 3; i++) c.fillRect(sx + 10 + i * 6, sy - 26 + i * 4, 10, 1.5);
    c.globalAlpha = 1;
  },
  carousel(c, p) {   // a merry-go-round: you stand on its roof
    const x = p.x, w = p.w, t = p.top, cx = x + w / 2;
    fillRR(c, x - 6, GROUND - 14, w + 12, 14, 6, '#b8a0d8');
    c.fillStyle = '#e8d070'; c.fillRect(cx - 4, t, 8, GROUND - t - 14);
    for (let i = 0; i < 4; i++) {   // horses going up and down
      const hx = x + 22 + i * (w - 44) / 3, bob = Math.sin(G.t * 2.5 + i * 1.6) * 10, hy = GROUND - 60 + bob;
      c.fillStyle = '#e8d070'; c.fillRect(hx - 1.5, t + 14, 3, GROUND - t - 28);
      c.fillStyle = ['#ffffff', '#ffd0e0', '#c8e8ff', '#fff0b0'][i];
      c.beginPath(); c.ellipse(hx, hy, 16, 8, 0, 0, Math.PI * 2); c.fill();
      fillRR(c, hx + 10, hy - 16, 8, 14, 3, c.fillStyle); c.fillRect(hx - 10, hy + 4, 3, 14); c.fillRect(hx + 7, hy + 4, 3, 14);
      fillRR(c, hx - 6, hy - 10, 12, 4, 2, '#d83a5a');
    }
    c.fillStyle = '#d83a5a'; c.fillRect(x - 4, t, w + 8, 12);
    for (let i = 0; i < 10; i++) { const sx = x - 4 + i * (w + 8) / 10; c.fillStyle = i % 2 ? '#ffffff' : '#d83a5a'; poly(c, [sx, t + 12, sx + (w + 8) / 10, t + 12, sx + (w + 8) / 20, t + 22]); }
    for (let i = 0; i < 9; i++) circle(c, x + i * w / 8, t + 6, 2.2, (Math.floor(G.t * 4) + i) % 2 ? '#fff4c0' : '#806a40');   // light bulbs
    c.fillStyle = '#ffd23f'; c.fillRect(x + 6, t - 3, w - 12, 3);
  },
});
