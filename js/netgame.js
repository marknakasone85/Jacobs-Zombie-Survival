'use strict';
// Wi-Fi co-op (up to 4 players, each on their own computer or tablet).
//
// The host's computer runs the real game. Everyone else sends their buttons to the host
// and draws what the host sends back about 25 times a second (a "snapshot"), plus the
// effects and sounds that happened since the last one, so every screen sees and hears the same fight.
//
// Every player keeps their own coins and guns on their own device: guests send theirs when
// they join, the host keeps the score during the game, and guests save what they earned.
// Between waves everyone shops together: you see your teammates' wallets, buy for yourself and press READY.

const WEAPON_IDS = WEAPONS.map(w => w.id);
const BULLET_KINDS = ['pellet', 'bullet', 'slug', 'flame', 'rocket', 'bolt', 'plasma', 'inferno', 'shrap', 'gl', 'hrocket'];
const r1 = v => Math.round(v * 10) / 10, r2 = v => Math.round(v * 100) / 100;
const ownedMask = prof => WEAPON_IDS.reduce((m, id, i) => m | (prof.owned.includes(id) ? 1 << i : 0), 0);
const maskOwned = m => WEAPON_IDS.filter((id, i) => m & (1 << i));
const armorMask = prof => ARMOR_IDS.reduce((m, id, i) => m | ((prof.armors || []).includes(id) ? 1 << i : 0), 0);
const maskArmors = m => ARMOR_IDS.filter((id, i) => m & (1 << i));
function cleanProfile(p) {   // a guest's coins and guns as they sent them (checked, never trusted blindly)
  const out = newProfile();
  if (p && typeof p === 'object') {
    if (Number.isFinite(p.coins)) out.coins = clamp(Math.floor(p.coins), 0, 999999);
    if (Array.isArray(p.owned)) out.owned = [...new Set(['pistol', ...p.owned.filter(id => WMAP[id])])];
    if (WMAP[p.equipped] && out.owned.includes(p.equipped)) out.equipped = p.equipped;
    if (Array.isArray(p.armors)) out.armors = [...new Set(p.armors.filter(id => ARMOR_MAP[id]))];
    if (out.armors.includes(p.armor)) out.armor = p.armor;
    if (Number.isFinite(p.boost)) out.boost = clamp(Math.floor(p.boost), 0, HEALTH_BOOSTS.length);
    if (p.nades && typeof p.nades === 'object') out.nades = cleanNades(p.nades);
    if (NADE_MAP[p.nade]) out.nade = p.nade;
  }
  return out;
}

// Only one window can host. If you press HOST A GAME in a second window, the first one stops.
const TAKEN_OVER = 'Another window on this computer started hosting, so this window stopped. Use the newest window (only one window can host).';

