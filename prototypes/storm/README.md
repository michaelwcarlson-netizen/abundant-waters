# Storm Day campsite

Storm Day now plays as a small campsite adventure. The weather/cloth model in
`storm-physics.js` is unchanged. `storm-adventure.js` adds a camper, proximity-based
handling, bulk-dependent walking speed, canoe towing, continuous guyline adjustment,
and Dad's quiet arrival after the rain. `storm.js` draws the camp and connects controls
to the existing immersive pause and completion messages.

## Controls

- Walk: thumb pad on touchscreens, WASD or arrows on a keyboard.
- Camp action: tap the contextual button, or E / Space, to pick up, put down, take
  the canoe bow, or grab/release a nearby guyline.
- Canoe: walk to tow and turn it; hold the camp action to tension its bow line.
- Guyline: with it in hand, move sideways to change tension and down/up to lower/raise
  the edge. Release it with the camp action.
- Pause: Pause button or P. Fullscreen exit/resume stays with the shared trip player.

Rain begins after 32 simulation seconds, leaving the first 15 seconds for handling
and exploration. The wind then turns; rain eases and ends at 100 seconds. Dad joins
under the tarp for an automatic story before a small same-wind replay control appears.
No inventory, task-order gates, designated correct set-down targets, or new achievement
systems are added. Gear wetting, wind forces, canoe tether strain, water pooling and
runoff remain spatial and persistent within an attempt.

## Local checks

Serve the repository with a static HTTP server. From its root:

```sh
node --test prototypes/storm/storm.test.cjs prototypes/storm/storm-adventure.test.cjs
GAME_URL=http://127.0.0.1:8766 node prototypes/storm/storm-browser.test.cjs
GAME_URL=http://127.0.0.1:8766 node prototypes/storm/storm-touch.test.cjs
```

The browser check requires Playwright and its Chromium browser. Set `BROWSER_PATH`
to use an installed Chrome executable instead. It uses real keyboard/CDP touch inputs
and Playwright's controlled clock for the full weather cycle. Observation hooks are
injected into responses only; none are included in the playable HTML or scripts.

Validation covers movement, the jacket slice, continuous tarp adjustment, bulk carrying,
canoe towing/tying, pause, multiple weather scenarios, Dad's arrival, replay, and the
shared immersive exit/resume and progress path. Benchmark levels and shared files are
left unchanged. Browser emulation cannot establish whether kids find the movement fun,
or replace a real iPhone/Safari check of simultaneous thumbs, landscape and fullscreen.
