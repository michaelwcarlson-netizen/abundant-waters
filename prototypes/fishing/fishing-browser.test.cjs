/* Browser gameplay check. Hooks are added to HTTP responses, not shipped. */
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const base=process.env.GAME_URL||'http://127.0.0.1:8766';
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{})}),errors=[];
 try{
 for(const [name,width,height]of [['desktop',1280,800],['iphone',390,844]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:name==='iphone',isMobile:name==='iphone'}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(`${name}: ${e.message}`));page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${name}: HTTP ${r.status()} ${r.url()}`);});
  await page.clock.install({time:new Date('2026-09-29T21:00:00Z')});await page.clock.pauseAt(new Date('2026-09-29T21:00:01Z'));
  await page.route('**/prototypes/fishing/index.html',async route=>{const response=await route.fetch(),body=(await response.text()).replace('\n})();\n</script>','\nwindow.__fish={state:()=>({phase,clock,lure,landing,targetFish,biteAge,tension,progress,retrieve,snagged,catches,pressing,bass:fishAt("bass")})};\n})();\n</script>');await route.fulfill({response,body});});
  await page.goto(`${base}/prototypes/fishing/index.html`);await page.clock.runFor(100);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const cdp=name==='iphone'?await context.newCDPSession(page):null;
  async function cast(x,y){const r=await page.locator('#water').boundingBox(),px=r.x+r.width*x,py=r.y+r.height*y;if(cdp){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:px,y:py,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}else await page.mouse.click(px,py);await page.clock.runFor(650);}
  async function hold(id,ms){const r=await page.locator('#'+id).boundingBox();assert.ok(r&&r.width>44&&r.height>=48,`${id} not reachable on ${name}`);if(cdp){const x=r.x+r.width/2,y=r.y+r.height/2;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:2}]});await page.clock.runFor(ms);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}else{await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.clock.runFor(ms);await page.mouse.up();}await page.clock.runFor(60);}
  const state=()=>page.evaluate(()=>__fish.state());await page.screenshot({path:`/private/tmp/fishing-rescue-${name}-start.png`});await page.evaluate(()=>window.dispatchEvent(new Event('abundant-waters:pause')));const still=(await state()).clock;await page.clock.runFor(1200);assert.equal((await state()).clock,still,'paused fishing clock must stop');await page.evaluate(()=>window.dispatchEvent(new Event('abundant-waters:resume')));
  await cast(.38,.39);assert.equal((await state()).phase,'snag');await hold('give',150);assert.equal((await state()).phase,'retrieve');
  await hold('reel',6500);assert.equal((await state()).phase,'aim');
  await cast(.54,.49);assert.equal((await state()).phase,'retrieve');
  for(let i=0;i<10&&(await state()).phase==='retrieve';i++)await hold('reel',180);
  assert.equal((await state()).phase,'bite','fish should visibly tug near the moving lure');
  await page.clock.runFor(1600);assert.equal((await state()).phase,'lost','a missed hook window should lose the fish');await page.clock.runFor(2000);assert.equal((await state()).phase,'aim');
  const fishNow=(await state()).bass;await cast(fishNow.x+.065,fishNow.y-.015);for(let i=0;i<10&&(await state()).phase==='retrieve';i++)await hold('reel',180);
  assert.equal((await state()).phase,'bite',JSON.stringify(await state()));await page.clock.runFor(360);await hold('reel',45);assert.equal((await state()).phase,'fight');
  for(let i=0;i<85&&(await state()).phase==='fight';i++){
   const s=await state();await hold(s.tension>.64?'give':'reel',180);
  }
  assert.equal((await state()).phase,'caught','controlled tension should bring a fish alongside');assert.equal((await state()).catches,1);
  await page.screenshot({path:`/private/tmp/fishing-rescue-${name}.png`});
  await page.locator('#again').click();assert.equal((await state()).phase,'aim');
  await context.close();console.log(`PASS ${name}: cast, cover snag and recovery, moving-fish bite, missed bite, timed hook, tension fight, catch, replay`);
 }
 assert.deepEqual(errors,[]);console.log('PASS no browser exceptions or missing local resources');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
