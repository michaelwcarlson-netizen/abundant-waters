/* Sawbill route model. Hull-frame glide and bank response adapt the established
 * J-Stroke canoe physics; the shoreline geometry stays shared with this level's
 * existing canvas and paper map. No other level needs to import this model. */
(function(root){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const center=x=>295+38*Math.sin(x/195)-17*Math.sin(x/410);
const bay=x=>x>330&&x<760?130*Math.sin(Math.PI*(x-330)/430)**2:0;
const width=x=>x>1040&&x<1310?96-37*Math.sin(Math.PI*(x-1040)/270)**2:96;
const north=x=>center(x)-width(x)-bay(x),south=x=>center(x)+width(x);
const island={x:805,y:center(805)+19,rx:108,ry:37};
const rocks=[{x:1118,y:north(1118)+26,r:22},{x:1215,y:center(1215)+7,r:20},{x:1610,y:north(1610)+20,r:17}];
const STEP=1/120;
class Route{
 constructor(){this.boat={x:115,y:300,angle:0,vx:0,vy:0,om:0};this.time=0;this.accumulator=0;this.paused=false;this.finished=false;this.bumps=0;this.bumpCooldown=0;this.spray=0;this.distance=0;this.wind=0;}
 bankDepth(p,side){return side==='north'?p.y-north(p.x):south(p.x)-p.y;}
 points(){const b=this.boat,fx=Math.cos(b.angle),fy=Math.sin(b.angle);return [-26,0,26].map(d=>({x:b.x+fx*d,y:b.y+fy*d}));}
 speed(){const b=this.boat;return Math.hypot(b.vx,b.vy);}
 landingReady(){return this.boat.x>1790&&this.boat.x<1985&&this.points().some(p=>this.bankDepth(p,'north')<31)&&this.speed()<34;}
 step(dt,input){
  if(this.paused||this.finished)return;
  const b=this.boat;this.time+=dt;this.bumpCooldown=Math.max(0,this.bumpCooldown-dt);this.spray=Math.max(0,this.spray-dt);
  const thrust=clamp(-(input.y||0),-1,1),turn=clamp(input.x||0,-1,1);
  b.om+=turn*2.5*dt;
  const fx=Math.cos(b.angle),fy=Math.sin(b.angle),rx=-fy,ry=fx;
  if(thrust>0){b.vx+=fx*80*thrust*dt;b.vy+=fy*80*thrust*dt;}
  if(thrust<0){const k=Math.exp(thrust*3.5*dt);b.vx*=k;b.vy*=k;b.om*=k;b.vx-=fx*24*(-thrust)*dt;b.vy-=fy*24*(-thrust)*dt;}
  // Crosswind is visible in surface streaks; a gentle shore current persists.
  this.wind=(b.x>350&&b.x<1050?1.1:.45)*Math.sin(this.time*.65+b.x/410);
  b.vx+=(6+1.5*Math.sin(b.x/260))*dt;
  b.vy+=(this.wind*10+2*Math.sin(this.time*.42))*dt;
  let forward=b.vx*fx+b.vy*fy,side=b.vx*rx+b.vy*ry;
  forward*=Math.exp(-.7*dt);side*=Math.exp(-3.5*dt);b.om*=Math.exp(-2.7*dt);
  b.vx=forward*fx+side*rx;b.vy=forward*fy+side*ry;
  b.x=clamp(b.x+b.vx*dt,38,2155);b.y+=b.vy*dt;b.angle+=b.om*dt;
  for(const [i,p]of this.points().entries()){
   for(const sideName of ['north','south']){
    const depth=this.bankDepth(p,sideName),limit=12;
    if(depth>=limit)continue;
    const slope=((sideName==='north'?north:south)(p.x+1)-(sideName==='north'?north:south)(p.x-1))/2;
    const normal=sideName==='north'?{x:-slope,y:1}:{x:slope,y:-1},n=Math.hypot(normal.x,normal.y);
    normal.x/=n;normal.y/=n;const pen=(limit-depth)/n;
    b.x+=normal.x*pen;b.y+=normal.y*pen;
    const impact=b.vx*normal.x+b.vy*normal.y;
    if(impact<0){b.vx-=1.3*impact*normal.x;b.vy-=1.3*impact*normal.y;b.om+=(i-1)*.025;this.collide(-impact);}
   }
   const dx=(p.x-island.x)/island.rx,dy=(p.y-island.y)/island.ry,d=Math.hypot(dx,dy);
   if(d<1.16){const nx=dx/island.rx,ny=dy/island.ry,n=Math.hypot(nx,ny)||1,pen=(1.16-d)*island.ry;
    b.x+=nx/n*pen;b.y+=ny/n*pen;const v=b.vx*nx/n+b.vy*ny/n;if(v<0){b.vx-=1.35*v*nx/n;b.vy-=1.35*v*ny/n;b.om+=(i-1)*.04;this.collide(-v);}}
   for(const r of rocks){const dx=p.x-r.x,dy=p.y-r.y,d=Math.hypot(dx,dy);if(d>=r.r+9)continue;
    const nx=dx/(d||1),ny=dy/(d||1),pen=r.r+9-d;b.x+=nx*pen;b.y+=ny*pen;
    const v=b.vx*nx+b.vy*ny;if(v<0){b.vx-=1.45*v*nx;b.vy-=1.45*v*ny;b.om+=(i-1)*.09;this.collide(-v);}}
  }
  this.distance=Math.max(this.distance,b.x);
 }
 collide(speed){if(speed>20&&this.bumpCooldown===0){this.bumps++;this.spray=1;this.bumpCooldown=.8;}}
 advance(dt,input={x:0,y:0}){this.accumulator+=Math.min(dt,.1);while(this.accumulator>=STEP){this.step(STEP,input);this.accumulator-=STEP;}}
}
const api={Route,center,bay,width,north,south,island,rocks,clamp};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SawbillRoute=api;
})(typeof window==='undefined'?this:window);
