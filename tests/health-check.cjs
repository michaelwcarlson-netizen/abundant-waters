// Run against a local static server. Requires Playwright and an installed browser.
// Test-only hooks place players near exits; no hooks are shipped in the game.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const base = process.env.GAME_URL || 'http://127.0.0.1:8765';
const names = ['j-stroke', 'bow-stern', 'portage', 'tarp', 'bear-hang'];
const hooks = {
  'j-stroke': `finish() { c.x = LAND.x; c.y = LAND.y; update(0); }, state() { return {finished, strokes:stats.strokes}; }`,
  'bow-stern': `finish() { c.x = LAND.x; c.y = LAND.y; update(0); }, state() { return {finished, strokes:stats.strokes}; }`,
  portage: `arrive() { kid.x = END_X; arrive(); }, advance() { for(let i=0;i<100;i++) update(0.033); }, state() { return {mode, across:across.size}; }`,
  tarp: `storm() { startStorm(); for(let i=0;i<1300;i++) update(0.033); }, state() { return {mode}; }`,
  'bear-hang': `night() { startNight(); for(let i=0;i<15000 && !night.done;i++) update(0.033); }, state() { return {mode, done:night?.done}; }`
};

(async () => {
  // Parse every inline script and verify local HTML links and DOM references.
  for (const file of ['index.html', ...names.map(n => `prototypes/${n}/index.html`)]) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
    assert.equal(new Set(ids).size, ids.length, `${file}: duplicate DOM IDs`);
    for (const [i, match] of [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].entries()) {
      new vm.Script(match[1], {filename:`${file}:script${i}`});
      for(const ref of match[1].matchAll(/\$\('([^']+)'\)|getElementById\("([^"]+)"\)/g)) {
        assert.ok(ids.includes(ref[1] || ref[2]), `${file}: missing DOM element ${ref[1] || ref[2]}`);
      }
    }
    for (const ref of html.matchAll(/(?:path: "|href="|src=")([^"#]+\.html)/g)) {
      assert.ok(fs.existsSync(path.resolve(root, path.dirname(file), ref[1])), `${file}: dead path ${ref[1]}`);
    }
  }
  console.log('PASS: JavaScript syntax, DOM references, duplicate IDs and local HTML paths');
  const browser = await chromium.launch({headless:true, ...(process.env.BROWSER_PATH ? {executablePath:process.env.BROWSER_PATH} : {})});
  try {
    const errors = [], failures = [], externalFailures = [];
    const context = await browser.newContext({viewport:{width:1280,height:900}});
    const page = await context.newPage();
    function watch(p) {
      p.on('pageerror', e => errors.push(e.message));
      p.on('console', m => { if(m.type()==='error' && !m.text().includes('Failed to load resource')) errors.push(m.text()); });
      p.on('requestfailed', r => (r.url().startsWith(base) ? failures : externalFailures).push(`${r.url()}: ${r.failure().errorText}`));
      p.on('response', r => { if(r.status()>=400 && !r.url().endsWith('/favicon.ico')) (r.url().startsWith(base) ? failures : externalFailures).push(`${r.url()}: ${r.status()}`); });
    }
    watch(page);
    await page.goto(base);
    await page.locator('#next').click();
    await page.frameLocator('iframe').locator('canvas').waitFor();
    await page.locator('[data-paddle="bowstern"]').click();
    await page.frameLocator('iframe').locator('#coopBtn').click();
    await page.frameLocator('iframe').locator('#coopBtn').click();
    for(const title of ['Portage Trail','Storm Tarp','Bear Hang']) {
      await page.locator('#next').click();
      await page.frameLocator('iframe').locator('canvas').waitFor();
      assert.equal(await page.locator('iframe').getAttribute('title'), title+' game');
    }
    await page.locator('#next').click();
    assert.equal(await page.locator('#title').textContent(), 'Camp is settled');
    assert.equal(await page.locator('[role=progressbar]').getAttribute('aria-valuenow'),'5');
    for(let i=0;i<5;i++) await page.locator('#back').click();
    assert.equal(await page.locator('#title').textContent(),'Break camp');
    for(let i=0;i<6;i++) await page.locator('#next').click();
    assert.equal(await page.locator('#title').textContent(),'Break camp');
    console.log('PASS: all trip transitions, paddle selection, back, day completion and start over');

    // Inject hooks into responses, keeping the on-disk gameplay untouched.
    await page.route('**/prototypes/*/index.html', async route => {
      const name = new URL(route.request().url()).pathname.split('/')[2];
      const response = await route.fetch();
      const html = (await response.text()).replace('})();', `window.__health = {${hooks[name]}};\n})();`);
      await route.fulfill({response,body:html});
    });
    for(const name of names) {
      await page.goto(`${base}/prototypes/${name}/index.html`);
      await page.waitForTimeout(150);
      assert.equal(await page.evaluate(()=>document.compatMode),'CSS1Compat');
      assert.equal(await page.evaluate(()=>document.characterSet),'UTF-8');
      assert.ok(await page.locator('canvas').evaluate(c=>c.width>0 && c.height>0));
      if(process.env.HEALTH_SCREENSHOT_DIR) await page.screenshot({path:path.join(process.env.HEALTH_SCREENSHOT_DIR, `${name}-desktop.png`)});
      await page.locator('#tuneBtn').click();
      await page.locator('#tReset').click();
      await page.locator('#tuneBtn').click();
      if(name==='j-stroke' || name==='bow-stern') {
        if(name==='bow-stern') {
          // A mode switch during the arrival delay must cancel the old end card.
          await page.evaluate(()=>__health.finish());
          await page.locator('#coopBtn').click();
          await page.waitForTimeout(1700);
          assert.equal(await page.locator('#end').isVisible(),false);
          await page.locator('#coopBtn').click();
          await page.locator('#hutBtn').click();
          await page.locator('#drawBtn').click();
        }
        await page.evaluate(()=>__health.finish());
      } else if(name==='portage') {
        // Exercise a partial load, return trip, remaining load and completion.
        await page.locator('[data-id="canoe"]').click();
        await page.locator('#go').click();
        await page.evaluate(()=>__health.arrive());
        assert.equal(await page.locator('#dropSheet').isVisible(),true);
        await page.locator('#back').click();
        await page.evaluate(()=>__health.advance());
        for(const item of await page.locator('#items .item:not([disabled])').all()) await item.click();
        await page.locator('#go').click();
        await page.evaluate(()=>__health.arrive());
      } else if(name==='tarp') {
        await page.evaluate(()=>__health.storm());
      } else {
        await page.evaluate(()=>__health.night());
        assert.equal(await page.evaluate(()=>__health.state().done),true);
      }
      await page.locator('#end').waitFor({state:'visible',timeout:6000});
      assert.ok((await page.locator('#endStats').textContent()).trim());
      await page.locator('#again').click();
      assert.equal(await page.locator('#end').isVisible(),false);
      if(name==='j-stroke' || name==='bow-stern') {
        await page.keyboard.down('Space');
        await page.waitForTimeout(300);
        await page.keyboard.up('Space');
        assert.equal(await page.evaluate(()=>__health.state().strokes),1, `${name}: keyboard after replay`);
      }
      console.log(`PASS: ${name} load, tuning, completion and replay`);
    }
    const mobile = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
    const mp = await mobile.newPage();
    watch(mp);
    for(const name of names) {
      await mp.goto(`${base}/prototypes/${name}/index.html`);
      assert.equal(await mp.evaluate(()=>innerWidth),390, `${name}: mobile viewport`);
      assert.equal(await mp.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      if(process.env.HEALTH_SCREENSHOT_DIR) await mp.screenshot({path:path.join(process.env.HEALTH_SCREENSHOT_DIR, `${name}-mobile.png`)});
      if(name==='portage') {
        await mp.locator('[data-id="canoe"]').tap();
        await mp.locator('#go').tap();
      }
      await mp.locator('canvas').tap({position:{x:100,y:350}});
    }
    await mp.goto(base);
    for(let i=0;i<5;i++) {
      await mp.locator('#next').click();
      if(i<4) await mp.frameLocator('iframe').locator('canvas').waitFor();
    }
    assert.equal(await mp.locator('#title').textContent(),'Camp is settled');
    console.log('PASS: phone viewport, touch smoke checks and embedded trip');
    assert.deepEqual(errors, [], 'runtime/console errors');
    assert.deepEqual(failures, [], 'local asset/request failures');
    console.log('PASS: no runtime errors or failed local game requests (optional favicon excluded)');
    if(externalFailures.length) console.log('External font requests:',externalFailures);
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
