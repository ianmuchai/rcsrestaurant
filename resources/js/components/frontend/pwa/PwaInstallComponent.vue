<template>
    <section class="rcs-pwa-install-page">
        <div class="container">
            <div class="rcs-pwa-install-hero">
                <div class="rcs-pwa-install-copy">
                    <span class="rcs-pwa-install-kicker">RC's Restaurant</span>
                    <h1>Download RC's app</h1>
                    <p>
                        Keep RC's on your home screen for quick ordering and menu access.
                    </p>
                    <div class="rcs-pwa-install-actions">
                        <button type="button" class="rcs-pwa-primary-button" :disabled="isInstalled || isInstalling"
                            @click="nativeInstall">
                            <i class="fa-solid fa-cloud-arrow-down" aria-hidden="true"></i>
                            <span>{{ installButtonLabel }}</span>
                        </button>
                        <router-link class="rcs-pwa-secondary-button" :to="{ name: 'frontend.home' }">
                            Continue on website
                        </router-link>
                    </div>
                </div>

                <section class="rcs-pwa-ios-guide" aria-labelledby="rcs-pwa-guide-title">
                    <h2 id="rcs-pwa-guide-title" ref="installGuide" tabindex="-1">Install on iPhone or iPad</h2>
                    <ol>
                        <li>Open this page in <strong>Safari</strong>.</li>
                        <li>Tap <strong>Share</strong> (the square with an upward arrow).
                            If it is hidden, open <strong>Page Menu</strong> or <strong>More</strong> first.</li>
                        <li>Select <strong>Add to Home Screen</strong>.</li>
                        <li>Turn on <strong>Open as Web App</strong> if shown, then tap <strong>Add</strong>.</li>
                    </ol>
                    <figure class="rcs-pwa-share-figure">
                        <img src="/images/pwa/ios-share-button.png" width="50" height="60"
                            alt="Safari Share button: a square with an upward arrow">
                        <figcaption>Safari Share button.
                            <a href="https://support.apple.com/en-lamr/guide/iphone/iphea86e5236/ios"
                                target="_blank" rel="noopener noreferrer">Apple's iPhone guide</a>
                        </figcaption>
                    </figure>
                </section>
            </div>
            <div class="rcs-pwa-qr-links">
                <details>
                    <summary>QR install link</summary>
                    <article class="rcs-pwa-link-card">
                        <div>
                            <strong>Customer install page</strong>
                            <a :href="installPageUrl">{{ installPageUrl }}</a>
                        </div>
                        <button type="button" class="rcs-pwa-copy-button" @click="copyLink(installPageUrl)">
                            <i class="fa-regular fa-copy" aria-hidden="true"></i>
                            <span>Copy</span>
                        </button>
                    </article>
                </details>
            </div>
            <p class="rcs-pwa-copy-status" role="status" aria-live="polite">{{ copyStatus }}</p>
        </div>
    </section>
</template>

<script>
export default {
    name: "PwaInstallComponent",
    data() {
        return {
            installPrompt: null,
            isInstalled: false,
            isInstalling: false,
            isIos: false,
            copyStatus: "",
            origin: "",
        };
    },
    computed: {
        installPageUrl() {
            return `${this.origin}/install-app`;
        },
        installButtonLabel() {
            if (this.isInstalled) {
                return "Installed";
            }

            return this.isInstalling ? "Installing..." : "Download App";
        },
    },
    mounted() {
        this.origin = window.location.origin;
        this.isIos = /iPad|iPhone|iPod/i.test(navigator.userAgent)
            || (/Mac/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
        this.ensurePwaManifest();
        this.registerPwaServiceWorker();
        this.syncInstalledState();
        window.addEventListener("beforeinstallprompt", this.handleBeforeInstallPrompt);
        window.addEventListener("appinstalled", this.handleAppInstalled);
    },
    beforeUnmount() {
        window.removeEventListener("beforeinstallprompt", this.handleBeforeInstallPrompt);
        window.removeEventListener("appinstalled", this.handleAppInstalled);
    },
    methods: {
        syncInstalledState() {
            const standaloneDisplay = window.matchMedia
                && window.matchMedia("(display-mode: standalone)").matches;
            const iosStandalone = window.navigator && window.navigator.standalone === true;
            this.isInstalled = this.isInstalled || Boolean(standaloneDisplay || iosStandalone);
        },
        handleBeforeInstallPrompt(event) {
            event.preventDefault();
            if (this.isInstalled) {
                return;
            }
            this.installPrompt = event;
        },
        handleAppInstalled() {
            this.installPrompt = null;
            this.isInstalled = true;
            this.copyStatus = "RC's is installed on this device.";
        },
        ensurePwaManifest() {
            if (document.querySelector('link[rel="manifest"]')) {
                return;
            }

            const manifest = document.createElement("link");
            manifest.rel = "manifest";
            manifest.href = "/manifest.webmanifest";
            document.head.appendChild(manifest);
        },
        registerPwaServiceWorker() {
            if (!("serviceWorker" in navigator)) {
                return;
            }

            navigator.serviceWorker.register("/sw.js").catch(() => {});
        },
        async nativeInstall() {
            if (this.isInstalled || this.isInstalling) {
                return;
            }

            if (!this.installPrompt) {
                await this.showInstallGuide();
                return;
            }

            const promptEvent = this.installPrompt;
            this.installPrompt = null;
            this.isInstalling = true;
            try {
                await promptEvent.prompt();
                const choice = await promptEvent.userChoice;
                if (!this.isInstalled) {
                    if (choice && choice.outcome === "accepted") {
                        this.copyStatus = "Finish installing RC's in your browser.";
                    } else {
                        await this.showInstallGuide();
                    }
                }
            } catch {
                if (!this.isInstalled) {
                    await this.showInstallGuide();
                }
            } finally {
                this.isInstalling = false;
            }
        },
        async showInstallGuide() {
            this.copyStatus = this.isIos
                ? "Open this page in Safari and follow the iPhone or iPad steps."
                : "On Android, open your browser menu and choose Install app or Add to Home Screen. On iPhone or iPad, follow the Safari steps.";
            await this.$nextTick(() => {
                const guide = this.$refs.installGuide;
                if (guide) {
                    guide.focus();
                }
            });
        },
        async copyLink(url) {
            try {
                if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
                    await navigator.clipboard.writeText(url);
                    this.copyStatus = "Install link copied.";
                    return;
                }
            } catch {
                // The visible URL remains available when clipboard permission is denied.
            }
            this.copyStatus = `Copy this install link: ${url}`;
        },
    },
};
</script>
