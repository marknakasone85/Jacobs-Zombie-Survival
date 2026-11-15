// Draws the game's app icon (the home-screen picture) with the game's own zombie drawing, at every size the
// phones and browsers ask for. Used only by tools/make_icons.py, which saves the pictures into icons/.
(function () {
  setTimeout(() => {
    try {
      G.t = 0;
      const z = Object.assign(makeZombieBody('walker', [2, 0, 0], 1), {
        x: 0, y: 0, facing: 1, walkT: 0.4, phase: 0, flash: 0, dead: false, atkAnim: 0.29, pose: 0, rage: 0,
      });
      // size in pixels; round = rounded corners with see-through edges (computers);
      // safe = the zombie kept inside the middle, because Android cuts "maskable" icons to a circle or other shape
      const draw = (size, { round = false, safe = false } = {}) => {
        const cv = document.createElement('canvas');
        cv.width = cv.height = size;
        const c = cv.getContext('2d');
        c.scale(size / 512, size / 512);
        if (round) { c.beginPath(); c.roundRect(0, 0, 512, 512, 112); c.clip(); }
        const sky = c.createLinearGradient(0, 0, 0, 512);
        sky.addColorStop(0, '#3d1f63'); sky.addColorStop(0.6, '#1c0f33'); sky.addColorStop(1, '#0b0716');
        c.fillStyle = sky; c.fillRect(0, 0, 512, 512);
        const glow = c.createRadialGradient(330, 180, 60, 330, 180, 230);
        glow.addColorStop(0, 'rgba(255,236,170,0.35)'); glow.addColorStop(1, 'rgba(255,236,170,0)');
        c.fillStyle = glow; c.fillRect(0, 0, 512, 512);
        circle(c, 330, 180, 118, '#f4e7b2');                        // the moon
        circle(c, 292, 150, 20, '#e2d39a'); circle(c, 372, 222, 14, '#e2d39a'); circle(c, 352, 128, 10, '#e2d39a');
        c.save();
        if (safe) { c.translate(256, 600); c.scale(0.8, 0.8); c.translate(-256, -600); }
        c.translate(176, 874); c.scale(11, 11);                     // a close-up: the head and a reaching arm
        drawZombie(c, z);
        c.restore();
        return cv.toDataURL('image/png');
      };
      const icons = {
        'icon-512': draw(512, { round: true }),
        'icon-192': draw(192, { round: true }),
        'icon-32': draw(32, { round: true }),
        'maskable-512': draw(512, { safe: true }),
        'apple-touch-icon': draw(180),
      };
      const out = document.createElement('script');
      out.type = 'application/json'; out.id = 'icon-out';
      out.textContent = JSON.stringify(icons);
      document.body.appendChild(out);
    } catch (e) { document.title = 'ERR ' + e.message; }
  }, 50);
})();
