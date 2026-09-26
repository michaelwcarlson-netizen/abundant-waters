# Abundant Waters

*A Boundary Waters canoe adventure game*

Design notes — v3, Sept 2026
Source material: "BWCA Sawbill Family Trip Itinerary — Carlson Family, August 2026"

> **What changed from v2:** the eight "stages" are rebuilt as a **day loop** you
> repeat, **zones** (the lakes) you move through, and **events** that break into
> the loop. Every v2 mechanic is still here; it just sits where it naturally
> happens in a day. Food now has a job, and "abide" is built into how the game
> plays instead of sitting on the to-explore list. v2 is in git history.

## Tone & style

Sneaky Sasquatch style: open world, low stress, goofy physics, no fail states that punish. You learn by doing, not by tutorial. Chase memories, not miles.

## Premise

You're a kid on a family canoe trip — a family of six. The trip's route (Sawbill → Smoke → Burnt) is the map. Each lake is a zone. The game is the trip: a handful of days, each one lived through the same loop.

## Structure at a glance

| Layer | What it is | Examples |
|---|---|---|
| **Day loop** | The repeating rhythm of every day | Break camp → travel → make camp → free time → evening → night |
| **Zones** | Where you are; each lake changes what the loop offers | Sawbill, Smoke, Burnt |
| **Skills** | What you get better at; carries across days | Strokes, map reading, knots, casting, swimming |
| **Events** | Things that interrupt the loop | Storm day, bear visit, moose sighting, northern lights |
| **Passport** | What you keep | Stamps, sightings, Fish Log, Journal |

---

## The day loop

A day has five beats. Time moves slowly with the sun, never as a countdown. The only soft pressure is light: whatever you haven't finished by dark, you finish by headlamp, which is clumsier and funnier, not a failure.

Each morning the family chooses: **travel day** (move to the next lake) or **layover day** (stay put, skip beat 2). Layover days are how a real BWCA trip breathes, and they're where most fishing, snorkeling and exploring happen.

### 1. Morning — break camp

- Breakfast. What you eat depends on last night (see *Food*).
- **Read the sky.** Wind direction, cloud shape and the look of the lake hint at the day's weather. It's the first place weather skill shows up, and it's how the storm gets foreshadowed.
- Pack up. Packing well makes the portage easier: heavy items low, nothing dangling. A sloppy pack is the one chipmunks raid.
- Choose: travel or layover.

### 2. Travel — paddle, navigate, portage *(travel days only)*

**Paddling** (v2 Stage 1)
- The J-stroke via a "wobble meter." Sloppy strokes zigzag you into the reeds.
- Sweep, draw, and the bow/stern partnership unlock through use, not menus.
- Wind and waves scale with how far from shore you drift. Hugging the shoreline is always the safe, slower choice.

**Navigation** (v2 Stage 3)
- No quest markers. You read the actual shoreline against a paper map.
- Identify bays, narrows and portage landings by their shape.
- Getting lost is recoverable and kind of funny: you find a new bay, a stray lure, a beaver lodge. Wrong turns pay out small discoveries so they never feel wasted.

**Portage** (v2 Stage 2): the only real gate between zones
- Load-balancing mini-game: pack weight, canoe carry, and not clocking your sibling with the bow.
- Multiple trips vs. one heavy haul: a real tradeoff, shaped by the family's **energy** (see *Food*).
- Muddy landings, rocks, and the classic portage-trail slip.

### 3. Afternoon — make camp

Arrive, pick a site, set up. Family jobs, each a small physics toy (v2 Stage 4):

- **Tarp line and knots:** a good tarp matters on storm day.
- **Firewood and fire building:** a good fire matters at dinner.
- **Water filtering.**
- Tent spot choice: pick the slope wrong and everyone slides into one corner overnight.

Site choice matters a little: rocky points have good snorkeling and smallmouth; sheltered bays are calmer in wind.

### 4. Free time — fish, swim, explore

The open-world heart of the day. No required order.

**Fishing** (v2 Stage 5)
- Smallmouth off the rocks, northern pike in the weeds. Walleye wait for dusk (beat 5).
- Map skill pays off: read the shoreline for drop-offs instead of following a marker.

**Snorkel & dive** (v2 Stage 6)
- Swim off the camp rocks and from the canoe with a mask and snorkel.
- Clear water lets you spot fish before you cast: scouting feeds fishing.
- Discoveries: sunken logs, lost paddles and lures, voyageur-era artifacts, crayfish, freshwater sponges. Found items go in the Passport.
- Built-in safety habits: buddy system, a cold meter that tells you when to get out, staying near shore.

**Explore on foot or by canoe:** short hikes, wildlife spotting, filling the sightings page.

### 5. Evening & night — dinner, bear hang, sky

