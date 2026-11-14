'use strict';
// Every sound is made in code with the Web Audio API, so there are no sound files.
//
// Guns are built in layers like a real recording: a sharp crack, the blast, a deep boom,
// mechanical clicks (shotgun pump, sniper bolt), shells clinking on the ground, and an
// outdoor echo bouncing off the buildings.
// Zombie voices use "formant" filters (the way a throat and mouth shape a vowel sound)
// fed by a gritty buzz, with a fast rattle on top that makes it raspy and gross.
// Sounds come out of the left or right speaker depending on where they happen.

const Sound = (() => {
  let ac = null, master = null, comp = null, revIn = null, echoIn = null, meter = null, noiseBuf = null, punch = null, grit = null, warmed = false;
  const lastPlayed = {}, loops = {}, recent = [];
  let voices = 0, frame = 0, live = 0;
  // Phones and tablets have small speakers and slower chips, so they get a lighter mix:
  // - deep booms are filtered out before the limiter (the speaker can't play them, but the limiter
  //   still heard them and turned everything down after every shot, so the sound "pulsed")
  // - a shorter reverb, cheaper distortion, fewer zombie voices and fewer new sounds at once
  const PHONE = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const VOLUME = PHONE ? 0.7 : 0.6, MAX_VOICES = PHONE ? 3 : 5;
  const BUDGET = PHONE ? 8 : 16;   // new sounds per quarter second; when it's busy, extra zombie noises are skipped

  function curve(k) {
    const n = 2048, c = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = i * 2 / n - 1; c[i] = (1 + k) * x / (1 + k * Math.abs(x)); }
    return c;
  }
  function impulse(dur, decay) {
    const len = Math.floor(ac.sampleRate * dur), b = ac.createBuffer(2, len, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
    return b;
  }
  function init() {
    if (ac) {
      if (ac.state === 'suspended' || ac.state === 'interrupted') ac.resume();
      if (!warmed) {   // some iPhones only switch sound on after something has really played
        warmed = true;
        try { const src = ac.createBufferSource(); src.buffer = ac.createBuffer(1, 1, 22050); src.connect(ac.destination); src.start(0); } catch (e) { /* ignore */ }
      }
      return;
    }
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      comp = ac.createDynamicsCompressor();   // keeps big explosions from crackling
      comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 5; comp.attack.value = 0.002; comp.release.value = PHONE ? 0.12 : 0.2;
      master = ac.createGain(); master.gain.value = save.muted ? 0 : VOLUME;
      meter = ac.createAnalyser(); meter.fftSize = 1024;
      if (PHONE) {   // no deep booms on phones (see the note at the top)
        const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 120; hp.Q.value = 0.7;
        master.connect(hp); hp.connect(comp);
      } else master.connect(comp);
      comp.connect(meter); meter.connect(ac.destination);
      const rev = ac.createConvolver(); rev.buffer = impulse(PHONE ? 1.1 : 2.2, 3);   // a big outdoor space
      revIn = ac.createGain(); revIn.gain.value = PHONE ? 0.35 : 0.5; revIn.connect(rev); rev.connect(master);
      echoIn = ac.createGain();                                         // echo off the buildings
      const dl = ac.createDelay(1), fb = ac.createGain(), lp = ac.createBiquadFilter();
      dl.delayTime.value = 0.26; fb.gain.value = 0.32; lp.type = 'lowpass'; lp.frequency.value = 1800;
      echoIn.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(master);
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      punch = curve(6); grit = curve(14);
    } catch (e) { ac = null; }
  }
  function setMuted(m) {
    save.muted = m; writeSave();
    if (master) master.gain.value = m ? 0 : VOLUME;
    if (m) for (const k in loops) stopLoop(k);
  }
  const ready = () => ac && !save.muted && ac.state !== 'closed';
  // Too many sounds starting at once? Important ones (guns, the HUD) always play; extras wait their turn.
  function busy(important) {
    const now = performance.now();
    while (recent.length && now - recent[0] > 250) recent.shift();
    if (!important && recent.length >= BUDGET) return true;
    recent.push(now); return false;
  }
  function limited(name, ms) {
    const now = performance.now();
    if (lastPlayed[name] && now - lastPlayed[name] < ms) return true;
    lastPlayed[name] = now; return false;
  }

  // ---- Building blocks ----------------------------------------------------
  // Left/right and how loud, from a spot in the world (zombies far off screen are quieter).
  function where(x) {
    if (x === undefined || !G.level) return { pan: 0, vol: 1 };
    const rel = x - (G.camX + W / 2), off = Math.max(0, Math.abs(rel) - W / 2);
    return { pan: clamp(rel / (W / 2), -1, 1) * 0.8, vol: clamp(1 - off / 700, 0.12, 1) };
  }
  // Every sound gets its own little mixer. It is unplugged once the sound is over (life seconds, longer than
  // any sound), or the phone keeps them all and slows down as the fight goes on. Loops unplug it themselves.
  function bus(x, vol = 1, wet = 0.25, echo = 0, life = 3.5) {
    const w = where(x), g = ac.createGain(); g.gain.value = vol * w.vol;
    let out = g;
    const parts = [g];
    if (ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = w.pan; g.connect(p); out = p; parts.push(p); }
    out.connect(master);
    if (wet) { const s = ac.createGain(); s.gain.value = wet; out.connect(s); s.connect(revIn); parts.push(s); }
    if (echo) { const s = ac.createGain(); s.gain.value = echo; out.connect(s); s.connect(echoIn); parts.push(s); }
    live++;
    g.unplug = () => { if (!g.unplugged) { g.unplugged = true; live--; parts.forEach(n => n.disconnect()); } };
    if (life) setTimeout(g.unplug, life * 1000);
    return g;
  }
  function shaper(dst, c) { const s = ac.createWaveShaper(); s.curve = c; s.oversample = PHONE ? 'none' : '2x'; s.connect(dst); return s; }
  // A burst of filtered static.
  function nz(dst, o) {
    const t = ac.currentTime + (o.at || 0), dur = o.dur;
    const src = ac.createBufferSource(); src.buffer = noiseBuf;
    const f = ac.createBiquadFilter(); f.type = o.type || 'lowpass'; f.Q.value = o.q || 0.7;
    f.frequency.setValueAtTime(o.f0, t); if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.vol, t + (o.atk || 0.001)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(dst);
    src.start(t, Math.random() * Math.max(0, 1.9 - dur), dur + 0.05);
  }
  // A tone that slides from one pitch to another.
  function osc(dst, o) {
    const t = ac.currentTime + (o.at || 0), dur = o.dur;
    const s = ac.createOscillator(); s.type = o.type || 'sine';
    s.frequency.setValueAtTime(o.f0, t); if (o.f1) s.frequency.exponentialRampToValueAtTime(o.f1, t + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.vol, t + (o.atk || 0.003)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(g); g.connect(dst); s.start(t); s.stop(t + dur + 0.05);
  }
  const click = (dst, at, f, vol, q = 9) => nz(dst, { at, dur: 0.035, type: 'bandpass', f0: f, q, vol });
  function tink(dst, at, vol) {   // a brass shell bouncing on the street
    osc(dst, { at, dur: 0.09, f0: 3200 + Math.random() * 600, vol });
    osc(dst, { at, dur: 0.07, f0: 5100 + Math.random() * 500, vol: vol * 0.6 });
  }

  // ---- Guns ---------------------------------------------------------------
  const GUNS = {
    shotgun(x) {
      const b = bus(x, 1, 0.35, 0.3), p = shaper(b, punch);
      nz(p, { dur: 0.012, type: 'highpass', f0: 2500, vol: 1.2 });                       // crack
      nz(p, { dur: 0.3, f0: 6500, f1: 280, vol: 1.1 });                                 // blast
      osc(p, { dur: 0.32, f0: 120, f1: 38, vol: 1.2 });                                 // boom
      osc(b, { dur: 0.45, f0: 58, f1: 30, vol: 0.7 });                                  // sub thump
      nz(b, { at: 0.34, dur: 0.07, type: 'bandpass', f0: 2600, f1: 1800, q: 2, vol: 0.25 });
      click(b, 0.36, 1700, 1.1); click(b, 0.47, 1200, 1.3);                              // pump: chk-chk
      tink(b, 0.75, 0.06); tink(b, 0.88, 0.035);                                         // shell bounces
    },
    pistol(x) {   // the starter pistol: a small, flat pop
      const b = bus(x, 0.8, 0.22, 0.12), p = shaper(b, punch);
      nz(p, { dur: 0.01, type: 'highpass', f0: 2800, vol: 1 });
      nz(p, { dur: 0.12, f0: 5200, f1: 700, vol: 0.85 });
      osc(p, { dur: 0.12, f0: 160, f1: 55, vol: 0.7 });
      tink(b, 0.4, 0.03);
    },
    hcannon(x) {   // the hand cannon: an enormous BOOM with a long echo
      const b = bus(x, 1.15, 0.45, 0.5), p = shaper(b, punch);
      nz(p, { dur: 0.016, type: 'highpass', f0: 1800, vol: 1.5 });
      nz(p, { dur: 0.45, f0: 6000, f1: 160, vol: 1.3 });
      osc(p, { dur: 0.5, f0: 95, f1: 28, vol: 1.5 });
      osc(b, { dur: 0.6, f0: 50, f1: 24, vol: 0.8 });
      click(b, 0.32, 1500, 0.8); tink(b, 0.6, 0.05);
    },
    smg(x) {
      const b = bus(x, 0.75, 0.18, 0.08), p = shaper(b, punch);
      nz(p, { dur: 0.008, type: 'highpass', f0: 3000, vol: 0.9 });
      nz(p, { dur: 0.07, f0: 5000, f1: 900, vol: 0.7 });
      osc(p, { dur: 0.06, f0: 170, f1: 60, vol: 0.6 });
      if (Math.random() < 0.2) tink(b, 0.45, 0.02);
    },
    rifle(x) {
      const b = bus(x, 0.9, 0.25, 0.15), p = shaper(b, punch);
      nz(p, { dur: 0.01, type: 'highpass', f0: 2600, vol: 1.1 });
      nz(p, { dur: 0.13, f0: 6000, f1: 500, vol: 0.95 });
      osc(p, { dur: 0.13, f0: 140, f1: 45, vol: 0.9 });
      if (Math.random() < 0.3) tink(b, 0.5, 0.025);
    },
    sniper(x) {
      const b = bus(x, 1.1, 0.4, 0.45), p = shaper(b, punch);
      nz(p, { dur: 0.016, type: 'highpass', f0: 1800, vol: 1.4 });
      nz(p, { dur: 0.42, f0: 7500, f1: 150, vol: 1.2 });
      osc(p, { dur: 0.55, f0: 95, f1: 28, vol: 1.3 });
      click(b, 0.5, 2300, 1.0);                                                          // bolt up and back
      nz(b, { at: 0.55, dur: 0.08, type: 'bandpass', f0: 3000, f1: 2000, q: 3, vol: 0.25 });
      click(b, 0.66, 1500, 1.2);                                                         // bolt forward
      tink(b, 0.9, 0.05);
    },
    aa12(x) {   // a shotgun blast, but no pump: the next shell is in already
      const b = bus(x, 0.95, 0.3, 0.2), p = shaper(b, punch);
      nz(p, { dur: 0.01, type: 'highpass', f0: 2600, vol: 1.1 });
      nz(p, { dur: 0.19, f0: 6000, f1: 360, vol: 1.0 });
      osc(p, { dur: 0.2, f0: 125, f1: 42, vol: 1.1 });
      click(b, 0.09, 1900, 0.7);
      if (Math.random() < 0.4) tink(b, 0.5, 0.035);
    },
    mini(x) {
      const b = bus(x, 0.6, 0.15, 0.05), p = shaper(b, punch);
      nz(p, { dur: 0.006, type: 'highpass', f0: 3200, vol: 0.8 });
      nz(p, { dur: 0.045, f0: 4200, f1: 1200, vol: 0.6 });
      osc(p, { dur: 0.045, f0: 150, f1: 70, vol: 0.5 });
    },
    rocket(x) {
      const b = bus(x, 0.9, 0.3, 0.2), p = shaper(b, punch);
      osc(p, { dur: 0.18, f0: 90, f1: 40, vol: 1 });
      nz(p, { dur: 0.05, f0: 3000, f1: 600, vol: 0.8 });
      nz(b, { dur: 0.8, type: 'bandpass', f0: 500, f1: 3200, q: 1.2, vol: 0.7, atk: 0.05 }); // whoosh
    },
    glaunch(x) {   // THOOMP: a grenade leaving the tube
      const b = bus(x, 0.9, 0.25, 0.15), p = shaper(b, punch);
      osc(p, { dur: 0.2, f0: 150, f1: 55, vol: 1.1 });
      nz(p, { dur: 0.12, f0: 900, f1: 120, vol: 0.9 });
      click(b, 0, 2600, 0.9); click(b, 0.3, 1400, 1.1);   // and the drum turning
    },
    quad(x) {   // four rockets whooshing off one after another
      const b = bus(x, 1.1, 0.35, 0.3), p = shaper(b, punch);
      osc(p, { dur: 0.35, f0: 85, f1: 32, vol: 1.2 });
      for (let i = 0; i < 4; i++) {
        nz(p, { at: i * 0.06, dur: 0.05, f0: 3000, f1: 600, vol: 0.75 });
        nz(b, { at: i * 0.06, dur: 0.9, type: 'bandpass', f0: 450, f1: 3000, q: 1.2, vol: 0.45, atk: 0.05 });
      }
    },
    boom(x) {
      const b = bus(x, 1.2, 0.5, 0.35), p = shaper(b, grit);
      nz(p, { dur: 0.025, type: 'highpass', f0: 900, vol: 1.2 });
      nz(p, { dur: 1.4, f0: 3200, f1: 60, vol: 1.3 });
      osc(b, { dur: 1.0, f0: 75, f1: 20, vol: 1.4 });
      for (let i = 0; i < 9; i++) nz(b, { at: 0.12 + Math.random() * 0.8, dur: 0.02, type: 'bandpass', f0: 2000 + Math.random() * 3500, q: 4, vol: 0.4 }); // debris
    },
    bigboom(x) {   // the High Explosive grenade: the biggest boom there is
      const b = bus(x, 1.35, 0.55, 0.4), p = shaper(b, grit);
      nz(p, { dur: 0.03, type: 'highpass', f0: 800, vol: 1.3 });
      nz(p, { dur: 1.7, f0: 2600, f1: 45, vol: 1.4 });
      osc(b, { dur: 1.4, f0: 60, f1: 18, vol: 1.6 });
      osc(p, { dur: 0.5, f0: 110, f1: 35, vol: 1.1 });
      for (let i = 0; i < 12; i++) nz(b, { at: 0.15 + Math.random() * 1.1, dur: 0.025, type: 'bandpass', f0: 1500 + Math.random() * 4000, q: 4, vol: 0.4 });
    },
    laser(x) {
      const b = bus(x, 0.6, 0.35, 0.1);
      osc(b, { type: 'sawtooth', dur: 0.26, f0: 2200, f1: 140, vol: 0.5 });
      osc(b, { type: 'square', dur: 0.2, f0: 1100, f1: 80, vol: 0.25 });
      nz(b, { dur: 0.12, type: 'highpass', f0: 4000, vol: 0.4 });
    },
    magnum(x) {   // a huge BANG, then the cylinder clicks round
      const b = bus(x, 1.05, 0.38, 0.4), p = shaper(b, punch);
      nz(p, { dur: 0.014, type: 'highpass', f0: 2000, vol: 1.4 });
      nz(p, { dur: 0.32, f0: 6800, f1: 200, vol: 1.2 });
      osc(p, { dur: 0.4, f0: 110, f1: 32, vol: 1.3 });
      click(b, 0.3, 1900, 0.9); click(b, 0.36, 2600, 0.6);
    },
    crossbow(x) {   // string twang and the bolt whooshing away
      const b = bus(x, 0.8, 0.2, 0.05);
      osc(b, { type: 'triangle', dur: 0.18, f0: 190, f1: 90, vol: 0.6 });
      nz(b, { dur: 0.03, type: 'bandpass', f0: 2500, q: 4, vol: 1 });
      nz(b, { at: 0.02, dur: 0.35, type: 'bandpass', f0: 900, f1: 2400, q: 1.5, vol: 0.25, atk: 0.04 });
      click(b, 0.45, 1600, 0.8);
    },
    plasma(x) {
      const b = bus(x, 0.6, 0.3, 0.1);
      osc(b, { type: 'sawtooth', dur: 0.16, f0: 520, f1: 1500, vol: 0.32 });
      osc(b, { dur: 0.2, f0: 220, f1: 90, vol: 0.5 });
      nz(b, { dur: 0.1, type: 'bandpass', f0: 3000, f1: 1200, q: 2, vol: 0.5 });
    },
    sword(x) { const b = bus(x, 0.7, 0.15); nz(b, { dur: 0.2, type: 'bandpass', f0: 500, f1: 3000, q: 1.6, vol: 0.9, atk: 0.04 }); },   // swish
    hammer(x) { const b = bus(x, 0.9, 0.2); nz(b, { dur: 0.34, type: 'bandpass', f0: 250, f1: 900, q: 1.2, vol: 1, atk: 0.08 }); },   // big whoosh
    saber(x) {   // vwoom
      const b = bus(x, 0.7, 0.25);
      osc(b, { type: 'sawtooth', dur: 0.22, f0: 95, f1: 150, vol: 0.4, atk: 0.02 });
      osc(b, { type: 'sawtooth', dur: 0.22, f0: 97, f1: 155, vol: 0.3, atk: 0.02 });
      nz(b, { dur: 0.2, type: 'bandpass', f0: 700, f1: 1800, q: 3, vol: 0.5 });
    },
    toss(x) {   // pin out (ping!) and a whoosh
      const b = bus(x, 0.9, 0.12);
      click(b, 0, 3400, 1.2, 12); osc(b, { at: 0.01, dur: 0.14, f0: 3900, vol: 0.1 });
      nz(b, { at: 0.05, dur: 0.22, type: 'bandpass', f0: 600, f1: 1500, q: 1.4, vol: 1, atk: 0.04 });
    },
    clink(x) { const b = bus(x, 0.8, 0.15); tink(b, 0, 0.16); nz(b, { dur: 0.04, type: 'bandpass', f0: 1800, q: 3, vol: 0.8 }); },   // a grenade bouncing
    beep(x) { const b = bus(x, 0.9, 0.1); [0, 0.11, 0.22].forEach(at => osc(b, { type: 'square', at, dur: 0.06, f0: 1760, vol: 0.4 })); },   // stuck on!
    frag(x) {   // a boom, and metal pieces zinging away
      GUNS.boom(x);
      const b = bus(x, 0.55, 0.35);
      for (let i = 0; i < 6; i++) { const f = 2400 + Math.random() * 2000; osc(b, { type: 'triangle', at: 0.03 + Math.random() * 0.25, dur: 0.13, f0: f, f1: f * 0.45, vol: 0.07 }); }
    },
    acid(x) {   // splash and a long hiss
      const b = bus(x, 0.95, 0.3, 0.1), p = shaper(b, grit);
      nz(p, { dur: 0.35, f0: 1400, f1: 80, vol: 1.1 }); osc(b, { dur: 0.25, f0: 130, f1: 45, vol: 0.8 });
      nz(b, { at: 0.1, dur: 1.6, type: 'highpass', f0: 3500, vol: 0.32, atk: 0.15 });
      for (let i = 0; i < 4; i++) nz(b, { at: 0.2 + Math.random() * 1.0, dur: 0.05, type: 'bandpass', f0: 500 + Math.random() * 700, q: 4, vol: 0.35 });   // bubbles
    },
    freeze(x) {   // whoomp, then shimmering frost
      const b = bus(x, 0.95, 0.5, 0.2);
      nz(b, { dur: 0.05, type: 'highpass', f0: 2500, vol: 1 }); osc(b, { dur: 0.3, f0: 90, f1: 40, vol: 0.9 });
      nz(b, { dur: 0.9, type: 'highpass', f0: 6000, f1: 2500, vol: 0.4, atk: 0.02 });
      [2093, 2637, 3136, 3951].forEach((f, i) => osc(b, { type: 'triangle', at: 0.05 + i * 0.06, dur: 0.5, f0: f, vol: 0.08 }));
    },
    crack(x) {   // the ice breaking when a zombie thaws out
      const b = bus(x, 0.55, 0.2);
      nz(b, { dur: 0.05, type: 'highpass', f0: 3000, vol: 0.8 });
      for (let i = 0; i < 3; i++) nz(b, { at: 0.03 + i * 0.04, dur: 0.03, type: 'bandpass', f0: 2500 + i * 900, q: 5, vol: 0.5 });
    },
    clang(x) { const b = bus(x, 0.6, 0.3); osc(b, { type: 'triangle', dur: 0.25, f0: 1800, f1: 1700, vol: 0.25 }); osc(b, { dur: 0.3, f0: 2700, vol: 0.15 }); nz(b, { dur: 0.06, type: 'highpass', f0: 3000, vol: 0.5 }); },
    thud(x) { const b = bus(x, 1, 0.3, 0.15), p = shaper(b, punch); osc(p, { dur: 0.35, f0: 90, f1: 30, vol: 1.3 }); nz(p, { dur: 0.25, f0: 1200, f1: 80, vol: 1 }); },
    zap(x) { const b = bus(x, 0.6, 0.2); osc(b, { type: 'square', dur: 0.12, f0: 1400, f1: 300, vol: 0.2 }); nz(b, { dur: 0.1, type: 'highpass', f0: 3500, vol: 0.5 }); },
    splat(x) {   // a bloater bursting
      const b = bus(x, 1, 0.3, 0.1), p = shaper(b, grit);
      nz(p, { dur: 0.5, f0: 1200, f1: 60, vol: 1.2 });
      osc(b, { dur: 0.3, f0: 140, f1: 40, vol: 0.8 });
      for (let i = 0; i < 5; i++) nz(b, { at: 0.05 + Math.random() * 0.4, dur: 0.05, type: 'bandpass', f0: 300 + Math.random() * 600, q: 3, vol: 0.5 });
    },
  };

  // Sounds that keep going while you hold fire: the flamethrower roar and the minigun motor.
  function startLoop(kind, x) {
    const b = bus(x, 1, 0.2, 0, 0), t = ac.currentTime, parts = [];
    let tune = null;
    const env = ac.createGain(); env.gain.setValueAtTime(0.0001, t); env.gain.exponentialRampToValueAtTime(1, t + 0.08); env.connect(b);
    if (kind === 'flame' || kind === 'inferno') {   // inferno = the Heavy Incinerator: a deeper, louder roar
      const big = kind === 'inferno';
      const src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = big ? 850 : 1100;
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = big ? 290 : 380; bp.Q.value = 0.8;
      const g1 = ac.createGain(); g1.gain.value = big ? 1.1 : 0.9; const g2 = ac.createGain(); g2.gain.value = big ? 0.8 : 0.6;
      const flutter = ac.createGain(); flutter.gain.value = 0.75;
      const lfo = ac.createOscillator(); lfo.frequency.value = 11; const lg = ac.createGain(); lg.gain.value = 0.25;
      lfo.connect(lg); lg.connect(flutter.gain);
      src.connect(lp); lp.connect(g1); g1.connect(flutter); src.connect(bp); bp.connect(g2); g2.connect(flutter); flutter.connect(env);
      src.start(); lfo.start(); parts.push(src, lfo);
      nz(b, { dur: 0.3, type: 'bandpass', f0: 300, f1: 1800, q: 1, vol: 0.6, atk: 0.02 });  // fwoosh as it lights
    } else if (kind === 'hum') {   // the laser sword's low hum
      const o1 = ac.createOscillator(), o2 = ac.createOscillator();
      o1.type = 'sawtooth'; o2.type = 'sawtooth'; o1.frequency.value = 88; o2.frequency.value = 90.5;
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 340;
      const g = ac.createGain(); g.gain.value = 0.06;
      o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(env);
      o1.start(); o2.start(); parts.push(o1, o2);
    } else if (kind === 'engine') {   // a truck engine: tune(r) revs it up with the speed (r = 0..1)
      const o1 = ac.createOscillator(), o2 = ac.createOscillator(), lfo = ac.createOscillator();
      o1.type = 'sawtooth'; o2.type = 'square'; o1.frequency.value = 55; o2.frequency.value = 110.5; lfo.frequency.value = 22;
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500;
      const g = ac.createGain(); g.gain.value = 0.07; const lg = ac.createGain(); lg.gain.value = 0.03;
      lfo.connect(lg); lg.connect(g.gain);   // the chug-chug
      o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(env);
      o1.start(); o2.start(); lfo.start(); parts.push(o1, o2, lfo);
      tune = r => { const tt = ac.currentTime; o1.frequency.setTargetAtTime(55 + r * 75, tt, 0.15); o2.frequency.setTargetAtTime(110.5 + r * 150, tt, 0.15); lfo.frequency.setTargetAtTime(22 + r * 30, tt, 0.15); lp.frequency.setTargetAtTime(500 + r * 700, tt, 0.15); };
    } else if (kind === 'rotor') {   // helicopter blades: whup-whup-whup
      const src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 650;
      const g = ac.createGain(); g.gain.value = 0.35;
      const lfo = ac.createOscillator(); lfo.frequency.value = 11; const lg = ac.createGain(); lg.gain.value = 0.35;
      const thump = ac.createOscillator(); thump.frequency.value = 75; const tg = ac.createGain(); tg.gain.value = 0.12; const lg2 = ac.createGain(); lg2.gain.value = 0.12;
      lfo.connect(lg); lg.connect(g.gain); lfo.connect(lg2); lg2.connect(tg.gain);
      src.connect(lp); lp.connect(g); g.connect(env); thump.connect(tg); tg.connect(env);
      src.start(); lfo.start(); thump.start(); parts.push(src, lfo, thump);
    } else {
      const o1 = ac.createOscillator(), o2 = ac.createOscillator();
      o1.type = 'sawtooth'; o2.type = 'square';
      o1.frequency.setValueAtTime(50, t); o1.frequency.exponentialRampToValueAtTime(190, t + 0.35);
      o2.frequency.setValueAtTime(100, t); o2.frequency.exponentialRampToValueAtTime(380, t + 0.35);
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
      const g = ac.createGain(); g.gain.value = 0.14;
      o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(env);
      o1.start(); o2.start(); parts.push(o1, o2);
    }
    return { env, parts, bus: b, touched: frame, tune };
  }
  function stopLoop(key) {
    const l = loops[key]; if (!l) return;
    delete loops[key];
    const t = ac.currentTime;
    l.env.gain.cancelScheduledValues(t); l.env.gain.setValueAtTime(Math.max(0.0001, l.env.gain.value), t);
    l.env.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    for (const s of l.parts) s.stop(t + 0.2);
    setTimeout(l.bus.unplug, 400);
  }
  function hold(key, kind, on, x, rate) {   // rate (0..1) revs up a loop that can change (the truck engine)
    if (!ready()) return;
    if (on) {
      if (loops[key]) loops[key].touched = frame; else loops[key] = startLoop(kind, x);
      if (loops[key].tune && rate !== undefined) loops[key].tune(rate);
    }
    else stopLoop(key);
  }
  // Called once a frame: any loop nobody asked for this frame fades out (pause, shop, death...).
  function endFrame() { frame++; for (const k in loops) if (loops[k].touched < frame - 1) stopLoop(k); }

  // ---- Voices (zombies and the civilians) -------------------------------------
  const VOWELS = { oo: [300, 870, 2240], uh: [640, 1190, 2390], ah: [760, 1150, 2500], aa: [860, 1650, 2650], er: [490, 1350, 1690], eh: [550, 1770, 2490] };
  function voice(x, o) {
    if (voices >= MAX_VOICES) return;
    voices++;
    const t = ac.currentTime + (o.at || 0), dur = o.dur, end = t + dur, atk = o.atk || 0.06;
    const b = bus(x, o.vol, o.wet ?? 0.3, o.echo || 0);
    const env = ac.createGain();
    env.gain.setValueAtTime(0.0001, t); env.gain.exponentialRampToValueAtTime(1, t + atk);
    env.gain.setValueAtTime(1, Math.max(t + atk, end - dur * 0.35)); env.gain.exponentialRampToValueAtTime(0.0001, end);
    env.connect(b);
    const am = ac.createGain(); am.gain.value = 1 - (o.rasp || 0) * 0.5; am.connect(env);   // the throat rattle
    const lfo = ac.createOscillator(); lfo.type = 'triangle'; lfo.frequency.value = o.raspHz || 30;
    const lg = ac.createGain(); lg.gain.value = (o.rasp || 0) * 0.5; lfo.connect(lg); lg.connect(am.gain);
    const sum = ac.createGain(); sum.gain.value = o.makeup || 4; sum.connect(am);
    const A = VOWELS[o.from], B = VOWELS[o.to || o.from], fs = o.shift || 1, inputs = [];
    for (let i = 0; i < 3; i++) {                                                            // the mouth shape
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = [7, 9, 10][i];
      bp.frequency.setValueAtTime(A[i] * fs, t); bp.frequency.linearRampToValueAtTime(B[i] * fs, t + dur * 0.6);
      const g = ac.createGain(); g.gain.value = [1, 0.55, 0.3][i];
      bp.connect(g); g.connect(sum); inputs.push(bp);
    }
    const into = n => inputs.forEach(bp => n.connect(bp));
    const sh = ac.createWaveShaper(); sh.curve = grit; into(sh);
    const oscs = [];
    for (const det of [1, 1.013]) {                                                          // vocal cords
      const s = ac.createOscillator(); s.type = 'sawtooth';
      s.frequency.setValueAtTime(o.f0 * det, t); s.frequency.exponentialRampToValueAtTime(o.f1 * det, end);
      s.connect(sh); oscs.push(s);
    }
    const vib = ac.createOscillator(); vib.frequency.value = 4 + Math.random() * 3;
    const vg = ac.createGain(); vg.gain.value = o.f0 * (o.wobble || 0.05);
    vib.connect(vg); oscs.forEach(s => vg.connect(s.frequency));
    if (o.breath) {
      const n = ac.createBufferSource(); n.buffer = noiseBuf;
      const ng = ac.createGain(); ng.gain.value = o.breath; n.connect(ng); into(ng);
      n.start(t, Math.random(), dur + 0.1);
    }
    for (const s of [...oscs, vib, lfo]) { s.start(t); s.stop(end + 0.05); }
    setTimeout(() => { voices--; }, ((o.at || 0) + dur) * 1000 + 100);
  }
  //                pitch (Hz)    mouth size  rattle      rattle speed  breathiness  loudness
  const ZV = {
    walker: { f0: [85, 115], shift: 0.9, rasp: 0.7, raspHz: 28, breath: 0.25, vol: 0.4 },
    runner: { f0: [230, 300], shift: 1.15, rasp: 0.45, raspHz: 42, breath: 0.45, vol: 0.38 },
    leaper: { f0: [170, 220], shift: 1.05, rasp: 0.6, raspHz: 36, breath: 0.6, vol: 0.38 },
    brute: { f0: [52, 64], shift: 0.75, rasp: 0.9, raspHz: 21, breath: 0.2, vol: 0.6 },
    boss: { f0: [42, 50], shift: 0.62, rasp: 1, raspHz: 16, breath: 0.4, vol: 0.9 },
    tiny: { f0: [300, 370], shift: 1.3, rasp: 0.35, raspHz: 48, breath: 0.4, vol: 0.32 },
    giant: { f0: [38, 46], shift: 0.6, rasp: 1, raspHz: 18, breath: 0.3, vol: 0.8 },
    bloater: { f0: [70, 90], shift: 0.85, rasp: 1, raspHz: 12, breath: 0.55, vol: 0.5 },   // gurgly
    kingbloat: { f0: [46, 56], shift: 0.7, rasp: 1, raspHz: 10, breath: 0.6, vol: 0.9 },   // gurglier
  };
  // Zombie animals: a growling, barking dog, a bleating sheep, a grunting kangaroo, a cawing crow, a roaring bear.
  const AV = {
    dog: { f0: [95, 125], shift: 1.25, rasp: 0.8, raspHz: 38, breath: 0.5, vol: 0.42 },
    sheep: { f0: [170, 230], shift: 1.2, rasp: 0.5, raspHz: 30, breath: 0.3, vol: 0.42, wobble: 0.13 },
    roo: { f0: [75, 95], shift: 1.0, rasp: 0.7, raspHz: 26, breath: 0.7, vol: 0.42 },
    crow: { f0: [430, 560], shift: 1.45, rasp: 0.9, raspHz: 64, breath: 0.3, vol: 0.34 },
    bear: { f0: [50, 62], shift: 0.7, rasp: 0.95, raspHz: 22, breath: 0.35, vol: 0.7 },
    mower: { f0: [95, 115], shift: 0.9, rasp: 0.8, raspHz: 26, breath: 0.3, vol: 0.45 },   // a grumpy zombie dad (and his mower)
    rat: { f0: [380, 460], shift: 1.4, rasp: 0.6, raspHz: 50, breath: 0.5, vol: 0.42 },
    yeti: { f0: [62, 74], shift: 0.66, rasp: 1, raspHz: 18, breath: 0.45, vol: 0.75 },     // roars like a bear
    gator: { f0: [58, 68], shift: 0.7, rasp: 1, raspHz: 14, breath: 0.6, vol: 0.7 },
  };
  function squelch(x, vol = 0.5) { const b = bus(x, vol, 0.05); nz(b, { dur: 0.05, type: 'bandpass', f0: rand(500, 900), q: 1.2, vol: 0.9 }); osc(b, { dur: 0.05, f0: 140, f1: 70, vol: 0.4 }); }
  function splat(x) { const b = bus(x, 0.7, 0.15); nz(b, { at: 0.05, dur: 0.25, f0: 900, f1: 90, vol: 1 }); osc(b, { at: 0.05, dur: 0.12, f0: 120, f1: 50, vol: 0.5 }); }
  function animal(z, kind, body, boss) {
    const v = AV[body], x = z.x, f = rand(v.f0[0], v.f0[1]) * (z.voice || 1) * (boss ? 0.62 : 1), V = (o) => voice(x, { ...v, ...o });
    const big = boss ? 1.5 : 1;
    if (body === 'dog') {
      const bark = (at, loud = 1) => V({ f0: f * 3, f1: f * 2.3, dur: 0.13, from: 'ah', to: 'uh', atk: 0.005, at, vol: v.vol * 1.3 * loud, rasp: 0.5, wet: 0.35, echo: 0.2 });
      if (kind === 'groan') { if (Math.random() < 0.45) { bark(0); bark(0.22); } else V({ f0: f, f1: f * 0.9, dur: rand(0.6, 0.9), from: 'uh', to: 'er', atk: 0.1, wobble: 0.02, vol: v.vol * 0.7 }); }
      else if (kind === 'screech') { bark(0, 1.2); V({ at: 0.12, f0: f * 1.2, f1: f, dur: 0.35, from: 'er', atk: 0.02 }); }
      else if (kind === 'attack') { if (limited('zatk', 60)) return; V({ f0: f * 1.4, f1: f, dur: 0.25, from: 'ah', to: 'er', atk: 0.01 }); const b = bus(x, 0.6, 0.1); nz(b, { at: 0.06, dur: 0.06, type: 'bandpass', f0: 1500, q: 1.5, vol: 0.9 }); }
      else if (kind === 'die') { if (limited('zdie', 40)) return; V({ f0: f * 5, f1: f * 2.2, dur: 0.4, from: 'eh', to: 'oo', rasp: 0.3, atk: 0.01 }); splat(x); }
      else if (kind === 'hit') { if (limited('zhit', 45)) return; squelch(x); if (Math.random() < 0.4) V({ f0: f * 4.5, f1: f * 3.5, dur: 0.12, from: 'eh', atk: 0.005, vol: v.vol * 0.6 }); }
      else V({ f0: f, f1: f * 0.7, dur: 2, from: 'uh', to: 'aa', atk: 0.2, wet: 0.5, echo: 0.3 });
    } else if (body === 'sheep') {
      const baa = (o) => V({ f0: f, f1: f * 0.9, dur: rand(0.7, 1.0) * big, from: 'eh', to: 'aa', atk: 0.06, ...o });
      if (kind === 'groan') baa({ vol: v.vol * 0.75 });
      else if (kind === 'screech') { baa({ f0: f * 1.25, f1: f * 1.05, dur: 0.9 * big, vol: v.vol * 1.3, rasp: 0.7 }); const b = bus(x, 0.5, 0.1); nz(b, { dur: 0.25, f0: 2500, f1: 600, vol: 0.6 }); }   // an angry snort and BAAA
      else if (kind === 'attack') { if (limited('zatk', 60)) return; const b = bus(x, 0.9 * big, 0.2), p = shaper(b, punch); nz(p, { dur: 0.2, f0: 700, f1: 80, vol: 1 }); osc(b, { dur: 0.25, f0: 90, f1: 40, vol: 1 }); baa({ at: 0.08, dur: 0.3, vol: v.vol * 0.8 }); }
      else if (kind === 'die') { if (limited('zdie', 40)) return; baa({ f0: f * 1.1, f1: f * 0.5, dur: 0.9, to: 'oo', rasp: 1, raspHz: 12 }); splat(x); }
      else if (kind === 'hit') { if (limited('zhit', 45)) return; squelch(x); }
      else baa({ f0: f * 0.8, f1: f * 0.5, dur: 2.2, rasp: 1, atk: 0.2, wet: 0.5, echo: 0.3, vol: v.vol * 1.6 });
    } else if (body === 'roo') {
      const grunt = (at, o) => V({ f0: f, f1: f * 0.85, dur: 0.12 * big, from: 'uh', atk: 0.01, at, ...o });
      if (kind === 'groan') { grunt(0); grunt(0.2); grunt(0.4, { f1: f * 0.7 }); }
      else if (kind === 'screech') { const b = bus(x, 0.4, 0.1); nz(b, { dur: 0.4, type: 'bandpass', f0: 3200, f1: 2200, q: 1.5, vol: 0.7 }); }   // a hiss
      else if (kind === 'attack') { if (limited('zatk', 60)) return; const b = bus(x, 0.8 * big, 0.15), p = shaper(b, punch); nz(p, { dur: 0.12, f0: 900, f1: 100, vol: 1 }); osc(b, { dur: 0.18, f0: 110, f1: 45, vol: 0.9 }); grunt(0, { vol: v.vol * 1.2 }); }
      else if (kind === 'die') { if (limited('zdie', 40)) return; V({ f0: f * 1.2, f1: f * 0.5, dur: 0.7, from: 'uh', to: 'oo', rasp: 1, raspHz: 11, atk: 0.02 }); splat(x); }
      else if (kind === 'hit') { if (limited('zhit', 45)) return; squelch(x); }
      else { V({ f0: f, f1: f * 0.6, dur: 2, from: 'uh', to: 'aa', atk: 0.2, wet: 0.5, echo: 0.3, vol: v.vol * 1.8 }); }
    } else if (body === 'crow') {
      const caw = (at, o) => V({ f0: f, f1: f * 0.8, dur: 0.24, from: 'aa', to: 'ah', atk: 0.01, at, wet: 0.4, echo: 0.25, ...o });
      if (kind === 'groan') { caw(0); caw(0.32); if (Math.random() < 0.5) caw(0.64, { f1: f * 0.7 }); }
      else if (kind === 'screech') caw(0, { dur: 0.5, f0: f * 1.15, to: 'eh', vol: v.vol * 1.3 });
      else if (kind === 'attack') { if (limited('zatk', 60)) return; const b = bus(x, 0.5, 0.05); click(b, 0, 2600, 1.5); caw(0.03, { dur: 0.15 }); }
      else if (kind === 'die') { if (limited('zdie', 40)) return; caw(0, { f0: f * 1.2, f1: f * 0.45, dur: 0.5, rasp: 1 }); const b = bus(x, 0.4, 0.1); nz(b, { at: 0.05, dur: 0.3, type: 'bandpass', f0: 1800, f1: 600, q: 0.8, vol: 0.6 }); }   // squawk and a puff of feathers
      else if (kind === 'hit') { if (limited('zhit', 45)) return; squelch(x, 0.35); }
      else caw(0, { dur: 1.2, f1: f * 0.5 });
    } else if (body === 'mower') {   // a lawn mower engine and a grumpy zombie neighbour
      const putt = (at, n, gap, vol) => { const b = bus(x, vol, 0.15); for (let i = 0; i < n; i++) { nz(b, { at: at + i * gap, dur: 0.05, f0: 500, f1: 120, vol: 0.9 }); osc(b, { at: at + i * gap, dur: 0.05, f0: 70, f1: 40, vol: 0.6 }); } };
      const vroom = (dur, vol) => { const b = bus(x, vol, 0.2, 0.1); osc(b, { type: 'sawtooth', dur, f0: 55, f1: 200, vol: 0.35, atk: 0.05 }); osc(b, { type: 'square', dur, f0: 110, f1: 400, vol: 0.08, atk: 0.05 }); nz(b, { dur, type: 'bandpass', f0: 300, f1: 1400, q: 1, vol: 0.5, atk: 0.05 }); };
      if (kind === 'groan') { putt(0, 10, 0.08, 0.5); if (Math.random() < 0.6) V({ at: 0.2, f0: f, f1: f * 0.8, dur: 0.9, from: 'uh', to: 'er', atk: 0.08 }); }
      else if (kind === 'screech') { vroom(0.9, 0.8); V({ at: 0.1, f0: f * 1.3, f1: f, dur: 0.6, from: 'ah', to: 'uh', vol: v.vol * 1.2 }); }   // VROOOM
      else if (kind === 'attack') { if (limited('zatk', 60)) return; const b = bus(x, 0.9, 0.2), p = shaper(b, punch); nz(p, { dur: 0.15, f0: 900, f1: 90, vol: 1 }); osc(b, { dur: 0.2, f0: 100, f1: 40, vol: 1 }); click(b, 0.02, 2200, 1.2); }
      else if (kind === 'die') { if (limited('zdie', 40)) return; putt(0, 6, 0.14, 0.6); V({ f0: f * 1.2, f1: f * 0.5, dur: 1, from: 'ah', to: 'oo', rasp: 1, atk: 0.03 }); splat(x); }
      else if (kind === 'hit') { if (limited('zhit', 45)) return; const b = bus(x, 0.4, 0.1); click(b, 0, 2600, 1, 6); squelch(x, 0.4); }
      else { vroom(1.4, 1); V({ at: 0.3, f0: f, f1: f * 0.6, dur: 1.6, from: 'ah', to: 'aa', vol: v.vol * 1.6, wet: 0.5 }); }   // a big VROOM and a yell
    } else if (body === 'rat') {   // squeaks, hisses and chattering teeth
      const squeak = (at, o) => V({ f0: f * 2, f1: f * 1.5, dur: 0.14, from: 'eh', atk: 0.005, at, ...o });
      const chatter = (at, n) => { const b = bus(x, 0.5, 0.05); for (let i = 0; i < n; i++) click(b, at + i * 0.045, 2400 + Math.random() * 800, 0.8, 8); };
      if (kind === 'groan') { chatter(0, 6); squeak(0.3, { vol: v.vol * 0.7 }); }
      else if (kind === 'screech') { squeak(0, { f0: f * 2.6, f1: f * 3.2, dur: 0.5, vol: v.vol * 1.4, rasp: 0.9 }); const b = bus(x, 0.5, 0.1); nz(b, { dur: 0.5, type: 'highpass', f0: 3500, vol: 0.5 }); }
      else if (kind === 'attack') { if (limited('zatk', 60)) return; chatter(0, 3); const b = bus(x, 0.8, 0.1), p = shaper(b, punch); nz(p, { at: 0.12, dur: 0.08, f0: 1400, f1: 200, vol: 1 }); squeak(0.05); }
      else if (kind === 'die') { if (limited('zdie', 40)) return; squeak(0, { f0: f * 2.4, f1: f * 0.8, dur: 0.9, rasp: 1 }); splat(x); }
      else if (kind === 'hit') { if (limited('zhit', 45)) return; squelch(x, 0.5); if (Math.random() < 0.5) squeak(0, { vol: v.vol * 0.6 }); }
      else { squeak(0, { f0: f * 1.6, f1: f * 2.8, dur: 1.4, vol: v.vol * 1.6, rasp: 1, wet: 0.5, echo: 0.3 }); const b = bus(x, 0.7, 0.3); nz(b, { at: 0.2, dur: 1.2, type: 'highpass', f0: 3000, vol: 0.4, atk: 0.1 }); }   // a huge squeal and a hiss
    } else if (body === 'gator') {   // hisses, a deep bellow, and jaws SNAPPING shut
      const hiss = (at, dur, vol) => { const b = bus(x, vol, 0.2); nz(b, { at, dur, type: 'highpass', f0: 2500, vol: 0.6, atk: 0.05 }); };
      const snap = at => { const b = bus(x, 1, 0.15), p = shaper(b, punch); nz(p, { at, dur: 0.05, type: 'bandpass', f0: 1200, q: 2, vol: 1.2 }); osc(b, { at, dur: 0.15, f0: 120, f1: 50, vol: 0.9 }); };
      if (kind === 'groan') V({ f0: f, f1: f * 0.85, dur: 1.2, from: 'uh', to: 'oo', atk: 0.2, vol: v.vol * 0.8 });
      else if (kind === 'screech') hiss(0, 0.8, 0.8);
      else if (kind === 'attack') { if (limited('zatk', 60)) return; snap(0); }
      else if (kind === 'die') { if (limited('zdie', 40)) return; V({ f0: f * 1.2, f1: f * 0.5, dur: 1.4, from: 'ah', to: 'oo', rasp: 1, atk: 0.05 }); splat(x); }
      else if (kind === 'hit') { if (limited('zhit', 45)) return; squelch(x, 0.6); }
      else { V({ f0: f, f1: f * 0.6, dur: 2.2, from: 'uh', to: 'aa', atk: 0.2, wet: 0.5, echo: 0.3, vol: v.vol * 1.5 }); hiss(0.4, 1.2, 0.7); snap(1.6); }
    } else {   // bear (and the Yeti)
      const growl = (o) => V({ f0: f, f1: f * 0.8, dur: rand(1, 1.4) * big, from: 'uh', to: 'oo', atk: 0.15, ...o });
      if (kind === 'groan') growl({ vol: v.vol * 0.7 });
      else if (kind === 'screech') growl({ from: 'ah', to: 'aa', dur: 0.8 });
      else if (kind === 'attack') { if (limited('zatk', 60)) return; V({ f0: f * 1.3, f1: f, dur: 0.55 * big, from: 'ah', to: 'uh', atk: 0.03, vol: v.vol * 1.2 }); const b = bus(x, 0.7, 0.1); nz(b, { dur: 0.18, type: 'bandpass', f0: 900, f1: 2600, q: 0.8, vol: 0.7 }); nz(b, { at: 0.15, dur: 0.07, type: 'bandpass', f0: 1300, q: 1.5, vol: 0.9 }); }   // whoosh, then the claws hit
      else if (kind === 'die') { if (limited('zdie', 40)) return; V({ f0: f * 1.2, f1: f * 0.5, dur: 1.2, from: 'ah', to: 'oo', rasp: 1, raspHz: 14, atk: 0.05 }); const b = bus(x, 1, 0.3); osc(b, { at: 0.3, dur: 0.3, f0: 70, f1: 30, vol: 1 }); splat(x); }
      else if (kind === 'hit') { if (limited('zhit', 45)) return; squelch(x, 0.6); }
      else { V({ f0: f, f1: f * 0.65, dur: 2.4, from: 'uh', to: 'aa', atk: 0.2, wet: 0.5, echo: 0.3, vol: v.vol * 1.4 }); const b = bus(x, 1, 0.4); osc(b, { dur: 2, f0: 42, f1: 26, vol: 0.9, atk: 0.2 }); }
    }
  }
  function zombie(z, kind) {
    if (Rec.on) Rec.push('au', 'z', [z.type, +(z.voice || 1).toFixed(2), Math.round(z.x), kind]);
    if (!ready() || busy(kind === 'roar')) return;
    const T = ZTYPES[z.type];
    if (T && T.body) { try { animal(z, kind, T.body, !!T.boss); } catch (e) { /* audio hiccup: ignore */ } return; }
    const v = ZV[z.type] || ZV.walker, f = rand(v.f0[0], v.f0[1]) * (z.voice || 1), x = z.x;
    try {
      switch (kind) {
        case 'groan': {
          const [from, to] = pick([['oo', 'uh'], ['uh', 'ah'], ['er', 'uh'], ['ah', 'oo']]);
          voice(x, { ...v, f0: f, f1: f * 0.78, dur: rand(0.9, 1.6) * (z.type === 'brute' ? 1.3 : 1), from, to, atk: 0.15, vol: v.vol * 0.6 });
          break;
        }
        case 'screech':
          voice(x, { ...v, f0: f * 1.5, f1: f * 1.1, dur: rand(0.45, 0.7), from: 'eh', to: 'aa', rasp: 0.35, breath: 0.8, vol: v.vol * 1.1, atk: 0.03 });
          break;
        case 'attack': {
          if (limited('zatk', 60)) return;
          voice(x, { ...v, f0: f * 1.25, f1: f * 0.9, dur: 0.32, from: 'ah', to: 'uh', atk: 0.02, vol: v.vol * 1.1 });
          const b = bus(x, 0.6, 0.1);
          nz(b, { at: 0.08, dur: 0.06, type: 'bandpass', f0: 1400, q: 1.5, vol: 0.9 });   // crunch
          nz(b, { at: 0.1, dur: 0.12, f0: 900, f1: 200, vol: 0.6 });
          break;
        }
        case 'die': {
          if (limited('zdie', 40)) return;
          voice(x, { ...v, f0: f * 1.1, f1: f * 0.45, dur: rand(0.6, 0.9), from: 'uh', to: 'oo', rasp: 1, raspHz: 11, atk: 0.02 }); // gurgle
          const b = bus(x, 0.7, 0.15);
          nz(b, { at: 0.05, dur: 0.25, f0: 900, f1: 90, vol: 1 });                          // splat
          osc(b, { at: 0.05, dur: 0.12, f0: 120, f1: 50, vol: 0.5 });
          break;
        }
        case 'hit': {
          if (limited('zhit', 45)) return;
          const b = bus(x, 0.5, 0.05);
          nz(b, { dur: 0.05, type: 'bandpass', f0: rand(500, 900), q: 1.2, vol: 0.9 });     // squelch
          osc(b, { dur: 0.05, f0: 140, f1: 70, vol: 0.4 });
          break;
        }
        case 'roar': {
          voice(x, { ...v, f0: f, f1: f * 0.7, dur: 2.2, from: 'uh', to: 'aa', atk: 0.2, wet: 0.5, echo: 0.3 });
          const b = bus(x, 1, 0.4);
          osc(b, { dur: 2, f0: 45, f1: 28, vol: 0.9, atk: 0.2 });
          break;
        }
      }
    } catch (e) { /* audio hiccup: ignore */ }
  }

  // ---- Everything else ------------------------------------------------------
  const FX = {
    ...GUNS,
    hurt(x, who = 0) {   // an "oof!" and a thump
      voice(x, { f0: who ? 210 : 165, f1: who ? 160 : 120, dur: 0.22, from: 'uh', rasp: 0.1, raspHz: 30, breath: 0.35, vol: 0.4, shift: 1.1, atk: 0.01, wet: 0.1, makeup: 3 });
      const b = bus(x, 0.6, 0.1); nz(b, { dur: 0.1, f0: 700, f1: 120, vol: 0.8 }); osc(b, { dur: 0.1, f0: 110, f1: 50, vol: 0.6 });
    },
    die(x, who = 0) {
      voice(x, { f0: who ? 230 : 180, f1: who ? 120 : 90, dur: 0.7, from: 'ah', to: 'uh', rasp: 0.2, breath: 0.4, vol: 0.45, shift: 1.1, atk: 0.02, makeup: 3 });
      const b = bus(undefined, 0.5, 0.4); [392, 330, 262, 196].forEach((f, i) => osc(b, { type: 'triangle', at: 0.3 + i * 0.22, dur: 0.3, f0: f, f1: f * 0.97, vol: 0.35 }));
    },
    drumhit(x) {   // a bullet hitting a metal barrel: a hollow bong
      const b = bus(x, 0.55, 0.25);
      osc(b, { type: 'triangle', dur: 0.3, f0: 430, f1: 395, vol: 0.3 }); osc(b, { dur: 0.22, f0: 690, f1: 660, vol: 0.14 });
      nz(b, { dur: 0.04, type: 'bandpass', f0: 2400, q: 3, vol: 0.7 });
    },
    hiss(x) {   // a gas tank's valve breaks: pop, then a screaming hiss as it takes off
      const b = bus(x, 0.9, 0.25, 0.1);
      nz(b, { dur: 0.04, type: 'highpass', f0: 2000, vol: 1 });
      nz(b, { at: 0.02, dur: 1.2, type: 'highpass', f0: 3000, f1: 5000, vol: 0.5, atk: 0.03 });
      nz(b, { at: 0.02, dur: 1.1, type: 'bandpass', f0: 900, f1: 1800, q: 2, vol: 0.4, atk: 0.05 });
      osc(b, { at: 0.05, dur: 1.0, f0: 1400, f1: 2600, vol: 0.05, atk: 0.1 });
    },
    fireball(x) {   // an oil drum going up: a boom and a roaring WHOOMP of fire
      const b = bus(x, 1.1, 0.45, 0.25), p = shaper(b, grit);
      nz(p, { dur: 0.03, type: 'highpass', f0: 900, vol: 1.1 });
      nz(p, { dur: 1.1, f0: 1800, f1: 80, vol: 1.2 });
      osc(b, { dur: 0.7, f0: 70, f1: 24, vol: 1.2 });
      nz(b, { at: 0.04, dur: 1.5, type: 'bandpass', f0: 240, f1: 900, q: 0.8, vol: 0.8, atk: 0.1 });
    },
    slime(x) {   // the sticky slime barrel: a big wet SPLURT and a bloop
      const b = bus(x, 1, 0.3, 0.1), p = shaper(b, grit);
      nz(p, { dur: 0.5, f0: 900, f1: 70, vol: 1.1 });
      osc(b, { dur: 0.35, f0: 240, f1: 90, vol: 0.7 }); osc(b, { at: 0.16, dur: 0.25, f0: 360, f1: 150, vol: 0.4 });
      for (let i = 0; i < 4; i++) nz(b, { at: 0.1 + Math.random() * 0.5, dur: 0.06, type: 'bandpass', f0: 250 + Math.random() * 400, q: 3, vol: 0.45 });
    },
    shock(x) {   // the electric barrel: a crackling ZZZAP and a buzz
      const b = bus(x, 0.8, 0.3, 0.15);
      nz(b, { dur: 0.05, type: 'highpass', f0: 3000, vol: 1 });
      osc(b, { type: 'sawtooth', dur: 0.6, f0: 120, f1: 60, vol: 0.35 });
      osc(b, { type: 'square', dur: 0.5, f0: 240, f1: 180, vol: 0.12 });
      for (let i = 0; i < 10; i++) nz(b, { at: Math.random() * 0.6, dur: 0.02, type: 'highpass', f0: 2500 + Math.random() * 3000, vol: 0.6 });
    },
    stomp(x) { const b = bus(x, 1.1, 0.4, 0.2), p = shaper(b, punch); nz(p, { dur: 0.6, f0: 500, f1: 40, vol: 1 }); osc(b, { dur: 0.5, f0: 60, f1: 25, vol: 1.1 }); },
    jump(x) { const b = bus(x, 0.35, 0.05); nz(b, { dur: 0.1, type: 'bandpass', f0: 700, f1: 1500, q: 1, vol: 0.5 }); },
    land(x) { const b = bus(x, 0.4, 0.05); nz(b, { dur: 0.08, f0: 600, f1: 100, vol: 0.8 }); },
    swap(x) { const b = bus(x, 1, 0.1); click(b, 0, 2200, 2.5); click(b, 0.08, 1500, 3); },
    coin() { const b = bus(undefined, 1, 0.15); osc(b, { type: 'square', dur: 0.06, f0: 988, vol: 0.3 }); osc(b, { type: 'square', at: 0.05, dur: 0.16, f0: 1319, vol: 0.3 }); osc(b, { at: 0.05, dur: 0.25, f0: 2638, vol: 0.12 }); },
    heal() { const b = bus(undefined, 0.5, 0.2); osc(b, { dur: 0.12, f0: 520, vol: 0.4 }); osc(b, { at: 0.08, dur: 0.22, f0: 780, vol: 0.4 }); },
    wave() {   // a low horn and zombies moaning all around you
      const b = bus(undefined, 0.6, 0.4); osc(b, { type: 'sawtooth', dur: 0.6, f0: 110, vol: 0.18, atk: 0.05 }); osc(b, { type: 'sawtooth', at: 0.3, dur: 1, f0: 82, vol: 0.18, atk: 0.05 });
      [-1, 0, 1].forEach((side, i) => voice(G.camX + W / 2 + side * 700, { ...ZV.walker, f0: 90 + i * 12, f1: 70 + i * 8, dur: 1.4, from: 'oo', to: 'ah', at: 0.25 + i * 0.35, atk: 0.2, vol: 0.3 }));
    },
    clear() { const b = bus(undefined, 0.4, 0.3); [523, 659, 784, 1047].forEach((f, i) => osc(b, { type: 'square', at: i * 0.09, dur: 0.14, f0: f, vol: 0.2 })); },
    levelup() { const b = bus(undefined, 0.4, 0.3); [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => osc(b, { type: 'square', at: i * 0.1, dur: 0.16, f0: f, vol: 0.2 })); },
    buy() { const b = bus(undefined, 0.5, 0.2); click(b, 0, 2000, 1); [660, 880, 1320].forEach((f, i) => osc(b, { type: 'triangle', at: 0.05 + i * 0.07, dur: 0.12, f0: f, vol: 0.35 })); },
    nope() { const b = bus(undefined, 0.4, 0.1); osc(b, { type: 'square', dur: 0.15, f0: 160, f1: 120, vol: 0.2 }); },
    click() { const b = bus(undefined, 0.4, 0.05); osc(b, { type: 'triangle', dur: 0.05, f0: 700, vol: 0.3 }); },
  };
  const LIMITS = { coin: 45, hurt: 100, mini: PHONE ? 70 : 0, smg: PHONE ? 70 : 0, land: 80, clang: 50, zap: 40, thud: 60, splat: 60, clink: 60, crack: 50, beep: 80, drumhit: 60 };
  const EXTRAS = new Set(['coin', 'jump', 'land', 'clang', 'thud', 'zap', 'splat', 'clink', 'crack', 'drumhit']);   // can wait when it's busy
  function play(name, x, extra) {
    if (Rec.on && FX[name]) Rec.push('au', 'p', [name, x === undefined ? null : Math.round(x), extra]);
    if (x === null) x = undefined;
    if (!ready() || !FX[name]) return;
    if (LIMITS[name] && limited(name, LIMITS[name])) return;
    if (busy(!EXTRAS.has(name))) return;
    try { FX[name](x, extra); } catch (e) { /* audio hiccup: ignore */ }
  }
  // How loud the speakers are right now (0..1). Used for testing.
  function level() {
    if (!meter) return 0;
    const d = new Float32Array(meter.fftSize); meter.getFloatTimeDomainData(d);
    let peak = 0; for (const v of d) peak = Math.max(peak, Math.abs(v));
    return peak;
  }
  // For testing: phone mix?, mixers still plugged in, zombie voices, how much the limiter is turning things down (dB).
  const stats = () => ({ phone: PHONE, live, voices, squash: comp ? +comp.reduction.toFixed(1) : 0, state: ac ? ac.state : 'none' });
  return { init, play, zombie, hold, endFrame, setMuted, level, stats };
})();
