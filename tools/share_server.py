"""Locked-down web server for sharing Zombie Survival on a home network,
plus a tiny message relay for Wi-Fi co-op (up to 4 players).
(Same design as the one in Sloth-Slap-Game.)

Security choices:
  * Only the game itself is served: /index.html, /css/... and /js/...
    Everything else (hidden files, the .git backup history, settings, README,
    scripts) answers "404 Not Found", and folders are never listed.
  * Files are read-only: nothing anyone sends is ever written to disk.
  * Co-op relay (/net/...):
      - only the person sitting at THIS computer can host a game (localhost only)
      - joining needs the 4-digit code shown on the host's screen; after too many
        wrong codes a device is locked out for a minute
      - every request needs a secret per-player token; messages are small,
        kept only in memory and simply passed between players
      - requests must carry an "X-Zombie" header, so other web pages a player
        happens to have open cannot talk to the game
  * Stops by itself after a few hours so it is never left running by accident.

Usage:  python3 tools/share_server.py [--port 8010] [--hours 3] [--local]
        (--local = only this computer can connect, for testing)
"""
import argparse
import collections
import http.server
import json
import os
import posixpath
import secrets
import socket
import sys
import threading
import time
import urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ALLOWED_PREFIXES = ("/css/", "/js/")
MAX_BODY = 256 * 1024       # biggest message accepted (bytes)
MAX_PLAYERS = 4             # host + 3 guests
WRONG_CODE_LIMIT = 8        # wrong join codes before a lockout
LOCKOUT_SECONDS = 60
GONE_AFTER = 20             # seconds without a connection before a player counts as gone
HOST_GONE_AFTER = 30        # ...and before the host's game is closed

LOCK = threading.Lock()
ROOM = None                 # the one co-op game this computer can host
FAILS = {}                  # ip -> [wrong attempts, locked until]
ADDRESS = ""                # http://<wifi ip>:<port>, shown to the host


def allowed(path):
    if path == "/index.html":
        return True
    if not path.startswith(ALLOWED_PREFIXES):
        return False
    # no hidden files or folders anywhere in the path
    return not any(part.startswith(".") for part in path.split("/") if part)


# ---------------------------------------------------------------- co-op relay
class Client:
    def __init__(self, pid, ip):
        self.id = pid
        self.ip = ip
        self.token = secrets.token_urlsafe(18)
        self.queue = collections.deque(maxlen=400)  # a slow player just misses old updates
        self.cond = threading.Condition(LOCK)
        self.streams = 0
        self.stream_gen = 0   # only the newest connection may take messages (an old one may be dead)
        self.last_seen = time.time()
        self.gone = False

    def deliver(self, text):  # caller holds LOCK
        self.queue.append(text)
        self.cond.notify_all()


class Room:
    def __init__(self, code=None):
        self.code = code or f"{secrets.randbelow(10000):04d}"
        self.host = Client(0, "127.0.0.1")
        self.guests = {}  # id -> Client

    def by_token(self, token):
        if not isinstance(token, str) or not token or not token.isascii():
            return None
        if secrets.compare_digest(token, self.host.token):
            return self.host
        for g in self.guests.values():
            if secrets.compare_digest(token, g.token):
                return g
        return None

    def everyone(self):
        return [self.host] + list(self.guests.values())


def pack(sender, m):
    return json.dumps({"from": sender, "m": m}, separators=(",", ":"))


def close_room_locked(reason, rehost=False):
    global ROOM
    if not ROOM:
        return
    for c in ROOM.everyone():
        if c is not ROOM.host:
            # rehost = the host is reconnecting with the same code: players rejoin automatically
            c.deliver(pack("server", {"t": "hostLeft", "reason": reason, "rehost": rehost}))
        c.gone = True
        c.cond.notify_all()
    ROOM = None


def remove_guest_locked(g):
    g.gone = True
    g.cond.notify_all()
    if ROOM and ROOM.guests.get(g.id) is g:
        del ROOM.guests[g.id]
        ROOM.host.deliver(pack("server", {"t": "left", "id": g.id}))
        print(f"  Player {g.id + 1} left the game.")
        sys.stdout.flush()


def janitor():
    while True:
        time.sleep(2)
        now = time.time()
        with LOCK:
            if not ROOM:
                continue
            for g in list(ROOM.guests.values()):
                if g.streams == 0 and now - g.last_seen > GONE_AFTER:
                    remove_guest_locked(g)
            h = ROOM.host
            if h.streams == 0 and now - h.last_seen > HOST_GONE_AFTER:
                close_room_locked("The host closed the game.")