- **Dusk fishing:** walleye bite.
- **Dinner:** the catch gets cooked on the fire you built.
- **Bear bag:** throw a rope over a branch and hoist. Hang it lazy and a bear sorts you out at 2 a.m. (see *Events*).
- **Night sky** (v2 Stage 8): lie back and connect constellations by hand. Each one unlocks a lore card.
- **Story time** by the fire or in the tent: family lore and memories, fed by the day's Journal.
- Sleep. The Journal page for the day fills in on its own from what you did.

---

## Food & energy

In v2, a bad fishing day meaning oatmeal was charming but didn't affect anything. In v3, dinner sets the next day's **energy**:

| Last night's dinner | Next day |
|---|---|
| Fresh fish (a real meal) | High energy: one-trip portages are possible, longer paddles, a bonus story at night |
| Mixed / small catch | Normal day |
| Oatmeal again | Low energy: portages take more trips, the family's slower and grumpier (played for laughs) |

There's no starvation and no health bar. Food decides how *easy* tomorrow is, never whether you can continue. That keeps the fishing economy meaningful without breaking the low-stress promise.

---

## Zones

Each lake reshapes the loop instead of being a separate stage. Specific geography should come from the trip itinerary and real maps. The roles below are placeholders.

| Zone | Role in the trip | Loop emphasis |
|---|---|---|
| **Sawbill** | Entry point; sheltered; where you learn | Paddling basics, first camp, first fish. Safe to mess up. |
| **Smoke** | First portage behind you; the trip opens up | Navigation gets real; better snorkeling and wildlife |
| **Burnt** | Deepest point of the trip | Best fishing, darkest skies, most likely northern lights |

Going back is allowed. Nothing locks behind you.

---

## Events

Events break into the loop. Some are scripted, some come from conditions, some are consequences.

**Storm day** (scripted, once per trip; v2 Stage 7)
- Foreshadowed by the morning sky read: wind shifts, clouds stack, the lake goes dark.
- Get off the water early, never paddle in lightning, secure the canoe high on shore.
- Race to tarp up camp, stash gear and batten down before it hits. Good knots pay off here.
- Then the forced slow moment: the family waits it out under the tarp with cards, snacks and story time. The best story unlocks happen here.
- The storm passes into a rainbow or a glass-calm evening.

**Consequence events**
- **Bear visit:** lazy bear hang → 2 a.m. bear. Noisy, goofy, a lost food bag, oatmeal tomorrow. Nobody gets hurt.
- **Chipmunk raid:** careless pack → snacks gone.

**Condition events**
- **Northern lights:** rare; need a clear night, a far zone, and stillness (see *Abide*). Earned, not scheduled.
- **Wildlife encounters:** loons, moose, eagles, beavers and bears appear based on zone, time of day and how quiet you are.

---

## Abide: the quiet heart

The John 15 "abide" thread is built into play instead of explained. The game rewards **staying put**:

- **Sit.** You can stop anywhere: on a rock, in the canoe, by the fire. The world comes to you. Loons surface closer, fish drift into view, a moose steps out.
- **The best moments need stillness:** northern lights only show if you're lying still; the best stories only come when you stop working.
- **Storm day is the thesis:** the one day you *can't* do anything is the day the family is most together.
- **Layover days** are the design's way of saying you don't have to keep moving.

It's never labeled as a lesson in play. The Passport's final page can name it quietly once the trip is over.

---

## Skills

Skills grow through use and carry across days. No XP bars, just visibly better results.

- **Paddling:** J-stroke → sweep → draw → bow/stern teamwork
- **Map reading:** fewer wrong turns, spotting drop-offs for fishing
- **Knots:** tarp, bear hang, canoe tie-down
- **Casting:** accuracy and reading water
- **Swimming:** longer dives, better cold tolerance
- **Sky reading:** weather in the morning, constellations at night

---

## Progression: Adventure Passport

Straight from the family field guide: stamps instead of a score.

- Each family member has their own Passport.
- **Stamps** for skills and moments, mapped to the loop:
  - Travel: first clean J-stroke, one-trip portage, found your way back from lost
  - Camp: perfect bear hang, tarp that held through the storm
  - Free time: first walleye, first dive discovery
  - Events: weathered a storm, spotted the northern lights
- **Sightings page:** loon, moose, bear, eagle, beaver.
- **Fish Log** and **Journal** fill in as you play, mirroring the real trip journals. One Journal page per day, written from what happened.
- A completed Passport unlocks the next year's trip, with a new entry point and new lakes.

---

## Trip length

Real trips have a fixed number of days. The game should too. Placeholder: **5–6 days**, mirroring the itinerary (for example, travel → travel → layover/storm → travel → layover → paddle out). The last day is a paddle out with a short montage of the Journal.

A shorter length keeps each day special and makes replaying for missing stamps appealing.

---

## Still to explore

- **Playable family members:** switch between kids, each with different jobs and strengths (e.g. the strong portager, the sharp-eyed spotter, the fish whisperer). This fits the loop naturally: different kids shine in different beats.
- **Scope and platform:** who's building it, for whom, and on what. This decides most other calls.
- **Art direction.**
- **First prototype:** the J-stroke wobble meter alone. If paddling isn't fun, nothing else matters.
