<template>
    <section class="rcs-menu-collections" aria-labelledby="rcs-collections-title">
        <div class="container">
            <header class="rcs-collections-heading">
                <h2 id="rcs-collections-title" class="sr-only">Explore RC's menu</h2>
                <router-link :to="{ name: 'frontend.menu' }" class="rcs-editorial-text-link">
                    View menu <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
                </router-link>
            </header>
            <div class="rcs-collections-grid">
                <router-link v-for="collection in collections" :key="collection.key" :to="collection.to"
                    class="rcs-collection" :aria-label="collection.label">
                    <img class="rcs-promo-poster" :src="collection.image" :alt="collection.alt"
                        width="1536" height="1024" loading="lazy" decoding="async">
                </router-link>
            </div>
        </div>
    </section>
</template>

<script>
export default {
    name: 'MenuCollectionsComponent',
    props: { categories: { type: Array, default: () => [] } },
    data() {
        return {
            stories: [
                { key: 'signatures', terms: ['signature'], label: "Order RC's Classics",
                    image: '/images/rcs-posters/classics-v1.webp', alt: "RC's Classics. Rice, vegetables and curry. Order now." },
                { key: 'coffee', terms: ['coffee', 'tea'], label: 'Browse teas and coffee',
                    image: '/images/rcs-posters/coffee-v1.webp', alt: 'Coffee Time. Teas & coffee. Explore menu.' },
            ]
        };
    },
    computed: {
        collections() {
            return this.stories.map(story => {
                const category = this.categories.find(category => {
                    const words = `${category.slug || ''} ${category.name || ''}`.toLowerCase().split(/[^a-z0-9]+/);
                    return story.terms.some(term => words.includes(term) || words.includes(`${term}s`));
                });
                return { ...story, to: { name: 'frontend.menu', ...(category?.slug ? { query: { s: category.slug } } : {}) } };
            });
        }
    }
};
</script>
