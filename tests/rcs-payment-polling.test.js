const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const blade = fs.readFileSync('resources/views/payment.blade.php', 'utf8');
const start = blade.indexOf('let checkTimer;');
assert(start > 0, 'Payment confirmation polling must exist');
const script = blade.slice(start, blade.indexOf('</script>', start));

async function scenario(status, options = {}) {
    const elements = Object.fromEntries(['paymentWaitingMessage', 'checkPaymentAgain', 'cancelPayment'].map(id =>
        [id, { hidden: true, textContent: '', addEventListener(event, callback) { this[event] = callback; } }]));
    const timers = new Map();
    let timerId = 0;
    let clockCalls = 0;
    let fetches = 0;
    const context = {
        successUrl: '/success', failUrl: '/fail', cancelUrl: '/cancel', paymentStatusUrl: '/status',
        window: { location: { href: '' } }, document: { getElementById: id => elements[id] },
        AbortController, Date: { now: () => options.expired && clockCalls++ ? 180001 : 0 },
        setTimeout: (callback, delay) => { timers.set(++timerId, { callback, delay }); return timerId; },
        clearTimeout: id => timers.delete(id),
        fetch: async (url, settings) => {
            fetches++;
            assert.strictEqual(url, '/status');
            assert.strictEqual(settings.cache, 'no-store');
            if (options.networkError) throw new Error('Temporary outage');
            return { ok: true, json: async () => ({ status }) };
        },
    };
    vm.runInNewContext(script, context);
    await new Promise(resolve => setImmediate(resolve));
    return { context, elements, timers, fetches: () => fetches };
}

(async () => {
    for (const [status, target] of [['completed', '/success'], ['failed', '/fail']]) {
        const result = await scenario(status);
        assert.strictEqual(result.context.window.location.href, target);
        assert.strictEqual(result.timers.size, 0, 'Settlement must stop polling');
    }
    const pending = await scenario('pending');
    assert.strictEqual(pending.context.window.location.href, '');
    assert.deepStrictEqual([...pending.timers.values()].map(timer => timer.delay), [5000]);
    const outage = await scenario('pending', { networkError: true });
    assert.strictEqual(outage.context.window.location.href, '', 'Network errors must not report payment failure');
    assert(outage.elements.paymentWaitingMessage.textContent.includes('do not pay again'));
    const delayed = await scenario('pending', { expired: true });
    assert.strictEqual(delayed.elements.checkPaymentAgain.hidden, false);
    assert.strictEqual(delayed.timers.size, 0, 'Long waits must stop the endless spinner loop');
    delayed.elements.checkPaymentAgain.click();
    await new Promise(resolve => setImmediate(resolve));
    assert.strictEqual(delayed.fetches(), 2, 'Explicit retry must check status without initiating payment');
    pending.elements.cancelPayment.click();
    assert.strictEqual(pending.context.window.location.href, '/cancel');
    assert.strictEqual(pending.timers.size, 0);
    console.log('Payment waiting screen: settlement, outage, timeout, explicit recheck and exit passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