const NetGame = {
  slots: {},            // host: id -> { id, prof, remote, ready }
  seq: 0, lastN: 0, sendT: 0,
  lobbyLevel: 0,
  // guest-side
  snap: null, shopData: null, ready: false, guestAim: 'keys', presses: [],
  inT: 0, mouseT: 0, lastBool: '', lastMouse: '', profKey: '',

  // ---------------------------------------------------------------- hosting
  async host() {
    await Net.host();
    Net.onMessage = (m, from) => this.hostMessage(m, from);
    this.slots = { 0: { id: 0, prof: save.players[0], remote: null, ready: true } };
    Rec.on = true;
    startHostTicker();
    this.toLobby();
  },
  toLobby() {   // host: everyone back to the lobby
    clearWorld();
    G.players = [];
    for (const s of Object.values(this.slots)) s.ready = false;
    G.level = LEVELS[Math.min(this.lobbyLevel, save.unlocked - 1)]; G.platforms = buildPlatforms(G.level);
    setState('lobby');
    renderLobby(); showOverlay('lobby');
  },
  guestSlots() { return Object.values(this.slots).filter(s => s.id !== 0); },
  addSlot(id) {
    if (!this.slots[id]) this.slots[id] = { id, prof: newProfile(), remote: { left: false, right: false, down: false, jump: false, fire: false, md: false, mx: 0, my: 0 }, ready: false, seen: performance.now(), won: [] };
    return this.slots[id];
  },
  removeGuest(id) {
    const p = G.players.find(q => q.id === id);
    delete this.slots[id];
    if (p) { G.players = G.players.filter(q => q !== p); toast(`${p.look.tag} left the game`); }
    renderLobbyOrShop();
  },
  // Host: make the player list for a new level from everyone in the game.
  buildPlayers(x) {
    return Object.values(this.slots).sort((a, b) => a.id - b.id).map((s, k) =>
      makePlayer(s.id, x + k * 50, s.id === 0 ? { ctrl: CONTROLS.solo } : { ctrl: CONTROLS.remote, prof: s.prof, remote: s.remote }));
  },
  // Host: someone joined in the middle of a level, so drop them in next to the team.
  addMidGame(s) {
    if (!['playing', 'cleared', 'dying', 'shop', 'over'].includes(G.state) || G.players.some(p => p.id === s.id)) return;
    const buddy = alivePlayers()[0] || G.players[0];
    const p = makePlayer(s.id, buddy ? buddy.x - 30 : G.level.worldW * 0.35, { ctrl: CONTROLS.remote, prof: s.prof, remote: s.remote });
    p.inv = 2; p.y = GROUND - 300; p.onGround = false;
    G.players.push(p); G.players.sort((a, b) => a.id - b.id);
    G.run.coins[s.id] = 0;
    banner(`${p.look.tag} JOINED!`, '', 1.6, p.look.tagCol);
  },
  hostMessage(m, from) {
    if (!m || typeof m !== 'object') return;
    if (from === 'server') {
      if (m.t === 'joined') { this.addSlot(m.id).seen = performance.now(); renderLobbyOrShop(); }
      else if (m.t === 'left') this.removeGuest(m.id);
      else if (m.t === 'replaced') leaveWifi(TAKEN_OVER);
      return;
    }
    if (!Number.isInteger(from) || from < 1 || from > 3) return;
    const s = this.addSlot(from);
    s.seen = performance.now();
    const p = G.players.find(q => q.id === from);
    switch (m.t) {
      case 'hello':
        s.prof = cleanProfile(m.prof);
        if (p) { p.prof = s.prof; if (!s.prof.owned.includes(p.weapon)) p.weapon = s.prof.equipped; applyGear(p); }
        else this.addMidGame(s);
        renderLobbyOrShop();
        break;
      case 'in': {
        const r = s.remote;
        Object.assign(r, { left: !!m.l, right: !!m.r, down: !!m.d, jump: !!m.j, fire: !!m.f, md: !!m.md, mx: +m.mx || 0, my: +m.my || 0 });
        if (!p) break;
        p.aimMode = m.mm ? 'mouse' : 'keys';
        for (const k of Array.isArray(m.p) ? m.p.slice(0, 8) : []) {
          if (k === 'jump') p.jumpBuf = 0.13;
          else if (k === 'prev') cycleWeapon(p, -1);
          else if (k === 'next') cycleWeapon(p, 1);
          else if (k === 'nade') throwNade(p);
          else if (k === 'ntype') cycleNade(p);
          else if (/^s\d{1,2}$/.test(k)) selectSlot(p, +k.slice(1));
        }
        break;
      }
      case 'buy': { const wp = WMAP[m.w]; if (wp && G.state === 'shop') shopBuy(from, wp); break; }
      case 'equip': if (WMAP[m.w] && G.state === 'shop') shopEquip(from, m.w); break;
      case 'medkit': if (G.state === 'shop') shopMedkit(from); break;
      case 'sell': { const wp = WMAP[m.w]; if (wp && G.state === 'shop') shopSell(from, wp); break; }
      case 'armorBuy': case 'armorWear': case 'armorSell':
        if (ARMOR_MAP[m.w] && G.state === 'shop') shopArmor(from, m.t.slice(5).toLowerCase(), m.w);
        break;
      case 'boost': if (G.state === 'shop') shopBoost(from); break;
      case 'nadeBuy': case 'nadePick': if (NADE_MAP[m.w] && G.state === 'shop') shopNade(from, m.t === 'nadeBuy' ? 'buy' : 'pick', m.w); break;
      case 'ready': s.ready = !!m.v; if (G.state === 'shop') renderShop(); break;
    }
  },
  hostTick(dt) {
    Net.maintain(dt, () => {   // the host's connection came back with the same code: everyone rejoins
      for (const s of this.guestSlots()) delete this.slots[s.id];
      G.players = G.players.filter(p => p.id === 0);
      renderLobbyOrShop();
    }, () => leaveWifi(TAKEN_OVER));
    // Friends send a heartbeat every second. One we haven't heard from in 25 seconds has gone.
    const now = performance.now();
    for (const s of this.guestSlots()) if (now - s.seen > 25000) this.removeGuest(s.id);
    if (!this.guestSlots().length) { Rec.take(); return; }
    this.sendT -= dt;
    if (this.sendT > 0) return;
    // If the network is busy, wait for it instead of skipping, so no effects or sounds get lost.
    if (Net.inflight > 2) return;
    this.sendT = G.state === 'lobby' || G.state === 'shop' ? 0.2 : 0.04;
    Net.send(this.snapshot());
  },
  snapshot() {
    const b = Rec.take();
    const s = { t: 's', n: ++this.seq, st: G.state === 'paused' ? G.pausedFrom : G.state, lv: G.levelIndex, wv: G.waveIndex, cam: r1(G.camX), left: zombiesLeft(), sh: r1(G.shake), hf: r2(G.hurtFlash), boss: G.boss && !G.boss.dead ? G.boss.uid : 0, fx: b.fx, au: b.au };
    s.pl = G.players.map(p => [p.id, r1(p.x), r1(p.y), Math.round(p.vx), p.facing, r2(p.aim), p.onGround ? 1 : 0, Math.ceil(p.hp), p.dead ? 1 : 0, r2(p.deadT), r2(p.inv),
      WEAPON_IDS.indexOf(p.weapon), r2(p.recoil), r2(p.flashT), r2(p.walkT), p.cd <= 0.08 ? 1 : 0, p.prof.coins, r2(p.coinPulse || 0),
      p.target && !p.target.dead ? p.target.uid : 0, p.aimMode === 'mouse' ? 1 : 0, p.firing ? 1 : 0, ownedMask(p.prof), p.maxHp, r2(p.swingT || 0), r2(p.swingDur || 0),
      ARMOR_IDS.indexOf(p.armorId) + 1, Math.ceil(p.armor || 0), p.maxArmor || 0, armorMask(p.prof), p.prof.boost || 0,
      NADE_IDS.map(id => nadeCount(p.prof, id)), Math.max(0, NADE_IDS.indexOf(p.prof.nade)), r2(p.throwT || 0), p.vface || 1]);
    s.zs = G.zombies.map(z => [z.uid, ZTYPE_NAMES.indexOf(z.type), r1(z.x), r1(z.y), z.facing, z.flash > 0 ? 1 : 0, z.dead ? 1 : 0, r2(z.deadT), r2(z.walkT), r2(z.atkAnim), r2(clamp(z.hp / z.maxHp, 0, 1)), z.ci[0], z.ci[1], z.ci[2], r1(z.phase), z.sz || 1, z.pose || 0, z.onGround ? 1 : 0, z.frozen > 0 ? 1 : 0, z.sticky > 0 ? 1 : 0, z.shocked > 0 ? 1 : 0]);
    s.bu = G.bullets.filter(q => q.dist >= q.hide * 0.7).map(q => [BULLET_KINDS.indexOf(q.kind), Math.round(q.x), Math.round(q.y), Math.round(q.vx), Math.round(q.vy), r2(q.life / q.max)]);
    s.gr = G.nades.map(g => [NADE_IDS.indexOf(g.type), Math.round(g.x), Math.round(g.y), r1(g.rot), g.stuck ? 1 : 0, r2(g.fuse)]);
    s.po = G.pools.map(q => [Math.round(q.x), Math.round(q.y), q.w, r2(q.t / q.max), Math.max(0, POOL_KINDS.indexOf(q.kind))]);
    s.es = G.shots.map(q => [SHOT_IDS.indexOf(q.kind), Math.round(q.x), Math.round(q.y), r1(q.rot)]);
    s.kc = [G.run.kills, G.killGoal];
    if (G.state === 'rescue') s.rs = [r2(G.rescueT), Math.round(G.rescueX)];   // the ending (js/rescue.js)
    s.ba = G.barrels.map(b => [BARREL_IDS.indexOf(b.kind), r1(b.fly ? b.cx : b.x), r1(b.fly ? b.cy : b.y), r2(b.rot), (b.gone ? 1 : 0) | (b.fly ? 2 : 0) | (b.armed ? 4 : 0),
      r2(clamp(b.hp / b.T.hp, 0, 1)), r2(b.drop), r2(b.wob), r2(b.flash)]);
    s.bm = G.beams.map(m => [Math.round(m.x1), Math.round(m.y1), Math.round(m.x2), Math.round(m.y2), r2(m.t)]);
    s.co = G.coins.map(c => [c.kind === 'heart' ? 1 : 0, c.val, Math.round(c.x), Math.round(c.float ? c.baseY : c.y), c.float ? 1 : 0, r1(c.t), c.pull ? 1 : 0, Math.round(c.vx || 0), Math.round(c.vy || 0)]);
    if (G.state === 'shop') s.shop = { next: G.next, ready: this.readyIds() };
    if (G.state === 'over' || G.state === 'win') s.run = G.run;
    if (G.state === 'lobby') s.lobby = Object.values(this.slots).map(sl => [sl.id, sl.prof.coins]);
    s.won = Object.fromEntries(this.guestSlots().filter(sl => sl.won.length).map(sl => [sl.id, sl.won]));
    return s;
  },
  readyIds() { return this.guestSlots().filter(s => s.ready).map(s => s.id); },
  // Host: everyone playing when a level is beaten gets it unlocked on their own device.
  levelWon(i) { for (const p of G.players) { const s = this.slots[p.id]; if (s && s.id !== 0 && !s.won.includes(i)) s.won.push(i); } },

  // ---------------------------------------------------------------- joining
  async join(code) {
    await Net.join(code);
    Net.onMessage = (m, from) => this.guestMessage(m, from);
    Object.assign(this, { lastN: 0, shopData: null, ready: false, presses: [], profKey: '' });
    clearWorld(); G.players = [];
    this.sayHello();
    setState('lobby'); renderLobby(); showOverlay('lobby');
  },
  sayHello() { Net.send({ t: 'hello', prof: save.players[0] }, 'host', true); },
  guestMessage(m, from) {
    if (!m || typeof m !== 'object') return;
    if (from === 'server') {
      if (m.t === 'hostLeft' && !m.rehost) leaveWifi(m.reason || 'The host ended the game.');
      return;
    }
    if (m.t === 's') this.apply(m);
  },
  // Guest: turn the host's snapshot into things we can draw.
  apply(s) {
    if (s.n <= this.lastN && s.n > 5) return;   // an old one that arrived late
    this.lastN = s.n;
    if (!G.level || G.levelIndex !== s.lv || G.level !== LEVELS[s.lv]) { G.levelIndex = s.lv; G.level = LEVELS[s.lv] || LEVELS[0]; G.platforms = buildPlatforms(G.level); }
    const before = G.state;
    G.state = s.st; G.waveIndex = s.wv; G.camX = s.cam; G.netLeft = s.left; G.shake = s.sh; G.hurtFlash = Math.max(G.hurtFlash, s.hf);
    const oldP = new Map(G.players.map(p => [p.id, p]));
    G.players = s.pl.map(a => {
      const p = oldP.get(a[0]) || makePlayer(a[0], a[1], { ctrl: CONTROLS.remote, prof: newProfile(), remote: {} });
      [, p.x, p.y, p.vx, p.facing, p.aim] = a;
      p.onGround = !!a[6]; p.hp = a[7]; p.dead = !!a[8]; p.deadT = a[9]; p.inv = a[10];
      p.weapon = WEAPON_IDS[a[11]] || 'pistol'; p.recoil = a[12]; p.flashT = a[13]; p.walkT = a[14]; p.cd = a[15] ? 0 : 1;
      p.prof.coins = a[16]; p.coinPulse = a[17]; p.targetUid = a[18]; p.aimMode = a[19] ? 'mouse' : 'keys'; p.firing = !!a[20];
      p.prof.owned = maskOwned(a[21]); p.prof.equipped = p.weapon; p.maxHp = a[22];
      if (a[23] > (p.swingT || 0) + 0.02) { p.swingT = a[23]; p.swingDur = a[24]; }   // a new melee swing started (we animate it here)
      p.armorId = ARMOR_IDS[(a[25] || 0) - 1] || ''; p.armor = a[26] || 0; p.maxArmor = a[27] || 0;   // armor and health boosts
      p.prof.armors = maskArmors(a[28] || 0); p.prof.armor = p.armorId; p.prof.boost = a[29] || 0;
      p.prof.nades = Object.fromEntries(NADE_IDS.map((id, i) => [id, (Array.isArray(a[30]) && +a[30][i]) || 0])); p.prof.nade = NADE_IDS[a[31]] || 'frag';
      if ((a[32] || 0) > (p.throwT || 0) + 0.02) p.throwT = a[32];   // a new grenade throw started (we animate it here)
      p.veh = G.level.vehicle || false; p.vface = a[33] === -1 ? -1 : 1;   // in a truck or helicopter on the vehicle levels (js/vehicles.js)
      return p;
    });
    const oldZ = new Map(G.zombies.map(z => [z.uid, z]));
    G.zombies = s.zs.map(a => {
      let z = oldZ.get(a[0]);
      if (!z) { z = makeZombieBody(ZTYPE_NAMES[a[1]] || 'walker', [a[11], a[12], a[13]], a[15] || 1); z.uid = a[0]; }
      [, , z.x, z.y, z.facing] = a;
      z.flash = a[5] ? 0.05 : 0; z.dead = !!a[6]; z.deadT = a[7]; z.walkT = a[8]; z.atkAnim = a[9]; z.hp = a[10]; z.maxHp = 1; z.phase = a[14];
      z.pose = a[16] || 0; z.onGround = a[17] !== 0;   // a charging sheep, a hopping kangaroo...
      z.frozen = a[18] ? 1 : 0;                          // stuck in a block of ice
      z.sticky = a[19] ? 1 : 0; z.shocked = a[20] ? 1 : 0;   // stuck in slime, zapped by lightning (js/barrels.js)
      return z;
    });
    G.boss = s.boss ? G.zombies.find(z => z.uid === s.boss) || null : null;
    for (const p of G.players) p.target = p.targetUid ? G.zombies.find(z => z.uid === p.targetUid) || null : null;
    G.bullets = s.bu.map(a => ({ kind: BULLET_KINDS[a[0]], x: a[1], y: a[2], vx: a[3], vy: a[4], life: a[5], max: 1, dist: 1, hide: 0 }));
    G.nades = (s.gr || []).map(a => ({ type: NADE_IDS[a[0]] || 'frag', x: a[1], y: a[2], rot: a[3], stuck: !!a[4], fuse: a[5] }));
    G.pools = (s.po || []).map(a => ({ x: a[0], y: a[1], w: a[2], k: a[3], kind: POOL_KINDS[a[4]] || 'acid' }));
    G.shots = (s.es || []).map(a => ({ kind: SHOT_IDS[a[0]] || 'snow', x: a[1], y: a[2], rot: a[3] || 0 }));
    if (Array.isArray(s.kc)) G.netKills = s.kc;
    if (Array.isArray(s.rs)) [G.rescueT, G.rescueX] = s.rs;
    G.barrels = (s.ba || []).map(a => {
      const kind = BARREL_IDS[a[0]] || 'boom', T = BARRELS[kind], f = a[4] | 0;
      return { kind, T, w: T.w, h: T.h, x: a[1], y: a[2], cx: a[1], cy: a[2], rot: a[3] || 0, gone: !!(f & 1), fly: !!(f & 2), armed: !!(f & 4),
        hpK: a[5], drop: a[6] || 0, wob: a[7] || 0, flash: a[8] || 0 };
    });
    G.beams = s.bm.map(a => ({ x1: a[0], y1: a[1], x2: a[2], y2: a[3], t: a[4], max: 0.16 }));
    G.coins = s.co.map(a => ({ kind: a[0] ? 'heart' : 'coin', val: a[1], x: a[2], y: a[3], baseY: a[3], float: !!a[4], t: a[5], spin: 0, pull: !!a[6], vx: a[7] || 0, vy: a[8] || 0 }));
    for (const [name, args] of s.fx || []) if (FX_NAMES.has(name) && Array.isArray(args)) window[name](...args);
    for (const [k, a] of s.au || []) {
      if (k === 'p') Sound.play(a[0], a[1] === null ? undefined : a[1], a[2]);
      else if (k === 'z') Sound.zombie({ type: a[0], voice: a[1], x: a[2] }, a[3]);
    }
    if (s.shop) this.shopData = s.shop;
    if (s.run) G.run = s.run;
    if (s.lobby) this.lobbyData = s.lobby;
    for (const i of (s.won && s.won[Net.id]) || []) if (Number.isInteger(i) && !save.beaten.includes(i)) markBeaten(i);
    this.saveMine();
    if (G.state !== before) this.guestStateChanged(before);
    else if (G.state === 'shop') renderShop(true);
    else if (G.state === 'lobby') renderLobby(true);
  },
  // Guest: keep the coins and guns we earned in this game on our own device.
  saveMine() {
    const me = G.players.find(p => p.id === Net.id); if (!me) return;
    const key = [me.prof.coins, me.prof.owned.join(','), me.weapon, me.prof.armors.join(','), me.prof.armor, me.prof.boost, NADE_IDS.map(id => nadeCount(me.prof, id)).join(','), me.prof.nade].join('|');
    if (key === this.profKey) return;
    this.profKey = key;
    Object.assign(save.players[0], { coins: me.prof.coins, owned: me.prof.owned.slice(), equipped: me.weapon, armors: me.prof.armors.slice(), armor: me.prof.armor, boost: me.prof.boost,
      nades: cleanNades(me.prof.nades), nade: me.prof.nade });
    writeSave();
  },
  guestStateChanged(before) {
    if (before === 'shop') this.ready = false;
    if (G.state === 'shop') { renderShop(); showOverlay('shop'); }
    else if (G.state === 'over') showGameOver();
    else if (G.state === 'win') showWin();
    else if (G.state === 'lobby') { renderLobby(); showOverlay('lobby'); }
    else if (!document.getElementById('netmenu').classList.contains('show')) hideOverlays();
  },
  guestTick(dt) {
    Net.maintain(dt, () => this.sayHello(), () => leaveWifi('The Wi-Fi game ended or has a new code. Ask the host for the code and join again.'));
    for (const c of G.coins) { c.spin = G.t * 6 + c.x * 0.1; if (c.float) c.y = c.baseY + Math.sin(G.t * 3 + c.x * 0.05) * 3; }
    for (const p of G.players) { p.coinPulse = Math.max(0, (p.coinPulse || 0) - dt * 3); p.flashT -= dt; p.swingT = Math.max(0, (p.swingT || 0) - dt); p.throwT = Math.max(0, (p.throwT || 0) - dt); }
    G.hurtFlash = Math.max(0, G.hurtFlash - dt);
    updateFX(dt);
    if (G.state === 'rescue') { G.rescueT = (G.rescueT || 0) + dt; Sound.hold('rotor', 'rotor', G.rescueT < RESCUE_TIME - 1, heliPos(G.rescueT).x); }
    for (const p of G.players) {
      Sound.hold('flame' + p.id, p.weapon === 'incin' ? 'inferno' : 'flame', p.firing && !p.dead && isFlame(WMAP[p.weapon].kind), p.x);
      Sound.hold('motor' + p.id, 'motor', p.firing && !p.dead && p.weapon === 'minigun', p.x);
      Sound.hold('hum' + p.id, 'hum', !p.dead && p.weapon === 'saber', p.x);
      if (p.veh) Sound.hold('engine' + p.id, p.veh === 'heli' ? 'rotor' : 'engine', PLAYING.includes(G.state) && !p.dead, p.x, Math.abs(p.vx) / TRUCK.max);
    }
    this.sendInput(dt);
    // Heartbeat, and keep saying hello until the host has us on its list.
    this.hbT = (this.hbT || 0) - dt;
    if (this.hbT <= 0) {
      this.hbT = 1;
      const listed = G.state === 'lobby' ? (this.lobbyData || []).some(q => q[0] === Net.id) : G.players.some(p => p.id === Net.id);
      if (!listed) this.sayHello(); else if (performance.now() - (this.lastSent || 0) > 900) Net.send({ t: 'hb' }, 'host');
    }
  },
  // Guest: send our buttons when they change, every key press, and a heartbeat twice a second.
  sendInput(dt) {
    if (!['playing', 'cleared', 'dying'].includes(G.state) || document.querySelector('.overlay.show')) { this.presses = []; return; }
    const c = CONTROLS.solo, k = list => list.some(n => keys[n]);
    const mm = this.guestAim === 'mouse';
    const m = { t: 'in', l: k(c.left) || touch.left, r: k(c.right) || touch.right, d: k(c.down) || touch.down, j: k(c.jump) || touch.jump, f: k(c.fire) || touch.fire,
      md: mm && mouse.down, mm, mx: Math.round(mouse.sx + G.camX), my: Math.round(mouse.sy), p: this.presses };
    const bools = [m.l, m.r, m.d, m.j, m.f, m.md, m.mm].map(Number).join('');
    const mouseKey = mm ? `${Math.round(m.mx / 4)},${Math.round(m.my / 4)}` : '';
    this.inT -= dt; this.mouseT -= dt;
    const urgent = this.presses.length > 0 || bools !== this.lastBool;
    if (urgent || this.inT <= 0 || (mouseKey !== this.lastMouse && this.mouseT <= 0)) {
      if (Net.send(m, 'host', urgent)) {
        this.inT = 0.5; this.mouseT = 0.05; this.lastBool = bools; this.lastMouse = mouseKey; this.presses = []; this.lastSent = performance.now();
      }
    }
  },
  press(name) { if (this.presses.length < 8) this.presses.push(name); },
};

