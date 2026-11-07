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
- It is `artifact.html` plus `css/style.css` and the `js/` files. `artifact.html` is made from `index.html` by `python3 tools/make_artifact.py`, which also prints the `files` list to publish. Both made pages are in `.gitignore`.
- To update after a change: run the script, then publish `artifact.html` with that `files` list and `url` set to the link above. Read the artifact first in a new conversation, or the publish is refused.
- In the Artifact there is no WI-FI button (it can't reach the share server), and `confirm()`/`alert()` don't work, so ask "are you sure?" on the page itself, like the two-press Reset button. Saves are per browser and separate from the home copy.
- Test it first with `zombie-artifact-preview` in `.claude/launch.json` (127.0.0.1:8782/artifact-preview.html, which looks like the published page). That server shows the whole folder, so it only listens on this computer; stop it after testing.

## Testing
- The app's browser pane: `.claude/launch.json` has `zombie-survival` (local only, port 8781), `zombie-survival-wifi` (port 8010) and `zombie-artifact-preview` (port 8782).
- The app may stop a server it started (the Wi-Fi share once stopped mid-session), so check `preview_list` before telling the owner a link still works.
- A hidden pane doesn't animate: drive the game with `step(dt)` from the page, or `startHostTicker()`.
- Several Wi-Fi players in one browser: give each its own origin (`localhost`, `127.0.0.1`, the Mac's Wi-Fi address, `zombie.localhost`) so their saves don't mix, and call `startHostTicker()` on each guest.
- Tests change the save (`localStorage` key `jacob-zombie-survival.v1`): back it up first and put it back afterwards, on every origin you used.
