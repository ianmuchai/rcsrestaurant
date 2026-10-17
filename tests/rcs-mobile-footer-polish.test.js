const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { parse, compileTemplate } = require("@vue/compiler-sfc");

const root = path.resolve(__dirname, "..");
const footerPath = path.join(root, "resources/js/components/layouts/frontend/FrontendFooterComponent.vue");
const mobileNavPath = path.join(root, "resources/js/components/layouts/frontend/FrontendMobileNavBarComponent.vue");
const cssPath = path.join(root, "resources/css/app.css");

function readVue(filePath) {
    const source = fs.readFileSync(filePath, "utf8");
    const descriptor = parse(source, { filename: filePath }).descriptor;
    assert(descriptor.template, `${path.basename(filePath)} should include a template`);

    const result = compileTemplate({
        source: descriptor.template.content,
        filename: filePath,
        id: path.basename(filePath)
    });

    assert.deepStrictEqual(result.errors, [], `${path.basename(filePath)} template should compile cleanly`);
    return source;
}

const footerSource = readVue(footerPath);
const mobileNavSource = readVue(mobileNavPath);
const cssSource = fs.readFileSync(cssPath, "utf8");
const workerSource = fs.readFileSync(path.join(root, 'public/sw.js'), 'utf8');
assert(workerSource.includes('rcs-pwa-ui-install-20261017-v3'),
    'Existing PWA installations should refresh their asset cache for the mobile layout release');

assert(
    footerSource.includes("rcs-footer-downloads")
        && footerSource.includes("rcs-footer-download-button")
        && footerSource.includes("Android")
        && footerSource.includes("iOS")
        && footerSource.includes("frontend.installApp")
        && !footerSource.includes("App Store")
        && !footerSource.includes("Play Store")
        && !footerSource.includes("Google Play"),
    "Footer should include Android and iOS PWA download links without app store wording"
);

assert(
    mobileNavSource.includes("rcs-mobile-topbar")
        && mobileNavSource.includes("rcs-mobile-search")
        && mobileNavSource.includes("rcs-mobile-nav-link")
        && mobileNavSource.includes("frontend.home")
        && mobileNavSource.includes("frontend.menu")
        && mobileNavSource.includes("frontend.offers")
        && mobileNavSource.includes("auth.login")
        && mobileNavSource.includes("search")
        && mobileNavSource.includes("fa-magnifying-glass")
        && mobileNavSource.includes("fa-house")
        && mobileNavSource.includes("fa-tags")
        && mobileNavSource.includes("fa-circle-user"),
    "Mobile navigation should provide a compact top bar with search, home, menu, offers, and login/profile access"
);

assert(mobileNavSource.includes('aria-label="Download app"')
    && mobileNavSource.includes('fa-download')
    && mobileNavSource.includes('v-if="searchOpen"')
    && mobileNavSource.includes(':aria-expanded="searchOpen"')
    && mobileNavSource.includes('ref="searchInput"'),
    "Mobile header should use accessible icon-only install and expandable search controls");

assert(
    cssSource.includes(".rcs-mobile-topbar")
        && cssSource.includes(".rcs-mobile-search")
        && cssSource.includes(".rcs-mobile-bottom-nav")
        && cssSource.includes(".rcs-front-video-hero .rcs-plain-video-slide")
        && cssSource.includes("height: calc(100svh - 48px)")
        && cssSource.includes("object-position: center center")
        && cssSource.includes(".product-card-grid")
        && cssSource.includes("grid-template-columns: repeat(2, minmax(0, 1fr))")
        && cssSource.includes(".product-card-grid-title")
        && cssSource.includes(".product-card-list-title")
        && cssSource.includes("min-width: 0")
        && cssSource.includes(".rcs-footer-downloads")
        && cssSource.includes(".rcs-footer-download-button"),
    "Mobile CSS should size the hero, product cards, mobile nav, and footer download buttons intentionally"
);

console.log("RC's mobile and footer polish contract passed");

assert(cssSource.includes('grid-template-areas: "brand links downloads contact"')
    && cssSource.includes('grid-template-areas: "brand brand" "links links" "downloads contact"'),
    'Footer should have explicit desktop and phone group placement');
