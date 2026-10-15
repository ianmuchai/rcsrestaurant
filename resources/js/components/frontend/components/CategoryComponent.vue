<template>
    <Swiper dir="ltr" :modules="carouselModules" :speed="6500" slidesPerView="auto" :spaceBetween="16"
        :autoplay="categoryAutoplay" :freeMode="categoryFreeMode" :loop="true"
        :loopAdditionalSlides="categoryLoopAdditionalSlides" :allowTouchMove="true" :grabCursor="true"
        :loopPreventsSliding="false" class="menu-slides">
        <SwiperSlide v-for="(category, index) in carouselCategories"
            :key="`${category.id || category.slug || category.name}-${index}`" class="!w-fit">
            <router-link v-if="design === categoryDesignEnum.FIRST"
                :to="{ name: 'frontend.menu', query: { s: category.slug } }"
                class="w-40 min-h-[154px] flex flex-col items-center text-center gap-3 p-3 rounded-2xl border-b-2 border-transparent transition hover:bg-[#FFEDF4] bg-[#F7F7FC]">
                <span class="rcs-category-photo-frame rcs-category-photo-frame-lg">
                    <img class="rcs-category-photo" :src="categoryPhoto(category)" draggable="false"
                        :alt="`${category.name} food photo`" loading="lazy"
                        @error="handleCategoryPhotoError($event, category)">
                </span>
                <h3 class="text-xs font-medium leading-tight">{{ category.name }}</h3>
            </router-link>

            <router-link :class="checkIsQueryAndRouteQuerySame(category.slug) ? 'menu-category-active' : ''"
                v-else-if="design === categoryDesignEnum.SECOND"
                :to="{ name: 'frontend.menu', query: { s: category.slug } }"
                class="w-40 min-h-[140px] flex flex-col items-center text-center gap-3 p-3 rounded-2xl border-b-2 border-transparent transition hover:bg-[#FFEDF4]">
                <span class="rcs-category-photo-frame">
                    <img class="rcs-category-photo" :src="categoryPhoto(category)" draggable="false"
                        :alt="`${category.name} food photo`" loading="lazy"
                        @error="handleCategoryPhotoError($event, category)">
                </span>
                <h3 class="text-xs font-medium leading-tight">{{ category.name }}</h3>
            </router-link>
        </SwiperSlide>
    </Swiper>
</template>

<script>

import categoryDesignEnum from "../../../enums/modules/categoryDesignEnum";
import { Swiper, SwiperSlide } from 'swiper/vue';
import { Autoplay, FreeMode } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/free-mode';

