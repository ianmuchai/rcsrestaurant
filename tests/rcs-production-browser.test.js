const assert = require('assert');
const path = require('path');
const os = require('os');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

(async () => {
    const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
    try {
        for (const viewport of [{ width: 320, height: 740 }, { width: 390, height: 568 }, { width: 390, height: 844 }, { width: 768, height: 640 }, { width: 844, height: 390 }, { width: 568, height: 320 }, { width: 1440, height: 900 }]) {
            const landscape = viewport.width < 1024 && viewport.height <= 500 && viewport.width > viewport.height;
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
            const order = await page.locator('.rcs-hero-order-button').boundingBox();
            if (viewport.width < 1024) {
                assert(order.y >= viewport.height * (landscape ? 0.5 : 0.7) && order.y + order.height <= viewport.height - 70, 'Mobile Order Now must be near the bottom, clear of the bottom bar');
            }
            assert(Math.abs(order.x + order.width / 2 - (landscape ? viewport.width / 4 : viewport.width / 2 - (viewport.width >= 1024 ? 40 : 0))) < 2, 'Keep responsive Order Now alignment');
            assert.strictEqual(await page.locator('.rcs-floating-action-directions').isVisible(), viewport.width < 1024, 'Keep mobile location control but hide it on desktop');
            assert.strictEqual(await page.locator('.rcs-hero-link-panel .rcs-hero-centered-logo').count(), 1);
            assert.deepStrictEqual(await page.locator('.rcs-hero-page-links span').allTextContents(), ['MENU', 'OFFERS', 'LOCATION', 'ORDERS', 'FEEDBACK']);
            assert(await page.locator('.rcs-hero-page-links span').evaluateAll(labels => labels.every(label => label.scrollWidth <= label.clientWidth + 1)), 'Production labels must fit on narrow phones');
            const heroLink = page.locator('.rcs-hero-page-links a').first();
            assert(await heroLink.evaluate(el => {
                const line = getComputedStyle(el, '::after');
                return line.content === '""' && line.height === '1px' && parseFloat(line.width) >= 88 && Math.abs(parseFloat(line.left) - el.clientWidth / 2) < 1;
            }), 'Production should show longer centered hairline underlines');
            if (viewport.width >= 1024) {
                await heroLink.hover();
                await page.waitForFunction(() => parseFloat(getComputedStyle(document.querySelector('.rcs-hero-page-links a'), '::after').width) >= 123);
                await page.mouse.move(0, 0);
            }
            const logo = await page.locator('.rcs-hero-centered-logo').boundingBox();
            assert(logo.width <= (viewport.width < 1024 ? 73 : 113), 'Production hero must use the newly reduced logo');
            for (const selector of ['.rcs-floating-actions', '.rcs-hero-menu-button', '.rcs-hero-motion-toggle']) {
                const control = await page.locator(selector).boundingBox();
                assert(control.x >= 0 && control.x <= (landscape && selector === '.rcs-hero-motion-toggle' ? 172 : 20), 'Production controls must remain in the left-hand area: ' + selector);
            }
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
