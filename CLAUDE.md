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

## The Claude Artifact
- Published at https://claude.ai/artifact/TEJW7sM1nCrghUcRUBMBfJ ("Zombie Survival"), like Matthew-SurviveBob's "Survive Bob". It is private until the owner shares it.
- It is `artifact.html` plus `css/style.css` and the `js/` files. `artifact.html` is made from `index.html` by `python3 tools/make_artifact.py`, which also prints the `files` list to publish. Both made pages are in `.gitignore`.
- To update after a change: run the script, then publish `artifact.html` with that `files` list and `url` set to the link above. Read the artifact first in a new conversation, or the publish is refused.
- In the Artifact there is no WI-FI button (it can't reach the share server), and `confirm()`/`alert()` don't work, so ask "are you sure?" on the page itself, like the two-press Reset button. Saves are per browser and separate from the home copy.
- Test it first with `zombie-artifact-preview` in `.claude/launch.json` (127.0.0.1:8782/artifact-preview.html, which looks like the published page). That server shows the whole folder, so it only listens on this computer; stop it after testing.

## Testing
- The app's browser pane: `.claude/launch.json` has `zombie-survival` (local only, port 8781), `zombie-survival-wifi` (port 8010) and `zombie-artifact-preview` (port 8782).
- The app may stop a server it started (the Wi-Fi share once stopped mid-session), so check `preview_list` before telling the owner a link still works.
- A hidden pane doesn't animate: drive the game with `step(dt)` from the page, or `startHostTicker()`.
- Several Wi-Fi players in one browser: give each its own origin (`localhost`, `127.0.0.1`, `192.168.x.x`, `zombie.localhost`) so their saves don't mix, and call `startHostTicker()` on each guest.
- Tests change the save (`localStorage` key `jacob-zombie-survival.v1`): back it up first and put it back afterwards, on every origin you used.
