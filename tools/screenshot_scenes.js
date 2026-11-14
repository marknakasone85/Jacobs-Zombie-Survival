// Sets up the scenes for the README pictures (screenshots/). Used only by tools/take_screenshots.py, which
// opens the game with #scene (or #scene,seconds to try a different moment) and takes a picture.
// The world is frozen once the scene is ready (step does nothing) while the page keeps drawing it.
(function () {
  const [sc, extra] = decodeURIComponent(location.hash.slice(1)).split(',');
  window.onerror = (m, src, l) => { document.title = 'ERR ' + m + ' @' + l; };
  setTimeout(() => {
    try {
      const two = ['heli', 'nyc'].includes(sc);
      save.unlocked = LEVELS.length; save.numPlayers = two ? 2 : 1;
      const suits = ['military', 'space'];
      save.players.forEach((pr, i) => { pr.owned = WEAPONS.map(w => w.id); pr.coins = 1800 + i * 345; pr.armors = ARMORS.map(a => a.id); pr.armor = suits[i % 2]; });
      if (sc === 'shop') {
        save.players[0].owned = ['pistol', 'shotgun', 'smg', 'sword', 'magnum']; save.players[0].coins = 1460; save.players[0].armor = ''; save.players[0].armors = [];
        openShop({ level: 10, wave: 2 }); renderShop();
        document.title = 'READY'; return;
      }
      const lvl = { snow: 3, strike: 15, heli: 13, nyc: 12, beach: 10, mall: 11, sewer: 14, barrels: 5 }[sc];
      startLevel(lvl); G.queue = ['walker']; G.spawnT = 1e9; G.bossPending = false;
      const p = G.players[0], p2 = G.players[1];
      const run = (sec, f) => { for (let i = 0; i < Math.round(sec * 60); i++) { for (const q of G.players) { q.hp = q.maxHp; q.inv = 1e9; } if (f) f(i); step(1 / 60); } };
      const place = (type, x, o = {}) => { const z = spawnZombie(type); z.x = x; if (!z.T.fly && !z.T.drops) { z.y = GROUND; z.prevY = GROUND; } Object.assign(z, o); return z; };
      let cam = null;
      if (sc === 'strike') {   // the twist: heavy bombers carpet bombing the flood
        G.barrels = []; G.zombies.length = 0; G.waveIndex = G.level.waves.length - 1; G.queue = [];
        p.x = 2000; p.weapon = 'minigun'; run(0.2);
        startFinale(); keys[' '] = true;
        for (let i = 0; i < 4000 && G.finale.t < (+extra || 19.8); i++) run(1 / 60);
        keys[' '] = false; G.banner = null;
      } else if (sc === 'heli') {   // two helicopters over the bridge
        G.barrels = [];
        p.weapon = 'minigun'; p2.weapon = 'quad'; p2.x = p.x - 330;
        for (let i = 0; i < 16; i++) { const z = spawnZombie(pick(['walker', 'runner', 'roo', 'crow', 'crow', 'dog'])); z.x = p.x - 200 + i * 60; z.atkCd = 99; }
        keys.d = true; keys[' '] = true; keys.arrowright = true; keys.enter = true;
        run(+extra || 1.1, i => { if (i === 20) keys.w = true; if (i === 45) keys.w = false; if (i === 5) keys.arrowup = true; if (i === 25) keys.arrowup = false; });
        keys.d = keys[' '] = keys.arrowright = keys.enter = false;
      } else if (sc === 'nyc') {   // the swarm, from both sides
        G.barrels = [];
        p.x = 1700; p2.x = 1560; p.weapon = 'minigun'; p2.weapon = 'incin'; p.facing = 1; p2.facing = -1;
        const kinds = ['walker', 'walker', 'runner', 'dog', 'tiny', 'leaper', 'bombie', 'riot', 'brute'];
        for (let i = 0; i < 40; i++) place(pick(kinds), 1800 + i * 15 + Math.random() * 12);
        for (let i = 0; i < 32; i++) place(pick(kinds), 1450 - i * 15 - Math.random() * 12);
        for (let i = 0; i < 4; i++) place('crow', 1300 + i * 260, { y: GROUND - 160 - i * 30 });
        keys[' '] = true; keys.enter = true;
        run(+extra || 0.7, () => { p.facing = 1; p2.facing = -1; });
        keys[' '] = keys.enter = false;
      } else if (sc === 'snow') {   // the Yeti and sliding penguins in the snow
        G.barrels = [];
        p.x = 1100; p.weapon = 'rocket'; p.facing = 1;
        place('yeti', 1520); place('penguin', 1330, { chargeCd: 0 }); place('penguin', 1420); place('bear', 1650); place('walker', 1260); place('tiny', 1290); place('tiny', 1310);
        place('penguin', 900); place('runner', 820);
        keys[' '] = true; run(+extra || 0.8, () => { p.facing = 1; }); keys[' '] = false;
        cam = 820;
      } else if (sc === 'beach') {   // Captain Crab and his crabs
        G.barrels = [];
        p.x = 1450; p.weapon = 'aa12'; p.facing = 1;
        const b = place('capcrab', 1950, { throwCd: 0.4 });
        for (let i = 0; i < 5; i++) place('crab', 1640 + i * 55);
        place('gull', 1500, { y: GROUND - 200 }); place('gull', 1800, { y: GROUND - 250 }); place('walker', 1250); place('runner', 1180);
        keys[' '] = true; run(+extra || 1.0, () => { p.facing = 1; }); keys[' '] = false;
        cam = 1080;
      } else if (sc === 'mall') {   // mannequins only move when nobody looks
        G.barrels = [];
        p.x = 1500; p.weapon = 'plasma'; p.facing = 1;
        place('mascot', 1980); place('mannequin', 1700); place('mannequin', 1790); place('mannequin', 1240); place('mannequin', 1150); place('walker', 1630); place('runner', 1860);
        keys[' '] = true; run(+extra || 0.9, () => { p.facing = 1; }); keys[' '] = false;
        cam = 1080;
      } else if (sc === 'sewer') {   // the Sludge Monster
        G.barrels = [];
        p.x = 1100; p.weapon = 'flame'; p.facing = 1;
        const z = place('sludge', 1520, { throwCd: 0.3 });
        place('slime', 1330); place('blob', 1270); place('rat', 1390); place('rat', 1220); place('bat', 1250, { y: GROUND - 170 });
        const bb = place('bombie', 1000, { facing: 1 });
        keys[' '] = true; run(+extra || 0.9, () => { p.facing = 1; }); keys[' '] = false;
        bb.fuse = 0.5; bb.pose = 1;
        cam = 860;
      } else if (sc === 'barrels') {   // a chain of exploding barrels
        p.x = 560; p.facing = 1; p.weapon = 'smg';
        G.barrels = [makeBarrel('boom', 760), makeBarrel('boom', 900), makeBarrel('oil', 1040), makeBarrel('gas', 1180)];
        ['walker', 'runner', 'walker', 'brute', 'walker', 'walker', 'runner', 'walker', 'dog', 'walker'].forEach((t, i) => place(t, 700 + i * 55, { atkCd: 99 }));
        run(0.2); hitBarrel(G.barrels[0], 99, 1); run(+extra || 0.62);
        cam = 500;
      }
      if (G.killGoal) G.run.kills = Math.max(G.run.kills, Math.round(G.killGoal * 0.62));
      G.banner = sc === 'strike' ? G.banner : null; if (cam !== null) G.camX = cam;
      window.step = () => {};   // freeze the world; the page keeps drawing it
      if (!document.title.startsWith('ERR')) document.title = 'READY';
    } catch (e) { document.title = 'ERR ' + e.message + ' ' + (e.stack || '').split('\n')[1]; }
  }, 50);
})();
