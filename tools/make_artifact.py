#!/usr/bin/env python3
"""Make the Claude Artifact version of the game: a web page anyone with the link can play.

The Artifact uses the same game files (css/ and js/) with its own page, artifact.html, which this
script makes from index.html. Run it after changing index.html, then publish artifact.html again
(the steps are in CLAUDE.md). It also writes artifact-preview.html, which looks like the published
page, for testing on this computer. Both are made here, so they are not saved in the backups.

What is different in the Artifact:
- No WI-FI button. An Artifact can't reach the home share server, so it's 1 or 2 players on one device.
- The page keeps the Artifact's 16px side margins and stays clear of phone notches.
- css/style.css and its fonts are put inside the page, because an Artifact can't load font files of its own.

    python3 tools/make_artifact.py
"""
import base64
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent

# The Artifact service wraps the page in this (from the published Bob game), so the preview does too.
SKELETON_TOP = ('<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,'
                'initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;box-sizing:border-box;'
                'padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}'
                'html{scroll-padding-top:env(safe-area-inset-top,0px)}body{margin:0;padding:0;font:14px '
                '-apple-system,BlinkMacSystemFont,sans-serif;background:#fff;color:#000}img{max-width:100%}'
                '[hidden]:not([hidden=until-found i]){display:none!important}</style></head><body>\n')
SKELETON_END = '\n</body></html>\n'

ARTIFACT_STYLE = """<style>
  /* Layout: one 16:9 game screen, as big as fits inside a 16px side gutter; menus and touch buttons float over it. */
  /* The game keeps its one dark look in light and dark mode alike. */
  :root { color-scheme: dark; --bg: #0b0716; }
  html, body { height: 100%; background: var(--bg); }
  body {
    position: relative; inset: auto;
    padding-block: 0;
    padding-left: max(16px, env(safe-area-inset-left, 0px));
    padding-right: max(16px, env(safe-area-inset-right, 0px));
  }
  canvas {
    --gutter: calc(max(16px, env(safe-area-inset-left, 0px)) + max(16px, env(safe-area-inset-right, 0px)));
    --bars: calc(env(safe-area-inset-top, 0px) + env(safe-area-inset-bottom, 0px));
    width: min(calc(100vw - var(--gutter)), calc((100vh - var(--bars)) * 16 / 9));
    width: min(calc(100vw - var(--gutter)), calc((100dvh - var(--bars)) * 16 / 9));
    max-width: 100%;
  }
  .overlay {
    padding: calc(16px + env(safe-area-inset-top, 0px)) max(16px, env(safe-area-inset-right, 0px))
             calc(16px + env(safe-area-inset-bottom, 0px)) max(16px, env(safe-area-inset-left, 0px));
  }
  .panel { max-height: 100%; }
  @media (max-height: 520px) {
    .overlay { padding-top: calc(8px + env(safe-area-inset-top, 0px)); padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px)); }
  }
</style>"""


def main():
    page = (ROOT / 'index.html').read_text(encoding='utf-8')
    head = re.search(r'<head>(.*?)</head>', page, re.S).group(1)
    body = re.search(r'<body>(.*?)</body>', page, re.S).group(1).strip('\n')
    title = re.search(r'<title>(.*?)</title>', head, re.S).group(1)
    links = re.findall(r'<link [^>]*>', head)   # css/style.css (and any others), in order

    wifi = '<button data-n="net">WI-FI</button>'
    if body.count(wifi) != 1:
        sys.exit('Could not find the WI-FI button in index.html. Update tools/make_artifact.py to match.')
    body = body.replace(wifi, '')

    # css/style.css goes inside the page, with its fonts as data, because an Artifact can't load font files of its own.
    style_link = '<link rel="stylesheet" href="css/style.css">'
    if style_link not in links:
        sys.exit('Could not find the css/style.css link in index.html. Update tools/make_artifact.py to match.')
    css = (ROOT / 'css/style.css').read_text(encoding='utf-8')
    font_url = re.compile(r"url\('fonts/([^']+\.woff2)'\)")
    css, fonts = font_url.subn(lambda m: 'url(data:font/woff2;base64,'
                               + base64.b64encode((ROOT / 'css/fonts' / m.group(1)).read_bytes()).decode() + ')', css)
    if fonts != 3:
        sys.exit('Expected 3 fonts in css/style.css. Update tools/make_artifact.py to match.')
    links = [('<style>\n' + css + '</style>') if link == style_link else link for link in links]

    top = '\n'.join([
        f'<title>{title}</title>',
        '<meta name="claude:viewport-fit-sides" content="cover">',
        '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">',
        *links,
        ARTIFACT_STYLE,
    ])
    artifact = top + '\n' + body + '\n'
    (ROOT / 'artifact.html').write_text(artifact, encoding='utf-8')
    (ROOT / 'artifact-preview.html').write_text(SKELETON_TOP + artifact + SKELETON_END, encoding='utf-8')

    # The game files the page needs, to publish next to it.
    files = [m for m in re.findall(r'(?:href|src)="((?:css|js)/[^"]+)"', artifact)]
    missing = [f for f in files if not (ROOT / f).is_file()]
    if missing:
        sys.exit('These files are missing: ' + ', '.join(missing))
    print('Wrote artifact.html and artifact-preview.html')
    print('Publish artifact.html with these files:')
    print(json.dumps({f: f for f in files}, indent=1))


if __name__ == '__main__':
    main()
