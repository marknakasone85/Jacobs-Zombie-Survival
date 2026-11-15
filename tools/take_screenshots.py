#!/usr/bin/env python3
"""Take the pictures on the README page (the screenshots/ folder) with Google Chrome on a Mac.

Chrome opens the game hidden, tools/screenshot_scenes.js sets up each scene (a level, zombies, a gun
firing), and Chrome saves a picture. macOS's own `sips` turns it into a small JPEG (1280x720).
Nothing is installed and your saved game isn't touched: Chrome uses a fresh, temporary profile.

    python3 tools/take_screenshots.py                 # all the pictures
    python3 tools/take_screenshots.py beach mall      # just these scenes
    python3 tools/take_screenshots.py strike,19.3     # a scene at a different moment (seconds)

Look at the new pictures before saving them: zombies move a little differently every time.
"""
import pathlib
import re
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'screenshots'
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

# scene in screenshot_scenes.js -> picture name, and how long Chrome waits (ms) for the scene to be set up
SCENES = {
    'strike': ('air-strike', 20000),
    'heli': ('sky-escape', 4000),
    'nyc': ('new-york-city', 4000),
    'beach': ('zombie-beach', 4000),
    'mall': ('shopping-mall', 4000),
    'sewer': ('sewer-escape', 4000),
    'snow': ('frozen-forest', 4000),
    'barrels': ('exploding-barrels', 4000),
    'shop': ('gun-shop', 3000),
}


def make_page(tmp, script='tools/screenshot_scenes.js'):
    """index.html, reading the game's files from this folder, without the security line
    (it would stop the extra script, which isn't one of the game's files), plus that script."""
    html = (ROOT / 'index.html').read_text()
    html = re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]*>\n?', '', html)
    html = html.replace('<head>', f'<head><base href="{ROOT.as_uri()}/">', 1)
    html = html.replace('</body>', f'<script src="{script}"></script>\n</body>', 1)
    page = tmp / 'shots.html'
    page.write_text(html)
    return page


def main():
    wanted = sys.argv[1:] or list(SCENES)
    OUT.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory() as t:
        tmp = pathlib.Path(t)
        page = make_page(tmp)
        for arg in wanted:
            scene = arg.split(',')[0]
            if scene not in SCENES:
                sys.exit(f'No scene called {scene!r}. Scenes: {", ".join(SCENES)}')
            name, wait = SCENES[scene]
            png, jpg = tmp / f'{name}.png', OUT / f'{name}.jpg'
            subprocess.run([CHROME, '--headless=new', f'--user-data-dir={tmp / "profile"}', '--no-first-run',
                            '--allow-file-access-from-files', '--window-size=960,540', '--force-device-scale-factor=2',
                            '--hide-scrollbars', '--mute-audio', f'--virtual-time-budget={wait}',
                            f'--screenshot={png}', f'{page.as_uri()}#{arg}'], capture_output=True, timeout=120)
            if not png.exists():
                sys.exit(f'Chrome made no picture for {scene}')
            subprocess.run(['sips', '-s', 'format', 'jpeg', '-s', 'formatOptions', '72', '-z', '720', '1280',
                            str(png), '--out', str(jpg)], capture_output=True, check=True)
            print(f'{jpg.relative_to(ROOT)}  {jpg.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main()