class GameOnlyHandler(http.server.SimpleHTTPRequestHandler):
    server_version = "ZombieSurvival"
    sys_version = ""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    # ---------- static files (whitelisted, read-only) ----------
    def send_head(self):
        raw = urllib.parse.urlsplit(self.path).path
        path = posixpath.normpath(urllib.parse.unquote(raw))  # collapses any "../"
        if path in ("/", "."):
            path = "/index.html"
        full = self.translate_path(path)
        if not allowed(path) or not os.path.isfile(full):
            self.send_error(404, "Not Found")
            return None
        self.path = path
        return super().send_head()

    def list_directory(self, path):  # never show folder contents
        self.send_error(404, "Not Found")
        return None

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Cache-Control", "no-store")  # players always get the newest version
        super().end_headers()

    def log_message(self, fmt, *args):
        pass  # keep the window quiet

    # ---------- helpers ----------
    def json_reply(self, code, obj=None):
        body = json.dumps(obj if obj is not None else {}).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def query(self):
        return urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query)

    def token_client(self):
        token = (self.query().get("token") or [""])[0]
        return ROOM.by_token(token) if ROOM else None

    # ---------- relay endpoints ----------
    def do_GET(self):
        if urllib.parse.urlsplit(self.path).path == "/net/events":
            return self.events()
        return super().do_GET()

    def do_POST(self):
        path = urllib.parse.urlsplit(self.path).path
        if not path.startswith("/net/"):
            return self.json_reply(405, {"error": "Not allowed"})
        if self.headers.get("X-Zombie") != "1":
            return self.json_reply(403, {"error": "Not allowed"})
        try:
            length = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            return self.json_reply(400, {"error": "Bad request"})
        if length > MAX_BODY:
            return self.json_reply(413, {"error": "Message too big"})
        try:
            data = json.loads(self.rfile.read(length) or b"{}")
        except ValueError:
            return self.json_reply(400, {"error": "Bad request"})
        if not isinstance(data, dict):
            return self.json_reply(400, {"error": "Bad request"})

        routes = {"/net/host": self.net_host, "/net/join": self.net_join,
                  "/net/send": self.net_send, "/net/leave": self.net_leave}
        handler = routes.get(path)
        if not handler:
            return self.json_reply(404, {"error": "Not found"})
        return handler(data)

    def net_host(self, data):
        global ROOM
        if self.client_address[0] not in ("127.0.0.1", "::1"):
            return self.json_reply(403, {"error": "Only the computer running the game can host."})
        # The host may ask for its previous code back (after a lost connection or a
        # restarted sharing window) so everyone can rejoin without a new code.
        want = str(data.get("code", ""))
        reuse = want if len(want) == 4 and want.isdigit() else None
        automatic = bool(data.get("rehost"))
        with LOCK:
            if automatic and ROOM and ROOM.code != reuse:
                # A window reconnecting by itself must never take over a game that another
                # window started since. (Two host windows used to keep stealing the game from
                # each other, which kicked everyone out every few seconds.)
                return self.json_reply(409, {"error": "Another window on this computer is hosting the Wi-Fi game now.", "taken": True})
            rehost = bool(reuse and ROOM and ROOM.code == reuse)
            if ROOM and not rehost:
                # The person pressed HOST A GAME in a new window: the old window is told to stop.
                ROOM.host.deliver(pack("server", {"t": "replaced"}))
            close_room_locked("The host is reconnecting..." if rehost else "The host started a new game. Ask for the new code.", rehost)
            ROOM = Room(reuse if automatic else None)
            room = ROOM
        print(f"  Wi-Fi game {'re-opened' if rehost else 'started'}. Join code: {room.code}")
        sys.stdout.flush()
        return self.json_reply(200, {"id": 0, "token": room.host.token, "code": room.code, "address": ADDRESS})

    def net_join(self, data):
        ip = self.client_address[0]
        now = time.time()
        with LOCK:
            fails = FAILS.get(ip, [0, 0])
            if fails[1] > now:
                return self.json_reply(429, {"error": "Too many wrong codes. Wait a minute and try again."})
            if not ROOM:
                return self.json_reply(409, {"error": "No Wi-Fi game is being hosted right now."})
            if str(data.get("code", "")) != ROOM.code:
                fails[0] += 1
                if fails[0] >= WRONG_CODE_LIMIT:
                    fails = [0, now + LOCKOUT_SECONDS]
                FAILS[ip] = fails
                return self.json_reply(403, {"error": "That code is not right. Check the host's screen."})
            FAILS.pop(ip, None)
            free = [i for i in range(1, MAX_PLAYERS) if i not in ROOM.guests]
            if not free:
                return self.json_reply(409, {"error": "The game is full (4 players)."})
            g = Client(free[0], ip)
            ROOM.guests[g.id] = g
            ROOM.host.deliver(pack("server", {"t": "joined", "id": g.id}))
        print(f"  Player {g.id + 1} joined the game (device {ip}).")
        sys.stdout.flush()
        return self.json_reply(200, {"id": g.id, "token": g.token})

    def net_send(self, data):
        with LOCK:
            c = self.token_client()
            if not c or c.gone:
                return self.json_reply(403, {"error": "Not in this game."})
            c.last_seen = time.time()
            text = pack(c.id, data.get("m"))
            if c is ROOM.host:
                to = data.get("to", "all")
                targets = list(ROOM.guests.values()) if to == "all" else [ROOM.guests.get(to)]
                for g in targets:
                    if g:
                        g.deliver(text)
            else:
                ROOM.host.deliver(text)  # guests can only talk to the host
        self.send_response(204)
        self.end_headers()

    def net_leave(self, data):
        with LOCK:
            c = self.token_client()
            if c is not None:
                if c is ROOM.host:
                    close_room_locked("The host ended the game.")
                else:
                    remove_guest_locked(c)
        self.send_response(204)
        self.end_headers()

    def events(self):
        """Server-Sent Events stream: pushes messages to one player."""
        with LOCK:
            c = self.token_client()
            if not c or c.gone:
                c = None
            else:
                c.streams += 1
                # A player who reconnects gets a new stream. The old one stops right away instead of
                # taking messages and writing them into a connection that is probably dead.
                c.stream_gen += 1
                gen = c.stream_gen
                c.cond.notify_all()
        if c is None:
            return self.json_reply(403, {"error": "Not in this game."})
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.end_headers()
        try:
            self.wfile.write(b": connected\n\n")
            self.wfile.flush()
            while True:
                with LOCK:
                    if c.stream_gen != gen:
                        break
                    if not c.queue and not c.gone:
                        c.cond.wait(timeout=10)
                    if c.stream_gen != gen:
                        break
                    items = list(c.queue)
                    c.queue.clear()
                    c.last_seen = time.time()
                    gone = c.gone
                # The ping is a real message (comments are invisible to the page), so a quiet game
                # never looks like a lost connection.
                chunk = "".join(f"data: {t}\n\n" for t in items) if items else 'data: {"from":"server","m":{"t":"ping"}}\n\n'
                self.wfile.write(chunk.encode())
                self.wfile.flush()
                if gone:
                    break
        except (BrokenPipeError, ConnectionResetError, OSError):
            pass
        finally:
            with LOCK:
                c.streams -= 1
                c.last_seen = time.time()


def lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("10.255.255.255", 1))  # no traffic is sent; just picks the Wi-Fi address
        return s.getsockname()[0]
    except OSError:
        return None
    finally:
        s.close()


def main():
    global ADDRESS
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8010)
    ap.add_argument("--hours", type=float, default=3)
    ap.add_argument("--local", action="store_true")
    args = ap.parse_args()

    host = "127.0.0.1" if args.local else "0.0.0.0"
    try:
        server = http.server.ThreadingHTTPServer((host, args.port), GameOnlyHandler)
    except OSError:
        print(f"\n  Port {args.port} is busy. Is the game already being shared in another window?\n")
        sys.exit(1)
    server.daemon_threads = True

    ip = None if args.local else lan_ip()
    ADDRESS = f"http://{ip}:{args.port}" if ip else f"http://localhost:{args.port}"
    print("\n  Zombie Survival is now shared on your home network!\n")
    if ip:
        print("  On another computer or tablet on the same Wi-Fi, open this in a web browser:\n")
        print(f"      {ADDRESS}\n")
    print(f"  On this computer:  http://localhost:{args.port}")
    print("  (To host a Wi-Fi game, open that address on THIS computer: WI-FI -> HOST A GAME.)\n")
    print("  Only the game files are shared, read-only.")
    print(f"  Sharing stops automatically after {args.hours:g} hours.")
    print("  Close this window (or press Ctrl+C) to stop sharing now.\n")
    sys.stdout.flush()

    threading.Thread(target=janitor, daemon=True).start()
    timer = threading.Timer(args.hours * 3600, server.shutdown)
    timer.daemon = True
    timer.start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
        print("\n  Sharing stopped.\n")


if __name__ == "__main__":
    main()
