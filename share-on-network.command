#!/bin/bash
# Double-click this file in Finder to share Zombie Survival on your home network.
# Anyone on the same Wi-Fi can then play it in their web browser.
# Only the game files are shared (read-only), and sharing stops by itself after 3 hours.
# To host a Wi-Fi game: open http://localhost:8010 on THIS computer, then WI-FI -> HOST A GAME.
# Only use this on your own home Wi-Fi, not on public Wi-Fi (cafes, hotels, airports).

cd "$(dirname "$0")" || exit 1
python3 tools/share_server.py --port 8010 --hours 3
