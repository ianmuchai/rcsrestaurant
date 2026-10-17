const assert = require('assert');
const path = require('path');
const os = require('os');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

(async () => {
    const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
    try {
        for (const viewport of process.env.RCS_INSTALL_ONLY ? [] : [{ width: 320, height: 740 }, { width: 390, height: 568 }, { width: 390, height: 844 }, { width: 768, height: 640 }, { width: 844, height: 390 }, { width: 568, height: 320 }, { width: 1440, height: 900 }]) {
            const landscape = viewport.width < 1024 && viewport.height <= 500 && viewport.width > viewport.height;
            const page = await browser.newPage({ viewport });
            const heldRequests = [];
            // Keep backend requests pending to prove the built homepage remains usable.
            await page.route('**/api/**', route => { heldRequests.push(route); });
            await page.route('https://videos.pexels.com/**', route => route.abort());
            await page.goto(process.env.RCS_PREVIEW_URL || 'http://127.0.0.1:5174/', { waitUntil: 'domcontentloaded' });
            if (viewport.width >= 1024) await page.addStyleTag({ content: 'html { scrollbar-gutter: stable; overflow-y: scroll; }' });
            await page.locator('.rcs-hero-order-button').click({ trial: true, timeout: 10000 });
            assert.strictEqual(await page.locator('.rcs-collection').count(), 2);
            assert.strictEqual(await page.locator('.rcs-promo-poster').count(), 2);
            assert.strictEqual(await page.locator('.rcs-featured-glass-section').count(), 0);
            assert(heldRequests.length > 0, 'Test must exercise pending backend requests');
            assert.strictEqual(await page.locator('.rcs-hero-introduction h1').count(), 0);
            assert.strictEqual(await page.locator('.rcs-hero-order-button').innerText(), 'ORDER NOW');
            assert(await page.locator('.rcs-hero-order-button').evaluate(el => getComputedStyle(el).fontFamily.includes('Public Sans') && getComputedStyle(el).fontWeight === '600'), 'Order Now should use Public Sans semibold');
            const order = await page.locator('.rcs-hero-order-button').boundingBox();
            if (viewport.width < 1024) {
                assert(order.y >= viewport.height * (landscape ? 0.45 : 0.7) && order.y + order.height <= viewport.height - 70, 'Raised mobile Order Now must remain clear of the bottom bar');
            }
            const heroBounds = await page.locator('.rcs-front-video-hero').boundingBox();
            assert(Math.abs(order.x + order.width / 2 - (landscape ? viewport.width / 4 : heroBounds.x + heroBounds.width / 2 - (viewport.width >= 1024 ? 64 : 0))) < 2, 'Keep responsive Order Now alignment');
            assert.strictEqual(await page.locator('.rcs-floating-action-directions').count(), 0, 'Remove the floating location button');
            if (viewport.width < 1024) {
                const call = await page.locator('.rcs-floating-action-call').boundingBox();
                const whatsapp = await page.locator('.rcs-floating-action-whatsapp').boundingBox();
                assert(call.x <= 20 && viewport.width - whatsapp.x - whatsapp.width <= 20 && Math.abs(call.y - whatsapp.y) < 1, 'Align phone left and WhatsApp right');
            }
            assert.strictEqual(await page.locator('.rcs-hero-link-panel .rcs-hero-centered-logo').count(), 1);
            assert.strictEqual(await page.locator('.rcs-hero-page-links .fa-arrow-right, .rcs-hero-page-links .fa-arrow-up-right-from-square').count(), 0, 'Production must not contain navigation arrows');
            assert(await page.locator('.rcs-hero-page-links a').first().evaluate(el => parseFloat(getComputedStyle(el).fontSize)) >= (landscape ? 18 : viewport.width < 1024 ? 26 : 28), 'Production must use the newly enlarged hero type');
            assert.deepStrictEqual(await page.locator('.rcs-hero-page-links span').allTextContents(), ['MENU', 'OFFERS', 'LOCATION', 'ORDERS', 'FEEDBACK']);
            assert(await page.locator('.rcs-hero-page-links span').evaluateAll(labels => labels.every(label => label.scrollWidth <= label.clientWidth + 1)), 'Production labels must fit on narrow phones');
            const heroLink = page.locator('.rcs-hero-page-links a').first();
            assert(await heroLink.evaluate(el => {
                const label = el.querySelector('span'), line = getComputedStyle(label, '::after');
                return line.content === '""' && line.height === '1px' && line.left === '0px' && Math.abs(parseFloat(line.width) - label.getBoundingClientRect().width) < 1;
            }), 'Production underlines should sit directly below their justified labels');
            if (viewport.width >= 1024) {
                await heroLink.hover();
                await page.waitForFunction(() => getComputedStyle(document.querySelector('.rcs-hero-page-links span'), '::after').backgroundColor.includes('0.9'));
                await page.mouse.move(0, 0);
            }
            const logo = await page.locator('.rcs-hero-centered-logo').boundingBox();
            assert(logo.width <= (viewport.width < 1024 ? 73 : 113), 'Production hero must use the newly reduced logo');
            for (const selector of ['.rcs-floating-actions', '.rcs-hero-menu-button', '.rcs-hero-motion-toggle']) {
                if (viewport.width < 1024 && selector === '.rcs-hero-motion-toggle') {
                    assert.strictEqual(await page.locator(selector).isVisible(), false, 'Hide the video pause control on mobile');
                    continue;
                }
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
            const dimensions = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }));
            assert(dimensions.page <= dimensions.viewport + 1);
            await page.screenshot({ path: path.join(os.tmpdir(), 'rcs-production-home-' + viewport.width + '.png') });
            for (const route of heldRequests) await route.abort().catch(() => {});
            await page.close();
            console.log('Production homepage remains visible and usable while APIs are pending:', viewport.width);
        }
        for (const width of [390, 1440]) {
            const page = await browser.newPage({ viewport: { width, height: 844 } });
            const errors = [];
            page.on('pageerror', error => errors.push(error.message));
            const heldRequests = [];
            await page.route('**/api/**', route => { heldRequests.push(route); });
            const origin = new URL(process.env.RCS_PREVIEW_URL || 'http://127.0.0.1:5174/').origin;
            await page.goto(origin + '/install-app', { waitUntil: 'domcontentloaded' });
            const download = page.getByRole('button', { name: 'Download App', exact: true });
            await download.waitFor();
            await page.locator('.rcs-pwa-share-figure img').evaluate(image => image.decode());
            assert.strictEqual(await page.locator('.rcs-pwa-ios-guide li').count(), 4);
            assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));
            await download.click();
            assert.strictEqual(await page.evaluate(() => document.activeElement.id), 'rcs-pwa-guide-title');
            assert.deepStrictEqual(errors, [], 'Production download page must render without runtime errors');
            await page.screenshot({ path: path.join(os.tmpdir(), 'rcs-production-install-' + width + '.png'), fullPage: true });
            for (const route of heldRequests) await route.abort().catch(() => {});
            await page.close();
            console.log('Production QR install route and manual download passed:', width);
        }
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
