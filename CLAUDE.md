# Jacob's Zombie Survival - project guide

A side-scrolling zombie shooter for Jacob and his friends. Plain HTML5 canvas + JavaScript, **no build step, no dependencies**: every picture and sound is made in code. It runs by double-clicking `index.html`, and on phones/tablets/computers over home Wi-Fi via `share-on-network.command`. The README is the player-facing guide (levels, zombies, weapons, armor, controls, Wi-Fi) and lists what each file does.

## Rules the owner cares about
- **Backups:** this folder is a git repo. After each finished feature, offer to "save a backup", and commit only when the owner says yes. End commit messages with the Co-Authored-By line from the system reminder.
- **Keep it easy to deploy:** no build tools, no npm, no backend beyond `tools/share_server.py`.
- **Security of the home-network share:** the server only serves `/index.html`, `/css/` and `/js/` (no hidden files like `.git`, no `tools/`, no folder listings), only this computer can host, joining needs the 4-digit code, and it switches off after 3 hours. Keep it that way.
- The owner adds requirements as they go; new requests usually extend the game rather than replace it. Never remove levels.

## How the owner plays
- Shares with `share-on-network.command` (port 8010). Host: `http://localhost:8010` -> WI-FI -> HOST A GAME. Friends: `http://<Mac Wi-Fi IP>:8010` , 2-4 players, including iPhones.
- **Only one window may host.** A second HOST press stops the first window (it used to fight over the game and kick everyone). Don't host in the app's browser pane while the family hosts in their own browser.

## Testing
- The app's browser pane: `.claude/launch.json` has `zombie-survival` (local only, port 8781) and `zombie-survival-wifi` (port 8010).
- A hidden pane doesn't animate: drive the game with `step(dt)` from the page, or `startHostTicker()`.
- Several Wi-Fi players in one browser: give each its own origin (`localhost`, `127.0.0.1`, `192.168.x.x`, `zombie.localhost`) so their saves don't mix, and call `startHostTicker()` on each guest.
- Tests change the save (`localStorage` key `jacob-zombie-survival.v1`): back it up first and put it back afterwards, on every origin you used.
