/* Smoke Lake shoreline model. Hull-frame damping and bow/stern collision response
 * follow J-stroke; action lifecycle and character movement follow Storm Day.
 * Their original modules and other levels are unchanged. */
(function(root){
'use strict';
const physics=typeof module!=='undefined'&&module.exports?require('../storm/storm-physics.js'):root.StormPhysics;
const adventure=typeof module!=='undefined'&&module.exports?require('../storm/storm-adventure.js'):root.StormAdventure;
const {clamp,STEP}=physics, actions=adventure.Campsite.prototype;
const shore=x=>390+24*Math.sin(x/105)+13*Math.sin(x/43);
const rocks=[{x:255,y:451,r:28},{x:310,y:492,r:18},{x:610,y:436,r:31},{x:671,y:485,r:19}];
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
class Landing{
 constructor(){
  this.time=0;this.accumulator=0;this.paused=false;this.complete=false;this.stable=0;this.landed=false;
  this.canoe={x:450,y:685,vx:0,vy:0,th:0,om:0,tie:0,anchor:null};
  this.player={x:450,y:685,vx:0,vy:0,facing:1,step:0};this.mode='paddle';this.carry=null;
  this.items=[{id:'pack',name:'Family pack',color:'#7e8860',bulk:1},{id:'bedroll',name:'Bedroll',color:'#ae8b56',bulk:.7},{id:'paddles',name:'Spare paddles',color:'#c69e65',bulk:.3}].map((g,i)=>({...g,x:450,y:685,inBoat:true,wet:0,vx:0,vy:0,slot:(i-1)*23}));
  this.actionHeld=false;this.actionTime=0;this.actionUsed=false;this.message='';this.messageTime=0;this.near=null;this.bumps=0;this.bumpCooldown=0;this.splash=0;
 }
 wind(){return {x:5+3*Math.sin(this.time*.6),y:1.5+Math.sin(this.time*.9)};}
 depth(x,y){return y-shore(x);}
 points(){const c=this.canoe;return [-50,-25,0,25,50].map(d=>({x:c.x+Math.sin(c.th)*d,y:c.y-Math.cos(c.th)*d}));}
 bow(){return this.points()[4];}
 hullDistance(p){return Math.min(...this.points().map(q=>distance(p,q)));}
 exposure(g){return clamp((this.depth(g.x,g.y)+10+Math.sin(this.time*1.8+g.x/70)*8)/25,0,1);}
 canExit(){return this.points().some(p=>this.depth(p.x,p.y)<28)&&Math.hypot(this.canoe.vx,this.canoe.vy)<30;}
 refreshContext(){
  this.near=null;if(this.mode==='paddle'||this.carry)return;
  const targets=this.items.map(g=>({...g,type:'gear',d:distance(this.player,g),range:g.inBoat?85:48}));
  targets.push({id:'canoe',type:'hull',d:this.hullDistance(this.player),range:62});
  this.near=targets.filter(g=>g.d<g.range).sort((a,b)=>(a.type==='hull'?1:0)-(b.type==='hull'?1:0)||a.d-b.d)[0]||null;
 }
 context(){
  if(this.mode==='paddle')return {label:this.canExit()?'Step ashore':'Approach shore',hint:this.canExit()?'E / Space':'Up: paddle · Down: brake · Left / Right: steer',enabled:this.canExit()};
  if(this.carry==='canoe')return {label:'Release bow',hint:'Walk to pull · hold to tie',enabled:true};
  if(this.carry)return {label:'Put down',hint:this.items.find(g=>g.id===this.carry).name,enabled:true};
  if(this.near?.type==='gear')return {label:this.near.inBoat?'Unload':'Pick up',hint:this.near.name,enabled:true};
  if(this.near)return {label:this.canoe.tie?'Untie / take bow':'Take bow',hint:'Pull the hull onto higher ground',enabled:true};
  return {label:'Reach',hint:'Walk close to the canoe or gear',enabled:false};
 }
 interact(){
  if(this.complete)return;
  const c=this.canoe;
  if(this.mode==='paddle'){
   if(!this.canExit())return;
   const p=this.points().reduce((a,b)=>this.depth(a.x,a.y)<this.depth(b.x,b.y)?a:b);
   this.player.x=clamp(p.x,45,855);this.player.y=shore(this.player.x)-16;this.mode='walk';this.landed=true;
   this.tell('Granite under your feet. The lake still has the stern.');this.refreshContext();return;
  }
  if(this.carry){this.carry=null;this.refreshContext();return;}
  this.refreshContext();if(!this.near)return;
  if(this.near.type==='hull'){this.grabBow();}
  else{const g=this.items.find(g=>g.id===this.near.id);g.inBoat=false;this.carry=g.id;g.vx=g.vy=0;}
 }
 grabBow(){if(this.mode!=='walk'||this.carry||this.hullDistance(this.player)>62)return false;this.carry='canoe';this.canoe.tie=0;this.canoe.anchor=null;this.tell('Walk to pull. Hold the action to tie a bow line here.');return true;}
 board(){if(this.mode!=='walk'||this.carry||this.hullDistance(this.player)>62||this.depth(this.canoe.x,this.canoe.y)<5)return false;this.mode='paddle';this.canoe.tie=0;this.canoe.anchor=null;return true;}
 move(dt,input){
  const p=this.player,c=this.canoe;
  if(this.mode==='paddle'){
   const fx=Math.sin(c.th),fy=-Math.cos(c.th),steer=clamp(input.x||0,-1,1),power=clamp(-(input.y||0),-1,1);
   // Continuous paddle pressure: forward impulse, steer torque, and back-paddle drag.
   c.om+=steer*2.6*dt;
   if(power>0){c.vx+=fx*86*power*dt;c.vy+=fy*86*power*dt;}
   if(power<0){const k=Math.exp(power*3.2*dt);c.vx*=k;c.vy*=k;c.om*=k;c.vx-=fx*22*(-power)*dt;c.vy-=fy*22*(-power)*dt;}
   p.x=c.x;p.y=c.y;return;
  }
  if(this.actionHeld&&this.carry==='canoe'){
   this.actionTime+=dt;
   if(this.actionTime>.25){this.actionUsed=true;p.vx=p.vy=0;
    if(this.depth(p.x,p.y)>-8){this.tell('The line needs a dry foothold. Pull farther up the rock.');return;}
    c.tie=clamp(c.tie+dt/.95,0,1);c.anchor={x:p.x,y:p.y};
    if(c.tie>=1){this.carry=null;this.tell('The bow line holds.');}return;
   }
  }
  const len=Math.max(1,Math.hypot(input.x||0,input.y||0)),g=this.items.find(g=>g.id===this.carry);
  const speed=(this.carry==='canoe'?52:g?116-40*g.bulk:116)*(this.depth(p.x,p.y)>0?.52:1),smooth=1-Math.exp(-18*dt);
  p.vx+=((input.x||0)/len*speed-p.vx)*smooth;p.vy+=((input.y||0)/len*speed-p.vy)*smooth;
  p.x=clamp(p.x+p.vx*dt,45,855);p.y=clamp(p.y+p.vy*dt,185,shore(p.x)+55);
  if(Math.abs(p.vx)>2)p.facing=Math.sign(p.vx);p.step+=Math.hypot(p.vx,p.vy)*dt/18;
  for(const r of rocks){const d=distance(p,r);if(d<r.r+10){const nx=(p.x-r.x)/(d||1),ny=(p.y-r.y)/(d||1);p.x=r.x+nx*(r.r+10);p.y=r.y+ny*(r.r+10);}}
  if(this.carry==='canoe'){
   const b=this.bow(),dx=p.x-b.x,dy=p.y-b.y,d=Math.hypot(dx,dy);
   if(d>24){const pull=(d-24)*6;c.vx+=dx/d*pull*dt;c.vy+=dy/d*pull*dt;
    const fx=Math.sin(c.th),fy=-Math.cos(c.th);c.om+=(fx*dy-fy*dx)*.016*dt;}
  }else if(g){g.x=p.x+p.facing*13;g.y=p.y-6;g.vx=g.vy=0;}
 }
 hull(dt){
  const c=this.canoe,w=this.wind(),depth=this.depth(c.x,c.y),ground=clamp((35-depth)/60,0,1);
  c.vx+=w.x*(1-ground)*dt;c.vy+=(w.y- Math.max(0,depth-105)*.9)*(1-ground)*dt;
  if(c.tie>=1&&c.anchor){const b=this.bow(),dx=c.anchor.x-b.x,dy=c.anchor.y-b.y,d=Math.hypot(dx,dy);if(d>26){c.vx+=dx*(d-26)/d*12*dt;c.vy+=dy*(d-26)/d*12*dt;c.om+=(Math.sin(c.th)*dy+Math.cos(c.th)*dx)*.02*dt;}}
  const fx=Math.sin(c.th),fy=-Math.cos(c.th),rx=Math.cos(c.th),ry=Math.sin(c.th);
  let vf=c.vx*fx+c.vy*fy,vl=c.vx*rx+c.vy*ry;
  vf*=Math.exp(-(.6+ground*3.8)*dt);vl*=Math.exp(-(3.5+ground*2)*dt);c.om*=Math.exp(-2.8*dt);
  c.vx=fx*vf+rx*vl;c.vy=fy*vf+ry*vl;c.x+=c.vx*dt;c.y+=c.vy*dt;c.th+=c.om*dt;
  for(const [i,p]of this.points().entries()){
   for(const r of rocks){const d=distance(p,r);if(d<r.r+8){const nx=(p.x-r.x)/(d||1),ny=(p.y-r.y)/(d||1),pen=r.r+8-d;
    c.x+=nx*pen;c.y+=ny*pen;const vn=c.vx*nx+c.vy*ny;if(vn<0){c.vx-=1.35*vn*nx;c.vy-=1.35*vn*ny;c.om+=(i-2)*.06*(fx*ny-fy*nx);this.impact(-vn);}
   }}
   if(this.mode==='paddle'&&this.depth(p.x,p.y)<-40){
    const slope=(shore(p.x+1)-shore(p.x-1))/2,len=Math.hypot(slope,1),nx=-slope/len,ny=1/len,pen=(-40-this.depth(p.x,p.y))/len;
    c.x+=nx*pen;c.y+=ny*pen;const vn=c.vx*nx+c.vy*ny;if(vn<0){c.vx-=1.12*vn*nx;c.vy-=1.12*vn*ny;}
   }
   if(this.mode==='paddle'&&this.depth(p.x,p.y)<0){const speed=Math.hypot(c.vx,c.vy);if(speed>55){c.vy=Math.abs(c.vy)*.38;c.vx*=.7;c.y+=2;this.impact(speed);}}
  }
  c.x=clamp(c.x,62,838);c.y=clamp(c.y,190,840);
 }
 impact(speed){if(speed>35&&this.bumpCooldown<=0){this.bumps++;this.splash=1;this.bumpCooldown=1.5;this.tell('Hull on granite. Back-paddle to settle it.');for(const g of this.items)if(g.inBoat)g.wet=clamp(g.wet+speed*.12,0,100);}}
 step(dt,input){
  this.time+=dt;this.messageTime=Math.max(0,this.messageTime-dt);this.bumpCooldown=Math.max(0,this.bumpCooldown-dt);this.splash=Math.max(0,this.splash-dt);
  this.move(dt,input);this.hull(dt);if(this.mode==='paddle'){this.player.x=this.canoe.x;this.player.y=this.canoe.y;}
  const c=this.canoe;
  for(const g of this.items){
   if(g.inBoat){g.x=c.x+Math.sin(c.th)*g.slot;g.y=c.y-Math.cos(c.th)*g.slot;continue;}
   if(g.id===this.carry)continue;
   const e=this.exposure(g),w=this.wind();g.wet=clamp(g.wet+(e*7-(1-e)*.3)*dt,0,100);
   g.vx+=(w.x*e*2-g.vx*2)*dt;g.vy+=(e*(5+Math.sin(this.time*1.8)*5)-Math.max(0,this.depth(g.x,g.y)-80)*2-g.vy*2)*dt;
   g.x=clamp(g.x+g.vx*dt,45,855);g.y=clamp(g.y+g.vy*dt,185,shore(g.x)+100);
  }
  this.refreshContext();
  // Condition of the whole shoreline, not accepted item destinations or an action order.
  const secure=c.tie>=1||this.points().every(p=>this.depth(p.x,p.y)<-16);
  const settled=this.mode==='walk'&&!this.carry&&this.items.every(g=>!g.inBoat&&this.exposure(g)<.05)&&secure&&Math.hypot(c.vx,c.vy)<7;
  this.stable=settled?this.stable+dt:0;if(this.stable>4&&!this.exploring)this.complete=true;
 }
 advance(dt,input={x:0,y:0}){if(this.paused||this.complete)return;this.accumulator+=Math.min(dt,.1);while(this.accumulator>=STEP&&!this.complete){this.step(STEP,input);this.accumulator-=STEP;}}
}
for(const method of ['tell','press','release','cancelInput'])Landing.prototype[method]=actions[method];
const api={Landing,shore,rocks,clamp};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SmokeLanding=api;
})(typeof window==='undefined'?this:window);
