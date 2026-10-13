<template>
    <div v-if="isFrontendRoute" class="rcs-floating-actions" aria-label="Quick contact actions">
        <a :href="callUrl" data-rcs-action="call_click" class="rcs-floating-action rcs-floating-action-call"
            aria-label="Call RC's" title="Call RC's">
            <i class="fa-solid fa-phone"></i>
            <span class="rcs-floating-action-label">Call</span>
        </a>
        <a :href="whatsappUrl" target="_blank" rel="noopener" data-rcs-action="whatsapp_click"
            class="rcs-floating-action rcs-floating-action-whatsapp" aria-label="WhatsApp RC's" title="WhatsApp RC's">
            <i class="fa-brands fa-whatsapp"></i>
            <span class="rcs-floating-action-label">WhatsApp</span>
        </a>
        <a :href="directionsUrl" target="_blank" rel="noopener" data-rcs-action="directions_click"
            class="rcs-floating-action rcs-floating-action-directions" aria-label="Get directions to RC's"
            title="Get directions">
            <i class="fa-solid fa-location-dot"></i>
            <span class="rcs-floating-action-label">Directions</span>
        </a>
        <button type="button" data-rcs-action="pwa_install_click"
            class="rcs-floating-action rcs-floating-action-install" :disabled="isPwaInstalled"
            :aria-label="pwaInstallLabel" :title="pwaInstallLabel" @click="installPwaApp">
            <i class="fa-solid fa-cloud-arrow-down"></i>
            <span class="rcs-floating-action-label">{{ pwaInstallLabel }}</span>
        </button>
    </div>
</template>

<script>
export default {
    name: "FrontendQuickActionsComponent",
    data() {
        return {
            callUrl: "tel:+254712878787",
            whatsappUrl: "https://wa.me/254712878787",
            directionsUrl: "https://www.google.com/maps/search/?api=1&query=RC%27s%20Moon%20Palace%20Hotel%20General%20Waruingi%20Rd%20Nairobi",
            installPrompt: null,
            isPwaInstallAvailable: false,
            isPwaInstalled: false
        };
    },
    computed: {
        isFrontendRoute: function () {
            return this.$route.meta.isFrontend === true;
        },
        isPwaInstallVisible: function () {
            return this.isFrontendRoute;
        },
        pwaInstallLabel: function () {
            if (this.isPwaInstalled) {
                return "App Installed";
            }

            return this.isPwaInstallAvailable ? "Install App" : "Install App";
        }
    },
    mounted() {
        this.syncPwaInstalledState();

        if (typeof window !== "undefined") {
            window.addEventListener("beforeinstallprompt", this.handleBeforeInstallPrompt);
            window.addEventListener("appinstalled", this.handleAppInstalled);
        }
    },
    beforeUnmount() {
        if (typeof window !== "undefined") {
            window.removeEventListener("beforeinstallprompt", this.handleBeforeInstallPrompt);
            window.removeEventListener("appinstalled", this.handleAppInstalled);
        }
    },
    methods: {
        syncPwaInstalledState() {
            if (typeof window === "undefined") {
                return;
            }

            const standaloneDisplay = window.matchMedia
                && window.matchMedia("(display-mode: standalone)").matches;
            const iosStandalone = window.navigator && window.navigator.standalone === true;
            this.isPwaInstalled = standaloneDisplay || iosStandalone;
        },
        handleBeforeInstallPrompt(event) {
            event.preventDefault();
            this.installPrompt = event;
            this.isPwaInstallAvailable = true;
            this.isPwaInstalled = false;
        },
        handleAppInstalled() {
            this.installPrompt = null;
            this.isPwaInstallAvailable = false;
            this.isPwaInstalled = true;
        },
        async installPwaApp() {
            if (this.isPwaInstalled || !this.installPrompt) {
                return;
            }

            const promptEvent = this.installPrompt;
            this.installPrompt = null;
            await promptEvent.prompt();

            if (promptEvent.userChoice) {
                const choice = await promptEvent.userChoice;
                this.isPwaInstallAvailable = choice.outcome !== "accepted";
            } else {
                this.isPwaInstallAvailable = false;
            }
        }
    }
}
</script>
