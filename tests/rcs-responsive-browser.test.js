const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');
const esbuild = require('esbuild');
const { parse, compileTemplate, rewriteDefault } = require('@vue/compiler-sfc');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

const root = path.resolve(__dirname, '..');
const publicRoot = path.join(root, 'public');

// Render the production components with deterministic store data to test layout
// independently of the restaurant API's availability.
const fixture = `
import { createApp } from 'vue/dist/vue.esm-bundler.js';
import { createRouter, createWebHistory } from 'vue-router';
import Mobile from './resources/js/components/layouts/frontend/FrontendMobileNavBarComponent.vue';
import Footer from './resources/js/components/layouts/frontend/FrontendFooterComponent.vue';
import Slider from './resources/js/components/frontend/home/SliderComponent.vue';
import Items from './resources/js/components/frontend/components/ItemComponent.vue';
import itemDesignEnum from './resources/js/enums/modules/itemDesignEnum';
const names = ['frontend.home', 'frontend.menu', 'frontend.offers', 'auth.login', 'frontend.installApp', 'frontend.search', 'frontend.page'];
const router = createRouter({ history: createWebHistory(), routes: names.map((name, i) => ({ name, path: i === 0 ? '/' : name === 'frontend.installApp' ? '/install-app' : '/' + name.split('.').pop(), component: { template: '<div />' } })) });
const app = createApp({ components: { Mobile, Footer, Slider, Items },
  data: () => ({ design: itemDesignEnum.GRID, items: [1, 2, 3, 4].map(id => ({ id, name: 'Grilled chicken family platter', description: 'Freshly prepared chicken with rice and seasonal vegetables', currency_price: 'Ksh. 1,250.00', offer: [], cover: '/images/rcs-cafe-cover.jpg', item_type: 1 })) }),
  template: '<div class="rcs-frontend-layout"><Slider /><section class="rcs-featured-glass-section"><div class="container"><div class="rcs-featured-glass-panel"><h2 class="rcs-featured-title">Featured Items</h2><div class="rcs-featured-items-grid"><Items :items="items" :design="design" :type="null" /></div></div></div></section><Footer /><Mobile /></div>'
});
app.config.globalProperties.$store = { getters: {
 'authStatus': false, 'frontendItemCategory/lists': [{ slug: 'breakfast' }], 'frontendCart/subtotal': 0,
 'frontendSetting/lists': { theme_footer_logo: '/images/theme/theme-favicon-logo.png', site_copyright: "RC's Restaurant", social_media_instagram: 'https://instagram.com' },
 'frontendPage/lists': ['About Us', 'Privacy Policy', 'Terms & Conditions', 'Contact Us'].map((title, id) => ({ id, title, slug: 'page-' + id }))
}, dispatch: () => Promise.resolve({ data: {} }) };
app.config.globalProperties.$t = value => value.split('.').pop();
app.use(router); router.isReady().then(() => app.mount('#app'));
`;

