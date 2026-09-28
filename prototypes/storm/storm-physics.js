/* Storm Day simulation, kept local to this level.
 * Cloth constraint relaxation, gravity, downhill water flow and pooling are
 * adapted from Tarp & Rain's clothStep. No benchmark code is changed.
 * Fixed 1/120 s integration makes pointer/keyboard/frame rates equivalent.
 */
(function (root) {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const STEP = 1 / 120, MID = 8, N = 17;
  const CAMP = { width: 640, height: 640, ridgeX: 350, front: 395, back: 250 };
  const SCENARIOS = [
    { name: 'Across the granite', angle: .25, shift: -.48, phase: .7 },
    { name: 'From the pines', angle: 2.85, shift: .46, phase: 1.8 },
    { name: 'A turning wind', angle: -.38, shift: .76, phase: 3.1 }
  ];
  function weatherAt(t, scenario) {
    const s = SCENARIOS[scenario % SCENARIOS.length];
    const rain = clamp(Math.min((t - 32) / 14, (100 - t) / 18), 0, 1);
    const envelope = t < 32 ? .14 + t / 110 : .25 + .75 * rain;
    const gust = .72 + .2 * Math.sin(t * .77 + s.phase) + .18 * Math.max(0, Math.sin(t * 2.1));
    const strength = Math.max(.08, envelope * gust);
    const angle = s.angle + s.shift * clamp((t - 52) / 16, 0, 1);
    return { rain, strength, angle, x: Math.cos(angle), y: Math.sin(angle),
      phase: t < 32 ? 'approach' : t < 82 ? 'rain' : t < 100 ? 'easing' : 'after' };
  }
  class Storm {
    constructor(scenario = 0) {
      this.scenario = scenario % SCENARIOS.length;
      this.time = 0; this.accumulator = 0; this.paused = false; this.done = false;
      this.weather = weatherAt(0, this.scenario);
      this.edges = [{ height: 95, tension: .28 }, { height: 91, tension: .3 }];
      this.cloth = Array.from({ length: N }, (_, i) => {
        const x = CAMP.ridgeX + (i - MID) * 18;
        const h = 112 - Math.abs(i - MID) * 2.4;
        return { x, h, px: x, ph: h, water: 0 };
      });
      this.items = [
        { id: 'canoe', name: 'Canoe', x: 210, y: 492, r: 30, angle: 1.45, mass: 3.5, wet: 0, tie: 0, drift: 0 },
        { id: 'pack', name: 'Bedroll pack', x: 520, y: 425, r: 25, angle: -.12, mass: 2.6, wet: 0 },
        { id: 'jacket', name: 'Rain jacket', x: 125, y: 310, r: 22, angle: .2, mass: .55, wet: 0 },
        { id: 'wood', name: 'Dry kindling', x: 450, y: 480, r: 24, angle: -.2, mass: 2.1, wet: 0 },
        { id: 'paddle', name: 'Spare paddle', x: 100, y: 410, r: 20, angle: .75, mass: .8, wet: 0 }
      ].map(g => ({ ...g, vx: 0, vy: 0, exposure: 1, moving: 0, soakedFor: 0 }));
      this.held = null; this.events = []; this.dumps = 0; this.drain = [0, 0];
      this.splashes = []; this.wetLoad = 0; this.rainLoad = 0;
      // Settle the starting cloth without advancing the weather or gear.
      for (let i = 0; i < 180; i++) this.clothStep(STEP);
    }
    edgeX(side) { return CAMP.ridgeX + (side ? 1 : -1) * (125 + 35 * this.edges[side].tension); }
    adjustEdge(side, height, tension) {
      this.edges[side].height = clamp(height, 22, 106);
      this.edges[side].tension = clamp(tension, 0, 1);
    }
    move(id, x, y, dt) {
      const g = this.items.find(g => g.id === id);
      if (!g || this.done) return;
      const dx = clamp(x, 58, 582) - g.x, dy = clamp(y, 170, 520) - g.y;
      const d = Math.hypot(dx, dy), step = Math.min(1, (g.id === 'canoe' ? 200 : 300) * dt / (d || 1));
      if (d > 2 && g.id === 'canoe') g.tie = 0;
      g.x += dx * step; g.y += dy * step; g.vx = 0; g.vy = 0;
    }
    turn(radians) {
      const g = this.items[0]; g.angle += radians; g.tie = Math.max(0, g.tie - Math.abs(radians) * .25);
    }
    secure(dt) {
      const g = this.items[0];
      // Tension a real tether where the canoe is, not a correct-position button.
      if (g.tie <= .01) g.anchor = { x: g.x - 48, y: g.y - 32 };
      g.tie = clamp(g.tie + dt * .5, 0, 1);
    }
    projectedRoof() {
      const w = this.weather, lean = .9 * w.strength;
      return this.cloth.map(n => ({ x: n.x + n.h * w.x * lean,
        back: CAMP.back + n.h * w.y * lean, front: CAMP.front + n.h * w.y * lean }));
    }
    shelteredAt(x, y) {
      // Parallel rain rays projected from the actual cloth onto the ground.
      const roof = this.projectedRoof();
      for (let i = 0; i < N - 1; i++) {
        const a = roof[i], b = roof[i + 1];
        const u = (x - a.x) / (b.x - a.x || .0001);
        if (u >= 0 && u <= 1 && y > a.back + u * (b.back - a.back) && y < a.front + u * (b.front - a.front)) return true;
      }
      return false;
    }
    coverage(g) {
      let sheltered = 0;
      for (const [dx, dy] of [[0, 0], [-g.r, 0], [g.r, 0], [0, -g.r], [0, g.r]]) {
        if (this.shelteredAt(g.x + dx, g.y + dy)) sheltered++;
      }
      return sheltered / 5;
    }
    clothStep(dt) {
      const gust = this.weather.strength, cloth = this.cloth;
      const pin = i => i === 0 || i === MID || i === N - 1;
      for (let i = 0; i < N; i++) {
        const n = cloth[i];
        if (pin(i)) {
          n.x = n.px = i === MID ? CAMP.ridgeX : this.edgeX(i === 0 ? 0 : 1);
          n.h = n.ph = i === MID ? 112 : this.edges[i === 0 ? 0 : 1].height;
          continue;
        }
        const vx = (n.x - n.px) * .985, vh = (n.h - n.ph) * .985;
        n.px = n.x; n.ph = n.h;
        n.x += vx + gust * this.weather.x * 55 * dt * dt;
        n.h += vh - (180 + n.water * 65) * dt * dt + Math.sin(this.time * 9 + i) * gust * 45 * dt * dt;
      }
      // Tension-only constraints and alternating sweeps, as in Tarp & Rain.
      for (let it = 0; it < 18; it++) for (let q = 0; q < N - 1; q++) {
        const i = it % 2 ? N - 2 - q : q, a = cloth[i], b = cloth[i + 1];
        const side = i < MID ? 0 : 1, e = this.edges[side];
        const chord = Math.hypot(this.edgeX(side) - CAMP.ridgeX, 112 - e.height);
        const rest = chord / MID * (1.005 + .25 * (1 - e.tension));
        const dx = b.x - a.x, dh = b.h - a.h, d = Math.hypot(dx, dh);
        if (d <= rest || d === 0) continue;
        const ia = pin(i) ? 0 : 1 / (1 + a.water * 3), ib = pin(i + 1) ? 0 : 1 / (1 + b.water * 3);
        if (!ia && !ib) continue;
        const k = (d - rest) / d / (ia + ib);
        a.x += dx * k * ia; a.h += dh * k * ia; b.x -= dx * k * ib; b.h -= dh * k * ib;
      }
      const flow = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        const n = cloth[i]; n.h = Math.max(8, n.h);
        n.water += this.weather.rain * dt * .14;
        // Transfer only existing water, respecting conservation at both neighbors.
        for (const j of [i - 1, i + 1]) if (j >= 0 && j < N) {
          const dh = n.h - cloth[j].h;
          if (dh > .02) { const f = Math.min(n.water * .45, n.water * dh * 1.5 * dt); flow[i] -= f; flow[j] += f; }
        }
      }
      for (let i = 0; i < N; i++) cloth[i].water = Math.max(0, cloth[i].water + flow[i]);
      // As in Tarp & Rain, a shallow lip near the hem spills over the edge.
      for (const [j, e] of [[1, 0], [N - 2, N - 1]]) {
        if (cloth[j].h - cloth[e].h > -5) {
          const spill = cloth[j].water * Math.min(1, 8 * dt);
          cloth[j].water -= spill; cloth[e].water += spill;
        }
      }
      for (const [i, side] of [[0, 0], [N - 1, 1]]) {
        const spill = cloth[i].water * Math.min(1, 12 * dt);
        cloth[i].water -= spill; this.drain[side] = spill / dt;
      }
      for (let i = 1; i < N - 1; i++) if (cloth[i].water > 1.7) {
        const n = cloth[i]; n.water *= .15; this.dumps++;
        this.events.push({ type: 'dump', x: n.x });
        this.splashes.push({ x: n.x, y: 320, life: 1 });
        for (const g of this.items) if (Math.abs(g.x - n.x) < 35 + g.r && g.y > CAMP.back && g.y < CAMP.front) g.wet = clamp(g.wet + 16, 0, 100);
      }
    }
    tick(dt) {
      this.time += dt; this.weather = weatherAt(this.time, this.scenario);
      this.clothStep(dt);
      const w = this.weather;
      // Loaded adjustable lines stretch, rather than selecting a right/wrong knot.
      for (const e of this.edges) e.tension = Math.max(0, e.tension - w.rain * w.strength * .0018 * dt);
      for (const g of this.items) {
        const cover = this.coverage(g); g.exposure = 1 - cover;
        const shore = clamp((g.y - 465) / 55, 0, 1);
        let runoff = 0;
        for (let side = 0; side < 2; side++) if (Math.abs(g.x - this.edgeX(side)) < g.r + 10 && g.y > CAMP.back && g.y < CAMP.front) runoff += this.drain[side] * .9;
        const dose = (w.rain * g.exposure + runoff + shore * w.strength * .8) * dt;
        // Wetness persists; rescuing an item stops further damage, not its history.
        const absorb = g.id === 'wood' ? 2.1 : g.id === 'paddle' || g.id === 'canoe' ? .5 : 1.55;
        g.wet = clamp(g.wet + dose * absorb, 0, 100);
        if (g.id !== 'canoe') { this.wetLoad += dose; this.rainLoad += w.rain * dt; }
        const cross = Math.abs(Math.sin(g.angle - w.angle));
        const broadside = g.id === 'canoe' ? .18 + 1.6 * cross * cross : 1;
        const windward = this.edges[w.x > 0 ? 0 : 1];
        const shelter = .55 + .44 * (1 - windward.height / 112);
        const force = w.strength ** 2 * broadside * (1 - cover * shelter);
        if (g.id === 'canoe') {
          g.tie = Math.max(0, g.tie - Math.max(0, force - .65) * .038 * dt);
          g.strain = clamp(force / 1.4, 0, 1);
        }
        const friction = g.id === 'canoe' ? .2 : g.mass * .15;
        const tether = g.id === 'canoe' ? g.tie * 2.2 : 0;
        const drive = Math.max(0, force - friction - tether) * 80 / g.mass;
        if (this.held !== g.id) {
          g.vx = (g.vx + w.x * drive * dt) * Math.exp(-2.2 * dt);
          g.vy = (g.vy + w.y * drive * dt + shore * w.strength * dt * 9) * Math.exp(-2.2 * dt);
          const dx = g.vx * dt, dy = g.vy * dt;
          g.x = clamp(g.x + dx, 58, 582); g.y = clamp(g.y + dy, 170, 520);
          if (g.id === 'canoe') g.drift += Math.hypot(dx, dy);
        }
        g.moving = Math.hypot(g.vx, g.vy);
      }
      // Gear occupies space: don't allow a perfect stack at one magic coordinate.
      for (let i = 0; i < this.items.length; i++) for (let j = i + 1; j < this.items.length; j++) {
        const a = this.items[i], b = this.items[j], dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy), gap = a.r + b.r + 5;
        if (d >= gap) continue;
        const nx = d ? dx / d : 1, ny = d ? dy / d : 0, overlap = gap - d;
        const ia = this.held === a.id || (a.tie || 0) > .5 ? 0 : 1 / a.mass;
        const ib = this.held === b.id || (b.tie || 0) > .5 ? 0 : 1 / b.mass;
        if (!ia && !ib) continue;
        a.x = clamp(a.x - nx * overlap * ia / (ia + ib), 58, 582);
        a.y = clamp(a.y - ny * overlap * ia / (ia + ib), 170, 520);
        b.x = clamp(b.x + nx * overlap * ib / (ia + ib), 58, 582);
        b.y = clamp(b.y + ny * overlap * ib / (ia + ib), 170, 520);
      }
      this.splashes.forEach(p => p.life -= dt); this.splashes = this.splashes.filter(p => p.life > 0);
      if (this.time >= 100) { this.time = 100; this.done = true; this.held = null; }
    }
    advance(dt, beforeStep) {
      if (this.paused || this.done) return;
      this.accumulator += Math.min(.1, Math.max(0, dt));
      while (this.accumulator >= STEP && !this.done) {
        if (beforeStep) beforeStep(STEP);
        this.tick(STEP); this.accumulator -= STEP;
      }
    }
    result() {
      const gear = this.items.slice(1), canoe = this.items[0];
      return { dryGear: gear.filter(g => g.wet < 25).length,
        dryness: Math.round(100 - gear.reduce((s, g) => s + g.wet, 0) / gear.length),
        canoeDrift: Math.round(canoe.drift), dumps: this.dumps,
        protected: Math.round(100 * clamp(1 - this.wetLoad / Math.max(1, this.rainLoad), 0, 1)),
        items: gear.map(g => ({ name: g.name, wet: Math.round(g.wet) })) };
    }
  }
  const api = { Storm, weatherAt, SCENARIOS, CAMP, clamp, STEP };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.StormPhysics = api;
})(typeof window === 'undefined' ? this : window);
