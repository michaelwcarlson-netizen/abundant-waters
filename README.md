# abundant-waters

**Abundant Waters** — a low-stress, open-world Boundary Waters canoe adventure game about a family of six on a trip from Sawbill to Smoke to Burnt Lake.

## Play

- [Start the connected day-one trip](index.html): break camp, paddle Sawbill, cross the portage, and settle in at Smoke Lake. Progress lasts only while the page is open; refreshing starts over.

## Design and activities

- [Design notes (v3)](docs/design.md)
- [J-stroke wobble meter](prototypes/j-stroke/index.html): paddle Sawbill Lake north to the portage ([hosted prototype](https://claude.ai/artifact/URx1GLySNc7zShbjRqmnim))
- [Bow & stern partnership](prototypes/bow-stern/index.html): paddle in rhythm with the bow, call Hut! and Draw! through a rock garden, or play two-player ([hosted prototype](https://claude.ai/artifact/BTtJrFVShRSDhMmwC9ENtt))
- [Portage Trail](prototypes/portage/index.html): choose your load, then balance packs and tilt the canoe from Sawbill to Smoke ([hosted prototype](https://claude.ai/artifact/68tMZjVatSB8xAbWd9ANBi))
- [Bear Hang](prototypes/bear-hang/index.html): throw a rope over a branch, hoist the food pack 12 ft up and 6 ft out, then see what the bear does at 2 a.m. ([hosted prototype](https://claude.ai/artifact/BD5rvMKzuT4XWdhxjcCx1L))
- [Storm Tarp](prototypes/tarp/index.html): pitch the tarp and tie your knots before the storm, then see who stays dry ([hosted prototype](https://claude.ai/artifact/3WH33nuCWfrb9iwnyyQ2dk))

## Local run and health checks

This is a static HTML game. There is no compile/build step or application dependency installation.
From this directory, run `python3 -m http.server 8765 --bind 127.0.0.1`, then open
`http://127.0.0.1:8765` in a browser.

The optional browser regression check requires Node.js, Playwright (resolvable by Node),
and a Playwright Chromium installation: `node tests/health-check.cjs`.
To use an existing Chrome installation instead, set `BROWSER_PATH` to its executable.
Set `GAME_URL` if the server uses another address. The check covers trip navigation,
activity completion/replay, DOM references, runtime errors, and phone viewport loading.
Completion checks use test-only injected state to reach the exits; they do not replace
normal-paced human playtesting. See [the post-merge report](docs/health-check.md).
