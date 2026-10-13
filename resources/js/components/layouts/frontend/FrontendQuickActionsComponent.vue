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
    </div>
</template>

<script>
export default {
    name: "FrontendQuickActionsComponent",
    data() {
        return {
            callUrl: "tel:+254712878787",
            whatsappUrl: "https://wa.me/254712878787",
            directionsUrl: "https://www.google.com/maps/search/?api=1&query=RC%27s%20Moon%20Palace%20Hotel%20General%20Waruingi%20Rd%20Nairobi"
        };
    },
    computed: {
        isFrontendRoute: function () {
            return this.$route.meta.isFrontend === true;
        }
    }
}
</script>
