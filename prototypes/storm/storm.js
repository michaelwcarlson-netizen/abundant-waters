/* Storm Day's campsite renderer and controls. No changes to the shared level player. */
(() => {
  'use strict';
  const {Campsite}=window.StormAdventure, {CAMP,clamp}=window.StormPhysics;
  const $=id=>document.getElementById(id),canvas=$('camp'),ctx=canvas.getContext('2d');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let camp=new Campsite(),game=camp.storm,started=false,manualPause=false,shellPause=false,reported=false;
  let width=1,height=1,unit=1,baseUnit=1,vertical=1,camera={x:240,y:335},last=0,uiTime=-1;
  let keys=new Set(),stick={x:0,y:0},stickId=null,actionId=null,stickOrigin=null;
  const active=()=>started&&!manualPause&&!shellPause&&!document.hidden&&!camp.complete;
  const P=(x,y,h=0)=>({x:width/2+(x-camera.x)*unit,y:height*.5+(y-camera.y)*vertical-h*.62*unit});
  const trees=Array.from({length:50},(_,i)=>({x:(i*173+29)%720-40,y:65+(i*47)%120,size:48+(i*13)%44}));
  function resize(){
    const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
    width=r.width;height=r.height;canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    unit=height<350?clamp(height/350,.72,1.05):clamp(Math.min(width/760,height/500),1.04,1.55);
    baseUnit=unit; vertical=unit*(width<550?.98:.76);
    cancelInput();
  }
  new ResizeObserver(resize).observe(canvas);
  function cancelInput(){
    keys.clear();stick={x:0,y:0};stickId=null;actionId=null;
    camp.cancelInput();$('thumb').style.transform='';$('interact').classList.remove('pressed');
  }
  function begin(){started=true;$('intro').hidden=true;canvas.focus({preventScroll:true});last=performance.now();updateUi(true);}
  $('begin').addEventListener('click',begin);
  function togglePause(){
    if(!started||camp.complete)return;
    manualPause=!manualPause;cancelInput();$('pause-sheet').hidden=!manualPause;
    if(manualPause)$('resume').focus();else canvas.focus({preventScroll:true});
  }
  $('pause').addEventListener('click',togglePause);$('resume').addEventListener('click',togglePause);
  function restart(){
    cancelInput();camp=new Campsite(game.scenario);game=camp.storm;
    camera={x:240,y:335};reported=false;manualPause=false;uiTime=-1;
    $('replay').hidden=true;$('controls').hidden=false;$('pause').disabled=false;
    started=true;last=performance.now();canvas.focus({preventScroll:true});updateUi(true);
  }
  $('retry').addEventListener('click',restart);
  window.addEventListener('blur',cancelInput);
  document.addEventListener('visibilitychange',()=>{cancelInput();last=performance.now();});
  window.addEventListener('abundant-waters:pause',()=>{shellPause=true;cancelInput();});
  window.addEventListener('abundant-waters:resume',()=>{shellPause=false;last=performance.now();});
  const movement=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyW','KeyA','KeyS','KeyD'];
  window.addEventListener('keydown',e=>{
    if(e.code==='KeyP'&&!e.repeat){togglePause();return;}
    if(!active()||e.target.tagName==='BUTTON')return;
    if(movement.includes(e.code)){e.preventDefault();keys.add(e.code);}
    if((e.code==='KeyE'||e.code==='Space')&&!e.repeat){e.preventDefault();camp.press();}
  });
  window.addEventListener('keyup',e=>{
    keys.delete(e.code);
    if(e.code==='KeyE'||e.code==='Space')camp.release(!active());
  });
  canvas.addEventListener('pointerdown',()=>canvas.focus({preventScroll:true}));
  // One thumb can keep moving while the other handles gear.
  const pad=$('joystick');
  function moveStick(e){
    if(e.pointerId!==stickId)return;
    const dx=e.clientX-stickOrigin.x,dy=e.clientY-stickOrigin.y,d=Math.hypot(dx,dy),max=38;
    const k=d>max?max/d:1;
    stick={x:d<6?0:dx*k/max,y:d<6?0:dy*k/max};
    $('thumb').style.transform=`translate(${dx*k}px,${dy*k}px)`;
  }
  pad.addEventListener('pointerdown',e=>{
    if(!active()||stickId!==null)return;e.preventDefault();
    const r=pad.getBoundingClientRect();stickOrigin={x:r.left+r.width/2,y:r.top+r.height/2};
    stickId=e.pointerId;pad.setPointerCapture(e.pointerId);moveStick(e);
  });
  pad.addEventListener('pointermove',moveStick);
  for(const type of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(type,e=>{
    if(e.pointerId===stickId){stickId=null;stick={x:0,y:0};$('thumb').style.transform='';}
  });
  const action=$('interact');
  // A tap or hold ends with a synthetic click (detail 0 on mobile). Remember the last pointer event so that
  // click is not read as a second, keyboard press that would drop what was just picked up.
  let actionPointerAt=-1e9;
  for(const type of ['pointerdown','pointerup','pointercancel'])action.addEventListener(type,()=>{actionPointerAt=performance.now();},true);
  action.addEventListener('pointerdown',e=>{
    if(!active()||actionId!==null)return;e.preventDefault();actionId=e.pointerId;
    action.setPointerCapture(e.pointerId);action.classList.add('pressed');camp.press();
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture'])action.addEventListener(type,e=>{
    if(e.pointerId===actionId){camp.release(type!=='pointerup'||!active());actionId=null;action.classList.remove('pressed');updateUi(true);}
  });
  action.addEventListener('click',e=>{
    if(e.detail===0&&performance.now()-actionPointerAt>600&&active()){camp.interact();canvas.focus({preventScroll:true});updateUi(true);}
  });
  function input(){return {x:stick.x+Number(keys.has('ArrowRight')||keys.has('KeyD'))-Number(keys.has('ArrowLeft')||keys.has('KeyA')),
    y:stick.y+Number(keys.has('ArrowDown')||keys.has('KeyS'))-Number(keys.has('ArrowUp')||keys.has('KeyW'))};}
  function updateUi(force=false){
    if(!force&&!(camp.complete&&!reported)&&game.time+camp.after-uiTime<.15)return;uiTime=game.time+camp.after;
    const w=game.weather,c=camp.context();
    $('phase').textContent=w.phase==='approach'?'Wind on the water':w.phase==='rain'?'Rain through the pines':w.phase==='easing'?'The far shore returns':'A quiet corner of camp';
    $('wind-arrow').style.transform=`rotate(${w.angle}rad)`;
    $('wind-label').textContent=w.strength>.75?'Strong gusts':w.strength>.4?'Wind building':'Light breeze';
    $('weather-fill').style.width=game.time+'%';document.querySelector('.weather-track').setAttribute('aria-valuenow',String(Math.round(game.time)));
    $('action-label').textContent=c.label;$('action-hint').textContent=camp.carry==='canoe'?'Hold to tie · E / Space':camp.edge!==null?'Move to pull · tap to release':'E / Space';
    $('context').textContent=c.hint;action.disabled=camp.complete||(!camp.near&&!camp.carry&&camp.edge===null);
    $('tie-fill').style.width=camp.actionUsed&&camp.carry==='canoe'?game.items[0].tie*100+'%':'0%';
    $('feedback').textContent=camp.messageTime>0?camp.message:game.time<9?'Walk over to the jacket. The wind has noticed it too.':'';
    $('cue').textContent=game.done?'Rain ticking from the cedar.':game.time<15?'A breeze, a loose jacket, and a little room to explore.':game.time<32?'The far shore darkens.':game.time<55?'Rain finds the loose corners.':game.time<82?'The wind turns around the point.':'Light returns to Smoke Lake.';
    if(camp.complete&&!reported){
      reported=true;cancelInput();$('controls').hidden=true;$('feedback').textContent='';$('pause').disabled=true;
      const r=game.result();$('ending-note').textContent=r.dryness>80?'Dry packs, rain on the roof. A good place to sit.':r.dumps>0?'A tarp spill, some damp gear, and a story for next time.':'A few damp things. Still a good place to sit.';
      $('replay').hidden=false;
      window.AbundantWaters.complete({dryness:r.dryness,canoeDrift:r.canoeDrift,tarpSpills:r.dumps});
    }
  }
  function path(points,fill,stroke,width=1){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
  function ellipse(x,y,rx,ry,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,Math.PI*2);ctx.fill();}
  function text(txt,x,y,color='#eee8d8',size=12){ctx.fillStyle=color;ctx.font=`${size}px system-ui,sans-serif`;ctx.textAlign='center';ctx.fillText(txt,x,y);}
  function line(a,b,col,width=1){ctx.strokeStyle=col;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
  function pine(t){
    const p=P(t.x,t.y),u=unit,size=t.size*u,sway=reduced?0:Math.sin(game.time*2+t.x)*game.weather.strength*6*u;
    ellipse(p.x,p.y+3,20*u,7*u,'#253d2d35');line(p,{x:p.x+sway,y:p.y-size},'#665b41',5*u);
    for(let j=0;j<4;j++){const top=p.y-size+j*size*.18;
      path([{x:p.x+sway,y:top},{x:p.x-size*.30,y:top+size*.49},{x:p.x-size*.12,y:top+size*.44},{x:p.x+size*.33,y:top+size*.50}],j%2?'#304e3b':'#3c5940','#213f3233');
    }
  }
  function ground(){
    const w=game.weather,rain=w.rain;
    const sky=ctx.createLinearGradient(0,0,0,height);sky.addColorStop(0,rain>.3?'#697b72':'#9daca0');sky.addColorStop(1,rain>.3?'#536c66':'#77938d');
    ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);
    const shore=[];for(let x=-500;x<=1200;x+=20)shore.push(P(x,540+Math.sin(x/73)*9+(reduced?0:Math.sin(game.time*2+x/70)*w.strength*4)));
    path([...shore,{x:width,y:height},{x:0,y:height}],rain>.5?'#355861':'#527984');
    for(let j=0;j<24;j++){
      const q=P((j*89+game.time*w.x*8)%950-120,558+(j*31)%280);
      line(q,{x:q.x+(28+(j%4)*18)*unit,y:q.y-3},rain>.3?'#77989066':'#b5c7be88',1.4);
    }
    path([P(-200,120),P(900,120),P(900,508),...shore.slice().reverse(),P(-200,500)],rain>.5?'#657a60':'#7d8d65');
    path([P(50,252),P(130,185),P(262,184),P(403,210),P(548,205),P(600,393),P(540,510),P(270,523),P(44,470)],rain>.3?'#919381':'#b9af91','#c9bda2',2);
    for(let i=0;i<100;i++){
      const x=50+(i*83)%548,y=210+(i*47)%305,p=P(x,y);
      ellipse(p.x,p.y,1+(i%3)*unit,.65*unit,i%2?'#64735f35':'#dfcdae38');
    }
    for(const [x,y,rx,ry]of [[85,460,76,20],[520,484,69,19],[563,249,40,24],[460,219,25,14]]){
      const p=P(x,y);ellipse(p.x,p.y,rx*unit,ry*vertical,rain>.3?'#a1a496':'#c5bfaa');
      line(P(x-rx*.5,y),P(x+rx*.7,y+6),'#7b85726b',1.4);
    }
    for(const t of trees)pine(t);
    // Scattered ferns and roots, off the walking routes.
    for(let i=0;i<28;i++){
      const x=i%2?38:608,y=190+i*12,p=P(x,y);
      for(let j=-2;j<=2;j++)line(p,{x:p.x+j*6*unit,y:p.y-12*unit+Math.abs(j)*2},'#456148',2*unit);
    }
    const tent=P(112,222);path([{x:tent.x-47*unit,y:tent.y},{x:tent.x-14*unit,y:tent.y-55*unit},{x:tent.x+41*unit,y:tent.y-15*unit},{x:tent.x+55*unit,y:tent.y+9*unit}],'#af8c53','#d9c28e',2);
    path([{x:tent.x-47*unit,y:tent.y},{x:tent.x-14*unit,y:tent.y-55*unit},{x:tent.x+9*unit,y:tent.y+6*unit}],'#bfa56e','#dbc795',1.5);
    path([{x:tent.x-33*unit,y:tent.y},{x:tent.x-13*unit,y:tent.y-33*unit},{x:tent.x+2*unit,y:tent.y+2*unit}],'#48594b');
    const fire=P(470,432);ellipse(fire.x,fire.y,25*unit,14*vertical,'#596150');
    for(let i=0;i<9;i++)ellipse(fire.x+Math.cos(i*.7)*22*unit,fire.y+Math.sin(i*.7)*11*vertical,7*unit,5*unit,'#9b9f8e');
    line({x:fire.x-13*unit,y:fire.y+4},{x:fire.x+11*unit,y:fire.y-4},'#695b43',5*unit);
    // Darkening moves across the campsite before any rain falls.
    const dark=clamp((game.time-12)/25,0,1)*(game.done?.04:.16+rain*.14);
    ctx.fillStyle=`rgba(30,49,49,${dark})`;ctx.fillRect(0,0,width,height);
  }
  function shelter(){
    const cloth=game.cloth,roof=game.projectedRoof();
    path([...roof.map(n=>P(n.x,n.back)),...roof.slice().reverse().map(n=>P(n.x,n.front))],'#293f3538');
    for(const y of [CAMP.back-27,CAMP.front+30]){
      const base=P(CAMP.ridgeX,y),top=P(CAMP.ridgeX,y,135);
      line(base,top,'#705a3c',9*unit);line({x:base.x-2*unit,y:base.y},{x:top.x-2*unit,y:top.y},'#a28a56',2*unit);
    }
    line(P(CAMP.ridgeX,CAMP.back-27,116),P(CAMP.ridgeX,CAMP.front+30,116),'#e3c795',2);
    for(let i=0;i<cloth.length-1;i++){
      const a=cloth[i],b=cloth[i+1],flutter=reduced?0:Math.sin(game.time*9+i)*game.weather.strength*3;
      path([P(a.x,CAMP.back,a.h),P(b.x,CAMP.back,b.h),P(b.x,CAMP.front,b.h+flutter),P(a.x,CAMP.front,a.h+flutter)],i<8?'#a99b6db5':'#7f967bc2','#d5d0a351',.8);
      if(a.water>.14){const p=P(a.x,330,a.h);ellipse(p.x,p.y,Math.min(12,a.water*8)*unit,25*vertical,'#456c7477');}
    }
    for(const side of [0,1]){
      const e=game.edges[side],x=game.edgeX(side),hem=P(x,CAMP.front,e.height),stake=P(x+(side?27:-27),CAMP.front+24);
      if(e.tension<.35){ctx.strokeStyle='#e1c99d';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(hem.x,hem.y);ctx.quadraticCurveTo((hem.x+stake.x)/2,(hem.y+stake.y)/2+14*unit,stake.x,stake.y);ctx.stroke();}
      else line(hem,stake,'#e1c99d',2);
      line(stake,{x:stake.x+3,y:stake.y-12*unit},'#624d36',4);
      if(camp.near?.type==='edge'&&camp.near.side===side){ellipse(stake.x,stake.y-8*unit,11*unit,11*unit,'#f3d295bb');text('line',stake.x,stake.y+18*unit,'#283f34',12);}
      if(game.drain[side]>.01)for(let j=0;j<5;j++){
        const q=P(x,CAMP.back+j*32);line({x:q.x,y:q.y-e.height*.62*unit},{x:q.x+game.weather.x*5,y:q.y},'#cfddd6b3',1);
      }
    }
  }
  function person(who,dad=false){
    const p=P(who.x,who.y),u=unit,walk=Math.sin(who.step||camp.after*5)*(dad?camp.dad.arrived?0:3:Math.hypot(who.vx,who.vy)>2?4:0);
    if(dad&&who.arrived){
      ellipse(p.x,p.y+2,18*u,6*u,'#253d2c50');
      line({x:p.x-3*u,y:p.y-7*u},{x:p.x-18*u,y:p.y},'#405846',7*u);
      line({x:p.x+3*u,y:p.y-7*u},{x:p.x+18*u,y:p.y},'#405846',7*u);
      ctx.fillStyle='#637755';ctx.fillRect(p.x-12*u,p.y-29*u,24*u,24*u);
      ellipse(p.x,p.y-39*u,10*u,11*u,'#d5b281');ellipse(p.x-1*u,p.y-47*u,12*u,5*u,'#876b46');
      line({x:p.x-12*u,y:p.y-25*u},{x:p.x-16*u,y:p.y-11*u},'#d5b281',6*u);
      line({x:p.x+12*u,y:p.y-25*u},{x:p.x+16*u,y:p.y-11*u},'#d5b281',6*u);
      return;
    }
    ctx.save();
    ellipse(p.x,p.y+2,14*u,5*u,'#253d2c50');
    line({x:p.x-5*u,y:p.y-13*u},{x:p.x-7*u+walk*u,y:p.y},'#405846',7*u);
    line({x:p.x+5*u,y:p.y-13*u},{x:p.x+7*u-walk*u,y:p.y},'#405846',7*u);
    ctx.fillStyle=dad?'#637755':'#be7045';ctx.fillRect(p.x-12*u,p.y-37*u,24*u,27*u);
    ctx.fillStyle='#d5b281';ctx.fillRect(p.x-5*u,p.y-43*u,10*u,8*u);
    ellipse(p.x,p.y-48*u,10*u,11*u,'#d5b281');
    ellipse(p.x-1*u,p.y-55*u,12*u,5*u,dad?'#876b46':'#cead64');
    line({x:p.x-12*u,y:p.y-30*u},{x:p.x-(camp.carry&&!dad?16:14)*u,y:p.y-(camp.carry&&!dad?28:17)*u},'#d5b281',6*u);
    line({x:p.x+12*u,y:p.y-30*u},{x:p.x+16*u,y:p.y-(camp.carry&&!dad?28:17)*u},'#d5b281',6*u);
    if(!dad){ctx.fillStyle='#314935';ctx.fillRect(p.x+(who.facing>0?3:-6)*u,p.y-49*u,3*u,3*u);}
    if(camp.edge!==null&&!dad){const target=P(game.edgeX(camp.edge)+(camp.edge?27:-27),CAMP.front+24);line({x:p.x+14*u,y:p.y-27*u},target,'#d8caa3',2);}
    ctx.restore();
  }
  function drawItem(g){
    const held=camp.carry===g.id, p=P(g.x,g.y,held&&g.id!=='canoe'?29:0),u=unit*(g.id==='canoe'?1:.8),sel=camp.near?.id===g.id;
    ellipse(p.x+3,p.y+7,g.id==='canoe'?63*u:26*u,10*u,'#354b3c35');
    if(sel){ctx.setLineDash([4,4]);ctx.strokeStyle='#f1deb0';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y,g.id==='canoe'?73*u:33*u,g.id==='canoe'?36*u:33*u,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}
    if(g.id==='canoe'&&g.tie>.01&&g.anchor){const anchor=P(g.anchor.x,g.anchor.y);line(p,anchor,g.strain>.7?'#b68b57':'#d9cca7',1+g.tie*2);ellipse(anchor.x,anchor.y,7*u,4*u,'#626a5d');}
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(g.angle);ctx.scale(u,u);
    if(g.id==='canoe'){
      ctx.beginPath();ctx.moveTo(-65,0);ctx.bezierCurveTo(-25,-31,35,-31,65,0);ctx.bezierCurveTo(30,25,-30,25,-65,0);ctx.fillStyle=g.wet>35?'#754638':'#a96547';ctx.fill();ctx.strokeStyle='#e0b588';ctx.lineWidth=3;ctx.stroke();
      ctx.beginPath();ctx.moveTo(-57,0);ctx.quadraticCurveTo(0,-8,56,0);ctx.strokeStyle='#754c38';ctx.lineWidth=3;ctx.stroke();
      line({x:-20,y:-18},{x:-20,y:17},'#d6b585',3);line({x:20,y:-18},{x:20,y:17},'#d6b585',3);
    }else if(g.id==='pack'){
      ctx.fillStyle=g.wet>25?'#4e6452':'#7e8860';ctx.fillRect(-21,-24,42,45);ctx.strokeStyle='#c6b587';ctx.lineWidth=3;ctx.strokeRect(-21,-24,42,45);
      ctx.fillStyle='#c5b58b';ctx.fillRect(-23,-23,46,13);ctx.fillStyle='#555b43';ctx.fillRect(-12,-8,5,29);ctx.fillRect(8,-8,5,29);
    }else if(g.id==='jacket'){
      path([{x:-12,y:-21},{x:-31,y:-8},{x:-22,y:6},{x:-13,y:0},{x:-15,y:24},{x:16,y:24},{x:13,y:0},{x:25,y:7},{x:31,y:-9},{x:12,y:-21}],g.wet>25?'#96753f':'#c4a064','#e0c18b',2);
      line({x:0,y:-20},{x:0,y:22},'#826b48',2);
    }else if(g.id==='wood'){
      for(let i=0;i<5;i++){line({x:-23+i*6,y:-16},{x:-9+i*6,y:20},g.wet>25?'#65513d':'#99764e',7);ellipse(-23+i*6,-16,3,3,'#d4ba82');}
      line({x:-22,y:0},{x:19,y:0},'#d7c997',2);
    }else{
      line({x:-34,y:0},{x:20,y:0},g.wet>30?'#886039':'#c69e65',5);ellipse(26,0,18,9,g.wet>30?'#886039':'#c69e65');
    }
    if(g.wet>12){ctx.fillStyle='#345d7077';for(let j=0;j<Math.floor(g.wet/12);j++){ctx.beginPath();ctx.arc(-16+(j*13)%32,-12+(j*17)%28,3,0,Math.PI*2);ctx.fill();}}
    ctx.restore();
    if(sel && !held)text(g.name,p.x,p.y+Math.max(30,38*u),'#283f34',Math.max(11,12*unit));
    if(sel && g.id!=='canoe' && game.weather.rain>.05){const color=g.exposure>.3?'#caa16a':'#dee1b9';ctx.fillStyle='#354638';ctx.fillRect(p.x-22,p.y-37,44,4);ctx.fillStyle=color;ctx.fillRect(p.x-22,p.y-37,44*(1-g.exposure),4);}
  }
  function rain(){
    const w=game.weather;if(w.rain<=0)return;
    const roof=game.projectedRoof(),count=Math.floor(w.rain*(reduced?35:150)),time=reduced?game.time*.25:game.time;
    for(let i=0;i<count;i++){
      const x=((i*131+time*w.x*155)%850+850)%850-100,y=150+((i*73+time*300)%500);
      if(game.shelteredAt(x,y,roof)&&y>CAMP.back)continue;
      const p=P(x,y);line({x:p.x-w.x*8*w.strength,y:p.y-14},{x:p.x,y:p.y},'#dae6daa0',1.2);
    }
    for(const splash of game.splashes){const p=P(splash.x,splash.y);ellipse(p.x,p.y,(1-splash.life)*45*unit,8*unit,`rgba(200,220,205,${splash.life*.6})`);}
  }
  function story(){
    if(!camp.story)return;
    const p=P(camp.dad.x,camp.dad.y,100),max=Math.min(width-24,350),x=clamp(p.x-max/2,12,width-max-12),y=clamp(p.y-65,45,height-210);
    ctx.fillStyle='#efe4cbf5';ctx.beginPath();ctx.roundRect(x,y,max,65,9);ctx.fill();
    text('Dad: “Remember when the rain found my boots?”',x+max/2,y+23,'#344b38',max<300?11:13);
    text('He checks one. Then sits beside the packs.',x+max/2,y+45,'#58654d',max<300?11:12);
  }
  function draw(){
    ctx.clearRect(0,0,width,height);ground();shelter();
    const actors=game.items.filter(g=>camp.carry!==g.id||g.id==='canoe').map(g=>({y:g.y,draw:()=>drawItem(g)}));
    actors.push({y:camp.player.y,draw:()=>{person(camp.player);if(camp.carry&&camp.carry!=='canoe')drawItem(game.items.find(g=>g.id===camp.carry));}});
    if(game.done)actors.push({y:camp.dad.y,draw:()=>person(camp.dad,true)});
    actors.sort((a,b)=>a.y-b.y).forEach(a=>a.draw());rain();story();
  }
  function frame(now){
    const dt=Math.min(.05,Math.max(0,(now-(last||now))/1000));last=now;
    game.paused=!active();
    if(active())camp.advance(dt,input());
    // Keep Dad and the camper together in the quiet shot, even at opposite sides of camp.
    const endingUnit=game.done?Math.min(baseUnit,width/(Math.abs(camp.player.x-camp.dad.x)+80)):baseUnit;
    unit+=(endingUnit-unit)*(1-Math.exp(-4*dt));vertical=unit*(width<550?.98:.76);
    const span=width/(2*unit),targetX=game.done?(camp.player.x+camp.dad.x)/2:clamp(camp.player.x,Math.min(240,span-30),Math.max(400,640-span+30));
    camera.x+=(targetX-camera.x)*(1-Math.exp(-7*dt));
    const targetY=clamp(camp.player.y,305,385);camera.y+=(targetY-camera.y)*(1-Math.exp(-5*dt));
    updateUi();draw();requestAnimationFrame(frame);
  }
  resize();updateUi(true);requestAnimationFrame(frame);
})();
