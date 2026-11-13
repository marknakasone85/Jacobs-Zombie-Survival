# Jacob's Zombie Survival - project guide

A side-scrolling zombie shooter for Jacob and his friends. Plain HTML5 canvas + JavaScript, **no build step, no dependencies**: every picture and sound is made in code. It runs by double-clicking `index.html`, and on phones/tablets/computers over home Wi-Fi via `share-on-network.command`. The README is the player-facing guide (levels, zombies, weapons, armor, controls, Wi-Fi) and lists what each file does.

## Rules the owner cares about
- **Backups:** this folder is a git repo, uploaded to the owner's public GitHub repo https://github.com/marknakasone85/Jacobs-Zombie-Survival. After each finished feature, offer to "save a backup". Only when the owner says yes, commit and then `git push`. End commit messages with the Co-Authored-By line from the system reminder.
  - Commits use GitHub's private noreply address, set in this repo's git config. Never put the owner's Gmail in a commit: the repo is public.
  - `git push` signs in through the GitHub CLI (`gh`, account marknakasone85), set up in this repo's `.git/config`. If GitHub says it isn't signed in, run `gh auth login --hostname github.com --git-protocol https --web </dev/null` in a Terminal tab. It shows a one-time code for the owner to enter at github.com/login/device within 15 minutes.
- **License:** MIT (`LICENSE`, copyright Mark A. Nakasone). The owner chose it on 2026-11-07 because they want the game free to share, with the no-warranty protection.
- **Keep it easy to deploy:** no build tools, no npm, no backend beyond `tools/share_server.py`.
- **Security of the home-network share:** the server only serves `/index.html`, `/css/` and `/js/` (no hidden files like `.git`, no `tools/`, no folder listings), only this computer can host, joining needs the 4-digit code, and it switches off after 3 hours. Keep it that way.
  - Addresses are decoded once in `game_file()`. Never hand an undecoded path to `translate_path`, which decodes again: `/js/%252e%252e/%252egit/config` used to serve the whole folder. Only IP addresses and home names (localhost, *.local ...) get answers (`host_ok`, against DNS rebinding).
  - Look-ups by a name a guest sends (`WMAP`, `ARMOR_MAP`) have no prototype, so "constructor" or "__proto__" find nothing. Keep any new look-up table the same way.
- The owner adds requirements as they go; new requests usually extend the game rather than replace it. Never remove levels.

## How the owner plays
- Never write the family's real Wi-Fi address or network name in these files (the repo is public). Use `127.0.0.1` or `<wifi-network-address>`.
- Shares with `share-on-network.command` (port 8010). Host: `http://localhost:8010` -> WI-FI -> HOST A GAME. Friends: `http://<wifi-network-address>:8010`, 2-4 players, including iPhones.
- **Only one window may host.** A second HOST press stops the first window (it used to fight over the game and kick everyone). Don't host in the app's browser pane while the family hosts in their own browser.

