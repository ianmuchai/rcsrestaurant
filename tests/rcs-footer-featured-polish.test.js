const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { parse, compileTemplate } = require("@vue/compiler-sfc");

const root = path.resolve(__dirname, "..");
const footerPath = path.join(root, "resources/js/components/layouts/frontend/FrontendFooterComponent.vue");
const featuredPath = path.join(root, "resources/js/components/frontend/home/FeaturedItemComponent.vue");
const popularPath = path.join(root, "resources/js/components/frontend/home/PopularItemComponent.vue");
const cssPath = path.join(root, "resources/css/app.css");

function compileVue(filePath) {
    const source = fs.readFileSync(filePath, "utf8");
    const descriptor = parse(source, { filename: filePath }).descriptor;
    assert(descriptor.template, `${path.basename(filePath)} should include a template`);

    const result = compileTemplate({
        source: descriptor.template.content,
        filename: filePath,
        id: path.basename(filePath)
    });

    assert.deepStrictEqual(result.errors, [], `${path.basename(filePath)} template should compile without errors`);
    return source;
}

const footerSource = compileVue(footerPath);
const featuredSource = compileVue(featuredPath);
const popularSource = compileVue(popularPath);
const cssSource = fs.readFileSync(cssPath, "utf8");

assert(
    footerSource.includes("rcs-compact-footer")
        && footerSource.includes("rcs-footer-grid")
        && footerSource.includes("rcs-footer-brand")
        && footerSource.includes("rcs-footer-subscribe")
        && footerSource.includes("rcs-footer-social")
        && footerSource.includes("rcs-footer-bottom")
        && !footerSource.includes("pt-12")
        && !footerSource.includes("py-8 mt-8")
        && !footerSource.includes("mb-14"),
    "Frontend footer should use a compact redesigned structure instead of tall legacy spacing"
);

assert(
    cssSource.includes(".rcs-compact-footer")
        && cssSource.includes("padding: 28px 0 0")
        && cssSource.includes(".rcs-footer-grid")
        && cssSource.includes("gap: 18px")
        && cssSource.includes(".rcs-footer-bottom")
        && cssSource.includes("padding: 14px 0")
        && cssSource.includes("border-top: 1px solid rgba(255, 255, 255, 0.18)")
        && cssSource.includes(".rcs-footer-subscribe"),
    "Footer CSS should reduce height and use compact modern spacing"
);

assert(
    popularSource.includes("text-2xl")
        && popularSource.includes("font-semibold")
        && popularSource.includes("capitalize"),
    "Popular heading should keep its current typography contract"
);

assert(
    featuredSource.includes("text-2xl")
        && featuredSource.includes("font-semibold")
        && featuredSource.includes("capitalize")
        && featuredSource.includes("{{ $t('label.featured_items') }}")
        && !featuredSource.includes("rcs-featured-kicker")
        && !featuredSource.includes("rcs-featured-subtitle"),
    "Featured Items heading should match the Most Popular Items font size/style and remove extra title clutter"
);

const featuredCssStart = cssSource.indexOf(".rcs-featured-glass-section");
const featuredCssEnd = cssSource.indexOf(".rcs-pwa-install-page", featuredCssStart);
const featuredCss = cssSource.slice(featuredCssStart, featuredCssEnd);

assert(
    featuredCss.includes(".rcs-featured-title")
        && cssSource.includes('font-family: "Public Sans", "Rubik", sans-serif')
        && featuredCss.includes("font-size: 24px")
        && featuredCss.includes("font-weight: 600")
        && featuredCss.includes("line-height: 1.3")
        && !featuredCss.includes('font-family: "Georgia", "Times New Roman", "Public Sans", serif'),
    "Featured title CSS should no longer use the oversized serif treatment"
);

console.log("RC's footer and featured typography polish contract passed");
