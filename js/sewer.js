'use strict';
// Sewer Escape: the tunnels under the city (it hooks into THEMES like js/themes.js).
// Brick walls and side tunnels with glowing eyes, slimy pipes pouring green goo, ladders up to manholes
// with light shining down, drips from the ceiling, and a river of toxic sludge (with a rubber duck in it).
// Plus three platforms: pipe (a huge pipe lying on its side), catwalk (a metal walkway) and junk (a pile of tyres and crates).

const SEWER_SIGNS = [['EXIT  >>>', '#7CFC4A'], ['SEWER LINE 7', '#e8e0c8'], ['NO SWIMMING', '#ffd23f'], ['BEWARE OF GATORS', '#ff6a5a'], ['EXIT  >>>', '#7CFC4A'], ['DO NOT DRINK', '#ffd23f']];

THEMES.sewer = {
  fog: [110, 230, 120, 0.15],
  bg(bg, L, r) {
    bg.tunnels = []; for (let x = 120; x < L.worldW * 0.25 + W + 400; x += 520 + r() * 260) bg.tunnels.push({ x, eyes: r() < 0.6 });
    bg.pours = []; for (let x = 520; x < L.worldW - 200; x += 900 + r() * 500) bg.pours.push(x);
    bg.ladders = []; for (let x = 1050; x < L.worldW - 200; x += 1400 + r() * 400) bg.ladders.push(x);
    bg.signs = []; for (let x = 260, i = 0; x < L.worldW - 200; x += 760 + r() * 300, i++) bg.signs.push({ x, i });
    bg.holes = []; for (let x = 180; x < L.worldW - 100; x += 300 + r() * 380) bg.holes.push(x);
  },
  backdrop(c, L, camX, bg) {
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#040605'); g.addColorStop(0.55, '#0d1611'); g.addColorStop(1, '#14231a');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    const off = camX * 0.25;   // the far brick wall
    c.fillStyle = '#121a15'; c.fillRect(0, 70, W, GROUND - 70);
    c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 1; c.beginPath();
    for (let row = 0, y = 76; y < GROUND; row++, y += 16) {
      c.moveTo(0, y); c.lineTo(W, y);
      for (let x = -((off + row * 17) % 34); x < W; x += 34) { c.moveTo(x, y); c.lineTo(x, y + 16); }
    }
    c.stroke();
    for (const t of bg.tunnels) {   // side tunnels going off into the dark, some with eyes looking out
      const x = t.x - off; if (x < -120 || x > W + 120) continue;
      const gl = c.createLinearGradient(0, GROUND - 190, 0, GROUND);
      gl.addColorStop(0, '#020302'); gl.addColorStop(1, 'rgba(60,140,70,0.35)');
      c.fillStyle = gl; c.beginPath(); c.moveTo(x - 60, GROUND); c.lineTo(x - 60, GROUND - 120); c.arc(x, GROUND - 120, 60, Math.PI, 0); c.lineTo(x + 60, GROUND); c.closePath(); c.fill();
      c.strokeStyle = '#1e2a22'; c.lineWidth = 8; c.beginPath(); c.arc(x, GROUND - 120, 64, Math.PI, 0); c.stroke();
      if (t.eyes && Math.sin(G.t * 0.7 + t.x) > -0.3 && Math.floor(G.t * 3 + t.x) % 7) {
        for (const ex of [-14, 22]) { circle(c, x + ex, GROUND - 60 + (ex > 0 ? 6 : 0), 2.2, '#ff3a2a'); circle(c, x + ex + 7, GROUND - 60 + (ex > 0 ? 6 : 0), 2.2, '#ff3a2a'); }
      }
    }
    c.fillStyle = '#060908'; c.fillRect(0, 0, W, 72);   // the ceiling, with pipes running along it
    const po = camX * 0.5;
    for (const [y, rad, col] of [[84, 9, '#2e3a32'], [104, 6, '#3a3226']]) {
      fillRR(c, -10, y - rad, W + 20, rad * 2, rad, col);
      c.fillStyle = 'rgba(255,255,255,0.07)'; c.fillRect(-10, y - rad + 2, W + 20, 2);
      c.fillStyle = 'rgba(0,0,0,0.4)';
      for (let x = -((po + y) % 170); x < W; x += 170) c.fillRect(x, y - rad - 2, 7, rad * 2 + 4);
    }
  },
  back(c, L, camX, bg, x0, x1, vis) {
    for (let x = Math.floor(x0 / 700) * 700 + 350; x < x1 + 60; x += 700) {   // brick pillars holding up the roof
      c.fillStyle = '#222c25'; c.fillRect(x - 24, 64, 48, GROUND - 64);
      c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 1; c.beginPath();
      for (let y = 70; y < GROUND; y += 14) { c.moveTo(x - 24, y); c.lineTo(x + 24, y); c.moveTo(x + ((y / 14) % 2 ? -6 : 8), y); c.lineTo(x + ((y / 14) % 2 ? -6 : 8), y + 14); }
      c.stroke();
      c.fillStyle = 'rgba(120,200,120,0.07)'; c.fillRect(x - 24, GROUND - 60, 48, 60);   // slime at the bottom
    }
    c.fillStyle = '#1a221d'; c.fillRect(x0, 50, x1 - x0, 18);   // the roof beam
    for (const s of bg.signs) if (vis(s.x, 80)) {
      const [str, col] = SEWER_SIGNS[s.i % SEWER_SIGNS.length];
      fillRR(c, s.x - 62, GROUND - 210, 124, 30, 3, '#1c2620'); c.strokeStyle = col; c.lineWidth = 2; rr(c, s.x - 59, GROUND - 207, 118, 24, 2); c.stroke();
      text(c, str, s.x, GROUND - 194, { size: 12, color: col });
    }
    for (const x of bg.ladders) if (vis(x, 140)) {   // a ladder up to a manhole, with daylight shining down
      c.globalCompositeOperation = 'lighter';
      c.fillStyle = 'rgba(230,255,210,0.07)'; poly(c, [x - 18, 66, x + 18, 66, x + 110, GROUND, x - 70, GROUND]);
      for (let i = 0; i < 6; i++) { const u = (G.t * 0.08 + i / 6) % 1; c.globalAlpha = Math.sin(u * Math.PI) * 0.6; circle(c, x + Math.sin(i * 9 + G.t) * 20 + u * 40, 80 + u * (GROUND - 90), 1.4, '#e8ffd8'); }   // dust in the light
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      c.fillStyle = '#c8d8c0'; c.fillRect(x - 20, 58, 40, 6);   // the open manhole
      c.fillStyle = '#4a5450'; c.fillRect(x - 14, 64, 3, GROUND - 64); c.fillRect(x + 11, 64, 3, GROUND - 64);
      for (let y = 80; y < GROUND; y += 18) c.fillRect(x - 14, y, 28, 2.5);
    }
    for (const x of bg.pours) if (vis(x, 60)) {   // a pipe in the wall pouring out green goo
      const py = GROUND - 150;
      circle(c, x, py, 22, '#3a463e'); circle(c, x, py, 15, '#0a0e0c');
      const gg = c.createLinearGradient(0, py, 0, GROUND); gg.addColorStop(0, '#7ad84a'); gg.addColorStop(1, '#3a8a2a');
      c.fillStyle = gg; c.fillRect(x - 9 + Math.sin(G.t * 3) * 1, py + 6, 18, GROUND - py - 6);
      c.fillStyle = 'rgba(220,255,180,0.45)';
      for (let k = 0; k < 4; k++) { const u = (G.t * 1.6 + k / 4) % 1; c.fillRect(x - 6 + k * 3, py + 8 + u * (GROUND - py - 14), 2, 10); }
      for (let k = 0; k < 3; k++) { const u = (G.t * 2 + k / 3) % 1; c.globalAlpha = 1 - u; circle(c, x + (k - 1) * 9 * u * 2, GROUND - 4 - Math.sin(u * Math.PI) * 14, 3, '#9ae04a'); }
      c.globalAlpha = 1;
    }
    for (const x of bg.holes) if (vis(x, 30) && Math.floor(G.t * 0.9 + x) % 5) {   // little holes with rat eyes in them
      circle(c, x, GROUND - 14, 9, '#050706'); circle(c, x - 3, GROUND - 15, 1.4, '#ff4030'); circle(c, x + 3, GROUND - 15, 1.4, '#ff4030');
    }
    // The walkway you fight on, a yellow-and-black edge, and the river of sludge.
    c.fillStyle = '#3a4238'; c.fillRect(x0, GROUND, x1 - x0, 12);
    c.fillStyle = '#525c50'; c.fillRect(x0, GROUND, x1 - x0, 2);
    c.fillStyle = '#e8c030'; c.fillRect(x0, GROUND + 12, x1 - x0, 4);
    c.fillStyle = '#1a1a1a'; for (let x = Math.floor(x0 / 24) * 24; x < x1; x += 24) poly(c, [x, GROUND + 16, x + 8, GROUND + 12, x + 14, GROUND + 12, x + 6, GROUND + 16]);
    const rg = c.createLinearGradient(0, GROUND + 16, 0, H); rg.addColorStop(0, '#3f7a28'); rg.addColorStop(1, '#1c3a14');
    c.fillStyle = rg; c.fillRect(x0, GROUND + 16, x1 - x0, H - GROUND - 16);
    c.fillStyle = 'rgba(200,255,150,0.18)';   // ripples flowing along
    for (let x = Math.floor(x0 / 70) * 70; x < x1; x += 70) { const k = hash(x); c.fillRect(x + ((G.t * 30 + k * 70) % 70), GROUND + 24 + k * 36, 18 + k * 20, 2); }
    for (let k = 0; k < 2; k++) {   // a rubber duck floating by (and a bottle)
      const dx = ((G.t * 22 + k * 1900) % (L.worldW + 400)) - 200, dy = GROUND + 34 + k * 14 + Math.sin(G.t * 2 + k) * 2;
      if (dx < x0 - 30 || dx > x1 + 30) continue;
      if (k === 0) { c.fillStyle = '#ffd23f'; c.beginPath(); c.ellipse(dx, dy, 9, 6, 0, 0, Math.PI * 2); c.fill(); circle(c, dx + 6, dy - 7, 4.5); poly(c, [dx + 10, dy - 8, dx + 15, dy - 6, dx + 10, dy - 5], '#ff8a1a'); circle(c, dx + 7, dy - 8, 1, '#1a1a1a'); }
      else { c.save(); c.translate(dx, dy); c.rotate(0.4); fillRR(c, -10, -3, 16, 7, 3, 'rgba(120,200,140,0.8)'); c.fillRect(6, -1.5, 6, 3.5); c.restore(); }
    }
  },
  front(c, L, camX) {
    const x0 = camX - 30, w = W + 60;
    const dark = c.createLinearGradient(0, 0, 0, 150);   // it's dark up near the roof
    dark.addColorStop(0, 'rgba(0,0,0,0.55)'); dark.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = dark; c.fillRect(x0, 0, w, 150);
    const n = IS_TOUCH ? 14 : 24;   // drips falling from the roof, splashing on the floor (worked out from the clock alone)
    c.fillStyle = '#b8f0a0';
    for (let i = 0; i < n; i++) {
      const sp = 0.55 + hash(i + 3) * 0.4, ph = G.t * sp + hash(i), k = ph - Math.floor(ph);
      const x = camX + hash(i * 7 + Math.floor(ph) * 3.1) * W, y = 66 + k * k * (GROUND - 66);
      c.globalAlpha = 0.55; c.fillRect(x, y, 1.6, 5 + k * 6);
      if (k > 0.94) { c.globalAlpha = 0.4; c.strokeStyle = '#b8f0a0'; c.lineWidth = 1; c.beginPath(); c.ellipse(x, GROUND + 2, 6 * (k - 0.94) / 0.06 + 2, 1.5, 0, 0, Math.PI * 2); c.stroke(); }
    }
    c.globalAlpha = 1;
  },
};

