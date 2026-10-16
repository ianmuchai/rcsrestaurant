<template>
    <section class="rcs-menu-collections" aria-labelledby="rcs-collections-title">
        <div class="container">
            <header class="rcs-collections-heading">
                <div>
                    <p class="rcs-editorial-eyebrow">A taste of RC's</p>
                    <h2 id="rcs-collections-title">Something for every appetite.</h2>
                    <p>Start your morning, share a meal, or take a little coffee break.</p>
                </div>
                <router-link :to="{ name: 'frontend.menu' }" class="rcs-editorial-text-link">
                    Explore the menu <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
                </router-link>
            </header>
            <div class="rcs-collections-grid">
                <router-link v-for="collection in collections" :key="collection.key" :to="collection.to"
                    class="rcs-collection" :class="'rcs-collection-' + collection.key">
                    <div class="rcs-collection-photo">
                        <img :src="collection.image" :alt="collection.alt" width="600" height="420"
                            loading="lazy" decoding="async">
                    </div>
                    <div class="rcs-collection-copy">
                        <p class="rcs-editorial-eyebrow">{{ collection.label }}</p>
                        <h3>{{ collection.title }}</h3>
                        <p>{{ collection.description }}</p>
                        <span class="rcs-collection-action">{{ collection.action }}
                            <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
                        </span>
                    </div>
                </router-link>
            </div>
            <div class="rcs-visit-strip">
                <div>
                    <h3>Good food. Even better company.</h3>
                    <p>Join us at RC's, Moon Palace Hotel, Nairobi.</p>
                </div>
                <a href="https://www.google.com/maps/search/?api=1&amp;query=RC%27s%20Moon%20Palace%20Hotel%20General%20Waruingi%20Rd%20Nairobi"
                    target="_blank" rel="noopener noreferrer" class="rcs-editorial-text-link">
                    Find us <i class="fa-solid fa-location-dot" aria-hidden="true"></i>
                </a>
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
                { key: 'breakfast', terms: ['breakfast'], label: 'Morning rituals', title: 'A delicious start.',
                    description: 'Make room for a proper breakfast and a moment to yourself.', action: 'Discover breakfast',
                    image: '/images/rcs-menu-categories/breakfast.png', alt: "RC's breakfast platter" },
                { key: 'signatures', terms: ['signature'], label: "The RC's table", title: 'Make it a signature meal.',
                    description: 'Familiar flavours and satisfying plates, made for your appetite.', action: 'Explore our signatures',
                    image: '/images/rcs-menu-categories/rcs-signatures.png', alt: "RC's signature meal" },
                { key: 'coffee', terms: ['coffee', 'tea'], label: 'Your daily pause', title: 'Coffee. Conversation. Repeat.',
                    description: 'Find your favourite cup and settle into the good part of your day.', action: 'Browse teas & coffee',
                    image: '/images/rcs-menu-categories/teas-coffee.png', alt: 'A cup of freshly prepared coffee' },
                { key: 'platters', terms: ['platter', 'mexican', 'ethiopian'], label: 'Better together', title: 'Bring everyone to the table.',
                    description: 'Explore our platters and find something to enjoy together.', action: 'Discover platters',
                    image: '/images/rcs-menu-categories/platters.png', alt: "A platter from RC's menu" },
            ]
        };
    },
    computed: {
        collections() {
            return this.stories.map(story => {
                const category = this.categories.find(category => story.terms.some(term =>
                    `${category.slug || ''} ${category.name || ''}`.toLowerCase().includes(term)));
                return { ...story, to: { name: 'frontend.menu', ...(category?.slug ? { query: { s: category.slug } } : {}) } };
            });
        }
    }
};
</script>
