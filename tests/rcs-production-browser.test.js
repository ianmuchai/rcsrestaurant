const assert = require('assert');
const path = require('path');
const os = require('os');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

(async () => {
    const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
    try {
        for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
            const page = await browser.newPage({ viewport });
            const heldRequests = [];
            // Keep backend requests pending to prove the built homepage remains usable.
            await page.route('**/api/**', route => { heldRequests.push(route); });
            await page.route('https://videos.pexels.com/**', route => route.abort());
            await page.goto(process.env.RCS_PREVIEW_URL || 'http://127.0.0.1:5174/', { waitUntil: 'domcontentloaded' });
            await page.locator('.rcs-hero-order-button').click({ trial: true, timeout: 10000 });
            assert.strictEqual(await page.locator('.rcs-collection').count(), 2);
            assert.strictEqual(await page.locator('.rcs-promo-poster').count(), 2);
            assert.strictEqual(await page.locator('.rcs-featured-glass-section').count(), 0);
            assert(heldRequests.length > 0, 'Test must exercise pending backend requests');
            assert.strictEqual(await page.locator('.rcs-hero-introduction h1').count(), 0);
            assert.strictEqual(await page.locator('.rcs-hero-order-button').innerText(), 'Order Now');
            assert.strictEqual(await page.locator('.rcs-hero-link-panel .rcs-hero-centered-logo').count(), 1);
            assert.strictEqual(await page.locator('.rcs-footer-tagline').innerText(), 'Bringing class to cuisine');
            assert.strictEqual(await page.locator('.rcs-front-video-hero .rcs-footer-tagline').count(), 0);
            assert.strictEqual(await page.locator('.rcs-footer-quicklinks a').filter({ hasText: /^Menu$/ }).getAttribute('href'), '/menu');
            for (const platform of ['Android', 'iOS']) {
                assert.strictEqual(await page.locator('.rcs-footer-download-button').filter({ hasText: platform }).getAttribute('href'), '/install-app');
            }
            const menu = page.locator('.rcs-hero-menu-button');
            assert.strictEqual(await menu.evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(86, 91, 96)');
            assert.strictEqual(await menu.evaluate(el => getComputedStyle(el).color), 'rgb(255, 255, 255)');
            const dimensions = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, viewport: innerWidth }));
            assert(dimensions.page <= dimensions.viewport + 1);
            await page.screenshot({ path: path.join(os.tmpdir(), 'rcs-production-home-' + viewport.width + '.png') });
            for (const route of heldRequests) await route.abort().catch(() => {});
            await page.close();
            console.log('Production homepage remains visible and usable while APIs are pending:', viewport.width);
        }
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
