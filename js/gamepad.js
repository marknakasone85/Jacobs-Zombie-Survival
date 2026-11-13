'use strict';
// Game controllers: Xbox, PlayStation, Switch Pro and others the browser knows.
// Each controller's buttons become pretend keys like 'pad0:jump' (listed in CONTROLS in js/util.js),
// so a controller works everywhere the keyboard does, Wi-Fi games included.
//   One player: any controller.
//   Two players: controller 1 is player 1 and controller 2 is player 2. With just one controller
//   it belongs to player 2, so player 1 keeps the keyboard.
// Browsers only show a controller to the page after one of its buttons has been pressed.
//
//   Left stick or D-pad  move (down drops off a platform)    A or D-pad up  jump
//   RT or X              shoot                                LT or B        throw a grenade
//   Y                    switch grenade type                  LB / RB        switch gun
//   Start                pause

const PAD_HELD = {};   // the pretend keys held down right now
let padCount = 0;

function padList() {
  if (!navigator.getGamepads) return [];   // some browsers only allow controllers on https pages
  try { return [...navigator.getGamepads()].filter(Boolean).slice(0, 2); } catch (e) { return []; }
}
// Which player's buttons a controller presses: 0 = player 1 (or the only player), 1 = player 2.
const padSlot = (i, count) => (count === 1 && G.numPlayers === 2 && !Net.active ? 1 : i);

function padButtons(gp) {
  const b = i => !!(gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > 0.4));
  const ax = i => gp.axes[i] || 0;
  return {
    left: b(14) || ax(0) < -0.45, right: b(15) || ax(0) > 0.45, down: b(13) || ax(1) > 0.7,
    jump: b(0) || b(12), fire: b(7) || b(2), nade: b(6) || b(1), ntype: b(3),
    prev: b(4), next: b(5), start: b(9),
  };
}

// Called every frame from tick() in js/game.js.
function pollPads() {
  const pads = padList();
  if (pads.length !== padCount) padsChanged(pads.length);
  const now = {};
  pads.forEach((gp, i) => {
    const slot = padSlot(i, pads.length), s = padButtons(gp);
    for (const a in s) if (s[a]) now[`pad${slot}:${a}`] = true;
  });
  for (const k of Object.keys(PAD_HELD)) if (!now[k]) { delete PAD_HELD[k]; keys[k] = false; }
  for (const k of Object.keys(now)) {
    if (PAD_HELD[k]) continue;
    PAD_HELD[k] = true; keys[k] = true;
    onKey(k.endsWith(':start') ? 'p' : k);   // Start works like the P key
  }
}

function padsChanged(n) {
  const more = n > padCount;
  padCount = n;
  if (G.state === 'title') renderTitle();   // shows or hides the controller line in the help
  if (more && PLAYING.includes(G.state)) G.toast = { msg: n === 2 ? '2 controllers ready!' : 'Controller ready!', t: 0 };
}

// A short buzz in the hands. slot = only that player's controller (2 players); leave it out for everyone.
function padRumble(strong, weak, ms, slot) {
  const pads = padList();
  pads.forEach((gp, i) => {
    if (slot !== undefined && G.numPlayers === 2 && padSlot(i, pads.length) !== slot) return;
    const v = gp.vibrationActuator;
    try { if (v && v.playEffect) v.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak }).catch(() => {}); } catch (e) { /* no buzz on this one */ }
  });
}
