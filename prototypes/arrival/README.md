# Landing at Smoke Lake

Serve the repository over HTTP and open `prototypes/arrival/index.html`.
No build step or asset downloads are needed.

WASD/arrows or the thumb pad steer/paddle on water and walk ashore. Up paddles,
down back-paddles, sideways steers. E/Space or the action control steps out once
the hull settles near shore, unloads or carries nearby gear, and takes/releases
the bow. T or the small Take bow control grabs the hull directly when cargo is
also within reach, so you can pull it first. Walk while holding the bow to pull; hold the action to tie a line from
dry ground. B or Board canoe returns to a floating hull. P opens pause/controls.

There is no accepted landing rectangle or pack destination. Hull-frame momentum,
wind, shallow-ground friction, five hull collision samples, rock impacts, wave
exposure, floating gear, towing torque and bow-line tension determine the result.
A four-second quiet period with unloaded gear outside wave reach and the canoe
on high ground or tied reports completion to the unchanged immersive bridge.
Wet gear remains usable. Replay resets the same shoreline; Stay by the lake lets
you keep exploring. No timer, damage failure, scores, or ordered objectives.

Reuse: Storm Day's `clamp`, fixed simulation step, action press/release/cancel
lifecycle are imported directly. Character, carrying, thumb capture, towing and
hold-to-tie behavior follow Storm Day. J-stroke's inline hull-frame damping and
bow/stern collision response are adapted to a shoreline signed-distance model;
it has no exported canoe module. Shared bridge handles pause/resume, Escape and
completion. Existing source modules and other levels are unchanged.

Checks:
- `node --test prototypes/arrival/arrival.test.cjs`
- With Playwright and local Chrome: `GAME_URL=http://127.0.0.1:8766 BROWSER_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node prototypes/arrival/arrival-browser.test.cjs`

Physical iPhone/Safari handling, landing difficulty and child playtesting remain
human checks. This level adds no sound engine (existing referenced systems have
no shared audio API). The silent loon is an environmental detail.
