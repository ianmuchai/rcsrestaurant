const assert = require('assert');
const fs = require('fs');
const path = require('path');
const postcss = require('postcss');

const css = postcss.parse(fs.readFileSync(path.join(__dirname, '../resources/css/app.css'), 'utf8'));
const rule = css.nodes.find(node => node.type === 'rule' && node.selector === '.rcs-hero-order-button');
const declarations = Object.fromEntries(rule.nodes.filter(node => node.type === 'decl').map(node => [node.prop, node.value]));
assert.strictEqual(declarations['text-transform'], 'uppercase', 'Display ORDER NOW in capitals');
assert(declarations['font-family'].startsWith('"Public Sans"'), 'Use the bundled Public Sans family');
assert.strictEqual(declarations['font-weight'], '600', 'Use a clear semibold weight');
assert.strictEqual(declarations['letter-spacing'], '0');
assert.strictEqual(declarations['word-spacing'], '0.18em', 'Give the two-word label breathing room');
assert.strictEqual(declarations.gap, '12px', 'Separate the icon from the label');
console.log('Order button uppercase typography passed');
