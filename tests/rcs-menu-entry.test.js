const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const { parse } = require('@vue/compiler-sfc');
const { transformSync } = require('esbuild');
const { descriptor } = parse(fs.readFileSync('resources/js/components/frontend/menu/MenuComponent.vue', 'utf8'));
const moduleContext = { exports: {} };
vm.runInNewContext(transformSync(descriptor.script.content, { format: 'cjs', loader: 'js' }).code,
    { module: moduleContext, exports: moduleContext.exports, require: () => ({}) });
const component = moduleContext.exports.default;

(async () => {
    let destination;
    const calls = [];
    const state = {
        $route: { query: { other: 'keep' } }, categories: [{ slug: 'breakfast' }],
        $router: { replace: route => { destination = route; return Promise.resolve(); } },
        loading: { isActive: false },
        $store: { dispatch: (action, payload) => { calls.push({ action, payload }); return Promise.resolve({ data: { data: { name: 'Breakfast', items: [{ id: 1 }] } } }); } },
    };
    await component.methods.categoryShow.call(state);
    assert(destination, 'Opening /menu must select an available category instead of leaving the items blank');
    assert.strictEqual(destination.query.s, 'breakfast');
    assert.strictEqual(destination.query.other, 'keep');
    state.$route.query = destination.query;
    component.methods.categoryShow.call(state);
    await new Promise(resolve => setImmediate(resolve));
    assert.strictEqual(calls[0].action, 'frontendItemCategory/show');
    assert.strictEqual(calls[0].payload.slug, 'breakfast');
    assert.strictEqual(state.items.items.length, 1);
    console.log('Menu entry selects an available category and loads its food items');
})().catch(error => { console.error(error); process.exitCode = 1; });
