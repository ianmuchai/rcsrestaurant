const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { parse, compileTemplate } = require("@vue/compiler-sfc");

const root = path.resolve(__dirname, "..");
const featuredPath = path.join(root, "resources/js/components/frontend/home/FeaturedItemComponent.vue");
const cssPath = path.join(root, "resources/css/app.css");

const source = fs.readFileSync(featuredPath, "utf8");
const descriptor = parse(source, { filename: featuredPath }).descriptor;

assert(descriptor.template, "FeaturedItemComponent should include a template");

const result = compileTemplate({
    source: descriptor.template.content,
    filename: featuredPath,
    id: "FeaturedItemComponent"
});

assert.deepStrictEqual(result.errors, [], "FeaturedItemComponent template should compile without errors");

assert(
    source.includes('class="rcs-featured-glass-section')
        && source.includes("rcs-featured-shell")
        && source.includes("rcs-featured-glass-panel")
        && source.includes("rcs-featured-heading")
        && source.includes("rcs-featured-title")
        && source.includes("rcs-featured-kicker")
        && source.includes("rcs-featured-title-mark")
        && source.includes("rcs-featured-subtitle")
        && source.includes("rcs-featured-items-grid"),
    "Featured section should expose scoped structure classes for the improved glossy green UI"
);

assert(
    source.includes("<ItemComponent :items=\"featuredItems\" :type=\"itemProps.type\" :design=\"itemProps.design\" />"),
    "Featured section should keep using the existing ItemComponent grid"
);

const cssSource = fs.readFileSync(cssPath, "utf8");
const featuredCssStart = cssSource.indexOf(".rcs-featured-glass-section");
const featuredCssEnd = cssSource.indexOf(".rcs-video-band", featuredCssStart);
const featuredCss = cssSource.slice(featuredCssStart, featuredCssEnd);

assert(
    cssSource.includes(".rcs-featured-glass-section")
        && cssSource.includes("background-color: #00A800")
        && cssSource.includes("background: #00A800")
        && !cssSource.includes(".rcs-featured-glass-section::before")
        && !cssSource.includes(".rcs-featured-glass-section::after"),
    "Featured section background should be a standard unaltered green"
);

assert(
    !featuredCss.includes("linear-gradient")
        && !featuredCss.includes("repeating-linear-gradient"),
    "Featured section should not use CSS linear gradients in its glossy green background"
);

assert(
    cssSource.includes(".rcs-featured-glass-panel")
        && cssSource.includes("background: rgba(255, 255, 255, 0.18)")
        && cssSource.includes("backdrop-filter: blur(30px) saturate(1.15)")
        && cssSource.includes("-webkit-backdrop-filter: blur(30px) saturate(1.15)")
        && cssSource.includes("border: 1px solid rgba(255, 255, 255, 0.5)")
        && cssSource.includes("box-shadow: 0 34px 100px rgba(0, 54, 0, 0.28)")
        && cssSource.includes("border-radius: 18px"),
    "Featured section should use a cleaner premium glass panel over the standard green background"
);

assert(
    cssSource.includes(".rcs-featured-title")
        && cssSource.includes(".rcs-featured-kicker")
        && cssSource.includes(".rcs-featured-subtitle")
        && cssSource.includes(".rcs-featured-title-mark")
        && cssSource.includes(".rcs-featured-glass-section .product-card-grid")
        && cssSource.includes(".rcs-featured-glass-section .product-card-grid-image")
        && cssSource.includes(".rcs-featured-glass-section .product-card-grid-cart-btn")
        && cssSource.includes('font-family: "Playfair Display", "Fraunces", "Public Sans", serif')
        && cssSource.includes("font-size: clamp(34px, 4.2vw, 58px)")
        && cssSource.includes("letter-spacing: 0")
        && cssSource.includes("background: rgba(255, 255, 255, 0.92)")
        && cssSource.includes("transform: translateY(-6px)")
        && cssSource.includes("font-size: 15px")
        && cssSource.includes("font-weight: 900")
        && cssSource.includes("min-height: 46px"),
    "Featured section should improve typography, card hierarchy, and interactions with scoped glossy styling"
);

assert(
    !cssSource.includes("#FBB13C")
        && !cssSource.includes("#fbb13c")
        && !cssSource.includes("#FF7A00")
        && !cssSource.includes("#FF016C")
        && !cssSource.includes("#43AB39")
        && !cssSource.includes("#43ab39")
        && !cssSource.includes("#53AB43")
        && !cssSource.includes("#53ab43")
        && !cssSource.includes("#16A34A")
        && !cssSource.includes("#16A34A"),
    "Featured redesign should remove rainbow accents and old greens from the main CSS source"
);

console.log("RC's featured glass section contract passed");
