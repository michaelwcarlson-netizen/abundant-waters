/* Additional compact-screen and simultaneous-thumb smoke check; same prerequisites as storm-browser.test.cjs. */
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const base=process.env.GAME_URL||'http://127.0.0.1:8766';
(async()=>{
 const b=await chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{})});
 try{
 const c=await b.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),p=await c.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(e.message));await p.clock.install();
 await p.route('**/storm.js',async r=>{const a=await r.fetch();await r.fulfill({response:a,body:(await a.text()).replace('  resize();updateUi(true);requestAnimationFrame(frame);',
 '  window.__scene={get camp(){return camp},get game(){return game},P}; resize();updateUi(true);requestAnimationFrame(frame);')});});
 await p.goto(`${base}/prototypes/storm/index.html`);await p.locator('#begin').tap();
 const d=await c.newCDPSession(p),pad=await p.locator('#joystick').boundingBox(),button=await p.locator('#interact').boundingBox();
 const left={x:pad.x+pad.width/2-20,y:pad.y+pad.height/2-10,id:1};
 const right={x:button.x+button.width/2,y:button.y+button.height/2,id:2};
 await d.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[left]});await p.clock.runFor(100);
 await d.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[left,right]});await p.clock.runFor(50);
 await d.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[right]});await p.clock.runFor(500);
 assert.equal(await p.evaluate(()=>__scene.camp.carry),'jacket');assert.ok(await p.evaluate(()=>__scene.camp.player.x<150));
 await d.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.clock.runFor(300);
 assert.ok(await p.evaluate(()=>Math.abs(__scene.camp.player.vx)<1));
 console.log('PASS: simultaneous movement and pickup thumbs; release stops movement');
 for(const [width,height]of [[320,568],[375,812],[667,375]]){
  await p.setViewportSize({width,height});await p.clock.runFor(50);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  for(const id of ['joystick','interact','pause']){
   const box=await p.locator('#'+id).boundingBox();assert.ok(box.width>=44&&box.height>=44);
   assert.ok(box.x>=0&&box.x+box.width<=width+.5&&box.y>=0&&box.y+box.height<=height+.5);
  }
  assert.equal(await p.evaluate(()=>__scene.camp.carry),'jacket','Rotation retains held gear');
 }
 await p.setViewportSize({width:390,height:844});await p.clock.runFor(50);
 await p.screenshot({path:'/private/tmp/storm-iphone-jacket.png'});
 // Reach the automatic quiet scene only for visual inspection after the seated-pose change.
 await p.evaluate(()=>{for(let i=0;i<7000;i++){__scene.game.paused=false;__scene.camp.advance(1/60);}});
 await p.clock.runFor(1500);
 const dad=await p.evaluate(()=>__scene.P(__scene.camp.dad.x,__scene.camp.dad.y));
 assert.ok(dad.x>24&&dad.x<366,'Dad stays in the phone scene during his story');
 await p.screenshot({path:'/private/tmp/storm-iphone-final.png'});
 assert.equal(await p.locator('#replay').isVisible(),true);assert.deepEqual(errors,[]);
 console.log('PASS: small phone, iPhone, landscape and rotation; quiet ending renders without errors');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
