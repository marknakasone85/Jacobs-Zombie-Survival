'use strict';
// Backgrounds for the big-city levels (they hook into THEMES like js/themes.js):
//   nyc     New York City at sunset: skyscrapers, a tall spire, giant glowing billboards, subway stairs,
//           steam from the manholes, yellow taxis
//   bridge  the helicopter level: a huge suspension bridge out of the city at sunrise
// Plus two platforms: taxi (a yellow cab) and cart (a hot dog cart).

const BILLBOARDS = [['ZOMBIE NEWS', 'THE CITY IS OVERRUN!', '#ff4a6a'], ['BIG APPLE', 'PIZZA  $1', '#ffd23f'], ['RUN!', 'DO NOT FEED THE ZOMBIES', '#5ab0ff'],
  ['SHOW TONIGHT', 'CANCELLED (ZOMBIES)', '#c78bff'], ['HOT DOGS', 'NOW WITH BRAINS', '#7CFC4A']];

// A tall stepped skyscraper with a spire and a blinking red light (screen space).
function drawSpire(c, x, base, s) {
  const col = '#140e24';
  c.fillStyle = col;
  c.fillRect(x - 46 * s, base - 200 * s, 92 * s, 200 * s);
  c.fillRect(x - 34 * s, base - 250 * s, 68 * s, 50 * s);
  c.fillRect(x - 22 * s, base - 290 * s, 44 * s, 40 * s);
  c.fillRect(x - 12 * s, base - 320 * s, 24 * s, 30 * s);
  c.fillRect(x - 4 * s, base - 380 * s, 8 * s, 60 * s);
  c.fillRect(x - 1 * s, base - 420 * s, 2 * s, 40 * s);
  if (Math.floor(G.t * 1.5) % 2) circle(c, x, base - 420 * s, 3, '#ff3030');
  c.fillStyle = 'rgba(255,220,150,0.5)';
  for (let r = 0; r < 18; r++) for (let k = 0; k < 6; k++) if (hash(r * 7 + k) < 0.4) c.fillRect(x - 40 * s + k * 14 * s, base - 192 * s + r * 10 * s, 5 * s, 4 * s);
}
function drawBillboard(c, x, i) {
  const [a, b, col] = BILLBOARDS[i % BILLBOARDS.length], top = GROUND - 250, flick = hash(Math.floor(G.t * 8) + i) > 0.06 ? 1 : 0.4;
  c.fillStyle = '#2a2436'; c.fillRect(x + 30, top + 80, 8, GROUND - top - 80); c.fillRect(x + 182, top + 80, 8, GROUND - top - 80);
  c.globalAlpha = flick; glow(c, x + 110, top + 40, 170, col.slice(1).match(/../g).map(h => parseInt(h, 16)).join(','), 0.22); c.globalAlpha = 1;
  fillRR(c, x, top, 220, 84, 6, '#100c1c');
  c.strokeStyle = col; c.lineWidth = 3; c.globalAlpha = flick; rr(c, x + 4, top + 4, 212, 76, 4); c.stroke();
  text(c, a, x + 110, top + 32, { size: 22, color: col }); text(c, b, x + 110, top + 60, { size: 11, color: '#ffffff' });
  c.globalAlpha = 1;
  for (let k = 0; k < 11; k++) circle(c, x + 10 + k * 20, top + 2, 2.2, (Math.floor(G.t * 6) + k) % 2 ? '#fff4c0' : '#806a40');   // chasing light bulbs
}
function drawSubway(c, x) {   // stairs down to the subway, with two green globe lamps
  c.fillStyle = '#3a6a3a'; c.fillRect(x - 46, GROUND - 34, 4, 34); c.fillRect(x + 42, GROUND - 34, 4, 34); c.fillRect(x - 46, GROUND - 36, 92, 4);
  for (const lx of [x - 44, x + 44]) { c.fillRect(lx - 1, GROUND - 58, 3, 24); glow(c, lx, GROUND - 62, 30, '120,255,140', 0.3); circle(c, lx, GROUND - 62, 6, '#8aff9a'); }
  fillRR(c, x - 30, GROUND - 66, 60, 16, 3, '#1a1a1a'); text(c, 'SUBWAY', x, GROUND - 57.5, { size: 10, color: '#ffffff' });
}
function drawHydrant(c, x) {
  fillRR(c, x - 6, GROUND - 22, 12, 22, 4, '#d8402f'); fillRR(c, x - 9, GROUND - 16, 18, 5, 2, '#b8301f'); circle(c, x, GROUND - 23, 5, '#d8402f');
}
function drawSteam(c, x) {   // steam rising out of a manhole
  c.fillStyle = '#1a1622'; c.beginPath(); c.ellipse(x, GROUND + 30, 16, 3, 0, 0, Math.PI * 2); c.fill();
  for (let k = 0; k < 5; k++) {
    const ph = (G.t * 0.35 + k / 5 + x * 0.001) % 1;
    c.globalAlpha = (1 - ph) * 0.22; circle(c, x + Math.sin(G.t + k + ph * 3) * 10, GROUND + 26 - ph * 150, 12 + ph * 26, '#e8e0f0');
  }
  c.globalAlpha = 1;
}