// ---- Lobby screen -------------------------------------------------------------
function renderLobby(quiet = false) {
  const host = Net.isHost;
  const people = host ? Object.values(NetGame.slots).map(s => [s.id, s.prof.coins]) : (NetGame.lobbyData || []);
  const key = JSON.stringify([host, people, save.unlocked, Net.code]);
  if (quiet && key === renderLobby.key) return;
  renderLobby.key = key;
  $('lobbyHost').style.display = host ? '' : 'none';
  $('lobbyGuest').style.display = host ? 'none' : '';
  $('lCode').textContent = Net.code || '----';
  $('lAddr').textContent = (Net.address || location.origin).replace(/^https?:\/\//, '');
  $('lGuestCode').textContent = Net.code || '';
  $('lPlayers').innerHTML = [0, 1, 2, 3].map(id => {
    const p = people.find(q => q[0] === id), look = LOOKS[id];
    if (!p) return `<div class="lp empty"><span class="ptag p${id + 1}">P${id + 1}</span>waiting...</div>`;
    const me = id === (Net.id ?? 0);
    return `<div class="lp"><span class="ptag p${id + 1}">${look.tag}</span>${id === 0 ? 'Host' : 'Player ' + (id + 1)}${me ? ' (you)' : ''}<span class="lpc"><i class="coin"></i>${p[1]}</span></div>`;
  }).join('');
  const box = $('lLevels'); box.innerHTML = '';
  if (!host) return;
  LEVELS.forEach((L, i) => {
    const locked = i >= save.unlocked;
    const b = document.createElement('button');
    b.className = 'lvl' + (locked ? ' locked' : '') + (save.beaten.includes(i) ? ' beaten' : '');
    b.disabled = locked;
    b.innerHTML = `<span class="lnum">${locked ? '🔒' : 'PLAY LEVEL ' + (i + 1)}</span><span class="lname">${L.name}</span><span class="lblurb">${locked ? `Beat ${LEVELS[i - 1].name} to unlock` : L.blurb}</span>`;
    b.addEventListener('click', () => { blurAll(); Sound.init(); NetGame.lobbyLevel = i; startLevel(i); });
    box.appendChild(b);
  });
}
function renderLobbyOrShop() {
  if (G.state === 'lobby') renderLobby();
  else if (G.state === 'shop') renderShop();
}
// Leave a Wi-Fi game (or end it, for the host) and go back to the title screen.
function leaveWifi(message) {
  if (Net.isHost) stopHostTicker();
  Net.leave();
  Rec.on = false; Rec.take();
  NetGame.slots = {};
  clearWorld(); G.players = [];
  toTitle('net');
  if (message) $('netErr').textContent = message;
}
