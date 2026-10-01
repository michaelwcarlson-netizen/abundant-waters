/* Local browser check: serve repo, then GAME_URL=http://127.0.0.1:8766 node prototypes/storm/storm-browser.test.cjs
 * Requires Playwright; BROWSER_PATH can point to an installed Chrome executable.
 * Hooks are injected into HTTP responses for observation, never shipped in gameplay.
 */
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const base=process.env.GAME_URL||'http://127.0.0.1:8766';
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{})});
 const errors=[],failures=[];
 try{
 for(const [name,w,h]of [['desktop',1280,800],['iphone',390,844]]){
  const context=await browser.newContext({viewport:{width:w,height:h},hasTouch:name==='iphone',isMobile:name==='iphone'});
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(`${name}: ${e.message}`));
  page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400&&!r.url().endsWith('favicon.ico'))failures.push(r.url());});
  await page.clock.install();
  await page.route('**/storm.js',async route=>{
   const response=await route.fetch();const body=(await response.text()).replace('  resize();updateUi(true);requestAnimationFrame(frame);',
    '  window.__scene={get camp(){return camp},get game(){return game},P}; resize();updateUi(true);requestAnimationFrame(frame);');
   await route.fulfill({response,body});
  });
  await page.goto(`${base}/prototypes/storm/index.html`);await page.locator('#begin').click();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const cdp=name==='iphone'?await context.newCDPSession(page):null;
  let touching=false;
  async function move(x,y,ms){
   if(cdp){
    const box=await page.locator('#joystick').boundingBox();const tx=box.x+box.width/2+38*x,ty=box.y+box.height/2+38*y;
    await cdp.send('Input.dispatchTouchEvent',{type:touching?'touchMove':'touchStart',touchPoints:[{x:tx,y:ty,id:1}]});touching=true;
    await page.clock.runFor(ms);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});touching=false;
   }else{
    const keys=[];if(x>.2)keys.push('d');if(x<-.2)keys.push('a');if(y>.2)keys.push('s');if(y<-.2)keys.push('w');
    for(const k of keys)await page.keyboard.down(k);await page.clock.runFor(ms);for(const k of keys)await page.keyboard.up(k);
   }
   await page.clock.runFor(80);
  }
  async function walk(x,y){
   for(let i=0;i<35;i++){
    const p=await page.evaluate(()=>({x:__scene.camp.player.x,y:__scene.camp.player.y}));const dx=x-p.x,dy=y-p.y,d=Math.hypot(dx,dy);
    if(d<16)return;
    await move(dx/Math.max(30,d),dy/Math.max(30,d),Math.min(180,d/110*1000));
   }
   throw Error(`Walking could not reach ${x}, ${y}`);
  }
  async function action(){
   if(cdp)await page.locator('#interact').tap();
   else await page.keyboard.press('e');
   await page.clock.runFor(80);
  }
  // Small slice first: no state teleporting and no objective gate.
  await walk(135,316);await action();
  assert.equal(await page.evaluate(()=>__scene.camp.carry),'jacket');
  await walk(340,315);await action();
  assert.equal(await page.evaluate(()=>__scene.camp.carry),null);
  assert.ok(await page.evaluate(()=>__scene.game.coverage(__scene.game.items[2])>=.6));
  console.log(`PASS ${name}: walk → pick up jacket → carry → put under shelter`);
  // Move to and physically adjust both lines with the same movement input.
  for(const side of [0,1]){
   const x=await page.evaluate(side=>__scene.game.edgeX(side)+(side?27:-27),side);
   await walk(x,419);await action();assert.equal(await page.evaluate(()=>__scene.camp.edge),side);
   await move(side?1:-1,1,1900);await action();
   assert.equal(await page.evaluate(()=>__scene.camp.edge),null);
   assert.ok(await page.evaluate(side=>__scene.game.edges[side].height<45,side));
  }
  // Rescue a bulky pack; the same action works at any reachable set-down location.
  const pack=await page.evaluate(()=>({x:__scene.game.items[1].x,y:__scene.game.items[1].y}));
  await walk(pack.x,pack.y);await action();assert.equal(await page.evaluate(()=>__scene.camp.carry),'pack');
  await walk(380,320);await action();
  // The canoe uses a sustained hold, not repeated activations.
  const hull=await page.evaluate(()=>({x:__scene.game.items[0].x,y:__scene.game.items[0].y}));
  await walk(hull.x,hull.y-25);await action();assert.equal(await page.evaluate(()=>__scene.camp.carry),'canoe');
  await move(.5,-1,900);
  if(cdp){
   const box=await page.locator('#interact').boundingBox();
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2,id:2}]});
   await page.clock.runFor(2600);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }else{await page.keyboard.down('e');await page.clock.runFor(2600);await page.keyboard.up('e');}
  await page.clock.runFor(80);assert.equal(await page.evaluate(()=>__scene.camp.carry),null);
  assert.ok(await page.evaluate(()=>__scene.game.items[0].tie>.98));
  // Manual pause retains the entire scene.
  await page.locator('#pause').click();await page.clock.runFor(32);const paused=await page.evaluate(()=>JSON.stringify(__scene.camp));
  await page.clock.runFor(2000);assert.equal(await page.evaluate(()=>JSON.stringify(__scene.camp)),paused);
  await page.locator('#resume').click();
  await page.clock.runFor(1200);assert.ok(await page.evaluate(()=>__scene.game.time>0));
  const now=await page.evaluate(()=>__scene.game.time);
  await page.clock.runFor(Math.max(0,(58-now)*1000));
  assert.ok(await page.evaluate(()=>__scene.game.weather.rain>.8));
  await page.screenshot({path:`/private/tmp/storm-${name}-rain.png`});
  await page.clock.runFor(56500);
  assert.equal(await page.evaluate(()=>__scene.camp.complete),true,'Full weather cycle completes');
  await page.locator('#replay').waitFor({state:'visible',timeout:3000});
  assert.equal(await page.evaluate(()=>__scene.camp.story&&__scene.camp.dad.arrived&&__scene.camp.complete),true);
  await page.screenshot({path:`/private/tmp/storm-${name}-ending.png`});
  await page.locator('#retry').click();assert.equal(await page.evaluate(()=>__scene.game.time<1),true);
  assert.equal(await page.locator('#replay').isVisible(),false);
  console.log(`PASS ${name}: guylines, bulky gear, pause, entire weather cycle, Dad's story and replay`);
  await context.close();
 }
 // Immersive navigation uses the unmodified real shell and original benchmark levels.
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/storm.js',async route=>{
  const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('  resize();updateUi(true);requestAnimationFrame(frame);',
   '  window.__scene={get game(){return game}}; resize();updateUi(true);requestAnimationFrame(frame);')});
 });
 await page.goto(base);await page.locator('#next').click();
 // Seven trip stops; Storm Day is the last one.
 for(let step=1;step<=7;step++){
  await page.locator('.start-level').click();
  const iframe=page.frameLocator('#level-stage iframe');await iframe.locator('canvas, svg').first().waitFor({state:'visible'});
  if(step===2){await iframe.locator('[data-id="canoe"]').click();await iframe.locator('#go').click();}
  if(step===7){
   await iframe.locator('#begin').click();await page.waitForTimeout(200);
   const frame=page.frames().find(f=>f.url().includes('/storm/index.html'));
   const before=await frame.evaluate(()=>__scene.game.time);
   await page.locator('#level-exit').click();await page.waitForTimeout(100);
   const paused=await frame.evaluate(()=>__scene.game.time);await page.waitForTimeout(250);
   assert.equal(await frame.evaluate(()=>__scene.game.time),paused);
   await page.locator('.start-level').click();await page.waitForTimeout(200);
   assert.ok(await frame.evaluate(()=>__scene.game.time)>before);
   await frame.evaluate(()=>window.AbundantWaters.complete({dryness:80}));
   await page.locator('#level-continue').waitFor({state:'visible'});
   await page.locator('#level-continue').click();
   assert.equal(await page.locator('#title').textContent(),'The storm has passed');
  } else {
   await page.locator('#level-exit').click();await page.locator('#next').click();
  }
 }
 await page.locator('[data-side="tarp"]').click();await page.frameLocator('#level-stage iframe').locator('#readyBtn').waitFor();await page.locator('#level-exit').click();
 console.log('PASS: all seven trip stops load; Portage and Tarp & Rain controls remain; Storm immersive exit/resume/progress');
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
 console.log('PASS: no runtime errors or missing local Storm Day resources');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
