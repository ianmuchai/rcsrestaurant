const assert = require('assert');
const path = require('path');
const os = require('os');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

(async () => {
    const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
    try {
        for (const viewport of [{ width: 1440, height: 900 }, { width: 1280, height: 650 }, { width: 1024, height: 768 }, { width: 390, height: 844 }]) {
            const page = await browser.newPage({ viewport });
            await page.route('**/api/**', () => {});
            await page.route('https://videos.pexels.com/**', route => route.abort());
            await page.goto('http://127.0.0.1:5174/', { waitUntil: 'domcontentloaded' });
            await page.locator('.rcs-hero-order-button').waitFor();
            await page.evaluate(() => document.fonts.ready);
            const bounds = () => page.evaluate(() => Object.fromEntries(['.rcs-hero-order-button', '.rcs-hero-link-panel', '.rcs-hero-centered-logo'].map(selector => {
                const r = document.querySelector(selector).getBoundingClientRect();
                return [selector, { x: r.x, y: r.y, width: r.width, height: r.height }];
            })));
            const updated = await bounds();
            const baseline = await page.addStyleTag({ content: '@media (min-width: 1024px) { .rcs-hero-brand-overlay .rcs-hero-brand-stack { left: calc(50% - 40px); top: 39%; } .rcs-hero-link-panel { transform: translateY(-50%); } }' });
            const previous = await bounds();
            for (const selector of Object.keys(updated)) {
                const desktop = viewport.width >= 1024;
                assert(Math.abs(updated[selector].x - previous[selector].x - (desktop ? -24 : 0)) < 1, selector + ': approved horizontal shift at ' + viewport.width);
                assert(Math.abs(updated[selector].y - previous[selector].y - (desktop ? 16 : 0)) < 1, selector + ': approved vertical shift at ' + viewport.width);
                assert.strictEqual(updated[selector].width, previous[selector].width, 'Preserve sizes');
                assert.strictEqual(updated[selector].height, previous[selector].height, 'Preserve sizes');
            }
            await baseline.evaluate(element => element.remove());
            assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), 'No horizontal overflow');
            await page.screenshot({ path: path.join(os.tmpdir(), 'rcs-balanced-hero-' + viewport.width + '.png') });
            await page.close();
            console.log('Hero balance verified:', viewport.width, viewport.width >= 1024 ? '24px left, 16px down' : 'mobile unchanged');
        }
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
