#!/usr/bin/env python3
"""Make the game's app icons (icons/), the picture a phone shows when the game is put on its home screen.

Google Chrome opens the game hidden and tools/icon_art.js draws a zombie with the game's own drawing code,
at every size phones and browsers want. The pictures come back through the page, so they are exact
(and the rounded ones keep their see-through corners). Nothing is installed; no saves are touched.

    python3 tools/make_icons.py
"""
import base64
import html
import json
import pathlib
import re
import subprocess
import sys
import tempfile

from take_screenshots import CHROME, ROOT, make_page

OUT = ROOT / 'icons'


def main():
    OUT.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory() as t:
        tmp = pathlib.Path(t)
        page = make_page(tmp, 'tools/icon_art.js')
        dom = subprocess.run([CHROME, '--headless=new', f'--user-data-dir={tmp / "profile"}', '--no-first-run',
                              '--allow-file-access-from-files', '--mute-audio', '--virtual-time-budget=3000',
                              '--dump-dom', page.as_uri()], capture_output=True, text=True, timeout=120).stdout
    m = re.search(r'<script type="application/json" id="icon-out">(.*?)</script>', dom, re.S)
    if not m:
        sys.exit('Chrome drew no icons (look for ERR in the page title)')
    for name, url in json.loads(html.unescape(m.group(1))).items():
        path = OUT / f'{name}.png'
        path.write_bytes(base64.b64decode(url.split(',', 1)[1]))
        print(f'{path.relative_to(ROOT)}  {path.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main()
