<template>
    <section class="rcs-front-video-hero">
        <h1 class="sr-only">RC's Restaurant</h1>
        <router-link :to="{ name: 'frontend.menu' }" class="rcs-hero-menu-button rcs-floating-action-menu"
            data-rcs-action="hero_menu_click">
            <i class="fa-solid fa-bowl-food"></i>
            <span>{{ $t('label.menu') }}</span>
        </router-link>

        <Swiper :slides-per-view="1" :speed="900" :loop="true"
            :autoplay="{ delay: 5200, disableOnInteraction: false, pauseOnMouseEnter: true }"
            :modules="modules" @swiper="captureSwiper" @slideChange="syncPlayback" class="rcs-plain-video-carousel">
            <SwiperSlide v-for="(slide, index) in videoSlides" :key="slide.label">
                <article class="rcs-plain-video-slide">
                    <video class="rcs-plain-video" :src="slide.src" :autoplay="index === 0 && !motionPaused" muted loop playsinline
                        :preload="index === 0 ? 'auto' : 'metadata'"
                        :aria-label="slide.label" @canplay="playVideo" @loadeddata="playVideo"></video>
                </article>
            </SwiperSlide>
        </Swiper>

        <div class="rcs-hero-brand-overlay">
            <div class="rcs-hero-brand-stack">
                <router-link :to="{ name: 'frontend.menu' }" class="rcs-hero-order-button" data-rcs-action="order_click">
                    <i class="fa-solid fa-bag-shopping" aria-hidden="true"></i>
                    <span>Order Now</span>
                </router-link>
            </div>
            <div class="rcs-hero-link-panel">
                <router-link :to="{ name: 'frontend.home' }" class="rcs-hero-centered-logo" aria-label="RC's home">
                    <img class="rcs-hero-logo-image" :src="currentHeroLogoSrc" alt="RC's logo">
                </router-link>
            <nav class="rcs-hero-page-links" aria-label="Explore RC's">
                <router-link :to="{ name: 'frontend.menu' }">
                    <i class="fa-solid fa-utensils" aria-hidden="true"></i><span>MENU</span>
                </router-link>
                <router-link :to="{ name: 'frontend.offers' }">
                    <i class="fa-solid fa-tag" aria-hidden="true"></i><span>OFFERS</span>
                </router-link>
                <a href="https://www.google.com/maps/search/?api=1&amp;query=RC%27s%20Moon%20Palace%20Hotel%20General%20Waruingi%20Rd%20Nairobi"
                    target="_blank" rel="noopener noreferrer">
                    <i class="fa-solid fa-location-dot" aria-hidden="true"></i><span>LOCATION</span>
                </a>
                <router-link :to="{ name: 'frontend.myOrder' }">
                    <i class="fa-solid fa-receipt" aria-hidden="true"></i><span>ORDERS</span>
                </router-link>
                <router-link v-for="page in heroPages" :key="page.slug"
                    :to="{ name: 'frontend.page', params: { slug: page.slug } }">
                    <i class="fa-solid fa-circle-info" aria-hidden="true"></i><span>ABOUT</span>
                </router-link>
                <a href="https://wa.me/254712878787?text=Hello%20RC%27s%2C%20I%20would%20like%20to%20share%20feedback."
                    target="_blank" rel="noopener noreferrer">
                    <i class="fa-regular fa-comment" aria-hidden="true"></i><span>FEEDBACK</span>
                </a>
            </nav>
            </div>
        </div>
        <button type="button" class="rcs-hero-motion-toggle" @click="toggleMotion"
            :aria-label="motionPaused ? 'Play background videos' : 'Pause background videos'"
            :title="motionPaused ? 'Play background videos' : 'Pause background videos'" :aria-pressed="motionPaused">
            <i :class="motionPaused ? 'fa-solid fa-play' : 'fa-solid fa-pause'" aria-hidden="true"></i>
        </button>
    </section>
</template>

<script>
import { Swiper, SwiperSlide } from "swiper/vue";
import { Autoplay } from "swiper/modules";
import "swiper/css";

export default {
    name: "SliderComponent",
    components: {
        Swiper,
        SwiperSlide
    },
    setup() {
        return {
            modules: [Autoplay]
        };
    },
    data() {
        return {
            motionPaused: false,
            videoSlides: [
                {
                    src: "https://videos.pexels.com/video-files/5223106/5223106-hd_1920_1080_25fps.mp4",
                    label: "Restaurant meal service video"
                },
                {
                    src: "https://videos.pexels.com/video-files/5821371/5821371-hd_1920_1080_30fps.mp4",
                    label: "Cafe table food video"
                },
                {
                    src: "https://videos.pexels.com/video-files/9371315/9371315-hd_1920_1080_30fps.mp4",
                    label: "Food spread on restaurant table video"
                }
            ]
        };
    },
    methods: {
        captureSwiper(swiper) {
            this.heroSwiper = swiper;
            this.syncPlayback();
        },
        syncPlayback() {
            this.$nextTick(() => {
                if (!this.$el?.querySelectorAll) return;
                const stopped = this.motionPaused || document.hidden;
                if (this.heroSwiper && !this.heroSwiper.destroyed) {
                    if (stopped) this.heroSwiper.autoplay?.stop();
                    else if (!this.heroSwiper.autoplay?.running) this.heroSwiper.autoplay?.start();
                }
                this.$el.querySelectorAll('video').forEach(video => this.playVideo({ target: video }));
            });
        },
        toggleMotion() {
            this.motionPaused = !this.motionPaused;
            this.syncPlayback();
        },
        playVideo(event) {
            const video = event && event.target;
            if (video && typeof video.play === "function") {
                if (this.motionPaused || document.hidden || !video.closest('.swiper-slide-active')) {
                    video.pause();
                    return;
                }
                const attempt = video.play();
                if (attempt && typeof attempt.catch === "function") {
                    attempt.catch(() => {});
                }
            }
        }
    },
    mounted() {
        this.motionPaused = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        document.addEventListener('visibilitychange', this.syncPlayback);
        this.syncPlayback();
    },
    beforeUnmount() {
        document.removeEventListener('visibilitychange', this.syncPlayback);
    },
    computed: {
        heroPages() {
            const pages = this.$store.getters['frontendPage/lists'];
            return Array.isArray(pages) ? pages.filter(page => page.slug && /about/i.test(`${page.slug} ${page.title}`)).slice(0, 1) : [];
        },
        currentHeroLogoSrc: function () {
            return "/images/theme/theme-favicon-logo.png?v=rcs-current-logo-20261013";
        }
    }
};
</script>
