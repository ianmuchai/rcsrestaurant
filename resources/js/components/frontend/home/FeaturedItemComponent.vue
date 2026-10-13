<template>
    <LoadingComponent :props="loading" />
    <section class="rcs-featured-glass-section mb-12" v-if="featuredItems.length > 0">
        <div class="container rcs-featured-shell">
            <div class="rcs-featured-glass-panel">
                <div class="rcs-featured-heading">
                    <div>
                        <span class="rcs-featured-kicker">RC's picks</span>
                        <h2 class="rcs-featured-title">
                            {{ $t('label.featured_items') }}
                        </h2>
                        <p class="rcs-featured-subtitle">Fresh picks from the RC's kitchen</p>
                    </div>
                </div>
                <div class="rcs-featured-items-grid">
                    <ItemComponent :items="featuredItems" :type="itemProps.type" :design="itemProps.design" />
                </div>
            </div>
        </div>
    </section>
</template>
<script>

import alertService from "../../../services/alertService";
import itemDesignEnum from "../../../enums/modules/itemDesignEnum";
import ItemComponent from "../components/ItemComponent";
import LoadingComponent from "../components/LoadingComponent";

export default {
    name: "FeaturedItemComponent",
    components: {
        ItemComponent,
        LoadingComponent
    },
    props: {
        items: Object,
    },
    data() {
        return {
            loading: {
                isActive: false,
            },
            itemProps: {
                design: itemDesignEnum.GRID,
                type: null,
            },
        };
    },
    mounted() {
        try {
            this.loading.isActive = true;
            this.$store.dispatch("frontendItem/featured", {
                order_column: "id",
                order_type: "desc"
            }).then(res => {
                this.loading.isActive = false;
            }).catch((err) => {
                this.loading.isActive = false;
            });
        } catch (err) {
            this.loading.isActive = false;
        }
    },
    computed: {
        featuredItems: function () {
            return this.$store.getters["frontendItem/featured"];
        },
    },
    methods: {},
};
</script>
