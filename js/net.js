'use strict';
// Wi-Fi co-op connection. Talks to the relay in tools/share_server.py:
//   POST /net/host, /net/join, /net/send, /net/leave   +   GET /net/events (Server-Sent Events)
// Only works when the game was opened from share-on-network.command (http://...), not by double-clicking index.html.
// (Same design as Sloth-Slap-Game's net code.)

const Net = {
  role: null,        // 'host' | 'guest' | null
  id: null,          // player slot: 0 = host, 1..3 = guests
  token: null, code: null, address: null, es: null,
  status: 'off',     // 'off' | 'connecting' | 'connected' | 'reconnecting' | 'closed'
  onMessage: null,   // (message, fromId) => void
  lastHeard: 0, inflight: 0, busy: false, retryT: 0,
  HEADERS: { 'Content-Type': 'application/json', 'X-Zombie': '1' },

  available() { return (location.protocol === 'http:' || location.protocol === 'https:') && !this.onPublicWebsite(); },
  // A public website (GitHub Pages, the Claude Artifact) has no share server, so there are no Wi-Fi games there.
  // The share server only answers to IP addresses and home-network names (host_ok in tools/share_server.py),
  // so any other name is a public website.
  onPublicWebsite() {
    if (location.protocol === 'file:') return false;   // double-clicked index.html: the WI-FI menu explains how to share
    const h = location.hostname.toLowerCase();
    const home = h === 'localhost' || ['.localhost', '.local', '.lan', '.home', '.home.arpa'].some(s => h.endsWith(s))
      || /^\d{1,3}(\.\d{1,3}){3}$/.test(h) || h.includes(':');   // IPv4 or IPv6 address
    return !home;
  },
  get active() { return !!this.role; },
  get isHost() { return this.role === 'host'; },
  get isGuest() { return this.role === 'guest'; },

  async api(path, body) {
    let r;
    try { r = await fetch(path, { method: 'POST', headers: this.HEADERS, body: JSON.stringify(body || {}) }); }
    catch (e) { throw new Error('Could not reach the game server. Is share-on-network still open?'); }
    let data = {};
    try { data = await r.json(); } catch (e) { /* empty reply */ }
    if (!r.ok) {
      const err = new Error(data.error || (r.status === 404 || r.status === 405 ? 'Wi-Fi play needs share-on-network.command (see the README).' : 'Could not reach the host (error ' + r.status + ').'));
      err.taken = !!data.taken;   // another window on the host computer is hosting now
      err.status = r.status;
      throw err;
    }
    return data;
  },
  async host() {
    const d = await this.api('/net/host');
    Object.assign(this, { role: 'host', id: 0, token: d.token, code: d.code, address: d.address });
    this.open();
    return d;
  },
  async join(code) {
    const d = await this.api('/net/join', { code });
    Object.assign(this, { role: 'guest', id: d.id, token: d.token, code });
    this.open();
    return d;
  },
  open() {
    if (this.es) this.es.close();
    this.status = 'connecting';
    this.lastHeard = performance.now();
    const es = (this.es = new EventSource('/net/events?token=' + encodeURIComponent(this.token)));
    es.onopen = () => { this.status = 'connected'; this.lastHeard = performance.now(); };
    // CLOSED = the server no longer knows us (we were away too long, or the server restarted)
    es.onerror = () => { this.status = es.readyState === 2 ? 'closed' : 'reconnecting'; };
    es.onmessage = e => {
      this.lastHeard = performance.now();
      let msg; try { msg = JSON.parse(e.data); } catch (err) { return; }
      if (this.onMessage) this.onMessage(msg.m, msg.from);
    };
  },
  silence() { return (performance.now() - this.lastHeard) / 1000; },   // the server pings every 10 s
  // important = never skipped (inputs, purchases); snapshots may be skipped if the network is busy.
  send(m, to = 'all', important = false) {
    if (!this.token) return false;
    if (!important && this.inflight > 2) return false;
    this.inflight++;
    fetch('/net/send?token=' + encodeURIComponent(this.token), { method: 'POST', headers: this.HEADERS, body: JSON.stringify({ to, m }) })
      .then(r => { if (r.status === 403) this.status = 'closed'; })
      .catch(() => {}).finally(() => { this.inflight--; });
    return true;
  },
  async rehost() {   // host: open the game again with the SAME join code
    const d = await this.api('/net/host', { code: this.code, rehost: true });
    Object.assign(this, { token: d.token, code: d.code, address: d.address || this.address });
    this.open();
  },
  async rejoin() {   // player: join again with the remembered code
    const d = await this.api('/net/join', { code: this.code });
    Object.assign(this, { id: d.id, token: d.token });
    this.open();
  },
  get lost() { return this.status === 'closed' || this.silence() > 12; },
  // Call every frame during a Wi-Fi game: quietly reconnects if the connection broke.
  // onGiveUp(message) = the game can't come back (another window took over hosting).
  maintain(dt, onBack, onGiveUp) {
    if (!this.role || this.status === 'off') return;
    this.retryT -= dt;
    if (this.busy || this.retryT > 0) return;
    if (this.status === 'closed') {
      this.busy = true; this.retryT = 3;
      (this.role === 'host' ? this.rehost() : this.rejoin())
        .then(() => { this.busy = false; this.fails = 0; if (onBack) onBack(this.role); })
        .catch(e => {
          this.busy = false; this.fails = (this.fails || 0) + 1;
          // The host window was replaced, or (for a player) the game is gone or has a new code.
          const over = e.taken || (this.role === 'guest' && (e.status === 403 || e.status === 409) && this.fails >= 4);
          if (over && onGiveUp) onGiveUp(e.message);
        });
    } else if (this.silence() > 14) { this.retryT = 5; this.open(); }
  },
  leave() {
    if (this.token) fetch('/net/leave?token=' + encodeURIComponent(this.token), { method: 'POST', headers: this.HEADERS, body: '{}', keepalive: true }).catch(() => {});
    if (this.es) this.es.close();
    Object.assign(this, { role: null, id: null, token: null, code: null, es: null, status: 'off', onMessage: null, busy: false, fails: 0 });
  },
};
// Only really leave when the page is closed or reloaded. Phones also fire 'pagehide' when the browser
// goes to the background or the screen locks (persisted = it may come back): then we stay in the game.
addEventListener('pagehide', e => { if (Net.token && !e.persisted) Net.leave(); });
// Back from the lock screen or another app: reconnect right away instead of waiting.
function netComeBack() {
  if (!Net.role || Net.status === 'off') return;
  Net.lastHeard = performance.now();
  if (Net.status !== 'closed') Net.open();
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) netComeBack(); });
addEventListener('pageshow', e => { if (e.persisted) netComeBack(); });
