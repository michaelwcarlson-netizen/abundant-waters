const test=require('node:test'),assert=require('node:assert/strict');
const {Campsite}=require('./storm-adventure.js');
function run(c,seconds,input={x:0,y:0},fps=60){for(let i=0;i<seconds*fps;i++)c.advance(1/fps,input);return c;}
function walkTo(c,x,y){for(let i=0;i<600;i++){const p=c.player,d=Math.hypot(x-p.x,y-p.y);if(d<3)break;c.advance(1/120,{x:(x-p.x)/Math.max(d,30),y:(y-p.y)/Math.max(d,30)});}run(c,.2);}
test('walk, pick up jacket, carry it under shelter, put down; rain respects its actual location',()=>{
 const c=new Campsite();walkTo(c,130,315);c.interact();assert.equal(c.carry,'jacket');
 walkTo(c,350,315);c.interact();assert.equal(c.carry,null);
 const jacket=c.storm.items.find(g=>g.id==='jacket');assert.ok(c.storm.coverage(jacket)>=.8);
 c.storm.adjustEdge(0,26,1);c.storm.adjustEdge(1,26,1);
 run(c,95);assert.ok(jacket.wet<12,JSON.stringify(jacket));
 const ignored=run(new Campsite(),100).storm.items.find(g=>g.id==='jacket');assert.ok(ignored.wet>jacket.wet+20);
});
test('movement responds quickly, diagonals normalize and bulky items slow the camper',()=>{
 const a=new Campsite(),b=new Campsite();run(a,.5,{x:1,y:0});run(b,.5,{x:1,y:1});
 assert.ok(a.player.x-170>45);assert.ok(Math.abs(Math.hypot(b.player.x-170,b.player.y-330)-(a.player.x-170))<1);
 const light=new Campsite(),heavy=new Campsite();light.carry='jacket';heavy.carry='pack';
 run(light,1,{x:1,y:0});run(heavy,1,{x:1,y:0});assert.ok(light.player.x-heavy.player.x>25);
 run(light,.2);assert.ok(Math.abs(light.player.vx)<4);
});
test('the first fifteen seconds allow learning before rain and wetting',()=>{
 const c=run(new Campsite(),15);assert.equal(c.storm.weather.rain,0);assert.equal(c.complete,false);
 assert.ok(c.storm.items.find(g=>g.id==='jacket').wet<1);
});
test('a canoe is towed with lag, then tied where it rests by a sustained hold',()=>{
 const c=new Campsite();walkTo(c,210,480);c.interact();assert.equal(c.carry,'canoe');
 run(c,1,{x:1,y:-.5});const hull=c.storm.items[0];assert.ok(Math.hypot(c.player.x-hull.x,c.player.y-hull.y)>30);
 assert.ok(hull.x>210);c.press();run(c,2.5);c.release();assert.equal(c.carry,null);assert.ok(hull.tie>.98);assert.ok(hull.anchor);
 c.interact();assert.equal(c.carry,'canoe');assert.equal(hull.tie,0);
});
test('guylines require proximity and adjust continuously without moving the camper',()=>{
 const c=new Campsite();c.player.x=c.storm.edgeX(0)-27;c.player.y=419;c.refreshContext();c.interact();assert.equal(c.edge,0);
 const start={x:c.player.x,y:c.player.y},old=c.storm.edges[0].height;
 run(c,1,{x:-1,y:1});assert.ok(c.storm.edges[0].height<old-25);assert.ok(c.storm.edges[0].tension>.65);
 assert.deepEqual({x:c.player.x,y:c.player.y},start);c.interact();assert.equal(c.edge,null);
});
test('pause freezes character, weather, equipment and the quiet payoff',()=>{
 const c=run(new Campsite(),43);c.storm.paused=true;const before=JSON.stringify(c);run(c,10,{x:1,y:1});assert.equal(JSON.stringify(c),before);
});
test('all weather scenarios end with Dad in shelter before completion and no objective gates',()=>{
 for(let scenario=0;scenario<3;scenario++){
  const c=run(new Campsite(scenario),105);assert.equal(c.complete,false);assert.equal(c.story,true);assert.ok(c.dad.arrived);
  run(c,10);assert.equal(c.complete,true);assert.ok(c.storm.shelteredAt(c.dad.x,c.dad.y));
 }
});
test('cancelled action cannot drop gear or leave a held input running',()=>{
 const c=new Campsite();c.interact();assert.equal(c.carry,'jacket');c.press();c.cancelInput();assert.equal(c.carry,'jacket');assert.equal(c.actionHeld,false);
});
test('character interactions give equivalent results at 30, 60 and 120Hz',()=>{
 const states=[30,60,120].map(fps=>{const c=new Campsite();c.interact();run(c,2,{x:1,y:0},fps);return {x:c.player.x,y:c.player.y,wet:c.storm.items[2].wet};});
 for(const s of states)assert.ok(Math.abs(s.x-states[0].x)<.01);
});
