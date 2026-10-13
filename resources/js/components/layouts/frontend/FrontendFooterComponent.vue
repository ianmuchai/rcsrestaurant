<template>
    <LoadingComponent :props="loading" />
    <footer class="footer-part rcs-compact-footer">
        <div class="container">
            <div class="rcs-footer-strip">
                <div class="rcs-footer-brand">
                    <router-link :to="{ name: 'frontend.home' }">
                        <img class="rcs-footer-logo" :src="setting.theme_footer_logo" alt="logo">
                    </router-link>
                </div>
                <nav v-if="footerPages.length > 0" class="rcs-footer-quicklinks">
                    <router-link v-for="page in footerPages" :key="page.id || page.slug"
                            :to="{ name: 'frontend.page', params: { slug: page.slug } }">
                        {{ page.title }}
                    </router-link>
                </nav>
                <div class="rcs-footer-actions">
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
                            class="fa-brands fa-facebook-f"></a>
                        <a v-if="setting.social_media_twitter" target="_blank" :href="setting.social_media_twitter"
                            class="fa-brands fa-x-twitter"></a>
                        <a v-if="setting.social_media_instagram" target="_blank" :href="setting.social_media_instagram"
                            class="fa-brands fa-instagram"></a>
                        <a v-if="setting.social_media_youtube" target="_blank" :href="setting.social_media_youtube"
                            class="fa-brands fa-youtube"></a>
                    </nav>
                </div>
            </div>
        </div>
        <div class="rcs-footer-bottom">
            <p>{{ setting.site_copyright }}</p>
        </div>
    </footer>
</template>


<script>
import statusEnum from "../../../enums/modules/statusEnum";
import menuSectionEnum from "../../../enums/modules/menuSectionEnum";
import LoadingComponent from "../../frontend/components/LoadingComponent";

export default {
    name: "FrontendFooterComponent",
    components: { LoadingComponent },
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
            return Array.isArray(this.pages) ? this.pages.slice(0, 4) : [];
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
