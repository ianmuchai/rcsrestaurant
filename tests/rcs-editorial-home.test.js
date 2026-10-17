const assert = require('assert');
const fs = require('fs');
const { parse, compileTemplate } = require('@vue/compiler-sfc');
const base = 'resources/js/components/frontend/home/';
const home = fs.readFileSync(base + 'HomeComponent.vue', 'utf8');
assert(!home.includes('FeaturedItemComponent') && !home.includes('PopularItemComponent'), 'Homepage must replace both old item sections');
assert(home.includes('<MenuCollectionsComponent :categories="categories" />'));
for (const file of [base + 'HomeComponent.vue', base + 'TrackOrderComponent.vue', 'resources/js/components/layouts/frontend/FrontendFooterComponent.vue']) {
    assert(!fs.readFileSync(file, 'utf8').includes('<LoadingComponent'), 'Background homepage content must not block the entire page with a loading overlay: ' + file);
}

(async () => {
    for (const name of ['HomeComponent', 'MenuCollectionsComponent', 'SliderComponent']) {
        const file = base + name + '.vue';
        const { descriptor } = parse(fs.readFileSync(file, 'utf8'));
        assert.deepStrictEqual(compileTemplate({ source: descriptor.template.content, filename: file, id: name }).errors, []);
    }
    const source = fs.readFileSync(base + 'MenuCollectionsComponent.vue', 'utf8');
    const { descriptor } = parse(source);
    const { default: component } = await import('data:text/javascript;base64,' + Buffer.from(descriptor.script.content).toString('base64'));
    const state = { ...component.data(), categories: [{ slug: 'steak', name: 'Steak' }, { slug: 'rcs-signatures', name: "RC's Signatures" }, { slug: 'teas-coffee', name: 'Teas & Coffee' }] };
    const collections = component.computed.collections.call(state);
    assert.strictEqual(collections.length, 2, 'Replace the four verbose blocks with two designed posters');
    assert.strictEqual(collections[0].to.query.s, 'rcs-signatures');
    assert(!source.includes('collection.description') && !source.includes('rcs-visit-strip'));
    assert(source.includes('rcs-promo-poster') && source.includes('1536') && source.includes('1024'));
    assert.strictEqual(collections.find(x => x.key === 'coffee').to.query.s, 'teas-coffee');
    for (const collection of collections) {
        assert.strictEqual(collection.to.name, 'frontend.menu');
        assert(fs.existsSync('public' + collection.image), 'Every collection needs a real local food image');
        assert(fs.statSync('public' + collection.image).size < 250 * 1024, 'Poster images must remain lightweight');
    }
    const fallback = component.computed.collections.call({ ...state, categories: [] });
    assert(fallback.every(x => !x.to.query), 'Unavailable categories must fall back to the complete menu');
    const slider = fs.readFileSync(base + 'SliderComponent.vue', 'utf8');
    const styles = require('postcss').parse(fs.readFileSync('resources/css/app.css', 'utf8'));
    const heroLinkRule = styles.nodes.find(node => node.selector === '.rcs-hero-page-links a');
    assert(!heroLinkRule.nodes.some(node => node.prop === 'border-top'), 'Replace full-width hero dividers with short underlines');
    const underline = styles.nodes.find(node => node.selector === '.rcs-hero-page-links a::after');
    assert(underline && underline.nodes.some(node => node.prop === 'width' && node.value === '72px'), 'Hero links need restrained short underlines');
    assert(slider.includes('<video') && slider.includes('playsinline') && !slider.includes(':poster='));
    assert(slider.includes('rcs-hero-page-links') && slider.includes('<h1'));
    for (const label of ['MENU', 'OFFERS', 'LOCATION', 'ORDERS', 'ABOUT', 'FEEDBACK']) {
        assert(slider.includes('<span>' + label + '</span>'), 'Hero links should have single-word uppercase labels: ' + label);
    }
    assert(slider.includes('rcs-hero-link-panel'), 'Logo and page links need their own section');
    assert(slider.includes('<span>Order Now</span>') && !slider.includes('<span>Order Online</span>'));
    assert(!slider.includes('<h1>RC\'s Restaurant</h1>'), 'The visible restaurant heading must be removed');
    assert(slider.includes('frontend.myOrder') && slider.includes('frontend.offers'));
    assert(slider.includes('wa.me/254712878787') && slider.includes('google.com/maps'));
    assert(!slider.includes('Careers'), 'Do not advertise pages that RC\'s does not have');
    console.log('Editorial homepage: composition, Vue templates, food assets, category destinations and hero navigation passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