// ---- Platforms -----------------------------------------------------------------------
Object.assign(PLATFORM_TOP, { pipe: 64, catwalk: 120, junk: 56 });
Object.assign(PLATFORM_ART, {
  pipe(c, p) {   // a huge rusty pipe lying on its side on two stands, dripping slime out of the end
    const x = p.x, w = p.w, t = p.top;
    c.fillStyle = '#262c28'; for (const sx of [x + 18, x + w - 28]) c.fillRect(sx, t + 30, 10, GROUND - t - 30);
    fillRR(c, x - 4, t, w + 8, 38, 17, '#56645a');
    c.fillStyle = 'rgba(255,255,255,0.13)'; c.fillRect(x + 8, t + 5, w - 16, 4);
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(x + 4, t + 27, w - 8, 9);
    c.fillStyle = '#46524a'; for (let jx = x + 34; jx < x + w - 14; jx += 64) c.fillRect(jx, t - 2, 9, 42);
    c.fillStyle = 'rgba(150,90,50,0.55)'; for (let k = 0; k < 5; k++) circle(c, x + 14 + hash(x + k) * (w - 28), t + 10 + hash(k * 3 + x) * 18, 3 + hash(k + x * 2) * 4);
    c.fillStyle = '#0c100e'; c.beginPath(); c.ellipse(x + w + 3, t + 19, 6, 15, 0, 0, Math.PI * 2); c.fill();
    const u = (G.t * 0.8 + x * 0.01) % 1;
    c.fillStyle = '#7ad84a'; c.fillRect(x + w, t + 30, 5, 6); circle(c, x + w + 2.5, t + 36 + u * (GROUND - t - 40), 2.6);
  },
  catwalk(c, p) {   // a metal catwalk on legs, with a railing
    const x = p.x, w = p.w, t = p.top;
    c.strokeStyle = '#2e3438'; c.lineWidth = 3; c.beginPath();
    for (const lx of [x + 8, x + w - 8]) { c.moveTo(lx, t + 6); c.lineTo(lx, GROUND); }
    c.moveTo(x + 8, t + 10); c.lineTo(x + w - 8, GROUND - 6); c.moveTo(x + w - 8, t + 10); c.lineTo(x + 8, GROUND - 6);
    c.stroke();
    fillRR(c, x, t, w, 8, 2, '#5a646a');
    c.fillStyle = '#2a3034'; for (let gx = x + 4; gx < x + w - 4; gx += 7) c.fillRect(gx, t + 2, 4, 4);
    c.fillStyle = '#6a747a';
    for (let px = x + 1; px < x + w - 20; px += 30) c.fillRect(px, t - 24, 3, 24);
    c.fillRect(x + w - 4, t - 24, 3, 24);
    c.fillRect(x, t - 25, w, 3); c.fillRect(x, t - 13, w, 2);
    c.fillStyle = '#e8c030'; c.fillRect(x, t + 8, w, 2);
  },
  junk(c, p) {   // a pile of old tyres, a broken crate and a traffic cone
    const x = p.x, w = p.w, t = p.top;
    for (let i = 0; i < 3; i++) { const tx = x + 12 + i * (w - 24) / 2; c.fillStyle = '#16161a'; c.beginPath(); c.ellipse(tx, GROUND - 9, 18, 9, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = '#2e2e34'; c.beginPath(); c.ellipse(tx, GROUND - 9, 8, 4, 0, 0, Math.PI * 2); c.fill(); }
    fillRR(c, x + 4, t + 6, w - 8, GROUND - t - 22, 3, '#6a4e30');
    c.strokeStyle = '#4a3420'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 4, t + 6); c.lineTo(x + w - 4, GROUND - 16); c.moveTo(x + 4, t + 20); c.lineTo(x + w - 4, t + 20); c.stroke();
    c.fillStyle = '#16161a'; c.beginPath(); c.ellipse(x + w / 2, t + 3, w / 2 - 6, 6, 0, 0, Math.PI * 2); c.fill();
    poly(c, [x + w * 0.7, t - 1, x + w * 0.7 + 7, t - 22, x + w * 0.7 + 14, t - 1], '#ff7a1a');
    c.fillStyle = '#ffffff'; c.fillRect(x + w * 0.7 + 4, t - 12, 6, 3);
  },
});
