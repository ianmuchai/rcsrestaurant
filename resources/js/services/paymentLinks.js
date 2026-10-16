export function paymentCheckoutUrl(orderId, backendUrl) {
    if (!/^\d+$/.test(String(orderId)) || Number(orderId) < 1) {
        throw new Error('A valid order is required for payment');
    }
    const url = new URL(backendUrl);
    if (!['https:', 'http:'].includes(url.protocol)) {
        throw new Error('The payment server URL is invalid');
    }
    url.pathname = `${url.pathname.replace(/\/+$/, '')}/payment/${orderId}/pay`;
    url.search = '';
    url.hash = '';
    return url.toString();
}