THEMES.nyc = {
  fog: [255, 160, 140, 0.06],
  bg(bg, L, r) {
    bg.far = genCity(r, L.worldW * 0.08 + W + 400, 200, 370);
    bg.mid = genCity(r, L.worldW * 0.3 + W + 300, 120, 260);
    bg.boards = []; for (let x = 500, i = 0; x < L.worldW - 300; x += 950 + r() * 400, i++) bg.boards.push({ x, i });
    bg.subways = []; for (let x = 1100; x < L.worldW - 200; x += 2100) bg.subways.push(x);
    bg.steam = []; for (let x = 300; x < L.worldW - 100; x += 500 + r() * 500) bg.steam.push(x);
    bg.hydrants = []; for (let x = 220; x < L.worldW - 100; x += 700 + r() * 500) bg.hydrants.push(x);
  },
  backdrop(c, L, camX, bg) {
    const g = c.createLinearGradient(0, 0, 0, GROUND);
    g.addColorStop(0, '#0b0820'); g.addColorStop(0.45, '#3a1840'); g.addColorStop(0.8, '#c0486a'); g.addColorStop(1, '#ffb070');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    drawStars(c, 0.35);
    c.globalCompositeOperation = 'lighter';   // searchlights sweeping the sky
    for (let k = 0; k < 2; k++) {
      const bx = (k ? 760 : 240) - camX * 0.05, a = -Math.PI / 2 + Math.sin(G.t * 0.4 + k * 2) * 0.5;
      c.fillStyle = 'rgba(200,210,255,0.05)'; c.beginPath(); c.moveTo(bx, GROUND - 60);
      c.lineTo(bx + Math.cos(a - 0.05) * 700, GROUND - 60 + Math.sin(a - 0.05) * 700); c.lineTo(bx + Math.cos(a + 0.05) * 700, GROUND - 60 + Math.sin(a + 0.05) * 700); c.closePath(); c.fill();
    }
    c.globalCompositeOperation = 'source-over';
    drawSpire(c, 620 - camX * 0.05, GROUND - 40, 1);
    drawCityLayer(c, bg.far, camX * 0.08, '#1e1430', ['rgba(255,190,130,0.35)', 'rgba(255,230,170,0.55)'], 5, 7);
    const hz = c.createLinearGradient(0, GROUND - 200, 0, GROUND); hz.addColorStop(0, 'rgba(255,120,120,0)'); hz.addColorStop(1, 'rgba(255,120,120,0.2)');
    c.fillStyle = hz; c.fillRect(0, GROUND - 200, W, 200);
    drawCityLayer(c, bg.mid, camX * 0.3, '#2a1c3c', ['#e8c46a', '#fff0b8'], 7, 10);
  },
  back(c, L, camX, bg, x0, x1, vis) {
    for (const b of bg.boards) if (vis(b.x + 110, 160)) drawBillboard(c, b.x, b.i);
    for (let i = 0, x = 260; x < L.worldW; i++, x += 480) if (vis(x, 160)) drawLamp(c, x, i, '255,214,140');
    for (const x of bg.subways) if (vis(x, 60)) drawSubway(c, x);
    for (const x of bg.hydrants) if (vis(x, 20)) drawHydrant(c, x);
    drawStreet(c, x0, x1, '#4a4258', '#5e566e', '#332c40', '#232030', '#e8c840');
    for (const x of bg.steam) if (vis(x, 60)) drawSteam(c, x);
  },
};

