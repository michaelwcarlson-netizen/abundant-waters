/* Run: node prototypes/storm/storm.test.cjs */
const test = require('node:test');
const assert = require('node:assert/strict');
const { Storm, weatherAt } = require('./storm-physics.js');
function run(s, seconds, fps = 60, action) {
  for (let i = 0; i < seconds * fps; i++) s.advance(1 / fps, action);
  return s;
}
function prepare(s) {
  s.adjustEdge(0, 26, 1); s.adjustEdge(1, 26, 1);
  [[125,225],[300,285],[390,285],[320,350],[420,350]].forEach(([x,y],i)=>Object.assign(s.items[i],{x,y}));
  s.items[0].angle=.1;s.secure(2);
}
test('weather arrives independently of actions, turns, and clears', () => {
  assert.equal(weatherAt(0,0).rain,0);
  assert.ok(weatherAt(48,0).rain>.9);
  assert.notEqual(weatherAt(40,0).angle,weatherAt(75,0).angle);
  const s=run(new Storm(),101);assert.equal(s.done,true);assert.equal(s.weather.rain,0);
});
test('judgment produces a substantially better repeat of the same weather', () => {
  const neglected=run(new Storm(),101).result();
  const s=new Storm();prepare(s);const prepared=run(s,101).result();
  assert.ok(prepared.dryness>neglected.dryness+50,JSON.stringify({prepared,neglected}));
  assert.equal(prepared.dryGear,4);assert.equal(prepared.dumps,0);
  assert.ok(prepared.canoeDrift<neglected.canoeDrift/10);
});
test('canoe orientation changes movement and tether strain at the same place', () => {
  const a=new Storm(),b=new Storm();
  for(const s of [a,b]){s.time=38;s.items[0].x=100;s.items[0].y=200;}
  a.items[0].angle=.25;b.items[0].angle=.25+Math.PI/2;
  run(a,15);run(b,15);
  assert.ok(b.items[0].drift>a.items[0].drift+20);
  assert.ok(b.items[0].strain>a.items[0].strain);
});
test('coverage depends on wind, actual footprint, and cloth position', () => {
  const s=new Storm();prepare(s);run(s,2);
  s.weather={...weatherAt(45,0),x:1,y:0,strength:1};
  const rightward=s.projectedRoof().map(n=>n.x);
  s.weather={...s.weather,x:-1};
  const leftward=s.projectedRoof().map(n=>n.x);
  assert.ok(rightward[8]-leftward[8]>150);
  assert.equal(s.shelteredAt(350,320),true);assert.equal(s.shelteredAt(350,480),false);
  const g=s.items[1];g.x=205;g.y=320;const c=s.coverage(g);
  g.x=350;assert.ok(s.coverage(g)>=c);
});
test('a rescue during rain arrests further wetting without erasing earlier damage', () => {
  const s=new Storm();run(s,50);const pack=s.items[1],before=pack.wet;
  assert.ok(before>10);prepare(s);const rescued=pack.wet;run(s,20);
  assert.ok(pack.wet>=rescued);assert.ok(pack.wet<before+5);
});
test('loose cloth pools and spills while a low taut pitch drains', () => {
  const loose=run(new Storm(),90);
  const taut=new Storm();prepare(taut);run(taut,90);
  assert.ok(loose.dumps>0);assert.equal(taut.dumps,0);
  assert.ok(taut.cloth.every(n=>Number.isFinite(n.x)&&Number.isFinite(n.h)&&n.water>=0));
});
test('paused simulation retains time, weather, equipment and rope state', () => {
  const s=run(new Storm(),43);s.secure(1);s.paused=true;
  const snapshot=JSON.stringify(s);run(s,60);assert.equal(JSON.stringify(s),snapshot);
  s.paused=false;run(s,1);assert.ok(s.time>43);
});
test('30, 60 and 120 Hz produce equivalent outcomes', () => {
  const results=[30,60,120].map(fps=>run(new Storm(),101,fps).result());
  assert.deepEqual(results[0],results[1]);assert.deepEqual(results[1],results[2]);
});
test('all winds have a recoverable campsite and finite physics', () => {
  for(let scenario=0;scenario<3;scenario++){
    const s=new Storm(scenario);prepare(s);run(s,101);
    assert.ok(s.result().dryness>85,JSON.stringify(s.result()));
    for(const g of s.items)assert.ok(Number.isFinite(g.x)&&Number.isFinite(g.y)&&g.wet>=0&&g.wet<=100);
  }
});
test('moving a tied canoe releases its old anchor and gear cannot stack', () => {
  const s=new Storm();s.secure(2);s.move('canoe',300,250,1);assert.equal(s.items[0].tie,0);
  Object.assign(s.items[1],{x:350,y:320});Object.assign(s.items[2],{x:350,y:320});run(s,1);
  const [a,b]=s.items.slice(1,3);assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>=a.r+b.r);
});
