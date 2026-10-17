const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { parse, compileTemplate } = require("@vue/compiler-sfc");

const root = path.resolve(__dirname, "..");
const homePath = path.join(root, "resources/js/components/frontend/home/HomeComponent.vue");
const categoryPath = path.join(root, "resources/js/components/frontend/components/CategoryComponent.vue");
const cssPath = path.join(root, "resources/css/app.css");
const categoryAssetDir = path.join(root, "public/images/rcs-menu-categories");

const homeSource = fs.readFileSync(homePath, "utf8");
const source = fs.readFileSync(categoryPath, "utf8");
const descriptor = parse(source, { filename: categoryPath }).descriptor;

assert(descriptor.template, "CategoryComponent should include a template");

const result = compileTemplate({
    source: descriptor.template.content,
    filename: categoryPath,
    id: "CategoryComponent"
});

assert.deepStrictEqual(result.errors, [], "CategoryComponent template should compile without errors");

assert(
    homeSource.includes("rcs-menu-carousel-bleed")
        && homeSource.includes("<CategoryComponent :categories=\"categories\" :design=\"categoryProps.design\" />"),
    "Homepage should place the category carousel in a full-width strip"
);

assert(
    source.includes(":src=\"categoryPhoto(category)\""),
    "Category menu should render representative food photos instead of raw category thumbs"
);

assert(
    source.includes(":modules=\"carouselModules\"")
        && source.includes(":autoplay=\"categoryAutoplay\"")
        && source.includes(":freeMode=\"categoryFreeMode\"")
        && source.includes(":loop=\"true\"")
        && source.includes(":loopAdditionalSlides=\"categoryLoopAdditionalSlides\"")
        && source.includes(":allowTouchMove=\"true\"")
        && source.includes(":loopPreventsSliding=\"false\"")
        && source.includes("Autoplay")
        && source.includes("FreeMode"),
    "Category menu should autoscroll continuously using Swiper autoplay, loop, and free mode"
);

assert(
    source.includes("v-for=\"(category, index) in carouselCategories\"")
        && source.includes("categoryCarouselRepeats")
        && source.includes("carouselCategories")
        && source.includes("categoryLoopAdditionalSlides")
        && source.includes("Array.from({ length: this.categoryCarouselRepeats })"),
    "Category carousel should duplicate the slide track so it runs end-to-end smoothly"
);

assert(
    source.includes("w-40")
        && source.includes("min-h-[154px]")
        && source.includes("min-h-[140px]")
        && source.includes("leading-tight"),
    "Category cards should be widened and tall enough for larger photos without cramped labels"
);

assert(
    source.includes("categoryFoodPhotos")
        && source.includes("breakfast: \"/images/rcs-menu-categories/breakfast.png\"")
        && source.includes("\"teas-coffee\": \"/images/rcs-menu-categories/teas-coffee.png\"")
        && source.includes("\"rcs-signatures\": \"/images/rcs-menu-categories/rcs-signatures.png\"")
        && source.includes("\"rice-pastas\": \"/images/rcs-menu-categories/rice-pastas.png\"")
        && source.includes("\"fish-chicken-meat\": \"/images/rcs-menu-categories/fish-chicken-meat.png\"")
        && source.includes("\"platters-mexican-ethiopian-foods\": \"/images/rcs-menu-categories/platters.png\"")
        && source.includes("\"kenyan-food-soups\": \"/images/rcs-menu-categories/kenyan-food-soups.png\"")
        && source.includes("\"fast-foods\": \"/images/rcs-menu-categories/fast-foods.png\"")
        && source.includes("appetizers: \"/images/seeder/item/chicken_dumplings.png\"")
        && source.includes("\"flame-grill-burgers\": \"/images/seeder/item/whopper.png\"")
        && source.includes("\"veggie-plant-based-burgers\": \"/images/seeder/item/plant_based_whopper.png\"")
        && source.includes("\"sandwich-from-the-grill\": \"/images/seeder/item/steak_sandwich.png\"")
        && source.includes("\"hot-chicken-entrees\": \"/images/seeder/item/kung_pao_chicken.png\"")
        && source.includes("\"beef-entrees\": \"/images/seeder/item/beef_with_broccoli.png\"")
        && source.includes("\"seafood-entrees\": \"/images/seeder/item/shrimp_with_broccoli.png\"")
        && source.includes("\"house-special-salads\": \"/images/seeder/item/roasted_salmon_salad.png\"")
        && source.includes("\"zoop-soups\": \"/images/seeder/item/chicken_noodles_soup.png\"")
        && source.includes("\"side-orders\": \"/images/seeder/item/french_fries.png\"")
        && source.includes("beverages: \"/images/seeder/item/mojito.png\""),
    "Category photo mapping should use real seeded item photos from the matching category"
);

assert(
    source.includes("normalizeCategoryKey")
        && source.includes("rcsCategoryPhotoRules")
        && source.includes("categoryRulePhoto")
        && source.includes("replace(/rc['’`]?s/g, \"rcs\")")
        && source.includes("replace(/&/g, \" \")"),
    "Category photo mapping should normalize and match RC category name variations before lookup"
);

assert(
    source.includes("category.thumb")
        && source.includes("handleCategoryPhotoError")
        && source.includes("loading=\"lazy\"")
        && source.includes(":alt=\"`${category.name} food photo`\""),
    "Category photos should keep accessible labels, lazy loading, and category thumbnail fallback"
);

[
    "breakfast.png",
    "teas-coffee.png",
    "rcs-signatures.png",
    "rice-pastas.png",
    "fish-chicken-meat.png",
    "platters.png",
    "kenyan-food-soups.png",
    "fast-foods.png"
].forEach(file => {
    const assetPath = path.join(categoryAssetDir, file);
    assert(fs.existsSync(assetPath), `${file} should exist as a clean public category photo asset`);
    assert(fs.statSync(assetPath).size > 1000, `${file} should not be an empty category asset`);
});

const cssSource = fs.readFileSync(cssPath, "utf8");

assert(
    cssSource.includes(".rcs-category-photo-frame")
        && cssSource.includes(".rcs-category-photo")
        && cssSource.includes("width: 108px")
        && cssSource.includes("height: 108px")
        && cssSource.includes("object-fit: cover")
        && cssSource.includes("border-radius: 999px"),
    "Category food photos should be styled as polished, larger circular photo thumbnails"
);

assert(
    cssSource.includes(".menu-slides .swiper-wrapper")
        && cssSource.includes("transition-timing-function: linear"),
    "Category carousel should use a linear wrapper transition for smooth continuous scrolling"
);

assert(
    cssSource.includes(".rcs-menu-carousel-bleed")
        && !cssSource.includes("width: 100vw")
        && !cssSource.includes("margin-left: calc(50% - 50vw)")
        && !cssSource.includes("margin-right: calc(50% - 50vw)")
        && cssSource.includes("overflow: hidden"),
    "Homepage carousel should use the full available width without overflowing classic desktop scrollbars"
);

console.log("RC's category food photo menu contract passed");
