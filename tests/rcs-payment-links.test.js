const assert = require('assert');
const fs = require('fs');

(async () => {
    const source = fs.readFileSync('resources/js/services/paymentLinks.js', 'utf8');
    const { paymentCheckoutUrl } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
    assert.strictEqual(paymentCheckoutUrl(42, 'https://rcs.co.ke'), 'https://rcs.co.ke/payment/42/pay');
    assert.strictEqual(paymentCheckoutUrl(42, 'https://backend.test/store/'), 'https://backend.test/store/payment/42/pay');
    assert.throws(() => paymentCheckoutUrl('../other', 'https://rcs.co.ke'));
    assert.throws(() => paymentCheckoutUrl(42, 'javascript:alert(1)'));
    for (const file of [
        'resources/js/components/frontend/account/myOrder/OrderDetailsComponent.vue',
        'resources/js/components/frontend/account/myOrder/MyOrderComponent.vue',
        'resources/js/components/table/order/OrderDetailsComponent.vue',
        'resources/js/components/table/tableMenu/TableMenuComponent.vue',
    ]) {
        const component = fs.readFileSync(file, 'utf8');
        assert(component.includes('paymentCheckoutUrl'), 'Every checkout link must use the configured backend');
        assert(!component.includes("'/payment/' + order.id"));
    }
    console.log('Payment links target the backend rather than the static frontend');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
