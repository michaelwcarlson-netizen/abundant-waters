/* Browser route check: observation hooks are injected into the response, never shipped. */
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const base=process.env.GAME_URL||'http://127.0.0.1:8766';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{})}),errors=[];
 try{
 for(const [name,width,height,side]of [['desktop',1280,800,'north'],['iphone',390,844,'south']]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:name==='iphone',isMobile:name==='iphone'}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(`${name}: ${e.message}`));page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${name}: HTTP ${r.status()} ${r.url()}`);});
  await page.clock.install({time:new Date('2026-09-29T21:00:00Z')});await page.clock.pauseAt(new Date('2026-09-29T21:00:01Z'));
  await page.route('**/prototypes/navigation/index.html',async route=>{const response=await route.fetch(),body=(await response.text()).replace('\n})();\n</script>','\nwindow.__nav={state:()=>({boat:{...boat},speed:route.speed(),bumps:route.bumps,landingReady:route.landingReady(),time:route.time,paused:route.paused,finished:route.finished})};\n})();\n</script>');await route.fulfill({response,body});});
  await page.goto(`${base}/prototypes/navigation/index.html`);await page.clock.runFor(100);const state=()=>page.evaluate(()=>__nav.state());
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.locator('#map-toggle').click();assert.equal(await page.locator('#map-sheet').isVisible(),true);const before=(await state()).boat.x;await page.clock.runFor(1000);assert.equal((await state()).boat.x,before,'map must pause route');await page.locator('#close-map').click();await page.screenshot({path:`/private/tmp/navigation-rescue-${name}-start.png`});
  let pressed=new Set(),touchId=5,cdp=name==='iphone'?await context.newCDPSession(page):null,stickBox=name==='iphone'?await page.locator('#joystick').boundingBox():null;
  if(cdp){assert.ok(stickBox&&stickBox.width>=88,'touch pad too small');await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:stickBox.x+stickBox.width/2,y:stickBox.y+stickBox.height/2,id:touchId}]});}
  async function setControls(turn,throttle){
   if(cdp){const len=Math.hypot(turn,throttle),sx=turn/Math.max(1,len),sy=-throttle/Math.max(1,len);await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:stickBox.x+stickBox.width/2+38*sx,y:stickBox.y+stickBox.height/2+38*sy,id:touchId}]});}
   else{const want=new Set([turn>.18?'ArrowRight':turn<-.18?'ArrowLeft':'',throttle>.15?'ArrowUp':throttle<-.15?'ArrowDown':''].filter(Boolean));for(const key of pressed)if(!want.has(key))await page.keyboard.up(key);for(const key of want)if(!pressed.has(key))await page.keyboard.down(key);pressed=want;}
  }
  const points=side==='north'?[[560,235],[805,195],[1250,280],[1650,325],[1830,255],[1875,231]]:[[550,310],[805,321],[1250,319],[1650,335],[1830,255],[1875,231]];
  let idx=0,landed=false;
  for(let i=0;i<260;i++){
   const s=await state(),b=s.boat;if(s.landingReady){landed=true;break;}
   if(Math.hypot(b.x-points[idx][0],b.y-points[idx][1])<60&&idx<points.length-1)idx++;
   const [tx,ty]=points[idx],goal=Math.atan2(ty-b.y,tx-b.x),d=Math.atan2(Math.sin(goal-b.angle),Math.cos(goal-b.angle)),dist=Math.hypot(tx-b.x,ty-b.y);
   const turn=clamp(2.2*d-1.2*b.om,-1,1),throttle=idx===points.length-1?(s.speed>28?-1:dist>50?.45:0):idx>=points.length-2&&s.speed>70?-1:1;
   await setControls(turn,throttle);await page.clock.runFor(100);
  }
  const final=await state();assert.ok(landed||final.landingReady,`route did not reach shore on ${name}: ${JSON.stringify(final)} idx ${idx}`);
  assert.ok(final.boat.x>1790&&final.boat.x<1985&&final.speed<34,'landing must be slow and spatial');
  await page.screenshot({path:`/private/tmp/navigation-rescue-${name}.png`});
  if(cdp)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else for(const key of pressed)await page.keyboard.up(key);
  assert.equal(await page.locator('#land').isVisible(),true);await page.locator('#land').click();assert.equal(await page.locator('#end').isVisible(),true);
  await context.close();console.log(`PASS ${name}: map pause, ${side} channel steering, wind and momentum, slow physical landing, completion`);
 }
 assert.deepEqual(errors,[]);console.log('PASS no browser exceptions or missing local resources');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
