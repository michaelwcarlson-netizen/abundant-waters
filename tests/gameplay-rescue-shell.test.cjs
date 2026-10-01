/* Selected-level trip integration. Full physical loops run in each level's browser test. */
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const base=process.env.GAME_URL||'http://127.0.0.1:8766';
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{})});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`HTTP ${r.status()} ${r.url()}`);});
  await page.goto(base);await page.locator('#next').click();
  assert.equal(await page.locator('#title').textContent(),'Paddle to the portage');await page.locator('.start-level').click();
  let frame=page.frames().find(f=>f.url().includes('/navigation/index.html'));assert.ok(frame);await frame.locator('#joystick').waitFor();
  await frame.evaluate(()=>window.AbundantWaters.complete());await page.locator('#level-continue').click();
  assert.equal(await page.locator('#title').textContent(),'Cross to Smoke');
  await page.locator('#next').click();
  assert.equal(await page.locator('#title').textContent(),'Fish the shoreline');await page.locator('.start-level').click();
  frame=page.frames().find(f=>f.url().includes('/fishing/index.html'));assert.ok(frame);await frame.locator('#water').waitFor();
  await frame.evaluate(()=>{window.parent.postMessage({type:'abundant-waters:fish-landed',fish:'Smallmouth bass'},location.origin);window.AbundantWaters.complete();});
  await page.locator('#level-continue').click();
  assert.equal(await page.locator('#title').textContent(),'Make dinner together');await page.locator('.start-level').click();
  frame=page.frames().find(f=>f.url().includes('/campfire/index.html'));assert.ok(frame);await frame.locator('#fish-meal').waitFor({state:'attached'});assert.equal(await frame.locator('#fish-meal').evaluate(el=>el.hidden),false);
  assert.ok(frame.url().includes('fish=Smallmouth+bass')||frame.url().includes('fish=Smallmouth%20bass'));
  await frame.evaluate(()=>window.AbundantWaters.complete());await page.locator('#level-continue').click();
  assert.equal(await page.locator('#title').textContent(),'Look up for a while');assert.deepEqual(errors,[]);
  console.log('PASS trip shell: Navigation, Fishing and Campfire launch, complete, advance, and pass the caught fish into supper without runtime or resource errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
