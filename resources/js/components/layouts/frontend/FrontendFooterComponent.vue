<template>
    <LoadingComponent :props="loading" />
    <footer class="footer-part rcs-compact-footer">
        <div class="container">
            <div class="rcs-footer-grid">
                <div class="rcs-footer-brand">
                    <router-link :to="{ name: 'frontend.home' }">
                        <img class="rcs-footer-logo" :src="setting.theme_footer_logo" alt="logo">
                    </router-link>
                    <p>{{ $t('label.subscribe_short_text') }}</p>
                    <form @submit.prevent="saveSubscription"
                        class="rcs-footer-subscribe">
                        <input type="email" :placeholder="$t('label.your_email_address')"
                            v-model="subscriptionProps.post.email">
                        <button type="submit">
                            {{ $t('button.subscribe') }}
                        </button>
                    </form>
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
                <div>
                    <h3>{{ $t('label.useful_links') }}</h3>
                    <nav v-if="pages.length > 0" class="rcs-footer-links">
                        <router-link v-for="page in pages" :key="page.id || page.slug"
                            :to="{ name: 'frontend.page', params: { slug: page.slug } }">
                            {{ page.title }}
                        </router-link>
                    </nav>
                </div>
                <div>
                    <h3>Visit RC's</h3>
                    <ul class="rcs-footer-contact-list">
                        <li class="rcs-footer-detail-link">
                            <i class="fa-solid fa-location-dot"></i>
                            <span>Moon Palace Hotel, General Waruingi Rd, Nairobi</span>
                        </li>
                        <li>
                            <a href="tel:+254712878787" data-rcs-action="call_click" class="rcs-footer-detail-link">
                                <i class="fa-solid fa-phone"></i>
                                <span>0712 878787</span>
                            </a>
                        </li>
                        <li>
                            <a href="mailto:info@rcs.co.ke" class="rcs-footer-detail-link">
                                <i class="fa-solid fa-envelope"></i>
                                <span>info@rcs.co.ke</span>
                            </a>
                        </li>
                        <li>
                            <a href="https://www.google.com/maps/search/?api=1&amp;query=RC%27s%20Moon%20Palace%20Hotel%20General%20Waruingi%20Rd%20Nairobi"
                                target="_blank" rel="noopener" data-rcs-action="directions_click" class="rcs-footer-detail-link">
                                <i class="fa-solid fa-diamond-turn-right"></i>
                                <span>Get directions</span>
                            </a>
                        </li>
                    </ul>
                    <h3 v-if="setting.site_android_app_link || setting.site_ios_app_link"
                        class="rcs-footer-app-title">
                        {{ $t('label.download_our_apps') }}
                    </h3>
                    <nav class="rcs-footer-store-links">
                        <a target="_blank" v-if="setting.site_android_app_link" :href="setting.site_android_app_link">
                            <img :src="setting.image_play_store" alt="app">
                        </a>
                        <a target="_blank" v-if="setting.site_ios_app_link" :href="setting.site_ios_app_link">
                            <img :src="setting.image_app_store" alt="app">
                        </a>
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
import axios from "axios";
import alertService from "../../../services/alertService";
import LoadingComponent from "../../frontend/components/LoadingComponent";

export default {
    name: "FrontendFooterComponent",
    components: { LoadingComponent },
    data() {
        return {
            loading: {
                isActive: false,
            },
            subscriptionProps: {
                post: {
                    email: ""
                }
            }
        }
    },
    computed: {
        setting: function () {
            return this.$store.getters['frontendSetting/lists'];
        },
        pages: function () {
            return this.$store.getters['frontendPage/lists'];
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
    methods: {
        saveSubscription: function () {
            const url = '/frontend/subscriber';
            this.loading.isActive = true;
            axios.post(url, this.subscriptionProps.post).then(res => {
                this.loading.isActive = false;
                this.subscriptionProps.post.email = "";
                alertService.success(this.$t("message.subscribe"));
            }).catch((err) => {
                if (typeof err.response.data.errors === 'object') {
                    _.forEach(err.response.data.errors, (error) => {
                        alertService.error(error[0]);
                    });
                }
                this.loading.isActive = false;
            });
        }
    }
}
</script>
