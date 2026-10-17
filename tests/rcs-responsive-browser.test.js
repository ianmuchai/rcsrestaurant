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
import Category from './resources/js/components/frontend/components/CategoryComponent.vue';
import GoogleAuth from './resources/js/components/frontend/auth/GoogleAuthComponent.vue';
import Collections from './resources/js/components/frontend/home/MenuCollectionsComponent.vue';
import QuickActions from './resources/js/components/layouts/frontend/FrontendQuickActionsComponent.vue';
import Install from './resources/js/components/frontend/pwa/PwaInstallComponent.vue';
import categoryDesignEnum from './resources/js/enums/modules/categoryDesignEnum';
import itemDesignEnum from './resources/js/enums/modules/itemDesignEnum';
const names = ['frontend.home', 'frontend.menu', 'frontend.offers', 'auth.login', 'frontend.installApp', 'frontend.search', 'frontend.page', 'frontend.myOrder'];
const router = createRouter({ history: createWebHistory(), routes: names.map((name, i) => ({ name, path: i === 0 ? '/' : name === 'frontend.installApp' ? '/install-app' : name === 'frontend.page' ? '/page/:slug' : name === 'frontend.myOrder' ? '/my-orders' : '/' + name.split('.').pop(), meta: { isFrontend: true }, component: { template: '<div />' } })) });
const app = createApp({ components: { Mobile, Footer, Slider, Items, Category, GoogleAuth, Collections, QuickActions, Install },
  data: () => ({ categoryDesign: categoryDesignEnum.FIRST, categories: ['breakfast', 'teas-coffee', 'rcs-signatures', 'rice-pastas', 'fish-chicken-meat', 'fast-foods', 'beverages', 'appetizers'].map((slug, id) => ({ id, slug, name: slug, thumb: '/images/rcs-cafe-cover.jpg' })), design: itemDesignEnum.GRID, listDesign: itemDesignEnum.LIST, items: [1, 2, 3, 4].map(id => ({ id, name: 'Grilled chicken family platter', description: 'Freshly prepared chicken with rice and seasonal vegetables', currency_price: 'Ksh. 123,450.00', offer: [], cover: '/images/rcs-cafe-cover.jpg', thumb: '/images/rcs-cafe-cover.jpg', item_type: 1 })) }),
  computed: { cardDesign() { return this.$route.query.cards === 'list' ? this.listDesign : this.design; } },
  template: '<div v-if="$route.query.install" class="rcs-frontend-layout"><Mobile /><Install /></div><div v-else-if="$route.query.google" style="width: 304px; max-width: 100%; margin: 20px auto"><GoogleAuth /></div><div v-else-if="$route.query.cards" class="rcs-frontend-layout"><Mobile /><main class="container" style="padding-top: 16px"><Items :items="items" :type="null" :design="cardDesign" /></main></div><div v-else class="rcs-frontend-layout"><Slider /><Category :categories="categories" :design="categoryDesign" /><Collections :categories="categories" /><Footer /><Mobile /><QuickActions /></div>'
});
app.config.globalProperties.$store = { getters: {
 'authStatus': false, 'frontendItemCategory/lists': [{ slug: 'breakfast' }], 'frontendCart/subtotal': 0,
 'frontendSetting/lists': { theme_footer_logo: '/images/theme/theme-favicon-logo.png', site_copyright: "RC's Restaurant", social_media_instagram: 'https://instagram.com' },
 'frontendPage/lists': ['About Us', 'Privacy Policy', 'Terms & Conditions', 'Contact Us', 'Delivery Policy', 'Refund Policy'].map((title, id) => ({ id, title, slug: 'page-' + id }))
}, dispatch: (action, payload) => {
 if (action === 'googleLogin') {
   window.lastGooglePayload = payload;
   if (window.googleLoginError) return Promise.reject({ response: { data: { errors: { credential: [window.googleLoginError] } } } });
 }
 return Promise.resolve({ data: {} });
} };
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
        const page = await browser.newPage({ hasTouch: true });
        await page.addInitScript(() => {
            if (navigator.serviceWorker) navigator.serviceWorker.register = async () => ({});
        });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        let googleEnabled = false;
        await page.route('**/auth/google/config', route => route.fulfill({ json: googleEnabled
            ? { enabled: true, client_id: 'test-client-id', nonce: 'a'.repeat(64) } : { enabled: false } }));
        await page.route('https://accounts.google.com/gsi/client', route => route.fulfill({ contentType: 'application/javascript', body: `
            window.google = { accounts: { id: {
                initialize(options) { window.googleOptions = options; },
                renderButton(element) {
                    element.replaceChildren();
                    const button = document.createElement('button');
                    button.textContent = 'Google test account';
                    button.onclick = () => window.googleOptions.callback({ credential: 'verified-test-credential' });
                    element.appendChild(button);
                }
            } } };
        ` }));
        // Opt into the network-dependent playback check separately.
        if (!process.env.RCS_CHECK_VIDEO) {
            await page.route('https://videos.pexels.com/**', route => route.abort());
        }
        for (const viewport of [{ width: 320, height: 640 }, { width: 390, height: 568 }, { width: 360, height: 740 }, { width: 390, height: 844 }, { width: 430, height: 932 }, { width: 768, height: 640 }, { width: 768, height: 1024 }, { width: 844, height: 390 }, { width: 568, height: 320 }, { width: 1024, height: 768 }, { width: 1280, height: 650 }, { width: 1440, height: 900 }]) {
            const landscape = viewport.width < 1024 && viewport.height <= 500 && viewport.width > viewport.height;
            await page.setViewportSize(viewport);
            await page.goto('http://127.0.0.1:' + server.address().port);
            if (viewport.width >= 1024) await page.addStyleTag({ content: 'html { scrollbar-gutter: stable; overflow-y: scroll; }' });
            await page.waitForSelector('.rcs-collection');
            await page.evaluate(() => document.fonts.ready);
            for (const image of await page.locator('.rcs-collection img').all()) {
                await image.scrollIntoViewIfNeeded();
                await image.evaluate(image => image.decode());
            }
            await page.evaluate(() => scrollTo(0, 0));
            if (process.env.RCS_CHECK_VIDEO && viewport.width === 390) {
                await page.waitForFunction(() => {
                    const video = document.querySelector('.swiper-slide-active video');
                    return video && video.readyState >= 2 && video.currentTime > 0.2 && !video.paused;
                }, null, { timeout: 25000 });
                console.log('Mobile video playback confirmed');
            }
            const dimensions = await page.evaluate(() => {
                const rect = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
                const overflow = [...document.querySelectorAll('.rcs-promo-poster')].filter(el => {
                    const child = el.getBoundingClientRect(), card = el.closest('.rcs-collection').getBoundingClientRect();
                    return child.right > card.right + 1 || child.left < card.left - 1 || child.bottom > card.bottom + 1;
                }).length;
                const headerStyle = getComputedStyle(document.querySelector('.rcs-mobile-topbar'));
                return { width: document.documentElement.scrollWidth, contentWidth: document.documentElement.clientWidth, header: rect('.rcs-mobile-topbar'), headerBackground: headerStyle.backgroundColor, headerBlur: headerStyle.backdropFilter, hero: rect('.rcs-plain-video-carousel'), logo: rect('.rcs-hero-centered-logo'), order: rect('.rcs-hero-order-button'), heroLinks: rect('.rcs-hero-page-links'), footer: rect('.rcs-compact-footer'), overflow };
            });
            assert(dimensions.width <= dimensions.contentWidth + 1, 'Page must not scroll horizontally, including with a desktop scrollbar gutter: ' + JSON.stringify({ viewport, dimensions }));
            assert.strictEqual(dimensions.overflow, 0, 'Card content must stay within cards');
            assert(dimensions.logo.bottom < dimensions.heroLinks.y, 'Logo must sit above the hero page links');
            const orderCenter = landscape ? viewport.width / 4 : dimensions.hero.x + dimensions.hero.width / 2 - (viewport.width >= 1024 ? 64 : 0);
            assert(Math.abs(dimensions.order.x + dimensions.order.width / 2 - orderCenter) < 2, 'Shift Order Now slightly left on desktop while keeping mobile centered');
            assert.strictEqual(await page.locator('.rcs-floating-action-directions').count(), 0, 'Remove the floating location button from the markup');
            assert(dimensions.order.width >= (landscape || viewport.width < 360 ? 200 : viewport.width < 640 ? 208 : 240) && dimensions.order.height >= (landscape || viewport.width < 640 ? 56 : 64), 'Order Now must retain a comfortable touch target');
            if (viewport.width < 1024) {
                assert(dimensions.order.y >= viewport.height * 0.5 && dimensions.order.bottom <= viewport.height - 70, 'Mobile Order Now should sit low on screen and clear the bottom navigation');
                assert(Math.abs(dimensions.logo.x + dimensions.logo.width / 2 - (landscape ? viewport.width * 0.75 : viewport.width / 2)) < 2, 'Mobile logo must be centered over its link column');
                assert.strictEqual(await page.locator('.rcs-hero-page-links').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length), 1, 'Mobile hero links must use a single column');
            } else {
                assert(dimensions.order.y + dimensions.order.height / 2 - dimensions.hero.y < dimensions.hero.height / 2, 'Preserve desktop Order Now height');
                assert(Math.abs(dimensions.logo.x + dimensions.logo.width / 2 - dimensions.heroLinks.x - dimensions.heroLinks.width / 2) < 2, 'Center the desktop logo above its link panel');
            }
            assert.strictEqual(await page.locator('.rcs-hero-order-button').innerText(), 'Order Now');
            assert.strictEqual(await page.locator('.rcs-hero-introduction h1').count(), 0, 'Remove the visible restaurant heading');
            assert(dimensions.heroLinks.y >= dimensions.hero.y + 48 && dimensions.heroLinks.bottom < dimensions.hero.bottom, 'Hero links must fit inside the video area');
            assert.strictEqual(await page.locator('.rcs-collection').count(), 2);
            assert.strictEqual(await page.locator('.rcs-menu-collections p, .rcs-front-video-hero p').count(), 0, 'Homepage should not repeat marketing sentences');
            assert(await page.locator('.rcs-promo-poster').evaluateAll(images => images.every(image => Math.abs(image.width / image.height - 1.5) < 0.02 && getComputedStyle(image).objectFit === 'contain')), 'Show complete posters without cropping their text');
            assert(await page.locator('.rcs-collection img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0)), 'All collection food images must load');
            await page.getByRole('button', { name: 'Pause background videos' }).click();
            await page.getByRole('button', { name: 'Play background videos' }).waitFor();
            assert(await page.locator('.rcs-plain-video-carousel').evaluate(el => !el.swiper.autoplay.running), 'Pause must stop carousel motion');
            await page.getByRole('button', { name: 'Play background videos' }).click();
            assert.strictEqual(await page.locator('.rcs-hero-page-links a').filter({ hasText: /^MENU$/ }).getAttribute('href'), '/menu');
            assert.strictEqual(await page.locator('.rcs-hero-page-links a').filter({ hasText: /^ORDERS$/ }).getAttribute('href'), '/my-orders');
            assert.deepStrictEqual(await page.locator('.rcs-hero-page-links span').allTextContents(), ['MENU', 'OFFERS', 'LOCATION', 'ORDERS', 'ABOUT', 'FEEDBACK']);
            assert(await page.locator('.rcs-hero-page-links span').evaluateAll(labels => labels.every(label => label.scrollWidth <= label.clientWidth + 1)), 'Each single-word label must fit without clipping');
            assert(dimensions.logo.width <= (viewport.width < 1024 ? 73 : 113), 'Hero logo should use the newly reduced size');
            assert(await page.locator('.rcs-hero-page-links a').first().evaluate(el => getComputedStyle(el).fontFamily.includes('Palatino')), 'Hero links should use the refined serif treatment');
            assert.strictEqual(await page.locator('.rcs-hero-page-links .fa-arrow-right, .rcs-hero-page-links .fa-arrow-up-right-from-square').count(), 0, 'Remove trailing arrows from the component markup');
            assert(dimensions.logo.y < dimensions.hero.y + (viewport.width < 1024 ? 120 : dimensions.hero.height * 0.25), 'Move the logo and link section higher in the hero');
            assert(await page.locator('.rcs-hero-page-links a').evaluateAll(links => links.every(link => {
                const label = link.querySelector('span'), icon = link.querySelector('i');
                const rule = getComputedStyle(label, '::after');
                const text = label.getBoundingClientRect(), symbol = icon.getBoundingClientRect();
                return rule.content === '""' && Math.abs(parseFloat(rule.width) - text.width) < 1 && rule.left === '0px' && rule.height === '1px' && text.left - symbol.right >= 8 && text.left - symbol.right <= 13;
            })), 'Align close icon/text columns with underlines directly beneath each label');
            assert(await page.locator('.rcs-hero-page-links span').evaluateAll(labels => labels.every(label => Math.abs(label.getBoundingClientRect().left - labels[0].getBoundingClientRect().left) < 1)), 'Justify all hero labels on one consistent left edge');
            const fixedBefore = await page.locator('.rcs-floating-actions').boundingBox();
            await page.evaluate(() => scrollTo(0, 500));
            const fixedAfter = await page.locator('.rcs-floating-actions').boundingBox();
            assert(Math.abs(fixedBefore.y - fixedAfter.y) <= 1, 'Floating contact controls must remain visible on scroll');
            await page.evaluate(() => scrollTo(0, 0));
            if (viewport.width < 1024) {
                assert(dimensions.header.height <= 49, 'Mobile header must be compact');
                assert.strictEqual(dimensions.headerBackground, 'rgba(255, 255, 255, 0.88)', 'Header should provide strong contrast over the video');
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
                assert(dimensions.footer.height < 380, 'Expanded desktop footer must not fill the screen');
            }
            for (const name of ['Android', 'iOS']) {
                assert.strictEqual(await page.locator('.rcs-footer-download-button').filter({ hasText: name }).getAttribute('href'), '/install-app');
            }
            assert.strictEqual(await page.locator('.rcs-footer-tagline').innerText(), 'Bringing class to cuisine');
            assert.strictEqual(await page.locator('.rcs-footer-quicklinks a').count(), 8, 'Display all six configured page links plus Menu and Offers');
            assert.strictEqual(await page.locator('.rcs-footer-quicklinks a').filter({ hasText: 'Refund Policy' }).getAttribute('href'), '/page/page-5');
            const overlaps = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
            assert(!overlaps(dimensions.order, dimensions.logo) && !overlaps(dimensions.order, dimensions.heroLinks), 'Hero navigation and logo must not cover Order Now');
            const pauseBox = await page.locator('.rcs-hero-motion-toggle').boundingBox();
            const whatsappBox = await page.locator('.rcs-floating-action-whatsapp').boundingBox();
            const menuBox = await page.locator('.rcs-hero-menu-button').boundingBox();
            const contactButton = await page.locator('.rcs-floating-action-call').boundingBox();
            if (viewport.width < 1024) {
                assert(Math.abs(contactButton.y - whatsappBox.y) < 1, 'Align phone and WhatsApp at the same height');
                assert(contactButton.x <= 20 && viewport.width - whatsappBox.x - whatsappBox.width <= 20, 'Keep phone on the left and WhatsApp on the right');
            }
            if (viewport.width < 640) {
                assert.strictEqual(menuBox.width, 52, 'Mobile floating Menu should be compact');
                assert.strictEqual(contactButton.width, 44, 'Mobile contact buttons should keep 44px touch targets');
                assert(dimensions.footer.height < 570, 'Mobile footer should avoid the old unbalanced tall layout');
                const footerLayout = await page.locator('.rcs-footer-quicklinks').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
                assert.strictEqual(footerLayout, 2, 'Mobile footer links should use two balanced columns');
            } else if (viewport.width >= 1024) {
                assert.strictEqual(menuBox.width, 72, 'Preserve desktop Menu size');
                assert.strictEqual(contactButton.width, 52, 'Preserve desktop contact icon sizes');
                assert.strictEqual(pauseBox.width, 48, 'Preserve desktop video control size');
            }
            assert(await page.locator('.rcs-footer-strip a').evaluateAll(links => links.every(link => {
                const box = link.getBoundingClientRect();
                return box.left >= 0 && box.right <= innerWidth + 1 && link.scrollWidth <= link.clientWidth + 1;
            })), 'Footer text and links must fit their columns');
            for (const control of [contactButton, whatsappBox]) {
                assert(!overlaps(pauseBox, control), 'Pause and contact buttons must not overlap');
                assert(!overlaps(dimensions.order, control), 'Order Now must not overlap contact buttons');
                assert(!overlaps(dimensions.heroLinks, control), 'Reserve space beside hero links for contact buttons');
            }
            assert(!overlaps(dimensions.order, pauseBox), 'Order Now must not overlap the video control');
            assert(await page.locator('.rcs-hero-page-links a').first().evaluate(el => parseFloat(getComputedStyle(el).fontSize)) >= (landscape ? 18 : viewport.width < 1024 ? 26 : 28), 'Hero navigation must use the newly enlarged type sizes');
            for (const selector of ['.rcs-floating-actions', '.rcs-hero-menu-button', '.rcs-hero-motion-toggle']) {
                const box = await page.locator(selector).boundingBox();
                assert(box.x >= 0 && box.x <= (landscape && selector === '.rcs-hero-motion-toggle' ? 172 : 20), selector + ' must remain in the left control area');
            }
            if ([390, 1440].includes(viewport.width)) {
                await page.locator('.menu-slides').scrollIntoViewIfNeeded();
                const box = await page.locator('.menu-slides').boundingBox();
                const x = viewport.width / 2, y = box.y + box.height / 2;
                const urlBeforeDrag = page.url();
                const session = await page.context().newCDPSession(page);
                const position = () => page.locator('.menu-slides').evaluate(el => el.swiper.getTranslate());
                for (const direction of [-1, 1]) {
                    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
                    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + direction * 20, y }] });
                    const before = await position();
                    for (let distance = 40; distance <= 100; distance += 20) {
                        await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + direction * distance, y }] });
                    }
                    const after = await position();
                    assert((after - before) * direction > 30, 'Touch must move the carousel in either direction');
                    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
                    assert.strictEqual(page.url(), urlBeforeDrag, 'Swiping must not open a category');
                    const released = await position();
                    await page.waitForFunction(start => {
                        const swiper = document.querySelector('.menu-slides').swiper;
                        return swiper.autoplay.running && Math.abs(swiper.getTranslate() - start) > 2;
                    }, released, { timeout: 3000 });
                }
                await session.detach();
                const target = await page.locator('.menu-slides a').evaluateAll(links => {
                    const link = links.find(link => { const box = link.getBoundingClientRect(); return box.left >= 20 && box.right < innerWidth - 80; });
                    if (!link) return null;
                    const box = link.getBoundingClientRect();
                    return { href: link.getAttribute('href'), x: box.x + box.width / 2, y: box.y + box.height / 2 };
                });
                assert(target, 'A visible category should be tappable after swiping');
                await page.touchscreen.tap(target.x, target.y);
                await page.waitForURL('**' + target.href);
                console.log('Category touch left/right, autoplay resume and tap passed:', viewport.width);
                await page.evaluate(() => scrollTo(0, 0));
            }
            await page.screenshot({ path: path.join(os.tmpdir(), 'rcs-responsive-' + viewport.width + '.png'), fullPage: true });
            console.log('Responsive layout passed:', viewport.width, 'header', dimensions.header.height, 'hero', dimensions.hero.height, 'footer', dimensions.footer.height);
        }
        for (const width of [320, 390, 1440]) {
            await page.setViewportSize({ width, height: 844 });
            // Mount the actual install component through its fixture route.
            await page.goto('http://127.0.0.1:' + server.address().port + '/install-app?install=1');
            const download = page.getByRole('button', { name: 'Download App', exact: true });
            await download.waitFor();
            const picture = page.locator('.rcs-pwa-share-figure img');
            await picture.evaluate(image => image.decode());
            assert.strictEqual(await picture.evaluate(image => image.naturalWidth), 50);
            assert.strictEqual(await page.locator('.rcs-pwa-ios-guide li').count(), 4);
            assert.strictEqual(await page.getByRole('button', { name: /Share Link/i }).count(), 0);
            assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), 'Install page must fit the screen');
            await download.click();
            assert.strictEqual(await page.evaluate(() => document.activeElement.id), 'rcs-pwa-guide-title');
            await page.evaluate(() => {
                window.promptCalls = 0;
                const event = new Event('beforeinstallprompt', { cancelable: true });
                event.prompt = async () => { window.promptCalls++; };
                event.userChoice = Promise.resolve({ outcome: 'accepted' });
                dispatchEvent(event);
            });
            assert.strictEqual(await page.evaluate(() => window.promptCalls), 0, 'Never install automatically');
            await download.click();
            await page.waitForFunction(() => window.promptCalls === 1);
            await page.getByRole('status').filter({ hasText: 'Finish installing' }).waitFor();
            await page.evaluate(() => dispatchEvent(new Event('appinstalled')));
            assert(await page.getByRole('button', { name: 'Installed', exact: true }).isDisabled());
            await page.screenshot({ path: path.join(os.tmpdir(), 'rcs-install-' + width + '.png'), fullPage: true });
            console.log('Download page layout, iPhone image and explicit install passed:', width);
        }
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.goto('http://127.0.0.1:' + server.address().port);
        await page.getByRole('button', { name: 'Play background videos' }).waitFor();
        assert(await page.locator('.rcs-plain-video-carousel').evaluate(el => !el.swiper.autoplay.running), 'Reduced motion must disable background autoplay');
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await page.setViewportSize({ width: 390, height: 844 });
        for (const width of [320, 390]) {
            await page.setViewportSize({ width, height: 844 });
            for (const mode of ['grid', 'list']) {
                await page.goto('http://127.0.0.1:' + server.address().port + '/?cards=' + mode);
                const cards = page.locator('.product-card-' + mode);
                await cards.first().waitFor({ state: 'visible' });
                assert.strictEqual(await cards.count(), 4);
                assert(await cards.evaluateAll(elements => elements.every(card => {
                    const box = card.getBoundingClientRect();
                    return box.right <= innerWidth + 1 && [...card.querySelectorAll('h3, h4, p, button')].every(child => {
                        const rect = child.getBoundingClientRect();
                        return rect.left >= box.left - 1 && rect.right <= box.right + 1 && child.scrollWidth <= child.clientWidth + 1;
                    });
                })), 'Menu card text, prices and buttons must fit: ' + width + ' ' + mode);
                const add = await page.locator('.product-card-' + mode + '-cart-btn').first().boundingBox();
                assert(add.height >= 40, 'Menu Add buttons need comfortable touch targets');
                await page.screenshot({ path: path.join(os.tmpdir(), 'rcs-menu-' + mode + '-' + width + '.png'), fullPage: true });
                console.log('Mobile menu cards fit:', width, mode);
            }
        }
        const googleTestUrl = 'http://127.0.0.1:' + server.address().port + '/?google=1';
        await page.goto(googleTestUrl);
        await page.getByRole('button', { name: 'Sign up with Google' }).click();
        assert((await page.getByRole('alert').textContent()).includes('currently unavailable'));
        googleEnabled = true;
        await page.goto(googleTestUrl);
        await page.getByRole('button', { name: 'Google test account' }).click();
        await page.waitForURL('http://127.0.0.1:' + server.address().port + '/');
        assert.deepStrictEqual(await page.evaluate(() => window.lastGooglePayload), {
            credential: 'verified-test-credential', nonce: 'a'.repeat(64)
        });
        await page.goto(googleTestUrl);
        await page.evaluate(() => { window.googleLoginError = 'Please sign in using your existing method.'; });
        await page.getByRole('button', { name: 'Google test account' }).click();
        assert.strictEqual(await page.getByRole('alert').textContent(), 'Please sign in using your existing method.');
        assert.strictEqual(page.url(), googleTestUrl);
        console.log('Google signup: unavailable state, credential submission, navigation and account conflict passed');
        assert.deepStrictEqual(errors, [], 'Components must render without runtime errors');
    } finally {
        if (browser) await browser.close();
        await new Promise(resolve => server.close(resolve));
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
