const test=require('node:test'),assert=require('node:assert/strict');
const {Route,clamp,north,south}=require('./navigation-physics.js');
const tick=(route,input,seconds)=>{for(let i=0;i<seconds*120;i++)route.step(1/120,input);};
function steerToLanding(route,points,maxSeconds=30){
 let idx=0;
 for(let i=0;i<maxSeconds*120;i++){
  if(route.landingReady())return true;
  const b=route.boat;
  if(Math.hypot(b.x-points[idx][0],b.y-points[idx][1])<60&&idx<points.length-1)idx++;
  const [x,y]=points[idx],goal=Math.atan2(y-b.y,x-b.x),diff=Math.atan2(Math.sin(goal-b.angle),Math.cos(goal-b.angle)),dist=Math.hypot(x-b.x,y-b.y);
  const thrust=idx===points.length-1?(route.speed()>28?-1:dist>50?.45:0):idx>=points.length-2&&route.speed()>70?-1:1;
  route.step(1/120,{x:clamp(2.2*diff-1.2*b.om,-1,1),y:-thrust});
 }
 return false;
}
test('wind and current move an unpaddled canoe; pausing freezes it',()=>{
 const route=new Route();tick(route,{},5);assert.ok(route.boat.x>115);assert.ok(Math.abs(route.boat.y-300)>1);const still={...route.boat};route.paused=true;tick(route,{x:1,y:-1},5);assert.deepEqual(route.boat,still);
});
test('bank and island are solid and a straight rush has recoverable consequences',()=>{
 const route=new Route();tick(route,{x:0,y:-1},14);assert.ok(route.bumps>0,'straight route should touch structure');assert.ok(route.boat.y>north(route.boat.x)+12&&route.boat.y<south(route.boat.x)-12);assert.equal(route.landingReady(),false);
 assert.ok(steerToLanding(route,[[1700,310],[1830,255],[1875,231]]),'the player can turn from a poor route and land');assert.ok(route.speed()<34);
});
test('either side of the island can reach the landing',()=>{
 for(const points of [
  [[560,235],[805,195],[1250,280],[1650,325],[1830,255],[1875,231]],
  [[550,310],[805,321],[1250,319],[1650,335],[1830,255],[1875,231]]
 ]){const route=new Route();assert.ok(steerToLanding(route,points,35));assert.ok(route.boat.x>1790&&route.boat.x<1985);}
});
