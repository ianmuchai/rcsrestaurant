<template>
    <header class="rcs-mobile-topbar lg:hidden">
        <router-link :to="{ name: 'frontend.installApp' }" class="rcs-mobile-install rcs-mobile-icon" aria-label="Download app">
            <i class="fa-solid fa-download" aria-hidden="true"></i>
        </router-link>
        <button ref="searchToggle" type="button" class="rcs-mobile-icon" @click="toggleSearch" aria-label="Search menu"
            :aria-expanded="searchOpen" aria-controls="rcs-mobile-search-panel">
            <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
        </button>
        <form v-if="searchOpen" id="rcs-mobile-search-panel" @submit.prevent="search"
            @keydown.esc="closeSearch" class="rcs-mobile-search">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input ref="searchInput" type="search" v-model="searchItem" :placeholder="$t('button.search')"
                aria-label="Search menu items">
            <button type="submit" aria-label="Search">
                <i class="fa-solid fa-arrow-right"></i>
            </button>
        </form>
        <router-link v-if="!logged" :to="{ name: 'auth.login' }" class="rcs-mobile-login rcs-mobile-icon" aria-label="Log in">
            <i class="fa-solid fa-circle-user"></i>
        </router-link>
        <button v-else @click.prevent="openCanvas('user-profile-dropdown-box')" type="button"
            class="rcs-mobile-login rcs-mobile-icon user-profile-dropdown-box" aria-label="Open profile">
            <i class="fa-solid fa-circle-user"></i>
        </button>
    </header>

    <nav class="rcs-mobile-bottom-nav lg:hidden">
        <router-link :class="checkIsPathAndRoutePathSame('/') || checkIsPathAndRoutePathSame('/home') ? 'text-primary' : ''"
            class="rcs-mobile-nav-link" :to="{ name: 'frontend.home' }">
            <i class="fa-solid fa-house text-sm leading-none"></i>
            <span class="text-xs capitalize">{{ $t('menu.home') }}</span>
        </router-link>

        <router-link :class="checkIsPathAndRoutePathSame('/menu') ? 'text-primary' : ''"
            class="rcs-mobile-nav-link" :to="{ name: 'frontend.menu', query: { s: categoryProps.slug } }">
            <i class="fa-solid fa-layer-group text-base leading-none"></i>
            <span class="text-xs capitalize">{{ $t('label.menu') }}</span>
        </router-link>

        <button @click.prevent="openCanvas('cart')" type="button" class="mobcart fa-solid fa-bag-shopping text-base w-12 h-12 leading-[48px] text-center rounded-full -mt-12 text-white bg-primary
        relative after:absolute after:top-3 ltr:after:right-2.5 rtl:after:left-2.5 after:w-2 after:h-2 after:rounded-full
        after:shadow " :class="subtotal > 0 ? ' after:bg-[#FFDB1F]' : ''"></button>

        <router-link :class="checkIsPathAndRoutePathSame('/offers') ? 'text-primary' : ''"
            class="rcs-mobile-nav-link" :to="{ name: 'frontend.offers' }">
            <i class="fa-solid fa-tags text-base leading-none"></i>
            <span class="text-xs capitalize">{{ $t('label.offers') }}</span>
        </router-link>

        <router-link :class="checkIsPathAndRoutePathSame('/login') ? 'text-primary' : ''" v-if="!logged"
            class="rcs-mobile-nav-link" :to="{ name: 'auth.login' }">
            <i class="fa-solid fa-circle-user text-base leading-none"></i>
            <span class="text-xs capitalize">{{ $t('label.login') }}</span>
        </router-link>

        <button @click.prevent="openCanvas('user-profile-dropdown-box')" type="button" v-else
            class="rcs-mobile-nav-link user-profile-dropdown-box">
            <i class="fa-solid fa-circle-user text-base leading-none"></i>
            <span class="text-xs capitalize">{{ $t('label.profile') }}</span>
        </button>
    </nav>
</template>

<script>
import statusEnum from "../../../enums/modules/statusEnum";
import appService from "../../../services/appService";
export default {
    name: "FrontendMobileNavBarComponent",
    data() {
        return {
            loading: {
                isActive: false,
            },
            currentRoute: "",
            categoryProps: {
                search: {
                    paginate: 0,
                    order_column: 'sort',
                    order_type: 'asc',
                    status: statusEnum.ACTIVE
                },
                slug: '',
            },
            searchItem: "",
            searchOpen: false,
        };
    },
    watch: {
        $route(to, from) {
            this.currentRoute = to.path;
            this.searchOpen = false;
        },
        categories: {
            deep: true,
            handler(category) {
                if (category.length > 0) {
                    if (category[0].slug !== "undefined") {
                        this.categoryProps.slug = category[0].slug;
                    }
                }
            }
        }
    },
    computed: {
        logged: function () {
            return this.$store.getters.authStatus;
        },
        categories: function () {
            return this.$store.getters['frontendItemCategory/lists'];
        },
        subtotal: function () {
            return this.$store.getters['frontendCart/subtotal'];
        }
    },
    mounted() {
        this.currentRoute = this.$route.path;
        this.loading.isActive = true;
        this.$store.dispatch('frontendItemCategory/lists', this.categoryProps.search).then().catch();
        this.loading.isActive = false;
    },
    methods: {
        toggleSearch() {
            this.searchOpen = !this.searchOpen;
            if (this.searchOpen) {
                this.$nextTick(() => this.$refs.searchInput?.focus());
            }
        },
        closeSearch() {
            this.searchOpen = false;
            this.$refs.searchToggle?.focus();
        },
        checkIsPathAndRoutePathSame(path) {
            if (this.currentRoute === path) {
                return true;
            }
        },
        openCanvas: function (id) {
            return appService.openCanvas(id);
        },
        search: function () {
            if (typeof this.searchItem !== "undefined" && this.searchItem.trim() !== "") {
                this.$router.push({ name: "frontend.search", query: { s: this.searchItem.trim() } });
                this.searchItem = "";
                this.searchOpen = false;
            }
        },
        profileActive: function () {
            return appService.profileOpen('.user-profile-dropdown-box');
        },
    }

}
</script>
