/* Trip shell: seven stops, saved progress, and side trips that don't move the trip.
 * Serve the repo, then: GAME_URL=http://127.0.0.1:8766 node tests/trip-seven-stops.test.cjs
 * Requires Playwright; BROWSER_PATH can point to an installed Chrome executable.
 */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const base = process.env.GAME_URL || 'http://127.0.0.1:8766';

(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}) });
  const errors = [];
  try {
    for (const [name, viewport, touch] of [['desktop', { width: 1280, height: 800 }, false], ['iphone', { width: 390, height: 844 }, true]]) {
      const context = await browser.newContext({ viewport, hasTouch: touch, isMobile: touch });
      const page = await context.newPage();
      page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
      await page.goto(`${base}/index.html`);

      // The trip is seven stops between the intro and the ending.
      const titles = [];
      await page.click('#next');
      for (let i = 0; i < 7; i++) {
        titles.push(await page.textContent('#title'));
        assert.equal(await page.textContent('#count'), `Stop ${i + 1} of 7`);
        await page.click('#next');
      }
      assert.deepEqual(titles, ['Paddle to the portage', 'Cross to Smoke', 'Fish the shoreline', 'Make dinner together',
        'Look up for a while', 'Hang the food', 'Wait out the storm']);
      assert.equal(await page.textContent('#next'), 'Start a new trip');
      await page.click('#next');
      assert.equal(await page.textContent('#title'), 'Break camp');

      // Finishing a stop marks it complete and survives a reload.
      await page.click('#next');
      await page.click('.start-level');
      await page.waitForSelector('#level-player:not([hidden]) iframe');
      const frame = page.frameLocator('#level-stage iframe');
      await frame.locator('body').waitFor();
      await page.evaluate(() => document.querySelector('#level-stage iframe').contentWindow.AbundantWaters.complete());
      await page.waitForSelector('#level-continue:not([hidden])');
      const fullscreenBefore = await page.evaluate(() => document.fullscreenElement?.id || null);
      await page.click('#level-continue');
      assert.equal(await page.textContent('#title'), 'Cross to Smoke');
      // Continue opens the next stop in place, and fullscreen (where granted) stays on.
      await page.waitForFunction(() => document.querySelector('#level-stage iframe')?.src.includes('/portage/'));
      assert.equal(await page.isVisible('#level-player'), true);
      await page.waitForTimeout(150);
      assert.equal(await page.evaluate(() => document.fullscreenElement?.id || null), fullscreenBefore);
      await page.reload();
      assert.equal(await page.textContent('#title'), 'Cross to Smoke', 'reload keeps your place');

      // A side trip finishing does not advance or complete the current stop.
      await page.click('[data-side="snorkeling"]');
      await page.waitForSelector('#level-player:not([hidden]) iframe');
      await page.frameLocator('#level-stage iframe').locator('body').waitFor();
      await page.evaluate(() => document.querySelector('#level-stage iframe').contentWindow.AbundantWaters.complete());
      await page.waitForTimeout(200);
      assert.equal(await page.isVisible('#level-continue'), false, 'side trips do not offer Continue trip');
      await page.click('#level-exit');
      assert.equal(await page.textContent('#title'), 'Cross to Smoke');
      assert.equal(await page.textContent('#next'), 'Skip ahead');

      // The fish you land is carried into supper.
      await page.click('#next');
      await page.click('.start-level');
      await page.waitForSelector('#level-player:not([hidden]) iframe');
      await page.frameLocator('#level-stage iframe').locator('body').waitFor();
      // The message has to come from the level's own window, as the fishing level sends it.
      await page.evaluate(() => {
        const win = document.querySelector('#level-stage iframe').contentWindow;
        win.eval("window.parent.postMessage({ type: 'abundant-waters:fish-landed', fish: 'Walleye' }, location.origin)");
      });
      await page.waitForTimeout(100);
      await page.click('#level-exit');
      await page.click('#next');
      await page.click('.start-level');
      await page.waitForSelector('#level-player:not([hidden]) iframe');
      const src = await page.getAttribute('#level-stage iframe', 'src');
      assert.ok(src.includes('campfire') && src.includes('fish=Walleye'), `supper gets the fish: ${src}`);
      await page.click('#level-exit');

      console.log(`PASS ${name}: seven stops, saved progress, side trips stay separate, fish carried to supper`);
      await context.close();
    }
    assert.deepEqual(errors, []);
    console.log('PASS no runtime errors');
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
