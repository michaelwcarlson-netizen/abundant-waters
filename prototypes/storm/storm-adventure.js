/* Character/object layer for Storm Day. The existing weather/cloth model stays independent. */
(function(root) {
  'use strict';
  const physics = typeof module !== 'undefined' && module.exports ? require('./storm-physics.js') : root.StormPhysics;
  const { Storm, CAMP, clamp } = physics;
  const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  class Campsite {
    constructor(scenario=0) {
      this.storm = new Storm(scenario);
      this.player = {x:170,y:330,vx:0,vy:0,facing:1,step:0};
      this.carry = null; this.edge = null; this.near = null;
      this.actionHeld = false; this.actionTime = 0; this.actionUsed = false;
      this.dad = {x:105,y:210,arrived:false};
      this.after = 0; this.story = false; this.complete = false;
      this.message = ''; this.messageTime = 0;
      this.refreshContext();
    }
    tell(text) { this.message=text; this.messageTime=3; }
    refreshContext() {
      if(this.carry || this.edge!==null) { this.near=null; return; }
      const targets = this.storm.items.map(g=>({type:'item',id:g.id,name:g.name,x:g.x,y:g.y,range:g.id==='canoe'?72:51}));
      for(const side of [0,1]) targets.push({type:'edge',side,name:side?'East guyline':'West guyline',x:this.storm.edgeX(side)+(side?27:-27),y:CAMP.front+24,range:55});
      this.near = targets.filter(t=>distance(this.player,t)<t.range).sort((a,b)=>distance(this.player,a)-distance(this.player,b))[0] || null;
    }
    context() {
      if(this.complete) return {label:'Rain passed',hint:''};
      if(this.edge!==null) return {label:'Let go',hint:'Pull sideways to tension · down to lower'};
      if(this.carry==='canoe') return {label:'Set canoe down',hint:'Hold this control to tie the bow line'};
      if(this.carry) return {label:'Put down',hint:this.storm.items.find(g=>g.id===this.carry).name};
      if(this.near?.type==='edge') return {label:'Take guyline',hint:this.near.name};
      if(this.near?.id==='canoe') return {label:'Take the bow',hint:'Walk to tow and turn · hold to tie'};
      if(this.near) return {label:'Pick up',hint:this.near.name};
      return {label:'Reach',hint:'Walk close to gear or a guyline'};
    }
    press() {
      if(this.complete || this.actionHeld) return;
      this.actionHeld=true; this.actionTime=0; this.actionUsed=false;
    }
    release(cancel=false) {
      if(!this.actionHeld) return;
      if(!cancel && !this.actionUsed) this.interact();
      this.actionHeld=false; this.actionTime=0; this.actionUsed=false;
    }
    interact() {
      if(this.complete) return;
      if(this.edge!==null) { this.edge=null; this.tell('The line settles. Watch where the water drains.'); return; }
      if(this.carry) {
        const g=this.storm.items.find(g=>g.id===this.carry);
        this.carry=null; this.storm.held=null; g.vx=g.vy=0;
        this.tell(g.id==='canoe'?'The hull rests on the rock.':`${g.name}, right here.`);
        this.refreshContext(); return;
      }
      this.refreshContext();
      if(!this.near) return;
      if(this.near.type==='edge') {
        this.edge=this.near.side; this.player.vx=this.player.vy=0;
        this.tell('Lean into the line. Sideways pulls it taut; down lowers the edge.');
      } else {
        const g=this.storm.items.find(g=>g.id===this.near.id);
        this.carry=g.id; this.storm.held=g.id;
        if(g.id==='canoe') {g.tie=0; this.tell('A long, heavy hull. Walk slowly to swing the bow.');}
        else this.tell(`${g.name} in your hands. Put it wherever you like.`);
      }
    }
    cancelInput() { this.release(true); this.player.vx=this.player.vy=0; }
    speed() {
      if(!this.carry) return 120;
      return this.carry==='canoe'?54:this.carry==='pack'?78:this.carry==='wood'?90:113;
    }
    move(dt,input) {
      const p=this.player, s=this.storm;
      const length=Math.hypot(input.x||0,input.y||0), scale=Math.max(1,length);
      const x=(input.x||0)/scale, y=(input.y||0)/scale;
      if(this.edge!==null) {
        const e=s.edges[this.edge],sign=this.edge?1:-1;
        s.adjustEdge(this.edge,e.height-y*42*dt,e.tension+x*sign*.65*dt);
        p.vx=p.vy=0; p.step+=length*dt*2; return;
      }
      if(this.actionHeld && this.carry==='canoe') {
        this.actionTime+=dt;
        if(this.actionTime>.25) {
          this.actionUsed=true; s.secure(dt); p.vx=p.vy=0;
          if(s.items[0].tie>=.99) {
            this.carry=null; s.held=null;
            this.tell('The bow line is snug. The canoe can still strain in a gust.');
          }
          return;
        }
      }
      const smooth=1-Math.exp(-18*dt), speed=this.speed();
      p.vx+=(x*speed-p.vx)*smooth; p.vy+=(y*speed-p.vy)*smooth;
      p.x=clamp(p.x+p.vx*dt,58,582); p.y=clamp(p.y+p.vy*dt,185,520);
      if(Math.abs(p.vx)>2) p.facing=Math.sign(p.vx);
      p.step+=Math.hypot(p.vx,p.vy)*dt/18;
      // Fixed trunks at the ridgeline are solid; gear can still be reached on either side.
      for(const trunk of [{x:CAMP.ridgeX,y:CAMP.back-27},{x:CAMP.ridgeX,y:CAMP.front+30}]) {
        const dx=p.x-trunk.x,dy=p.y-trunk.y,d=Math.hypot(dx,dy);
        if(d<19) {p.x=trunk.x+(dx||1)/(d||1)*19;p.y=trunk.y+dy/(d||1)*19;}
      }
      if(this.carry) {
        const g=s.items.find(g=>g.id===this.carry); s.held=g.id;
        if(g.id==='canoe') {
          // Tow a hull that lags and swings behind the camper instead of carrying an icon.
          const dx=p.x-g.x,dy=p.y-g.y,d=Math.hypot(dx,dy);
          if(d>49) { const k=Math.min(1,dt*3.5); g.x+=dx*(d-49)/d*k;g.y+=dy*(d-49)/d*k; }
          if(d>10) { const target=Math.atan2(dy,dx);const delta=Math.atan2(Math.sin(target-g.angle),Math.cos(target-g.angle));g.angle+=delta*Math.min(1,dt*3); }
          g.vx=g.vy=0;
        } else {
          g.x=p.x+p.facing*12;g.y=p.y-6;g.vx=g.vy=0;
        }
      }
      this.refreshContext();
    }
    advance(dt,input={x:0,y:0}) {
      if(this.storm.paused || this.complete) return;
      if(!this.storm.done) this.storm.advance(dt,step=>this.move(step,input));
      else {
        // The payoff is still a place to walk, not an immediate results modal.
        this.move(Math.min(dt,.1),input); this.after+=Math.min(dt,.1);
        const spot={x:370,y:335},d=distance(this.dad,spot);
        if(d>2) {const k=Math.min(1,70*dt/d);this.dad.x+=(spot.x-this.dad.x)*k;this.dad.y+=(spot.y-this.dad.y)*k;}
        else this.dad.arrived=true;
        if(this.after>4 && this.dad.arrived) this.story=true;
        if(this.after>13) this.complete=true;
      }
      const jacket=this.storm.items.find(g=>g.id==='jacket');
      if(this.carry!=='jacket' && !this.storm.done) jacket.angle+=jacket.moving*dt*.035;
      this.messageTime=Math.max(0,this.messageTime-dt);
    }
  }
  const api={Campsite};
  if(typeof module!=='undefined' && module.exports) module.exports=api;
  else root.StormAdventure=api;
})(typeof window==='undefined'?this:window);