// ---- The bridge (Sky Escape) --------------------------------------------------------
const TOWER_GAP = 1500;
THEMES.bridge = {
  fog: [255, 200, 170, 0.05],
  bg(bg, L, r) {
    bg.far = genCity(r, L.worldW * 0.05 + W + 300, 90, 220);
    bg.clouds = Array.from({ length: 9 }, () => ({ x: r() * (W + 600) - 300, y: 40 + r() * 200, s: 0.5 + r() * 0.9, sp: 0.04 + r() * 0.1 }));
  },
  backdrop(c, L, camX, bg) {
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#1a2a5a'); g.addColorStop(0.45, '#6a5a9a'); g.addColorStop(0.72, '#ff9a7a'); g.addColorStop(0.85, '#ffd08a'); g.addColorStop(1, '#3a5a8a');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    const sx = 700 - camX * 0.02; glow(c, sx, GROUND - 70, 240, '255,210,140', 0.5); circle(c, sx, GROUND - 70, 52, '#ffe2a0');   // the sun coming up
    for (const cl of bg.clouds) {   // clouds drifting by (you're up high!)
      const x = ((cl.x - camX * cl.sp) % (W + 600) + W + 600) % (W + 600) - 300;
      c.globalAlpha = 0.55; c.fillStyle = '#ffd8c8';
      circle(c, x, cl.y, 26 * cl.s); circle(c, x + 30 * cl.s, cl.y - 10 * cl.s, 32 * cl.s); circle(c, x + 64 * cl.s, cl.y, 24 * cl.s); c.fillRect(x, cl.y, 64 * cl.s, 18 * cl.s);
      c.globalAlpha = 1;
    }
    drawCityLayer(c, bg.far, camX * 0.05, '#3a3050', ['rgba(255,220,170,0.35)', 'rgba(255,240,200,0.5)'], 4, 6);
    c.fillStyle = '#2a4a7a'; c.fillRect(0, GROUND - 30, W, 40);   // the river far below
    c.fillStyle = 'rgba(255,220,160,0.35)';
    for (let i = 0; i < 14; i++) { const wx = ((i * 97 - camX * 0.1) % W + W) % W; c.fillRect(wx, GROUND - 22 + (i % 4) * 6, 30 + (i % 3) * 14, 2); }
  },
  back(c, L, camX, bg, x0, x1, vis) {
    const deck = GROUND - 4, cableTop = GROUND - 330;
    const first = Math.floor((x0 - 400) / TOWER_GAP) * TOWER_GAP + 400;
    for (let tx = first; tx < x1 + TOWER_GAP; tx += TOWER_GAP) {   // the main cables, sagging between the towers
      const nx = tx + TOWER_GAP;
      c.strokeStyle = '#4a4458'; c.lineWidth = 5; c.beginPath(); c.moveTo(tx, cableTop); c.quadraticCurveTo(tx + TOWER_GAP / 2, deck + 80, nx, cableTop); c.stroke();
      c.strokeStyle = '#5e5870'; c.lineWidth = 1.5; c.beginPath();
      for (let k = 1; k < 30; k++) {   // the thin cables hanging down
        const u = k / 30, hx = tx + u * TOWER_GAP, hy = (1 - u) * (1 - u) * cableTop + 2 * (1 - u) * u * (deck + 80) + u * u * cableTop;
        if (hx < x0 - 20 || hx > x1 + 20 || hy > deck - 6) continue;
        c.moveTo(hx, hy); c.lineTo(hx, deck - 6);
      }
      c.stroke();
    }
    for (let tx = first; tx < x1 + 200; tx += TOWER_GAP) {   // stone towers with two pointed arches
      if (tx < x0 - 200) continue;
      c.fillStyle = '#6a6070'; c.fillRect(tx - 70, cableTop - 20, 140, deck - cableTop + 20);
      c.fillStyle = '#7a7080'; c.fillRect(tx - 70, cableTop - 20, 140, 12); c.fillRect(tx - 78, cableTop - 32, 156, 14);
      for (const ax of [tx - 50, tx + 6]) { c.fillStyle = '#3a3048'; c.fillRect(ax, cableTop + 50, 44, 150); poly(c, [ax, cableTop + 52, ax + 22, cableTop + 22, ax + 44, cableTop + 52], '#3a3048'); }
    }
    c.fillStyle = '#4a4458'; c.fillRect(x0, deck - 24, x1 - x0, 4);   // railing
    for (let x = Math.floor(x0 / 40) * 40; x < x1; x += 40) c.fillRect(x, deck - 24, 3, 20);
    c.fillStyle = '#3a3440'; c.fillRect(x0, deck, x1 - x0, 24);         // the deck (the road)
    c.fillStyle = '#e8c840'; for (let x = Math.floor(x0 / 90) * 90; x < x1; x += 90) c.fillRect(x, deck + 10, 46, 3);
    c.fillStyle = '#2a2632'; c.fillRect(x0, deck + 24, x1 - x0, 14);    // steel under the deck
    c.strokeStyle = '#4a4458'; c.lineWidth = 3; c.beginPath();
    for (let x = Math.floor(x0 / 60) * 60; x < x1; x += 60) { c.moveTo(x, deck + 38); c.lineTo(x + 30, H); c.moveTo(x + 60, deck + 38); c.lineTo(x + 30, H); }
    c.stroke();
  },
};

