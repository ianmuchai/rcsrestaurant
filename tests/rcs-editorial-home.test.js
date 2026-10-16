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
    const state = { ...component.data(), categories: [{ slug: 'breakfast-specials', name: 'Breakfast' }, { slug: 'teas-coffee', name: 'Teas & Coffee' }] };
    const collections = component.computed.collections.call(state);
    assert.strictEqual(collections.length, 4);
    assert.strictEqual(collections[0].to.query.s, 'breakfast-specials');
    assert.strictEqual(collections.find(x => x.key === 'coffee').to.query.s, 'teas-coffee');
    for (const collection of collections) {
        assert.strictEqual(collection.to.name, 'frontend.menu');
        assert(fs.existsSync('public' + collection.image), 'Every collection needs a real local food image');
    }
    const fallback = component.computed.collections.call({ ...state, categories: [] });
    assert(fallback.every(x => !x.to.query), 'Unavailable categories must fall back to the complete menu');
    const slider = fs.readFileSync(base + 'SliderComponent.vue', 'utf8');
    assert(slider.includes('<video') && slider.includes('playsinline') && !slider.includes(':poster='));
    assert(slider.includes('rcs-hero-page-links') && slider.includes('<h1'));
    assert(slider.includes('frontend.myOrder') && slider.includes('frontend.offers'));
    assert(slider.includes('wa.me/254712878787') && slider.includes('google.com/maps'));
    assert(!slider.includes('Careers'), 'Do not advertise pages that RC\'s does not have');
    console.log('Editorial homepage: composition, Vue templates, food assets, category destinations and hero navigation passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
