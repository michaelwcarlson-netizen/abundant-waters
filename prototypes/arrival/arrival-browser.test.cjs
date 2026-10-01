/* Browser integration checks. Observation hooks are injected in responses only.
 * Serve repo; requires Playwright and Chrome. No state teleports in the main loop. */
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const base=process.env.GAME_URL||'http://127.0.0.1:8766';
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{})}),errors=[];
 try{
 for(const [name,w,h]of [['desktop',1280,800],['iphone',390,844]]){
  if(process.env.VIEWPORT&&process.env.VIEWPORT!==name)continue;
  const context=await browser.newContext({viewport:{width:w,height:h},hasTouch:name==='iphone',isMobile:name==='iphone'}),page=await context.newPage();
  page.on('pageerror',e=>{errors.push(`${name}: ${e.message}`);console.error(`${name}: ${e.message}`);});page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`HTTP ${r.status()}: ${r.url()}`);});
  await page.clock.install({time:new Date('2026-09-28T15:00:00Z')});await page.clock.pauseAt(new Date('2026-09-28T15:00:01Z'));await page.route('**/arrival.js',async route=>{const response=await route.fetch(),body=(await response.text()).replace('resize();updateUi(true);requestAnimationFrame(frame);','window.__landing={get game(){return game},P};resize();updateUi(true);requestAnimationFrame(frame);');await route.fulfill({response,body});});
  await page.goto(`${base}/prototypes/arrival/index.html`);await page.clock.runFor(100);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const cdp=name==='iphone'?await context.newCDPSession(page):null;
  async function move(x,y,ms){
   if(cdp){const r=await page.locator('#joystick').boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2+x*38,y:r.y+r.height/2+y*38,id:1}]});await page.clock.runFor(ms);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
   else {const keys=[];if(x>.1)keys.push('d');if(x<-.1)keys.push('a');if(y>.1)keys.push('s');if(y<-.1)keys.push('w');for(const k of keys)await page.keyboard.down(k);await page.clock.runFor(ms);for(const k of keys)await page.keyboard.up(k);}
   await page.clock.runFor(80);
  }
  async function action(hold=0){if(cdp){if(!hold){const r=await page.locator('#interact').boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height/2,id:2}]});await page.clock.runFor(40);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}else{const r=await page.locator('#interact').boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height/2,id:2}]});await page.clock.runFor(hold);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}}else{await page.keyboard.down('e');if(hold)await page.clock.runFor(hold);await page.keyboard.up('e');}await page.clock.runFor(100);}
  async function walk(x,y){y=Math.min(y,await page.evaluate(x=>SmokeLanding.shore(x)+55,x));for(let i=0;i<80;i++){const p=await page.evaluate(()=>({x:__landing.game.player.x,y:__landing.game.player.y,carry:__landing.game.carry})),dx=x-p.x,dy=y-p.y,d=Math.hypot(dx,dy);if(d<8)return;const speed=p.carry==='canoe'?52:85;await move(dx/Math.max(d,30),dy/Math.max(d,30),Math.min(140,d/speed*650));}throw Error(`could not walk to ${x},${y}: ${await page.evaluate(()=>JSON.stringify({p:__landing.game.player,c:__landing.game.carry,near:__landing.game.near}))}`);}
  // Steer against wind, coast, then actually approach and back-paddle at the rock.
  await move(-1,0,200);await move(1,0,200);
  await move(0,-1,2200);await move(0,1,650);
  for(let i=0;i<20;i++){if(await page.evaluate(()=>__landing.game.canExit()))break;await move(0,-1,280);await move(0,1,380);}
  assert.ok(await page.evaluate(()=>__landing.game.canExit()));await page.clock.runFor(40);await page.screenshot({path:`/private/tmp/arrival-${name}-before-step.png`});await action();assert.equal(await page.evaluate(()=>__landing.game.mode),'walk');
  await page.screenshot({path:`/private/tmp/arrival-${name}-landed.png`});
  // Unload individually, drop one at the wet edge, then rescue it after a wave.
  let wetId;
  for(let n=0;n<3;n++){
   const cargo=await page.evaluate(()=>__landing.game.items.filter(g=>g.inBoat).map(g=>({x:g.x,y:g.y,id:g.id})));if(!cargo.length)break;
   await walk(cargo[0].x,cargo[0].y);await action();const id=await page.evaluate(()=>__landing.game.carry);assert.ok(id&&id!=='canoe');
   const x=await page.evaluate(()=>__landing.game.player.x);
   if(n===0){wetId=id;const y=await page.evaluate(x=>SmokeLanding.shore(x)+8,x);await walk(x,y);await action();await page.clock.runFor(3200);const wet=await page.evaluate(id=>__landing.game.items.find(g=>g.id===id),id);assert.ok(wet.wet>5);await walk(wet.x,wet.y);await action();assert.equal(await page.evaluate(()=>__landing.game.carry),id);}
   await walk(420+n*45,285);await action();assert.equal(await page.evaluate(()=>__landing.game.carry),null);
  }
  assert.ok(await page.evaluate(()=>__landing.game.items.every(g=>!g.inBoat)));
  // Grab the actual bow, drag up the bank, and tie with one sustained hold.
  const b=await page.evaluate(()=>__landing.game.bow());await walk(b.x,b.y-10);await action();assert.equal(await page.evaluate(()=>__landing.game.carry),'canoe');
  const before=await page.evaluate(()=>__landing.game.canoe.y);await move(0,-1,2500);assert.ok(await page.evaluate(y=>__landing.game.canoe.y<y-10,before));await action(1600);assert.equal(await page.evaluate(()=>__landing.game.canoe.tie),1);
  // Manual pause and shared-shell pause both freeze the whole simulation.
  await page.locator('#pause').click();await page.clock.runFor(32);const paused=await page.evaluate(()=>JSON.stringify(__landing.game));await page.clock.runFor(2000);assert.equal(await page.evaluate(()=>JSON.stringify(__landing.game)),paused);await page.locator('#resume').click();
  await page.evaluate(()=>window.dispatchEvent(new Event('abundant-waters:pause')));await page.clock.runFor(32);const shell=await page.evaluate(()=>JSON.stringify(__landing.game));await page.clock.runFor(1000);assert.equal(await page.evaluate(()=>JSON.stringify(__landing.game)),shell);await page.evaluate(()=>window.dispatchEvent(new Event('abundant-waters:resume')));
  await page.clock.runFor(7000);assert.equal(await page.evaluate(()=>__landing.game.complete),true);assert.ok(await page.locator('#ending').isVisible());await page.screenshot({path:`/private/tmp/arrival-${name}-ending.png`});
  await page.locator('#linger').click();await move(1,0,300);assert.equal(await page.evaluate(()=>__landing.game.complete),false);
  // Resize preserves gear and controls; no horizontal scroll or hidden touch targets.
  for(const [rw,rh]of [[320,568],[667,375]]){await page.setViewportSize({width:rw,height:rh});await page.clock.runFor(120);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);const r=await page.locator('#interact').boundingBox();assert.ok(r.width>=44&&r.height>=44&&r.y+r.height<=rh);}
  await page.setViewportSize({width:w,height:h});await page.clock.runFor(100);
  // Replay remains available from pause after choosing to linger.
  await page.locator('#pause').click();await page.locator('#restart').click();assert.equal(await page.evaluate(()=>__landing.game.mode),'paddle');assert.ok(await page.evaluate(()=>__landing.game.items.every(g=>g.inBoat&&g.wet===0)));console.log(`PASS ${name}: approach, landing, unloading, wet-gear recovery, towing, tie, pauses, ending, linger, replay, resize`);
  await context.close();
 }
 // Shared player integration uses a terminal-condition fixture only here; the
 // desktop/phone loops above reached the ending through real controls.
 const context=await browser.newContext({viewport:{width:1280,height:800}}),page=await context.newPage();
 page.on('pageerror',e=>errors.push(`trip: ${e.message}`));page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`HTTP ${r.status()}: ${r.url()}`);});
 await page.clock.install({time:new Date('2026-09-28T15:00:00Z')});await page.clock.pauseAt(new Date('2026-09-28T15:00:01Z'));
 await page.route('**/arrival.js',async route=>{const response=await route.fetch(),body=(await response.text()).replace('resize();updateUi(true);requestAnimationFrame(frame);','window.__landing={get game(){return game},P};resize();updateUi(true);requestAnimationFrame(frame);');await route.fulfill({response,body});});
 await page.goto(base);await page.locator('#next').click();
 // Seven trip stops, then Arrival as a side trip (it moved out of the main trip).
 for(let step=1;step<=7;step++){
  await page.locator('.start-level').click();const iframe=page.frameLocator('#level-stage iframe');await iframe.locator('canvas, svg').first().waitFor({state:'visible'});await page.clock.runFor(100);
  if(step===2){await iframe.locator('[data-id="canoe"]').click();await iframe.locator('#go').click();}
  await page.locator('#level-exit').click();await page.locator('#next').click();
 }
 assert.equal(await page.locator('#title').textContent(),'The storm has passed');
 {
  await page.locator('[data-side="tarp"]').click();await page.frameLocator('#level-stage iframe').locator('#readyBtn').waitFor();await page.locator('#level-exit').click();
  await page.locator('[data-side="arrival"]').click();await page.frameLocator('#level-stage iframe').locator('canvas').first().waitFor({state:'visible'});await page.clock.runFor(100);
  const frame=page.frames().find(f=>f.url().includes('/arrival/index.html'));
  await frame.locator('#lake').focus();await page.keyboard.down('w');await page.clock.runFor(600);await page.keyboard.up('w');
  await page.locator('#level-exit').click();await page.clock.runFor(100);const state=await frame.evaluate(()=>JSON.stringify(__landing.game));await page.clock.runFor(1500);assert.equal(await frame.evaluate(()=>JSON.stringify(__landing.game)),state);
  await page.locator('[data-side="arrival"]').click();await page.clock.runFor(200);assert.notEqual(await frame.evaluate(()=>JSON.stringify(__landing.game)),state,'side trip resumes the same game');
  const resumed=frame;
  await resumed.evaluate(()=>{const g=__landing.game;g.mode='walk';g.canoe.y=250;g.canoe.vx=g.canoe.vy=0;g.player.x=450;g.player.y=245;for(const [i,item]of g.items.entries())Object.assign(item,{inBoat:false,x:380+i*70,y:270});});
  await page.clock.runFor(6000);assert.equal(await resumed.evaluate(()=>__landing.game.complete),true);
  assert.equal(await page.locator('#level-continue').isVisible(),false);await page.locator('#level-exit').click();
  assert.equal(await page.locator('#title').textContent(),'The storm has passed');
 }
 await context.close();console.log('PASS all 7 trip stops load; Portage / Tarp controls present; Arrival side trip pauses on exit, completes, and leaves the trip where it was');
 assert.deepEqual(errors,[]);console.log('PASS no console exceptions or missing local resources');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
