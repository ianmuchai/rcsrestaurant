<template>
    <footer class="footer-part rcs-compact-footer">
        <div class="container">
            <div class="rcs-footer-strip">
                <div class="rcs-footer-brand">
                    <router-link :to="{ name: 'frontend.home' }">
                        <img class="rcs-footer-logo" src="/images/theme/theme-favicon-logo.png?v=rcs-current-logo-20261013" alt="RC's logo" width="104" height="104">
                    </router-link>
                </div>
                <nav class="rcs-footer-quicklinks" aria-label="Footer links">
                    <h2 class="rcs-footer-heading">Explore</h2>
                    <router-link :to="{ name: 'frontend.menu' }">Menu</router-link>
                    <router-link :to="{ name: 'frontend.offers' }">Offers</router-link>
                    <router-link v-for="page in footerPages" :key="page.id || page.slug"
                            :to="{ name: 'frontend.page', params: { slug: page.slug } }">
                        {{ page.title }}
                    </router-link>
                </nav>
                <div class="rcs-footer-downloads" aria-label="Download RC's app">
                    <span class="rcs-footer-download-title">Get the RC's app</span>
                    <div class="rcs-footer-download-buttons">
                        <router-link :to="{ name: 'frontend.installApp' }" class="rcs-footer-download-button"
                            data-rcs-action="footer_android_pwa">
                            <i class="fa-brands fa-android"></i>
                            <span>Android</span>
                        </router-link>
                        <router-link :to="{ name: 'frontend.installApp' }" class="rcs-footer-download-button"
                            data-rcs-action="footer_ios_pwa">
                            <i class="fa-brands fa-apple"></i>
                            <span>iOS</span>
                        </router-link>
                    </div>
                </div>
                <div class="rcs-footer-actions">
                    <h2 class="rcs-footer-heading">Contact</h2>
                    <a href="tel:+254712878787" data-rcs-action="call_click" class="rcs-footer-detail-link">
                        <i class="fa-solid fa-phone"></i>
                        <span>0712 878787</span>
                    </a>
                    <a href="https://www.google.com/maps/search/?api=1&amp;query=RC%27s%20Moon%20Palace%20Hotel%20General%20Waruingi%20Rd%20Nairobi"
                        target="_blank" rel="noopener" data-rcs-action="directions_click" class="rcs-footer-detail-link">
                        <i class="fa-solid fa-location-dot"></i>
                        <span>Directions</span>
                    </a>
                    <nav v-if="setting.social_media_facebook || setting.social_media_twitter || setting.social_media_instagram || setting.social_media_youtube"
                        class="rcs-footer-social" :aria-label="$t('label.follow_us_on')">
                        <a v-if="setting.social_media_facebook" target="_blank" :href="setting.social_media_facebook"
                            class="fa-brands fa-facebook-f" aria-label="Facebook" rel="noopener noreferrer"></a>
                        <a v-if="setting.social_media_twitter" target="_blank" :href="setting.social_media_twitter"
                            class="fa-brands fa-x-twitter" aria-label="X" rel="noopener noreferrer"></a>
                        <a v-if="setting.social_media_instagram" target="_blank" :href="setting.social_media_instagram"
                            class="fa-brands fa-instagram" aria-label="Instagram" rel="noopener noreferrer"></a>
                        <a v-if="setting.social_media_youtube" target="_blank" :href="setting.social_media_youtube"
                            class="fa-brands fa-youtube" aria-label="YouTube" rel="noopener noreferrer"></a>
                    </nav>
                </div>
            </div>
        </div>
        <div class="rcs-footer-bottom">
            <p class="rcs-footer-tagline">Bringing class to cuisine</p>
            <p>{{ setting.site_copyright }}</p>
        </div>
    </footer>
</template>


<script>
import statusEnum from "../../../enums/modules/statusEnum";
import menuSectionEnum from "../../../enums/modules/menuSectionEnum";

export default {
    name: "FrontendFooterComponent",
    data() {
        return {
            loading: {
                isActive: false,
            }
        }
    },
    computed: {
        setting: function () {
            return this.$store.getters['frontendSetting/lists'];
        },
        pages: function () {
            return this.$store.getters['frontendPage/lists'];
        },
        footerPages: function () {
            return Array.isArray(this.pages) ? this.pages.filter(page => page && page.slug && page.title) : [];
        }
    },
    mounted() {
        this.loading.isActive = true;
        this.$store.dispatch("frontendPage/lists", {
            paginate: 0,
            order_column: "id",
            order_type: "asc",
            menu_section_id: menuSectionEnum.FOOTER,
            status: statusEnum.ACTIVE
        }).then(res => {
            this.loading.isActive = false;
        }).catch((err) => {
            this.loading.isActive = false;
        });
    },
    methods: {}
}
</script>
