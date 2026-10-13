<template>
    <section class="rcs-video-band">
        <div class="container">
            <div class="rcs-section-kicker">
                <i class="fa-solid fa-play"></i>
                <span>Inside RC's</span>
            </div>
            <div class="rcs-video-heading">
                <div>
                    <h2>Fresh moments from the kitchen</h2>
                    <p>Explore the grills, shawarma, family meals, and warm Nairobi dining experience before you order.</p>
                </div>
                <div class="rcs-video-actions">
                    <router-link :to="{ name: 'frontend.menu', query: { s: categorySlug } }" data-rcs-action="menu_click">
                        <i class="fa-solid fa-bowl-food"></i>
                        <span>View menu</span>
                    </router-link>
                    <a href="tel:+254712878787" data-rcs-action="call_click">
                        <i class="fa-solid fa-phone"></i>
                        <span>Call RC's</span>
                    </a>
                </div>
            </div>

            <Swiper :speed="800" slidesPerView="auto" :spaceBetween="18" :grabCursor="true"
                :pagination="{ clickable: true }" :navigation="true" :modules="modules" class="rcs-video-swiper">
                <SwiperSlide v-for="video in videos" :key="video.title" class="!w-[255px] sm:!w-[300px]">
                    <article class="rcs-video-card">
                        <div class="rcs-video-frame">
                            <video :src="video.src" :poster="video.fallbackImage" muted playsinline loop controls
                                preload="metadata" @mouseenter="playVideo" @mouseleave="pauseVideo"
                                @touchstart.passive="playVideo"></video>
                            <div class="rcs-video-overlay">
                                <span>{{ video.tag }}</span>
                                <i class="fa-solid fa-play"></i>
                            </div>
                        </div>
                        <div class="rcs-video-card-body">
                            <h3>{{ video.title }}</h3>
                            <p>{{ video.description }}</p>
                            <router-link :to="{ name: 'frontend.menu', query: { s: categorySlug } }"
                                data-rcs-action="order_click">
                                <span>Order now</span>
                                <i class="fa-solid fa-arrow-right"></i>
                            </router-link>
                        </div>
                    </article>
                </SwiperSlide>
            </Swiper>
        </div>
    </section>
</template>

<script>
import { Swiper, SwiperSlide } from "swiper/vue";
import { Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

export default {
    name: "VideoCarouselComponent",
    components: {
        Swiper,
        SwiperSlide
    },
    props: {
        categorySlug: {
            type: String,
            default: ""
        }
    },
    setup() {
        return {
            modules: [Navigation, Pagination]
        };
    },
    data() {
        return {
            videos: [
                {
                    title: "Charcoal grill energy",
                    description: "Smoky, generous plates made for lunch dates, late dinners, and group orders.",
                    tag: "Grills",
                    src: "/videos/rcs-grills.mp4",
                    fallbackImage: "/images/rcs-cafe-cover.jpg"
                },
                {
                    title: "Shawarma and quick bites",
                    description: "Fast, fresh, and easy to order when the craving hits.",
                    tag: "Fresh bites",
                    src: "/videos/rcs-shawarma.mp4",
                    fallbackImage: "/images/item/cover.png"
                },
                {
                    title: "Family meals at RC's",
                    description: "Comfortable dining for families, friends, and casual celebrations in Nairobi.",
                    tag: "Dine in",
                    src: "/videos/rcs-family-dining.mp4",
                    fallbackImage: "/images/bg/footer.png"
                },
                {
                    title: "Order from anywhere",
                    description: "Pick your favorites online and keep dinner simple.",
                    tag: "Online order",
                    src: "/videos/rcs-order-online.mp4",
                    fallbackImage: "/images/rcs-cafe-cover.jpg"
                }
            ]
        };
    },
    methods: {
        playVideo(event) {
            event.target.play?.().catch(() => {});
        },
        pauseVideo(event) {
            event.target.pause?.();
        }
    }
};
</script>