## The Claude Artifact
- Published at https://claude.ai/artifact/TEJW7sM1nCrghUcRUBMBfJ ("Zombie Survival"), like Matthew-SurviveBob's "Survive Bob". It is private until the owner shares it.
- It is `artifact.html` plus the `js/` files. The page holds `css/style.css` and its fonts itself, because an Artifact can't load font files. `artifact.html` is made from `index.html` by `python3 tools/make_artifact.py`, which also prints the `files` list to publish. Both made pages are in `.gitignore`.
- To update after a change: run the script, then publish `artifact.html` with that `files` list and `url` set to the link above. Read the artifact first in a new conversation, or the publish is refused.
- In the Artifact there is no WI-FI button (it can't reach the share server). The last publish removed the old `css/style.css` file with `"css/style.css": null`, and `confirm()`/`alert()` don't work, so ask "are you sure?" on the page itself, like the two-press Reset button. Saves are per browser and separate from the home copy.
- Test it first with `zombie-artifact-preview` in `.claude/launch.json` (127.0.0.1:8782/artifact-preview.html, which looks like the published page). That server shows the whole folder, so it only listens on this computer; stop it after testing.

## The public web page (GitHub Pages)
- https://marknakasone85.github.io/Jacobs-Zombie-Survival/ is served by GitHub Pages straight from `main` (the whole repo, with `.nojekyll` so GitHub serves the files as they are). Every `git push` updates it within a minute or two.
- No WI-FI button there: `Net.onPublicWebsite()` says any name that isn't an IP address or a home name (localhost, *.local ...) is a public website, the same rule as the share server's `host_ok`.
- Fonts come from `css/fonts` (SIL Open Font License files next to them), not from Google, so the page contacts no other website. Keep it that way: no outside scripts, fonts, trackers or analytics.
- `index.html` has a Content-Security-Policy `<meta>` that enforces this. It lists `file:` so double-clicking `index.html` still works (Safari gives file pages no 'self'), `blob:` for the Wi-Fi background timer (a Worker) and `data:` for the icons drawn in code. A new kind of file or connection must be added there or the browser blocks it. `make_artifact.py` leaves it out of the Artifact (it only copies the title, stylesheet links and body).
- Everything in the repo can be read on the page too (README, CLAUDE.md, tools), so never put private details in any tracked file.

## Sound on phones
- Phones and tablets (`(pointer: coarse)`) get a lighter mix in `js/audio.js` (`PHONE`). Deep booms are filtered out before the limiter: the speaker can't play them, but the limiter still ducked everything after each shot, and the owner heard the sound "pulse" on a phone. Phones also get a shorter reverb, no oversampling, 3 zombie voices and a budget of new sounds (`busy()`).
- Every sound's mixer (`bus()`) is unplugged after `life` seconds (3.5 s, longer than any sound), or phones pile them up and the sound breaks up as a fight goes on. A new sound longer than about 3 s needs a bigger `life`. Loops unplug their own bus.
- `Sound.stats()` shows the phone mix, the mixers still plugged in, voices and limiter squash (dB) for testing. In the pane, the mobile preset turns on the phone mix (reload after resizing), and a real click is needed before sound starts.

## Barrels
- `js/barrels.js`: the barrels on each map (`barrels: [[kind, x]]` in `js/levels.js`). Every explosion calls `blastBarrels()` (grenades, rockets, bolts, bloaters, barrels), so add it to any new explosion. Bullets, lasers and melee call `hitBarrel()`.
- Wi-Fi guests get barrels in the snapshot (`ba`), puddle kinds (`po`) and two zombie flags (stuck in slime, shocked). Lightning is a `zap` particle, so it reaches guests like other effects. `BARRELS` and `GOO_COLS` have no prototype.
- The city's burning barrels in the background are scenery (`drawFireBarrel`), not barrels you can shoot.
- Two functions with the same name in different files don't cause an error: the later one silently wins. That is how the desert's small tumbleweeds vanished in the controllers update. Search for a name before adding a function.

## Game controllers
- `js/gamepad.js` turns controller buttons into pretend keys (`pad0:jump` ...) that are listed in `CONTROLS` (`js/util.js`), so they reach every place keys do, Wi-Fi guests included. Start calls `onKey('p')`. Two players with one controller: it is P2's.
- Test with a fake `navigator.getGamepads = () => [pad]` (buttons with `pressed`/`value`, `axes`), then `pollPads()` and `step()`.

## Testing
- The app's browser pane: `.claude/launch.json` has `zombie-survival` (local only, port 8781), `zombie-survival-wifi` (port 8010) and `zombie-artifact-preview` (port 8782).
- The app may stop a server it started (the Wi-Fi share once stopped mid-session), so check `preview_list` before telling the owner a link still works.
- A hidden pane doesn't animate: drive the game with `step(dt)` from the page, or `startHostTicker()`.
- Several Wi-Fi players in one browser: give each its own origin (`localhost`, `127.0.0.1`, the Mac's Wi-Fi address, `zombie.localhost`) so their saves don't mix, and call `startHostTicker()` on each guest.
- Tests change the save (`localStorage` key `jacob-zombie-survival.v1`): back it up first and put it back afterwards, on every origin you used. Set the page's in-memory `save` too (`Object.assign(save, ...)`) before reloading, or the page writes the test save back.
- When the app window isn't open, pane screenshots don't refresh. Take pictures with headless Chrome instead (`--headless=new --screenshot`, its own `--user-data-dir` in the scratchpad) of a scratch copy of `index.html` with a `<base href>` to this folder and the CSP line removed, plus a small script that sets up the scene with `startLevel`, `spawnZombie` and `step`.
- Republishing the Artifact may be refused until you read the changed files with the Artifact tool (`action: read`, `paths`).
