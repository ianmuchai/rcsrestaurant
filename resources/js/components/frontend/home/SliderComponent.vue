<template>
    <section class="rcs-front-video-hero">
        <router-link :to="{ name: 'frontend.menu' }" class="rcs-hero-menu-button rcs-floating-action-menu"
            data-rcs-action="hero_menu_click">
            <i class="fa-solid fa-bowl-food"></i>
            <span>{{ $t('label.menu') }}</span>
        </router-link>

        <Swiper :slides-per-view="1" :speed="900" :loop="true"
            :autoplay="{ delay: 5200, disableOnInteraction: false, pauseOnMouseEnter: true }"
            :modules="modules" class="rcs-plain-video-carousel">
            <SwiperSlide v-for="slide in videoSlides" :key="slide.label">
                <article class="rcs-plain-video-slide">
                    <video class="rcs-plain-video" :src="slide.src" autoplay muted loop playsinline preload="auto"
                        :aria-label="slide.label" @canplay="playVideo" @loadeddata="playVideo"></video>
                </article>
            </SwiperSlide>
        </Swiper>

        <div class="rcs-hero-brand-overlay">
            <div class="rcs-hero-brand-stack">
                <router-link :to="{ name: 'frontend.home' }" class="rcs-hero-centered-logo" aria-label="RC's home">
                    <img class="rcs-hero-logo-image" :src="setting.theme_logo" alt="RC's logo">
                </router-link>
                <router-link :to="{ name: 'frontend.menu' }" class="rcs-hero-order-button" data-rcs-action="order_click">
                    <i class="fa-solid fa-bag-shopping"></i>
                    <span>Order Online</span>
                </router-link>
            </div>
        </div>
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
        playVideo(event) {
            const video = event && event.target;
            if (video && typeof video.play === "function") {
                const attempt = video.play();
                if (attempt && typeof attempt.catch === "function") {
                    attempt.catch(() => {});
                }
            }
        }
    },
    computed: {
        setting: function () {
            return this.$store.getters["frontendSetting/lists"];
        }
    }
};
</script>