// ---- Platforms -----------------------------------------------------------------------
Object.assign(PLATFORM_TOP, { taxi: 46, cart: 52 });
Object.assign(PLATFORM_ART, {
  taxi(c, p) {   // a yellow cab, with the light on its roof
    PLATFORM_ART.car(c, Object.assign({}, p, { kind: 'car', color: '#f2c21b' }));
    const cx = p.x + p.w / 2;
    fillRR(c, cx - 12, p.top - 9, 24, 9, 2, '#2a2430'); text(c, 'TAXI', cx, p.top - 4, { size: 7, color: '#ffe680' });
    c.fillStyle = '#1a1a1a'; for (let k = 0; k < 6; k++) c.fillRect(p.x + 8 + k * 12, p.top + 22, 6, 4);   // checker stripe
  },
  cart(c, p) {   // a hot dog cart with an umbrella
    const x = p.x, w = p.w, t = p.top;
    c.fillStyle = '#5a5e68'; c.fillRect(x + w / 2 - 2, t - 46, 4, 46);
    poly(c, [x - 6, t - 40, x + w / 2, t - 62, x + w + 6, t - 40], '#d8402f'); poly(c, [x + w * 0.2, t - 44, x + w / 2, t - 62, x + w * 0.45, t - 46], '#f2f2f2'); poly(c, [x + w * 0.55, t - 46, x + w / 2, t - 62, x + w * 0.8, t - 44], '#f2f2f2');
    fillRR(c, x, t, w, GROUND - t - 12, 4, '#c8ccd4'); c.fillStyle = '#2a6ad8'; c.fillRect(x, t + 8, w, 8);
    text(c, 'HOT DOGS', x + w / 2, t + 24, { size: 8, color: '#d8402f' });
    circle(c, x + 14, GROUND - 8, 8, '#1a1a1a'); circle(c, x + w - 14, GROUND - 8, 8, '#1a1a1a');
  },
});
