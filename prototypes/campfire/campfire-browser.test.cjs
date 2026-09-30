/* Drag through the complete campfire loop at desktop and phone size. */
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const base=process.env.GAME_URL||'http://127.0.0.1:8766';
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{})}),errors=[];
 try{
 for(const [name,width,height]of [['desktop',1280,800],['iphone',390,844]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:name==='iphone',isMobile:name==='iphone'}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(`${name}: ${e.message}`));page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${name}: HTTP ${r.status()} ${r.url()}`);});
  await page.clock.install({time:new Date('2026-09-29T21:00:00Z')});await page.clock.pauseAt(new Date('2026-09-29T21:00:01Z'));
  await page.route('**/prototypes/campfire/index.html?*',async route=>{const response=await route.fetch(),body=(await response.text()).replace('\n})();\n</script>','\nwindow.__fire={state:()=>({heat,steady,cook,meal,stage,positions,finished})};\n})();\n</script>');await route.fulfill({response,body});});
  await page.goto(`${base}/prototypes/campfire/index.html?${name==='desktop'?'fish=Smallmouth+bass':'no-fish=1'}`);await page.clock.runFor(100);
  const cdp=name==='iphone'?await context.newCDPSession(page):null,state=()=>page.evaluate(()=>__fire.state());
  async function point(x,y){return page.evaluate(([x,y])=>{const p=document.querySelector('.scene svg').createSVGPoint();p.x=x;p.y=y;const q=p.matrixTransform(document.querySelector('.scene svg').getScreenCTM());return {x:q.x,y:q.y};},[x,y]);}
  async function move(id,from,to){const a=await point(...from),b=await point(...to);if(cdp){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:a.x,y:a.y,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:b.x,y:b.y,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}else{await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:8});await page.mouse.up();}await page.clock.runFor(100);const s=await state();assert.ok(Math.hypot(s.positions[id].x-to[0],s.positions[id].y-to[1])<4,`${name} ${id} did not move: ${JSON.stringify(s.positions[id])}`);}
  await page.screenshot({path:`/private/tmp/campfire-rescue-${name}-start.png`});
  await move('wet',[620,335],[455,245]);await page.clock.runFor(1500);assert.ok((await state()).heat<.15,'wet wood should suppress the coal');await move('wet',[455,245],[620,335]);
  await move('tinder',[250,335],[435,245]);await page.clock.runFor(2000);assert.ok((await state()).heat>.2,'tinder should wake the coal');
  await move('dry',[340,335],[475,252]);await page.clock.runFor(2500);assert.ok((await state()).heat>.45,'dry twigs should grow flame');await page.evaluate(()=>window.dispatchEvent(new Event('abundant-waters:pause')));const frozen=(await state()).heat;await page.clock.runFor(1500);assert.equal((await state()).heat,frozen,'paused fire must not change');await page.evaluate(()=>window.dispatchEvent(new Event('abundant-waters:resume')));
  await move('logs',[530,335],[515,264]);await page.clock.runFor(6000);assert.equal((await state()).stage,'meal','a tended fire should reach supper');
  await page.screenshot({path:`/private/tmp/campfire-rescue-${name}-fire.png`});
  if(name==='desktop'){await page.locator('#fish-meal').click();}else{assert.equal(await page.locator('#fish-meal').isVisible(),false);await page.locator('#pack-meal').click();}await page.clock.runFor(5500);assert.ok((await state()).cook>.95,'food should cook over a steady fire');assert.equal(await page.locator('#serve').isEnabled(),true);
  await page.locator('#serve').click();assert.equal((await state()).stage,'end');await move('kettle',[650,335],[455,240]);assert.equal((await state()).finished,true);assert.equal(await page.locator('#done').isVisible(),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await context.close();console.log(`PASS ${name}: damp fuel consequence and recovery, movable fire lay, heat, meal, kettle fire-out, completion`);
 }
 assert.deepEqual(errors,[]);console.log('PASS no browser exceptions or missing local resources');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
