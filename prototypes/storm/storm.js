/* UI and drawing for Storm Day. All coordinates entering physics are camp units. */
(() => {
  'use strict';
  const { Storm, SCENARIOS, CAMP, clamp } = window.StormPhysics;
  const $ = id => document.getElementById(id);
  const canvas = $('camp'), ctx = canvas.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let game = new Storm(0), started = false, manualPause = false, shellPause = false;
  let selected = 'canoe', drag = null, hold = null, keys = new Set(), last = 0, ending = 0, reported = false;
  let width = 1, height = 1, mapWidth = 1, sx = 1, sy = 1, ox = 0, oy = 0, unit = 1;
  let lastUi = -1, feedbackUntil = 0, notices = new Set(), history = new Map(), selectionDirty = true;
  const ids = ['canoe', 'pack', 'jacket', 'wood', 'paddle', 'left-edge', 'right-edge'];
  const trees = Array.from({length:38}, (_, i) => ({ x:(i*173+29)%640, y:70+(i*47)%105, size:25+(i*13)%35 }));
  const sideOf = id => id === 'left-edge' ? 0 : id === 'right-edge' ? 1 : null;
  const item = () => game.items.find(g => g.id === selected);
  const active = () => started && !manualPause && !shellPause && !document.hidden && !game.done;
  const P = (x,y,h=0) => ({x:ox+x*sx, y:oy+(y-100)*sy-h*.42*unit});
  const U = (x,y) => ({x:(x-ox)/sx, y:(y-oy)/sy+100});
  function resize() {
    const r = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    width = r.width; height = r.height;
    canvas.width = Math.round(width*dpr); canvas.height = Math.round(height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    // Portrait spreads the ground vertically; equipment itself stays undistorted.
    mapWidth = width >= 900 ? width-350 : width;
    sx = Math.min(mapWidth/640,1.65); sy = Math.max(.1,(height-20)/480);
    ox = (mapWidth-640*sx)/2; oy = 10; unit = Math.min(sx,sy);
    cancelInput();
  }
  new ResizeObserver(resize).observe(canvas);
  function say(text,seconds=4) { $('feedback').textContent=text; feedbackUntil=game.time+seconds; }
  function notice(key,text) { if (!notices.has(key) && game.time>feedbackUntil) {notices.add(key);say(text,5);} }
  function select(id) {
    selected=id; selectionDirty=true;
    const side=sideOf(id);
    if(side!==null) say('Pull the round handle down to lower this edge, outward to tighten. Watch the cloth change.');
    else if(id==='canoe') say('Drag inland. Turn the long hull into the wind, then hold Secure line.');
    else say('Move it wherever you like. Watch for blowing rain and water dripping off the tarp.');
    updateUi(true);
  }
  function cancelInput() { drag=null; hold=null; keys.clear(); game.held=null; document.querySelectorAll('.pressed').forEach(b=>b.classList.remove('pressed')); }
  function edgeHandle(side) { return P(game.edgeX(side),CAMP.front,game.edges[side].height); }
  function hitTest(x,y) {
    // Handles and equipment have at least a 44 CSS-pixel touch diameter.
    let best=null,bestD=Infinity;
    for (const side of [0,1]) {
      const p=edgeHandle(side),d=Math.hypot(x-p.x,y-p.y);
      if(d<25 && d<bestD){best=side?'right-edge':'left-edge';bestD=d;}
    }
    for(const g of game.items){
      const p=P(g.x,g.y),dx=x-p.x,dy=y-p.y;
      const a=g.angle,localX=dx*Math.cos(a)+dy*Math.sin(a),localY=-dx*Math.sin(a)+dy*Math.cos(a);
      const dist=g.id==='canoe'?Math.hypot(Math.max(0,Math.abs(localX)-45*unit),localY):Math.hypot(dx,dy);
      if(dist<Math.max(24,g.r*unit+5)&&dist<bestD){best=g.id;bestD=dist;}
    }
    return best;
  }
  function screenPoint(e){const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}
  canvas.addEventListener('pointerdown',e=>{
    if(!active()||drag)return;
    const p=screenPoint(e),id=hitTest(p.x,p.y);if(!id)return;
    e.preventDefault();canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);select(id);
    const side=sideOf(id),g=item(),u=U(p.x,p.y);
    drag={id:e.pointerId,start:p,point:p,side,dx:g?g.x-u.x:0,dy:g?g.y-u.y:0,
      edge:side!==null?{...game.edges[side]}:null};
    if(g)game.held=g.id;
  });
  canvas.addEventListener('pointermove',e=>{if(drag?.id===e.pointerId)drag.point=screenPoint(e);});
  const release=e=>{if(drag?.id===e.pointerId){
    if(e.type==='pointerup' && drag.side===null){const p=U(drag.point.x,drag.point.y);game.move(selected,p.x+drag.dx,p.y+drag.dy,10);}
    drag=null;game.held=null;}};
  canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);
  $('select-next').addEventListener('click',()=>{select(ids[(ids.indexOf(selected)+1)%ids.length]);canvas.focus({preventScroll:true});});
  document.querySelectorAll('[data-hold]').forEach(b=>{
    b.addEventListener('pointerdown',e=>{if(!active())return;e.preventDefault();cancelInput();hold=b.dataset.hold;b.classList.add('pressed');b.setPointerCapture(e.pointerId);});
    for(const name of ['pointerup','pointercancel','lostpointercapture']) b.addEventListener(name,()=>{hold=null;b.classList.remove('pressed');});
    // Assistive technology activation, separate from held pointer input.
    b.addEventListener('click',e=>{if(e.detail===0&&active())applyAction(b.dataset.hold,.22);});
  });
  function applyAction(action,dt){
    const side=sideOf(selected);
    if(selected==='canoe'){
      if(action==='turn-left')game.turn(-dt*1.15);
      if(action==='turn-right')game.turn(dt*1.15);
      if(action==='secure')game.secure(dt);
    }
    if(side!==null){const edge=game.edges[side];
      game.adjustEdge(side,edge.height+(action==='lower'?-38:action==='raise'?38:0)*dt,
        edge.tension+(action==='tighten'?.6:action==='loosen'?-.6:0)*dt);
    }
  }
  function inputs(dt){
    if(drag){
      if(drag.side!==null){
        const d=drag,sign=d.side?1:-1;
        game.adjustEdge(d.side,d.edge.height-(d.point.y-d.start.y)/(.65*unit),d.edge.tension+sign*(d.point.x-d.start.x)/(90*unit));
      }else{const p=U(drag.point.x,drag.point.y);game.move(selected,p.x+drag.dx,p.y+drag.dy,10);}
    }
    if(hold)applyAction(hold,dt);
    const side=sideOf(selected);
    if(side!==null){
      if(keys.has('ArrowDown'))applyAction('lower',dt);
      if(keys.has('ArrowUp'))applyAction('raise',dt);
      if(keys.has('ArrowRight'))applyAction('tighten',dt);
      if(keys.has('ArrowLeft'))applyAction('loosen',dt);
    }else{
      const g=item(),dx=Number(keys.has('ArrowRight'))-Number(keys.has('ArrowLeft')),dy=Number(keys.has('ArrowDown'))-Number(keys.has('ArrowUp'));
      if(g&&(dx||dy)){game.held=g.id;game.move(g.id,g.x+dx*180*dt,g.y+dy*180*dt,dt);}
      else if(!drag)game.held=null;
      if(keys.has('q'))applyAction('turn-left',dt);
      if(keys.has('e'))applyAction('turn-right',dt);
      if(keys.has(' '))applyAction('secure',dt);
    }
  }
  window.addEventListener('keydown',e=>{
    if(e.key.toLowerCase()==='p'&&!e.repeat){togglePause();return;}
    const k=e.key.length===1?e.key.toLowerCase():e.key;
    if(!active()||e.target!==canvas)return;
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','q','e',' '].includes(k)){e.preventDefault();keys.add(k);}
  });
  window.addEventListener('keyup',e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));
  function togglePause(){
    if(!started||game.done)return;
    manualPause=!manualPause;cancelInput();$('pause-sheet').hidden=!manualPause;
    if(manualPause)$('resume').focus();else canvas.focus({preventScroll:true});
  }
  $('pause').addEventListener('click',togglePause);$('resume').addEventListener('click',togglePause);
  window.addEventListener('blur',cancelInput);
  document.addEventListener('visibilitychange',()=>{cancelInput();last=performance.now();});
  window.addEventListener('abundant-waters:pause',()=>{shellPause=true;cancelInput();});
  window.addEventListener('abundant-waters:resume',()=>{shellPause=false;last=performance.now();});
  $('begin').addEventListener('click',()=>{started=true;$('intro').hidden=true;canvas.focus({preventScroll:true});last=performance.now();});
  function restart(next){
    cancelInput();game=new Storm(next);started=true;manualPause=false;ending=0;reported=false;lastUi=-1;notices.clear();feedbackUntil=0;
    $('result').hidden=true;$('pause').disabled=false;select('canoe');last=performance.now();canvas.focus({preventScroll:true});
  }
  $('retry').addEventListener('click',()=>restart(game.scenario));
  $('new-wind').addEventListener('click',()=>restart((game.scenario+1)%SCENARIOS.length));
  function updateUi(force=false){
    if(!force&&game.time-lastUi<.2)return;lastUi=game.time;
    const w=game.weather,side=sideOf(selected),g=item();
    $('phase').textContent=w.phase==='approach'?'Wind on the water':w.phase==='rain'?'Rain through the pines':w.phase==='easing'?'The far shore returns':'Camp held together';
    $('wind-arrow').style.transform=`rotate(${w.angle}rad)`;
    $('wind-label').textContent=w.strength>.75?'Strong gusts':w.strength>.4?'Wind building':'Light breeze';
    $('weather-fill').style.width=game.time+'%';document.querySelector('.weather-track').setAttribute('aria-valuenow',String(Math.round(game.time)));
    $('canoe-tools').hidden=selected!=='canoe';$('edge-tools').hidden=side===null;$('gear-help').hidden=side!==null||selected==='canoe';
    $('selected').textContent=side!==null?(side?'Right tarp edge':'Left tarp edge'):g.name;
    if(side!==null){const e=game.edges[side];$('condition').textContent=`Height ${Math.round(e.height)} · Tension ${Math.round(e.tension*100)}%`;}
    else if(g.id==='canoe'){$('condition').textContent=`Line ${Math.round(g.tie*100)}% · ${g.strain>.7?'straining':g.moving>2?'sliding':'steady'}`;}
    else $('condition').textContent=`${g.wet<25?'Dry':g.wet<60?'Damp':'Soaked'} · ${Math.round((1-g.exposure)*100)}% covered`;
    if(game.time>feedbackUntil){
      const moving=game.items.find(g=>g.moving>3),wet=game.items.slice(1).find(g=>g.wet>15&&g.exposure>.4);
      if(game.events.some(e=>e.type==='dump')){say('A belly of water spilled. Lower an edge and pull the cloth taut so it can drain.');game.events=[];}
      else if(moving)notice('moving-'+moving.id,`${moving.name} is sliding in the gusts. Move it into the lee or secure the canoe.`);
      else if(wet)notice('wet-'+wet.id,`${wet.name} is getting wet. Rain blows under a high edge; the dripping edge is wet too.`);
      else if(game.time>54)notice('shift','The wind is turning. Look at the rain angle and check the far edge.');
      else if(game.time>32)notice('rain','Here comes the rain. You can still move things and adjust the tarp.');
    }
    $('cue').textContent=game.done?'The rain moves on. Water ticks from the cedar.':game.time<15?'A dark line crosses Smoke Lake.':game.time<32?'The pine tops start to lean.':game.time<52?'Rain rattles on the tarp.':game.time<76?'The wind swings around the point.':'Light returns to the far shore.';
    selectionDirty=false;
  }
  function finish(){
    if(reported)return;reported=true;
    const r=game.result(),previous=history.get(game.scenario);history.set(game.scenario,r);
    $('result-title').textContent=r.dryness>=80?'A dry corner of the woods.':r.dryness>=50?'A little damp. Still together.':'Well, that was a shower.';
    $('story').textContent=r.dryness>=80?'Dad settles beside the packs. “Remember that trip when the rain found my boots?” He turns one over, just to check.':r.dumps>0?'Dad tips water out of a mug. “The tarp filled that one for us.” You can already see how you would pitch it next time.':'Dad drapes the damp things out. “Next time, we’ll see that wind coming.” The lake is in no hurry.';
    $('results').replaceChildren();
    for(const [label,value] of [['Gear dryness',r.dryness+'%'],['Dry items',r.dryGear+' of 4'],['Canoe drift',(r.canoeDrift/32).toFixed(1)+' m'],['Tarp spills',String(r.dumps)]]){
      const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;$('results').append(dt,dd);
    }
    $('comparison').textContent=previous?`Same weather, last attempt: ${previous.dryness}% dry. This time: ${r.dryness}%. Canoe drift ${(previous.canoeDrift/32).toFixed(1)} → ${(r.canoeDrift/32).toFixed(1)} m.`:'Try the same weather again to compare your arrangement, or read a different wind.';
    $('result').hidden=false;$('pause').disabled=true;$('retry').focus();
    window.AbundantWaters.complete({dryness:r.dryness, canoeDrift:r.canoeDrift, tarpSpills:r.dumps});
  }
  // Drawing: the ground is laid out to fit the viewport; objects retain their proportions.
  function path(points,fill,stroke,width=1){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
  function ellipse(x,y,rx,ry,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}
  function text(txt,x,y,color='#eee8d8',size=12){ctx.fillStyle=color;ctx.font=`${size}px system-ui,sans-serif`;ctx.textAlign='center';ctx.fillText(txt,x,y);}
  function line(a,b,col,width=1){ctx.strokeStyle=col;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
  function drawGround(){
    const rain=game.weather.rain;
    ctx.fillStyle=rain>.5?'#5c7168':'#70856e';ctx.fillRect(0,0,width,height);
    // Birch-paper contour lines and exposed granite, restrained and geographically legible.
    for(let k=0;k<8;k++){
      ctx.beginPath();for(let x=0;x<=640;x+=12){const p=P(x,180+k*47+10*Math.sin(x/80+k));if(!x)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);}
      ctx.strokeStyle=k>4?'#a2a28a55':'#b4b99d38';ctx.lineWidth=1;ctx.stroke();
    }
    path([P(60,250),P(174,176),P(380,172),P(546,238),P(603,438),P(538,519),P(81,534),P(31,423)],rain>.5?'#898e7d':'#b5ad94','#d2c7a5',2);
    for(const [x,y,rx,ry] of [[120,458,80,18],[506,478,99,24],[70,373,40,24],[573,248,48,20]]){const p=P(x,y);ellipse(p.x,p.y,rx*sx,ry*sy,rain>.5?'#969c8e':'#c4bdab');}
    for(const [x,y] of [[93,461],[455,465],[537,223]]){const p=P(x,y);line(p,P(x+65,y+9),'#646f6055',1);}
    // Waterline climbs and retreats with the wave run-up; anything here gets splash exposure.
    const wave=game.weather.strength*(reduced?0:Math.sin(game.time*2)*7);
    const shore=[];for(let x=0;x<=640;x+=10)shore.push(P(x,538+Math.sin(x/73)*9-wave));
    path([...shore,{x:width,y:height},{x:0,y:height}],rain>.5?'#395e66':'#527984');
    ctx.beginPath();shore.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle='#c1ccba';ctx.lineWidth=2;ctx.stroke();
    for(let j=0;j<5;j++){const p=P(150+j*65,555+j*10);line(p,{x:p.x+60*sx,y:p.y},'#b5c7be66',1);}
    const low=P(520,523);text('wave-washed rock',low.x,low.y,'#43584f',Math.max(10,12*unit));
    const lake=P(340,572);text('S M O K E   L A K E',lake.x,lake.y,'#d4ded1',Math.max(10,13*unit));
    // Far pines sway in the same wind that moves equipment.
    for(const t of trees){const p=P(t.x,t.y),size=t.size*Math.max(.55,unit),sway=reduced?0:Math.sin(game.time*2+t.x)*game.weather.strength*4;
      line(p,{x:p.x+sway,y:p.y-size},'#4d4937',3*unit);
      for(let j=0;j<3;j++){const top=p.y-size+j*size*.2;path([{x:p.x+sway,y:top},{x:p.x-size*.3,y:top+size*.52},{x:p.x+size*.3,y:top+size*.52}],j%2?'#29463a':'#34513d');}
    }
    const front=clamp(game.time/32,0,1),cloudY=50+front*60;
    ctx.fillStyle=`rgba(43,60,60,${.05+game.weather.rain*.18})`;ctx.fillRect(0,0,width,height);
    // Moving cloud shadows precede the rain, rather than a binary scene swap.
    for(let i=0;i<5;i++){const p=P(i*160-40+front*100,cloudY);ellipse(p.x,p.y,130*sx,30*sy,`rgba(48,65,66,${.18+front*.1})`);}
    // A tent and quiet family silhouettes anchor the scene without adding tasks.
    const t=P(100,200);path([{x:t.x-32*unit,y:t.y+10*unit},{x:t.x,y:t.y-26*unit},{x:t.x+40*unit,y:t.y+10*unit}],'#b39769','#6e7257');
    line({x:t.x,y:t.y-26*unit},{x:t.x+6*unit,y:t.y+10*unit},'#e6d5ad');
  }
  function drawShelter(){
    // Roof is translucent so hands and equipment stay visible underneath it.
    const cloth=game.cloth;
    const roof=game.projectedRoof();
    const dry=[...roof.map(n=>P(n.x,n.back)),...roof.slice().reverse().map(n=>P(n.x,n.front))];
    path(dry,'#e6d6aa28');
    for(let i=0;i<cloth.length-1;i++){
      const a=cloth[i],b=cloth[i+1],pts=[P(a.x,CAMP.back,a.h),P(b.x,CAMP.back,b.h),P(b.x,CAMP.front,b.h),P(a.x,CAMP.front,a.h)];
      path(pts,i<8?'#bbac7290':'#8c976d9c','#d0c39355',.6);
      if(a.water>.15){const p=P(a.x,326,a.h);ellipse(p.x,p.y,Math.min(12,a.water*8)*unit,32*sy,'#41636e78');}
    }
    const front=cloth.map(n=>P(n.x,CAMP.front,n.h));
    for(let i=0;i<front.length-1;i++)line(front[i],front[i+1],'#e1d5a5',2);
    for(const side of [0,1]){
      const e=game.edges[side],p=edgeHandle(side),stake=P(game.edgeX(side)+(side?27:-27),CAMP.front+24);
      line(p,stake,e.tension<.35?'#a69067':'#e0d0a6',1.6);
      line(stake,{x:stake.x+3,y:stake.y-8},'#4b4b37',3);
      if(game.drain[side]>.01){for(let j=0;j<5;j++){const q=P(game.edgeX(side),CAMP.back+j*32);line({x:q.x,y:q.y-e.height*.42*unit},{x:q.x+game.weather.x*4,y:q.y},'#c8d9d076',1);}}
      ellipse(p.x,p.y,Math.max(13,16*unit),Math.max(13,16*unit),selected===(side?'right-edge':'left-edge')?'#f0d49c':'#e1d8b5');
      ctx.strokeStyle='#5b6850';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,7,0,Math.PI*2);ctx.stroke();
      text(side?'R':'L',p.x,p.y+4,'#354d3a',11);
    }
    for(const y of [CAMP.back-27,CAMP.front+30]){const base=P(CAMP.ridgeX,y),top=P(CAMP.ridgeX,y,115);line(base,top,'#66563f',3);}
    line(P(CAMP.ridgeX,CAMP.back-27,115),P(CAMP.ridgeX,CAMP.front+30,115),'#dbcb99',2);
    const label=P(CAMP.ridgeX,CAMP.back-20,115);text('TARP',label.x,label.y-6,'#eee4c7',Math.max(10,12*unit));
  }
  function drawItem(g){
    const p=P(g.x,g.y),u=Math.max(.65,unit),sel=selected===g.id;
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
    if(sel || (!started))text(g.name,p.x,p.y+Math.max(30,38*u),'#283f34',Math.max(11,12*unit));
    if(sel && g.id!=='canoe' && game.weather.rain>.05){const color=g.exposure>.3?'#caa16a':'#dee1b9';ctx.fillStyle='#354638';ctx.fillRect(p.x-22,p.y-37,44,4);ctx.fillStyle=color;ctx.fillRect(p.x-22,p.y-37,44*(1-g.exposure),4);}
  }
  function drawRain(){
    const w=game.weather;if(w.rain<=0)return;
    const count=Math.floor(w.rain*(reduced?35:140)),time=reduced?game.time*.25:game.time;
    ctx.strokeStyle='#d3dfd076';ctx.lineWidth=1;
    for(let i=0;i<count;i++){
      const x=((i*131+time*w.x*155)%660+660)%660-10,y=140+((i*73+time*300)%420);
      if(game.shelteredAt(x,y)&&y>CAMP.back)continue;
      const p=P(x,y);line({x:p.x-w.x*8*w.strength,y:p.y-13},{x:p.x,y:p.y},'#d7e4d477');
    }
    for(const splash of game.splashes){const p=P(splash.x,splash.y);ellipse(p.x,p.y,(1-splash.life)*45*unit,8*unit,`rgba(192,213,199,${splash.life*.5})`);}
  }
  function draw(){
    ctx.clearRect(0,0,width,height);drawGround();drawShelter();
    for(const g of game.items.slice().sort((a,b)=>a.y-b.y))drawItem(g);
    drawRain();
    if(!started)return;
    if(!game.done&&game.weather.strength>.4){const p=P(590,185);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(game.weather.angle);line({x:-18,y:0},{x:18,y:0},'#e3dec5',2);path([{x:18,y:0},{x:9,y:-5},{x:9,y:5}],'#e3dec5');ctx.restore();}
  }
  function frame(now){
    const dt=Math.min(.05,Math.max(0,(now-(last||now))/1000));last=now;
    if(active())game.advance(dt,inputs);
    if(game.done&&!shellPause&&!document.hidden){ending+=dt;if(ending>3.5)finish();}
    updateUi(selectionDirty);draw();requestAnimationFrame(frame);
  }
  resize();updateUi(true);requestAnimationFrame(frame);
})();
