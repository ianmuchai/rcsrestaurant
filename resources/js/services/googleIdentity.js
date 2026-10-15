let sdkPromise;

export function loadGoogleIdentity() {
    if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
    if (sdkPromise) return sdkPromise;

    sdkPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        const timeout = setTimeout(() => {
            script.remove();
            reject(new Error('Google sign-in timed out'));
        }, 15000);
        script.onload = () => {
            clearTimeout(timeout);
            if (window.google?.accounts?.id) resolve(window.google.accounts.id);
            else reject(new Error('Google sign-in is unavailable'));
        };
        script.onerror = () => {
            clearTimeout(timeout);
            script.remove();
            reject(new Error('Google sign-in could not load'));
        };
        document.head.appendChild(script);
    }).catch(error => {
        sdkPromise = null;
        throw error;
    });
    return sdkPromise;
}
