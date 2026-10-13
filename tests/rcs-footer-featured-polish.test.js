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
        && footerSource.includes("rcs-footer-strip")
        && footerSource.includes("rcs-footer-brand")
        && footerSource.includes("rcs-footer-quicklinks")
        && footerSource.includes("rcs-footer-actions")
        && footerSource.includes("rcs-footer-social")
        && footerSource.includes("rcs-footer-bottom")
        && footerSource.includes("footerPages")
        && !footerSource.includes("rcs-footer-subscribe")
        && !footerSource.includes("saveSubscription")
        && !footerSource.includes("download_our_apps")
        && !footerSource.includes("label.subscribe_short_text")
        && !footerSource.includes("pt-12")
        && !footerSource.includes("py-8 mt-8")
        && !footerSource.includes("mb-14"),
    "Frontend footer should use a minimal strip structure instead of stacked full-page content"
);

assert(
    cssSource.includes(".rcs-compact-footer")
        && cssSource.includes("padding: 12px 0 0")
        && cssSource.includes(".rcs-footer-strip")
        && cssSource.includes("min-height: 72px")
        && cssSource.includes("gap: 14px")
        && cssSource.includes(".rcs-footer-bottom")
        && cssSource.includes("padding: 8px 0")
        && cssSource.includes("border-top: 1px solid rgba(255, 255, 255, 0.18)")
        && !cssSource.includes(".rcs-footer-subscribe"),
    "Footer CSS should enforce a slim minimal footer height"
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
