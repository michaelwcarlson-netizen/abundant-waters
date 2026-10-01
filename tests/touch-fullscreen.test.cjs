/* Serve repo and run with Playwright. Native exit is forced separately because
 * Chrome emulation cannot reproduce iOS Safari's browser-owned pinch gesture.
 * BASELINE=1 demonstrates the original fullscreen-exit regression.
 */
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const base=process.env.GAME_URL||'http://127.0.0.1:8766';
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{})});const errors=[];
 try{
 for(const [name,width,height]of [['iphone',390,844],['ipad',820,1180]]){
  for(const level of ['jstroke','bowstern']){
   const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true}),page=await context.newPage();
   page.on('pageerror',e=>errors.push(e.message));
   if(process.env.BASELINE)await page.route('**/immersive-player.js',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('if (!touchDevice) close();','close();')});});
   await page.route(`**/prototypes/${level==='jstroke'?'j-stroke':'bow-stern'}/index.html`,async route=>{const response=await route.fetch();const hook=level==='jstroke'?'window.__touchGame={snapshot:()=>({contacts:ptr===null?0:1,paused,x:c.x,y:c.y})};':'window.__touchGame={snapshot:()=>({contacts:pointers.size,paused,x:c.x,y:c.y})};';await route.fulfill({response,body:(await response.text()).replace('\n})();\n</script>',`\n${hook}\n})();\n</script>`)});});
   await page.goto(base);await page.locator(`[data-side="${level}"]`).click(); // J-Stroke and Bow & Stern are side trips
   await page.frameLocator('#level-stage iframe').locator('#c').waitFor({state:'visible'});
   const frame=page.frames().find(f=>f.url().includes(`/prototypes/${level==='jstroke'?'j-stroke':'bow-stern'}/`));await frame.waitForFunction(()=>!!window.__touchGame);
   if(level==='bowstern')await frame.locator('#coopBtn').click();
   await page.waitForFunction(()=>document.fullscreenElement?.id==='level-player');
   const identity=await page.locator('#level-stage iframe').getAttribute('src'),cdp=await context.newCDPSession(page),r=await frame.locator('#c').boundingBox();
   const contact=(id,x,y)=>({id,x:r.x+r.width*x,y:r.y+r.height*y});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[contact(1,.28,.48)]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[contact(1,.28,.63)]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[contact(1,.28,.63),contact(2,.72,.48)]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[contact(1,.25,.72),contact(2,.75,.64)]});
   assert.equal((await frame.evaluate(()=>__touchGame.snapshot())).contacts,level==='jstroke'?1:2);
   assert.equal(await page.locator('#level-player').isVisible(),true);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   assert.equal((await frame.evaluate(()=>__touchGame.snapshot())).contacts,0);
   // Safari-style game gestures are cancelled, ordinary help UI gestures aren't.
   assert.equal(await frame.locator('#c').evaluate(el=>el.dispatchEvent(new Event('gesturestart',{bubbles:true,cancelable:true}))),false);
   assert.equal(await frame.locator('#c').evaluate(el=>el.dispatchEvent(new Event('gesturechange',{bubbles:true,cancelable:true}))),false);
   assert.equal(await frame.locator('body').evaluate(el=>el.dispatchEvent(new Event('gesturestart',{bubbles:true,cancelable:true}))),true);
   // Force the browser-owned native exit and assert that the viewport game stays live.
   await page.evaluate(()=>document.exitFullscreen());await page.waitForFunction(()=>!document.fullscreenElement);await page.waitForTimeout(150);
   assert.equal(await page.locator('#level-player').isVisible(),true,'native fullscreen exit must not return a touch player to the guide');
   assert.equal(await page.locator('#level-stage iframe').getAttribute('src'),identity);
   assert.equal((await frame.evaluate(()=>__touchGame.snapshot())).paused,false);
   assert.equal(await page.evaluate(()=>document.body.classList.contains('player-open')),true);
   // Player can still paddle after fallback and then deliberately exit and resume.
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[contact(3,.28,.48)]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[contact(3,.28,.68)]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await page.locator('#level-exit').click();await page.waitForFunction(()=>document.getElementById('level-player').hidden);await frame.waitForFunction(()=>__touchGame.snapshot().paused);
   await page.locator(`[data-side="${level}"]`).click();await frame.waitForFunction(()=>!__touchGame.snapshot().paused);assert.equal(await page.locator('#level-stage iframe').getAttribute('src'),identity);
   await frame.locator('#c').focus();await page.keyboard.press('Escape');await page.waitForFunction(()=>document.getElementById('level-player').hidden);
   console.log(`PASS ${name} ${level}: two contacts, native-exit fallback, live input, explicit Exit/resume/Escape`);await context.close();
  }
 }
 // Preserve the original desktop native-fullscreen exit behavior.
 const context=await browser.newContext({viewport:{width:1280,height:800},hasTouch:false}),page=await context.newPage();await page.goto(base);await page.locator('#next').click();await page.locator('.start-level').click();await page.waitForFunction(()=>!!document.fullscreenElement);await page.waitForTimeout(150);await page.evaluate(()=>document.exitFullscreen());await page.waitForFunction(()=>document.getElementById('level-player').hidden);await context.close();
 assert.deepEqual(errors,[]);console.log('PASS desktop native exit remains supported; no runtime errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
