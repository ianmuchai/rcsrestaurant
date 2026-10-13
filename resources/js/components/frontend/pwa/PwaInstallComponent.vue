<template>
    <section class="rcs-pwa-install-page">
        <div class="container">
            <div class="rcs-pwa-install-hero">
                <div class="rcs-pwa-install-copy">
                    <span class="rcs-pwa-install-kicker">RC's app access</span>
                    <h1>Install RC's Restaurant</h1>
                    <p>
                        Use this page as the QR code destination for customers who want quick access to ordering,
                        menu browsing, and offline app support on their device.
                    </p>
                    <div class="rcs-pwa-install-actions">
                        <button type="button" class="rcs-pwa-primary-button" :disabled="isInstalled"
                            @click="nativeInstall">
                            <i class="fa-solid fa-cloud-arrow-down"></i>
                            <span>{{ installButtonLabel }}</span>
                        </button>
                        <button type="button" class="rcs-pwa-secondary-button" @click="shareInstallPage">
                            <i class="fa-solid fa-share-nodes"></i>
                            <span>Share Link</span>
                        </button>
                    </div>
                </div>

                <div class="rcs-pwa-link-stack" aria-label="PWA links for QR codes">
                    <article class="rcs-pwa-link-card" v-for="link in installLinks" :key="link.label">
                        <div>
                            <span>{{ link.label }}</span>
                            <strong>{{ link.title }}</strong>
                            <a :href="link.url" target="_blank" rel="noopener noreferrer">{{ link.url }}</a>
                        </div>
                        <button type="button" class="rcs-pwa-copy-button" @click="copyLink(link.url)">
                            <i class="fa-regular fa-copy"></i>
                            <span>Copy</span>
                        </button>
                    </article>
                    <p class="rcs-pwa-copy-status" aria-live="polite">{{ copyStatus }}</p>
                </div>
            </div>
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
            copyStatus: "",
            origin: "",
        };
    },
    computed: {
        installPageUrl() {
            return `${this.origin}/install-app`;
        },
        manifestUrl() {
            return `${this.origin}/manifest.webmanifest`;
        },
        serviceWorkerUrl() {
            return `${this.origin}/sw.js`;
        },
        installLinks() {
            return [
                {
                    label: "QR URL",
                    title: "Customer install page",
                    url: this.installPageUrl,
                },
                {
                    label: "Manifest",
                    title: "PWA manifest URL",
                    url: this.manifestUrl,
                },
                {
                    label: "Service worker",
                    title: "Offline support URL",
                    url: this.serviceWorkerUrl,
                },
            ];
        },
        installButtonLabel() {
            if (this.isInstalled) {
                return "Installed";
            }

            return this.installPrompt ? "Install App" : "Open From QR";
        },
    },
    mounted() {
        this.origin = window.location.origin;
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
            this.isInstalled = standaloneDisplay || iosStandalone;
        },
        handleBeforeInstallPrompt(event) {
            event.preventDefault();
            this.installPrompt = event;
            this.isInstalled = false;
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
            if (this.isInstalled) {
                return;
            }

            if (!this.installPrompt) {
                await this.copyLink(this.installPageUrl);
                return;
            }

            const promptEvent = this.installPrompt;
            this.installPrompt = null;
            await promptEvent.prompt();

            if (promptEvent.userChoice) {
                const choice = await promptEvent.userChoice;
                this.isInstalled = choice.outcome === "accepted";
            }
        },
        async shareInstallPage() {
            if (navigator.share) {
                await navigator.share({
                    title: "Install RC's Restaurant",
                    text: "Install RC's Restaurant for quick ordering and menu access.",
                    url: this.installPageUrl,
                });
                return;
            }

            await this.copyLink(this.installPageUrl);
        },
        async copyLink(url) {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(url);
                this.copyStatus = "Link copied for QR or sharing.";
                return;
            }

            this.copyStatus = url;
        },
    },
};
</script>
