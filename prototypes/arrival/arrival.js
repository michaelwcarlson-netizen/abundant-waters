/* Smoke Lake presentation. Thumb capture, action handling, camera follow and
 * earthy camper/gear drawing use the same conventions as Storm Day. */
(()=>{
'use strict';
const {Landing,shore,rocks,clamp}=window.SmokeLanding,$=id=>document.getElementById(id),canvas=$('lake'),ctx=canvas.getContext('2d');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const keyboard=matchMedia('(hover: hover) and (pointer: fine)').matches; // show key hints only on computers
let game=new Landing(),manualPause=false,shellPause=false,reported=false,linger=false,last=0,width=1,height=1,unit=1,camera={x:450,y:580},keys=new Set(),stick={x:0,y:0},stickId=null,actionId=null,origin=null,uiTime=-1;
const active=()=>!manualPause&&!shellPause&&!document.hidden&&(!game.complete||linger);
const P=(x,y,h=0)=>({x:width/2+(x-camera.x)*unit,y:height*.48+(y-camera.y)*unit-h*unit});
function cancelInput(){keys.clear();stick={x:0,y:0};stickId=null;actionId=null;game.cancelInput();$('thumb').style.transform='';$('interact').classList.remove('pressed');}
function resize(){const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);width=r.width;height=r.height;canvas.width=Math.round(width*d);canvas.height=Math.round(height*d);ctx.setTransform(d,0,0,d,0,0);unit=clamp(Math.min(width/730,height/660),.88,1.35);cancelInput();}
new ResizeObserver(resize).observe(canvas);
function togglePause(){manualPause=!manualPause;cancelInput();$('pause-sheet').hidden=!manualPause;if(manualPause)$('resume').focus();else canvas.focus({preventScroll:true});}
$('pause').addEventListener('click',togglePause);$('resume').addEventListener('click',togglePause);
function restart(){cancelInput();game=new Landing();reported=false;linger=false;manualPause=false;uiTime=-1;camera={x:450,y:580};$('ending').hidden=true;$('pause-sheet').hidden=true;$('controls').hidden=false;canvas.focus({preventScroll:true});updateUi(true);}
$('retry').addEventListener('click',restart);$('restart').addEventListener('click',restart);
$('linger').addEventListener('click',()=>{linger=true;game.exploring=true;game.complete=false;$('ending').hidden=true;$('controls').hidden=false;canvas.focus({preventScroll:true});});
$('take-bow').addEventListener('click',()=>{if(active()){game.grabBow();canvas.focus({preventScroll:true});updateUi(true);}});
$('board').addEventListener('click',()=>{if(active()){game.board();canvas.focus({preventScroll:true});updateUi(true);}});
window.addEventListener('blur',cancelInput);document.addEventListener('visibilitychange',()=>{cancelInput();last=performance.now();});
window.addEventListener('abundant-waters:pause',()=>{shellPause=true;cancelInput();});window.addEventListener('abundant-waters:resume',()=>{shellPause=false;last=performance.now();});
const movement=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyW','KeyA','KeyS','KeyD'];
window.addEventListener('keydown',e=>{if(e.code==='KeyP'&&!e.repeat){togglePause();return;}if(!active()||e.target.tagName==='BUTTON')return;
 if(movement.includes(e.code)){e.preventDefault();keys.add(e.code);}if((e.code==='KeyE'||e.code==='Space')&&!e.repeat){e.preventDefault();game.press();}if(e.code==='KeyB'&&!e.repeat){game.board();}if(e.code==='KeyT'&&!e.repeat){game.grabBow();}});
window.addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='KeyE'||e.code==='Space')game.release(!active());});
canvas.addEventListener('pointerdown',()=>canvas.focus({preventScroll:true}));
const pad=$('joystick'),action=$('interact');
function moveStick(e){if(e.pointerId!==stickId)return;const dx=e.clientX-origin.x,dy=e.clientY-origin.y,d=Math.hypot(dx,dy),k=d>38?38/d:1;stick={x:d<6?0:dx*k/38,y:d<6?0:dy*k/38};$('thumb').style.transform=`translate(${dx*k}px,${dy*k}px)`;}
pad.addEventListener('pointerdown',e=>{if(!active()||stickId!==null)return;e.preventDefault();const r=pad.getBoundingClientRect();origin={x:r.left+r.width/2,y:r.top+r.height/2};stickId=e.pointerId;pad.setPointerCapture(stickId);moveStick(e);});pad.addEventListener('pointermove',moveStick);
for(const type of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(type,e=>{if(e.pointerId===stickId){stickId=null;stick={x:0,y:0};$('thumb').style.transform='';}});
// A tap or hold ends with a synthetic click (detail 0 on mobile). Remember the last pointer event so that click is not read as a second, keyboard press.
let actionPointerAt=-1e9;
for(const type of ['pointerdown','pointerup','pointercancel'])action.addEventListener(type,()=>{actionPointerAt=performance.now();},true);
action.addEventListener('pointerdown',e=>{if(!active()||actionId!==null)return;e.preventDefault();actionId=e.pointerId;action.setPointerCapture(actionId);game.press();action.classList.add('pressed');});
for(const type of ['pointerup','pointercancel','lostpointercapture'])action.addEventListener(type,e=>{if(e.pointerId===actionId){game.release(type!=='pointerup'||!active());actionId=null;action.classList.remove('pressed');updateUi(true);}});
action.addEventListener('click',e=>{if(e.detail===0&&performance.now()-actionPointerAt>600&&active()){game.interact();canvas.focus({preventScroll:true});updateUi(true);}});
function input(){return {x:stick.x+Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft')),y:stick.y+Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'))};}
function updateUi(force=false){if(!force&&game.time-uiTime<.12&&!(game.complete&&!reported))return;uiTime=game.time;const c=game.context();$('action-label').textContent=c.label;$('context').textContent=keyboard||c.hint!=='E / Space'?c.hint:'Tap to step ashore';action.disabled=!c.enabled;$('pad-label').textContent=game.mode==='paddle'?'Paddle / steer':'Walk';$('tie-fill').style.width=game.actionUsed&&game.carry==='canoe'?game.canoe.tie*100+'%':'0%';$('take-bow').hidden=game.mode!=='walk'||!!game.carry||game.hullDistance(game.player)>62||game.near?.type!=='gear';$('board').hidden=game.mode!=='walk'||!!game.carry||game.hullDistance(game.player)>62||game.depth(game.canoe.x,game.canoe.y)<5;
 $('feedback').textContent=game.messageTime>0?game.message:game.time<12?'Up to paddle. Left / right to steer. Down to back-paddle.':'';
 $('cue').textContent=game.mode==='paddle'?'Pine needles point downwind. Ripples slide across the bow.':game.carry==='canoe'?'The stern follows slowly.':game.items.some(g=>!g.inBoat&&game.exposure(g)>.3)?'A wave reaches the low rock.':'Water washes the granite. Higher ground stays dry.';
 if(game.complete&&!reported){reported=true;cancelInput();$('controls').hidden=true;$('ending').hidden=false;$('feedback').textContent='';$('ending-note').textContent=game.items.some(g=>g.wet>25)?'A damp pack, a settled canoe, and the sound of water on rock.':'Gear on dry ground. The canoe rests. A loon calls across the bay.';$('retry').focus({preventScroll:true});window.AbundantWaters.complete({landed:true,bumps:game.bumps,gearWet:game.items.map(g=>({id:g.id,wet:Math.round(g.wet)})),canoeSecured:game.canoe.tie>=1});}
}
function line(a,b,color,n=1){ctx.strokeStyle=color;ctx.lineWidth=n;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
function ellipse(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}
function path(points,fill,stroke,n=1){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=n;ctx.stroke();}}
function pine(x,y,size){const p=P(x,y),s=size*unit,sway=reduced?0:Math.sin(game.time*1.2+x)*3*unit;line(p,{x:p.x+sway,y:p.y-s},'#6b6048',5*unit);for(let i=0;i<4;i++){const top=p.y-s+i*s*.18;path([{x:p.x+sway,y:top},{x:p.x-s*.27,y:top+s*.5},{x:p.x+s*.28,y:top+s*.5}],i%2?'#304e3b':'#3c5940');}}
function ground(){
 const gradient=ctx.createLinearGradient(0,0,0,height);gradient.addColorStop(0,'#709297');gradient.addColorStop(1,'#2e5b6d');ctx.fillStyle=gradient;ctx.fillRect(0,0,width,height);
 const edge=[];for(let x=-1000;x<=1900;x+=12)edge.push(P(x,shore(x)));path([P(-1000,-1500),P(1900,-1500),...edge.slice().reverse()],'#708461');
 const granite=[];for(let x=-1000;x<=1900;x+=12)granite.push(P(x,shore(x)-64-8*Math.sin(x/27)));path([...granite,...edge.slice().reverse()],'#b4ae93','#99957e',1);
 for(let j=0;j<60;j++){const x=50+(j*139)%820,y=shore(x)-12-(j*61)%85;line(P(x,y),P(x+10+(j%4)*6,y-2),'#6b716148',1);}
 const wave=(!reduced?Math.sin(game.time*1.8):0)*6;
 for(let x=-100;x<=1000;x+=9)line(P(x,shore(x)+wave),P(x+9,shore(x+9)+wave),'#d1d3b777',2*unit);
 for(let i=0;i<70;i++){const x=(i*113+game.time*8)%1200-100,y=420+(i*53)%500;if(y>shore(x)+14){const p=P(x,y);line(p,{x:p.x+(14+i%5*6)*unit,y:p.y-2*unit},'#b7d1c052',1);}}
 // Worn campsite, fire grate, and one quiet inhabited site beyond the point.
 ellipse(P(468,278).x,P(468,278).y,75*unit,30*unit,'#a89f80');
 for(let i=0;i<5;i++){const p=P(531+i*4,275);line(p,P(531+i*4,288),'#333e32',2*unit);}line(P(530,275),P(554,275),'#333e32',3*unit);
 path([P(109,309),P(147,269),P(184,311)],'#927950','#c5b087',2*unit);line(P(147,269),P(155,310),'#556348',2*unit);
 if(!reduced){const p=P(200,300);ctx.globalAlpha=.18;ellipse(p.x+Math.sin(game.time)*4,p.y-45-(game.time*8)%35,6,12,'#dedac4');ctx.globalAlpha=1;}
 for(const r of rocks){const p=P(r.x,r.y);ellipse(p.x+3,p.y+5,(r.r+6)*unit,(r.r*.7+5)*unit,'#183f4c60');ellipse(p.x,p.y,r.r*unit,r.r*.73*unit,'#8d9289');line({x:p.x-r.r*.5*unit,y:p.y-5*unit},{x:p.x+r.r*.4*unit,y:p.y-10*unit},'#c1c0a2',3*unit);}
 for(let i=0;i<24;i++)pine(20+(i*127)%860,190+(i*17)%56,45+i%4*15);
 // A loon slips past the outer rocks; wildlife has no objective or reward.
 const loon=P(730+Math.sin(game.time*.07)*45,585+Math.sin(game.time*.11)*17);ellipse(loon.x,loon.y,12*unit,5*unit,'#263c3c');ellipse(loon.x+9*unit,loon.y-6*unit,4*unit,5*unit,'#1d3438');line({x:loon.x+12*unit,y:loon.y-7*unit},{x:loon.x+18*unit,y:loon.y-6*unit},'#b4b4a0',2*unit);for(let i=0;i<4;i++)ellipse(loon.x-i*4*unit,loon.y-1,1.4*unit,1*unit,'#ded9bd');
}
function person(who,seated=false){const p=P(who.x,who.y),u=unit,walk=seated?0:Math.sin(who.step)*3;
 ellipse(p.x,p.y+2,14*u,5*u,'#253d2c50');line({x:p.x-5*u,y:p.y-13*u},{x:p.x-7*u+walk*u,y:p.y},'#405846',7*u);line({x:p.x+5*u,y:p.y-13*u},{x:p.x+7*u-walk*u,y:p.y},'#405846',7*u);
 ctx.fillStyle='#be7045';ctx.fillRect(p.x-12*u,p.y-37*u,24*u,27*u);ellipse(p.x,p.y-48*u,10*u,11*u,'#d5b281');ellipse(p.x-u,p.y-55*u,12*u,5*u,'#cead64');
 line({x:p.x-12*u,y:p.y-30*u},{x:p.x-16*u,y:p.y-(game.carry?28:17)*u},'#d5b281',6*u);line({x:p.x+12*u,y:p.y-30*u},{x:p.x+16*u,y:p.y-(game.carry?28:17)*u},'#d5b281',6*u);
 if(game.carry==='canoe')line({x:p.x+14*u,y:p.y-24*u},P(game.bow().x,game.bow().y),'#e0ce9f',2*unit);
}
function gear(g){const p=P(g.x,g.y,game.carry===g.id?28:0),u=unit*.8;ellipse(p.x,p.y+6,20*u,8*u,'#253d2c30');ctx.save();ctx.translate(p.x,p.y);ctx.scale(u,u);
 if(g.id==='paddles'){for(let i=-1;i<=1;i+=2){line({x:-25,y:i*6},{x:17,y:i*6},'#c69e65',4);ellipse(23,i*6,12,5,'#c69e65');}}
 else if(g.id==='bedroll'){ellipse(0,0,25,14,g.wet>25?'#826d4b':g.color);line({x:-10,y:-12},{x:-10,y:12},'#d7c89f',3);line({x:10,y:-12},{x:10,y:12},'#d7c89f',3);}
 else{ctx.fillStyle=g.wet>25?'#4e6452':g.color;ctx.fillRect(-20,-23,40,44);ctx.strokeStyle='#c6b587';ctx.lineWidth=3;ctx.strokeRect(-20,-23,40,44);ctx.fillStyle='#c5b58b';ctx.fillRect(-22,-24,44,12);line({x:-8,y:-6},{x:-8,y:18},'#555b43',4);line({x:8,y:-6},{x:8,y:18},'#555b43',4);}
 if(g.wet>12){for(let i=0;i<Math.floor(g.wet/12);i++)ellipse(-15+i*11%30,-10+i*13%24,2,2,'#345d7099');}ctx.restore();
}
function hull(){const c=game.canoe,p=P(c.x,c.y),u=unit;
 if(game.depth(c.x,c.y)>0){for(let i=0;i<3;i++){const stern=P(c.x-Math.sin(c.th)*(55+i*13),c.y+Math.cos(c.th)*(55+i*13));ellipse(stern.x,stern.y,(12+i*5)*u,3*u,'#d0d5b72b');}}
 if(c.anchor&&c.tie>0)line(P(game.bow().x,game.bow().y),P(c.anchor.x,c.anchor.y),'#e1cfa2',2*u);
 ctx.save();ctx.translate(p.x,p.y);ctx.rotate(c.th);ctx.scale(u,u);ctx.beginPath();ctx.moveTo(0,-57);ctx.bezierCurveTo(31,-27,27,30,0,57);ctx.bezierCurveTo(-27,30,-31,-27,0,-57);ctx.fillStyle='#a96547';ctx.fill();ctx.strokeStyle='#e0b588';ctx.lineWidth=3;ctx.stroke();ctx.beginPath();ctx.moveTo(0,-48);ctx.quadraticCurveTo(8,0,0,48);ctx.strokeStyle='#754c38';ctx.stroke();for(const y of [-24,24])line({x:-18,y},{x:18,y},'#d6b585',3);ctx.restore();
 if(game.mode==='paddle'){person({x:c.x,y:c.y+10,facing:1,step:0},true);const f=input(),q=P(c.x,c.y);line({x:q.x-12*u,y:q.y-12*u},{x:q.x-40*u,y:q.y+(f.y<0?Math.sin(game.time*7)*15:12)*u},'#c7b18b',4*u);}
}
function highlight(){if(!game.near)return;const g=game.near.type==='hull'?game.bow():game.items.find(g=>g.id===game.near.id),p=P(g.x,g.y);ctx.strokeStyle='#f1dfb6b0';ctx.lineWidth=2;ctx.setLineDash([4,5]);ctx.beginPath();ctx.ellipse(p.x,p.y,30*unit,20*unit,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}
function draw(){ground();hull();const actors=game.items.filter(g=>!g.inBoat&&game.carry!==g.id).map(g=>({y:g.y,draw:()=>gear(g)}));for(const g of game.items.filter(g=>g.inBoat))gear(g);if(game.mode==='walk')actors.push({y:game.player.y,draw:()=>{person(game.player);const g=game.items.find(g=>g.id===game.carry);if(g)gear(g);}});actors.sort((a,b)=>a.y-b.y).forEach(a=>a.draw());highlight();if(game.splash>0){const p=P(game.canoe.x,game.canoe.y);for(let i=0;i<12;i++){const a=i*Math.PI/6,r=(1-game.splash)*42;ellipse(p.x+Math.cos(a)*r*unit,p.y+Math.sin(a)*r*.5*unit,2*unit,3*unit,'#d4e3d0');}}}
function frame(now){const dt=Math.min(.05,Math.max(0,(now-(last||now))/1000));last=now;game.paused=!active();if(active())game.advance(dt,input());
 const target=game.mode==='paddle'?{x:game.canoe.x,y:game.canoe.y-70}:game.player;camera.x+=(target.x-camera.x)*(1-Math.exp(-7*dt));camera.y+=(target.y-camera.y)*(1-Math.exp(-5*dt));updateUi();draw();requestAnimationFrame(frame);}
resize();updateUi(true);requestAnimationFrame(frame);
})();
