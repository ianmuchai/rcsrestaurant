const assert = require('assert');
const path = require('path');
const os = require('os');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

(async () => {
    const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
    try {
        for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 568 }, { width: 390, height: 844 }, { width: 768, height: 640 }, { width: 568, height: 320 }, { width: 844, height: 390 }, { width: 1440, height: 900 }]) {
            const page = await browser.newPage({ viewport });
            await page.route('**/api/**', () => {});
            await page.route('https://videos.pexels.com/**', route => route.abort());
            await page.goto('http://127.0.0.1:5174/', { waitUntil: 'domcontentloaded' });
            await page.locator('.rcs-hero-order-button').waitFor();
            const mobile = viewport.width < 1024;
            const landscape = mobile && viewport.height <= 500 && viewport.width > viewport.height;
            const call = await page.locator('.rcs-floating-action-call').boundingBox();
            const whatsapp = await page.locator('.rcs-floating-action-whatsapp').boundingBox();
            assert.strictEqual(await page.locator('.rcs-hero-motion-toggle').isVisible(), !mobile, 'Hide video pause on mobile only');
            if (mobile) {
                assert(Math.abs(call.y - whatsapp.y) < 1 && call.x <= 20 && viewport.width - whatsapp.x - whatsapp.width <= 20, 'Keep phone left and WhatsApp right, level');
                assert(Math.abs(call.y + call.height / 2 - viewport.height * (landscape ? 0.43 : 0.55)) < 1, 'Raise contacts toward screen center');
                const updated = await page.locator('.rcs-hero-order-button').boundingBox();
                const menu = await page.locator('.rcs-hero-menu-button').boundingBox();
                const overlaps = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
                for (const contact of [call, whatsapp]) {
                    assert(!overlaps(contact, menu) && !overlaps(contact, updated), 'Contacts must clear Menu and Order Now');
                }
                const baseline = await page.addStyleTag({ content: '@media (max-width: 1023px) { .rcs-hero-brand-overlay .rcs-hero-brand-stack { top: calc(100svh - 48px - env(safe-area-inset-top) - 88px - env(safe-area-inset-bottom)); } }' });
                const previous = await page.locator('.rcs-hero-order-button').boundingBox();
                assert(Math.abs(updated.y - previous.y + (viewport.height > 700 ? 24 : 12)) < 1, 'Raise mobile Order Now without changing its horizontal position');
                assert(Math.abs(updated.x - previous.x) < 1);
                await baseline.evaluate(element => element.remove());
                await page.evaluate(() => scrollTo(0, 350));
                const scrolled = await page.locator('.rcs-floating-action-call').boundingBox();
                assert(Math.abs(call.y - scrolled.y) < 1, 'Contact buttons remain fixed on scroll');
                await page.evaluate(() => scrollTo(0, 0));
            }
            await page.screenshot({ path: path.join(os.tmpdir(), 'rcs-mobile-controls-' + viewport.width + '-' + viewport.height + '.png') });
            await page.close();
            console.log('Hero contact and order controls passed:', viewport.width, viewport.height);
        }
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