async function main() {
    const bundle = await esbuild.build({
        stdin: { contents: fixture, resolveDir: root, loader: 'js' },
        bundle: true, write: false, format: 'iife',
        define: { 'process.env.NODE_ENV': '"production"', __VUE_OPTIONS_API__: 'true', __VUE_PROD_DEVTOOLS__: 'false' },
        plugins: [{ name: 'vue-fixture', setup(build) {
            build.onResolve({ filter: /services\/(appService|alertService)$/ }, args => ({ path: args.path, namespace: 'mock-services' }));
            build.onLoad({ filter: /.*/, namespace: 'mock-services' }, () => ({ contents: 'export default { textShortener: (text, limit) => text.length > limit ? text.slice(0, limit) + "..." : text, openCanvas: () => {} };' }));
            build.onLoad({ filter: /\.css$/ }, () => ({ contents: '', loader: 'js' }));
            build.onResolve({ filter: /Component$/ }, args => {
                const file = path.resolve(args.resolveDir, args.path + '.vue');
                return fs.existsSync(file) ? { path: file } : undefined;
            });
            build.onLoad({ filter: /\.vue$/ }, args => {
                const { descriptor } = parse(fs.readFileSync(args.path, 'utf8'));
                const template = compileTemplate({ source: descriptor.template.content, filename: args.path, id: args.path });
                assert.deepStrictEqual(template.errors, []);
                return { contents: rewriteDefault(descriptor.script.content, '__component') + '\n' + template.code + '\n__component.render = render; export default __component;', resolveDir: path.dirname(args.path), loader: 'js' };
            });
        }}]
    });
    const html = '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/themes/default/fonts/fontawesome/fontawesome.css"><link rel="stylesheet" href="/themes/default/fonts/typography/public/public.css"><link rel="stylesheet" href="/themes/default/css/custom.css"><link rel="stylesheet" href="/css/app.css"><link rel="stylesheet" href="/swiper.css"></head><body><div id="app"></div><script src="/fixture.js"></script></body></html>';
    const server = http.createServer((req, res) => {
        const pathname = new URL(req.url, 'http://localhost').pathname;
        if (pathname === '/fixture.js') { res.setHeader('Content-Type', 'application/javascript'); return res.end(bundle.outputFiles[0].text); }
        if (pathname === '/swiper.css') { res.setHeader('Content-Type', 'text/css'); return res.end(fs.readFileSync(path.join(root, 'node_modules/swiper/swiper.css'))); }
        const file = path.resolve(publicRoot, '.' + pathname);
        if (file.startsWith(publicRoot + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) {
            const types = { '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.woff': 'font/woff' };
            res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
            return fs.createReadStream(file).pipe(res);
        }
        res.setHeader('Content-Type', 'text/html'); res.end(html);
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    let browser;
    try {
        browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
            args: ['--disable-gpu', '--disable-gpu-compositing', '--disable-gpu-rasterization', '--disable-software-rasterizer', '--no-sandbox'] });
        const page = await browser.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        // Opt into the network-dependent playback check separately.
        if (!process.env.RCS_CHECK_VIDEO) {
            await page.route('https://videos.pexels.com/**', route => route.abort());
        }
        for (const viewport of [{ width: 320, height: 740 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
            await page.setViewportSize(viewport);
            await page.goto('http://127.0.0.1:' + server.address().port);
            await page.waitForSelector('.product-card-grid');
            await page.evaluate(() => document.fonts.ready);
            if (process.env.RCS_CHECK_VIDEO && viewport.width === 390) {
                await page.waitForFunction(() => {
                    const video = document.querySelector('.swiper-slide-active video');
                    return video && video.readyState >= 2 && video.currentTime > 0.2 && !video.paused;
                }, null, { timeout: 25000 });
                console.log('Mobile video playback confirmed');
            }
            const dimensions = await page.evaluate(() => {
                const rect = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
                const overflow = [...document.querySelectorAll('.product-card-grid-title, .product-card-grid-cart-btn, .product-card-grid-price-current')].filter(el => {
                    const child = el.getBoundingClientRect(), card = el.closest('.product-card-grid').getBoundingClientRect();
                    return child.right > card.right + 1 || child.left < card.left - 1 || child.bottom > card.bottom + 1;
                }).length;
                const headerStyle = getComputedStyle(document.querySelector('.rcs-mobile-topbar'));
                return { width: document.documentElement.scrollWidth, header: rect('.rcs-mobile-topbar'), headerBackground: headerStyle.backgroundColor, headerBlur: headerStyle.backdropFilter, hero: rect('.rcs-plain-video-carousel'), logo: rect('.rcs-hero-centered-logo'), order: rect('.rcs-hero-order-button'), footer: rect('.rcs-compact-footer'), overflow };
            });
            assert(dimensions.width <= viewport.width + 1, 'Page must not scroll horizontally: ' + JSON.stringify({ viewport, dimensions }));
            assert.strictEqual(dimensions.overflow, 0, 'Card content must stay within cards');
            assert(dimensions.logo.bottom < dimensions.order.y, 'Logo and order button must have clear separation');
            if (viewport.width < 1024) {
                assert(dimensions.header.height <= 49, 'Mobile header must be compact');
                assert.strictEqual(dimensions.headerBackground, 'rgba(255, 255, 255, 0.22)', 'Header should have a transparent glass tint');
                assert(dimensions.headerBlur.includes('blur(24px)'), 'Header should blur the video behind it');
                assert.strictEqual(dimensions.hero.y, 0, 'Video should extend beneath the glass header');
                assert(dimensions.hero.height >= viewport.height - 50, 'Mobile video hero must remain tall');
                await page.getByRole('button', { name: 'Search menu', exact: true }).click();
                const input = page.getByRole('searchbox');
                await input.press('Escape');
                assert.strictEqual(await input.count(), 0, 'Escape closes search');
                await page.getByRole('button', { name: 'Search menu', exact: true }).click();
                await input.fill('   ');
                await input.press('Enter');
                assert(!page.url().includes('/search'), 'Blank search does not navigate');
                await input.fill('chicken');
                await input.press('Enter');
                await page.waitForURL('**/search?s=chicken');
                assert.strictEqual(await input.count(), 0, 'Search closes after submission');
                assert.strictEqual(await page.getByRole('link', { name: 'Download app', exact: true }).getAttribute('href'), '/install-app');
            } else {
                assert(dimensions.hero.height <= viewport.height, 'Desktop slider must render one slide at a time');
                assert(dimensions.footer.height < 180, 'Desktop footer must remain compact');
            }
            for (const name of ['Android', 'iOS']) {
                assert.strictEqual(await page.locator('.rcs-footer-download-button').filter({ hasText: name }).getAttribute('href'), '/install-app');
            }
            await page.screenshot({ path: path.join(os.tmpdir(), 'rcs-responsive-' + viewport.width + '.png'), fullPage: true });
            console.log('Responsive layout passed:', viewport.width, 'header', dimensions.header.height, 'hero', dimensions.hero.height, 'footer', dimensions.footer.height);
        }
        assert.deepStrictEqual(errors, [], 'Components must render without runtime errors');
    } finally {
        if (browser) await browser.close();
        await new Promise(resolve => server.close(resolve));
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