export default {
    name: "CategoryComponent",
    props: {
        categories: Object,
        design: Number
    },
    components: {
        Swiper,
        SwiperSlide,
    },
    data() {
        return {
            currentCategory: "",
            categoryDesignEnum: categoryDesignEnum,
            carouselModules: [Autoplay, FreeMode],
            categoryCarouselRepeats: 4,
            categoryAutoplay: {
                delay: 0,
                disableOnInteraction: false,
                pauseOnMouseEnter: false
            },
            categoryFreeMode: {
                enabled: true,
                momentum: false
            },
            categoryFoodPhotos: {
                breakfast: "/images/rcs-menu-categories/breakfast.png",
                "teas-coffee": "/images/rcs-menu-categories/teas-coffee.png",
                "tea-coffee": "/images/rcs-menu-categories/teas-coffee.png",
                "rcs-signatures": "/images/rcs-menu-categories/rcs-signatures.png",
                "rcs-signature": "/images/rcs-menu-categories/rcs-signatures.png",
                "rice-pastas": "/images/rcs-menu-categories/rice-pastas.png",
                "rice-pasta": "/images/rcs-menu-categories/rice-pastas.png",
                "fish-chicken-meat": "/images/rcs-menu-categories/fish-chicken-meat.png",
                "platters-mexican-ethiopian-foods": "/images/rcs-menu-categories/platters.png",
                "kenyan-food-soups": "/images/rcs-menu-categories/kenyan-food-soups.png",
                "fast-foods": "/images/rcs-menu-categories/fast-foods.png",
                appetizers: "/images/seeder/item/chicken_dumplings.png",
                "flame-grill-burgers": "/images/seeder/item/whopper.png",
                "veggie-plant-based-burgers": "/images/seeder/item/plant_based_whopper.png",
                "sandwich-from-the-grill": "/images/seeder/item/steak_sandwich.png",
                "hot-chicken-entrees": "/images/seeder/item/kung_pao_chicken.png",
                "beef-entrees": "/images/seeder/item/beef_with_broccoli.png",
                "seafood-entrees": "/images/seeder/item/shrimp_with_broccoli.png",
                "house-special-salads": "/images/seeder/item/roasted_salmon_salad.png",
                "zoop-soups": "/images/seeder/item/chicken_noodles_soup.png",
                "side-orders": "/images/seeder/item/french_fries.png",
                beverages: "/images/seeder/item/mojito.png"
            },
            rcsCategoryPhotoRules: [
                { terms: ["breakfast"], photo: "/images/rcs-menu-categories/breakfast.png" },
                { terms: ["teas", "coffee"], photo: "/images/rcs-menu-categories/teas-coffee.png" },
                { terms: ["tea", "coffee"], photo: "/images/rcs-menu-categories/teas-coffee.png" },
                { terms: ["rcs", "signature"], photo: "/images/rcs-menu-categories/rcs-signatures.png" },
                { terms: ["rice"], photo: "/images/rcs-menu-categories/rice-pastas.png" },
                { terms: ["pasta"], photo: "/images/rcs-menu-categories/rice-pastas.png" },
                { terms: ["fish", "chicken", "meat"], photo: "/images/rcs-menu-categories/fish-chicken-meat.png" },
                { terms: ["platters"], photo: "/images/rcs-menu-categories/platters.png" },
                { terms: ["mexican"], photo: "/images/rcs-menu-categories/platters.png" },
                { terms: ["ethiopian"], photo: "/images/rcs-menu-categories/platters.png" },
                { terms: ["kenyan"], photo: "/images/rcs-menu-categories/kenyan-food-soups.png" },
                { terms: ["soups"], photo: "/images/rcs-menu-categories/kenyan-food-soups.png" },
                { terms: ["fast", "foods"], photo: "/images/rcs-menu-categories/fast-foods.png" }
            ],
        }
    },
    computed: {
        categoryList() {
            return Array.isArray(this.categories) ? this.categories : Object.values(this.categories || {});
        },
        carouselCategories() {
            return Array.from({ length: this.categoryCarouselRepeats }).flatMap(() => this.categoryList);
        },
        categoryLoopAdditionalSlides() {
            return this.categoryList.length * this.categoryCarouselRepeats;
        }
    },
    mounted() {
        if (this.$route.query.s !== "undefined") {
            this.currentCategory = this.$route.query.s;
        }
    },
    methods: {
        submit: function (msg, e) {
            e.stopPropagation()
        },
        checkIsQueryAndRouteQuerySame(query) {
            if (this.currentCategory === query) {
                return true;
            }
        },
        categoryPhoto(category) {
            const categoryKey = this.normalizeCategoryKey(category.slug || category.name);
            const categoryNameKey = this.normalizeCategoryKey(category.name);
            return this.categoryFoodPhotos[categoryKey]
                || this.categoryFoodPhotos[categoryNameKey]
                || this.categoryRulePhoto(categoryKey, categoryNameKey)
                || category.thumb;
        },
        categoryRulePhoto(...keys) {
            const categoryKeys = keys.filter(Boolean);
            const matchingRule = this.rcsCategoryPhotoRules.find(rule => {
                return categoryKeys.some(key => rule.terms.every(term => key.includes(term)));
            });
            return matchingRule ? matchingRule.photo : null;
        },
        normalizeCategoryKey(value) {
            return String(value || "")
                .toLowerCase()
                .replace(/rc['’`]?s/g, "rcs")
                .replace(/&/g, " ")
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "");
        },
        handleCategoryPhotoError(event, category) {
            if (event.target.src !== category.thumb) {
                event.target.src = category.thumb;
            }
        },
    },
    watch: {
        $route(to, from) {
            if (to.query.s !== "undefined") {
                this.currentCategory = to.query.s;
            }
        }
    }
}
</script>
