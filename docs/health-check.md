# Post-merge health check — September 28, 2026

Result: the connected day-one trip and all five activities load, exit and replay
in local Chrome checks. Three focused bug categories were fixed. The merged
mechanics, physics values, difficulty, dialogue, scoring and artwork were preserved.

## Inspected

- README, v3 design notes, Git merge history, root trip controller and all five
  activity HTML files: J-Stroke, Bow & Stern, Portage Trail, Storm Tarp, Bear Hang.
- Trip step/progress handling, iframe paths and sandbox, activity input handlers,
  simulation/update loops, completion cards, replay, tuning controls and DOM IDs.
- Local references, inline JavaScript syntax, merge markers and external assets.

Architecture: root `index.html` embeds independent canvas games in an iframe.
Each activity owns its simulation, inputs, stamps, hints, rendering and restart.
There are no module imports, bundled assets, compile step, or shared gameplay engine.
Google Fonts are the only external assets; system-font fallbacks exist.
The guide advances manually and activity state is recreated when its iframe is
replaced. The broader multiday game in the design notes is not implemented here.

## Problems found and fixed

1. All five activity pages lacked a doctype, character encoding and phone viewport.
   Browsers entered quirks mode, phones used a 980-pixel layout, and HTTP-served
   punctuation/arrows could display incorrectly. Added standards-mode, UTF-8,
   language and viewport declarations; phone layout now uses the actual 390-pixel
   test viewport. Existing responsive styles and art are unchanged.
2. J-Stroke and Bow & Stern replay left focus on the replay button, whose key events
   were deliberately ignored by the game. Baseline reproduction recorded zero
   strokes after replay; the repaired check records a stroke. Returned focus from
   replay and Bow & Stern mode/call buttons using the same blur pattern already
   used by Portage controls.
3. Bow & Stern could show an old completion card after switching player mode during
   its arrival delay. Reproduced on the committed baseline. Reset now cancels that
   pending completion timeout; the new run stays active.

No broken imports, dead local game paths, duplicate DOM IDs, merge markers or
uncaught runtime exceptions were found. The browser requests an optional favicon
that is absent (404); this is unrelated to game assets. Some external font requests
were aborted during rapid navigation; no local game requests failed.

## Checks run

- Local HTTP server and headless installed Google Chrome through Playwright.
- Inline JavaScript syntax, literal DOM references, unique IDs and local HTML paths.
- Entire trip forward/backward, alternate paddle, player-mode switch, day completion
  and start-over; desktop and emulated-phone loading.
- All five activity completion cards and replay; partial Portage delivery, return
  trip and final delivery; untied-tarp storm completion and low-hang bear sequence.
- Replay keyboard regression, mode-switch timeout regression, tuning controls,
  viewport dimensions, touch smoke checks and runtime/network error collection.
- Desktop/phone screenshots and `git diff --check`.

The browser checks pass after the fixes. Completion tests inject temporary state
into browser responses to reach exits or advance time. They verify technical
completion paths, not the feasibility or feel of a full playthrough. The test hooks
are absent from production HTML. No build command exists in this repository.

## Files changed

- `prototypes/j-stroke/index.html`: document declarations and replay focus.
- `prototypes/bow-stern/index.html`: document declarations, button focus and
  completion-timeout cancellation.
- `prototypes/portage/index.html`, `prototypes/tarp/index.html`,
  `prototypes/bear-hang/index.html`: document declarations only.
- `tests/health-check.cjs`: repeatable static/browser regression checks.
- `README.md`: local run and test instructions.
- `docs/health-check.md`: this report.

Existing untracked `.DS_Store` files were left alone.

## Human playtesting and later work

- Play each activity through at normal speed on desktop and real phones/tablets,
  including Safari, landscape and short screens.
- Check simultaneous two-player touch, keyboard/mouse handoffs, tab/window focus
  changes, all tarp knot/repair outcomes and bear-hang success/failure outcomes.
- Check repeated activity changes and replay for delayed hints/stamp notifications.

Later, consider automated execution of the new health check in CI and a focused
input/timer lifecycle audit. Hints, stamps, tuning, helpers and render/input plumbing
are repeated across the standalone activities; consolidation could reduce drift,
but is a separate refactor. No clearly obsolete replacement level files were found.
Shared trip state/completion messages would be a separate product/architecture
decision: currently stamps/results are per activity and returning to an activity
starts it fresh. Preserve that behavior until a design change is explicitly approved.
