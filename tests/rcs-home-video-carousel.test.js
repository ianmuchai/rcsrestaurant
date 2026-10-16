const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { parse, compileTemplate } = require("@vue/compiler-sfc");

const root = path.resolve(__dirname, "..");
const homePath = path.join(root, "resources/js/components/frontend/home/HomeComponent.vue");
const sliderPath = path.join(root, "resources/js/components/frontend/home/SliderComponent.vue");
const legacyVideoCarouselPath = path.join(root, "resources/js/components/frontend/home/VideoCarouselComponent.vue");
const navbarPath = path.join(root, "resources/js/components/layouts/frontend/FrontendNavBarComponent.vue");
const quickActionsPath = path.join(root, "resources/js/components/layouts/frontend/FrontendQuickActionsComponent.vue");

function readVue(filePath) {
    return fs.readFileSync(filePath, "utf8");
}

function compileVueTemplate(filePath) {
    const source = readVue(filePath);
    const descriptor = parse(source, { filename: filePath }).descriptor;
    assert(descriptor.template, `${path.basename(filePath)} should include a template`);

    const result = compileTemplate({
        source: descriptor.template.content,
        filename: filePath,
        id: path.basename(filePath)
    });

    assert.deepStrictEqual(
        result.errors,
        [],
        `${path.basename(filePath)} template should compile without errors`
    );

    return source;
}

const homeSource = compileVueTemplate(homePath);

assert(
    homeSource.includes("<SliderComponent />"),
    "HomeComponent should keep the homepage hero in the existing slider position"
);

assert(
    homeSource.indexOf("<SliderComponent />") < homeSource.indexOf("<TrackOrderComponent />"),
    "HomeComponent should place the video hero directly below the menu bar before track order content"
);

assert(
    !homeSource.includes("VideoCarouselComponent"),
    "HomeComponent should not render a separate video carousel below the hero"
);

const sliderSource = compileVueTemplate(sliderPath);

assert(
    sliderSource.includes("<video"),
    "SliderComponent should render native video media as the homepage hero"
);

assert(
    sliderSource.includes("autoplay") && sliderSource.includes("playsinline") && sliderSource.includes("muted") && sliderSource.includes("loop")
        && sliderSource.includes(":preload=\"index === 0 ? 'auto' : 'metadata'\"")
        && sliderSource.includes("@canplay=\"playVideo\"")
        && sliderSource.includes("@loadeddata=\"playVideo\""),
    "Hero videos should autoplay silently, loop, prioritize the first video and retry playback when media is ready"
);

assert(
    !sliderSource.includes(":poster=")
        && !sliderSource.includes("<img v-else")
        && !sliderSource.includes("rcs-video-fallback-image")
        && !sliderSource.includes("markVideoFailed")
        && !sliderSource.includes("failed:"),
    "Hero carousel should render videos only, without poster images or image fallbacks"
);

assert(
    !sliderSource.includes(":navigation=")
        && !sliderSource.includes(":pagination=")
        && !sliderSource.includes("Navigation")
        && !sliderSource.includes("Pagination"),
    "Hero video carousel should be plain autoplay with no side navigation buttons or dot pagination"
);

assert(
    sliderSource.includes("frontend.menu") && sliderSource.includes("rcs-hero-order-button"),
    "Hero should place the functional Order Online button over the video carousel"
);

assert(
    sliderSource.includes("rcs-hero-menu-button")
        && sliderSource.includes("data-rcs-action=\"hero_menu_click\"")
        && sliderSource.includes("fa-bowl-food")
        && sliderSource.includes("{{ $t('label.menu') }}"),
    "Hero should keep the Menu action as a modern floating square food button"
);

assert(
    sliderSource.includes("currentHeroLogoSrc")
        && sliderSource.includes("/images/theme/theme-favicon-logo.png?v=rcs-current-logo-20261013")
        && !sliderSource.includes("setting.theme_favicon_logo")
        && !sliderSource.includes("setting.theme_logo")
        && sliderSource.includes("rcs-hero-centered-logo")
        && sliderSource.includes("rcs-hero-brand-stack")
        && sliderSource.indexOf("rcs-hero-centered-logo") < sliderSource.indexOf("rcs-hero-order-button"),
    "Hero should use the current cache-busted RC's logo asset directly, so stale backend logo settings cannot render the old mark"
);

assert(
    !sliderSource.includes("tel:+254712878787") && sliderSource.includes("rcs-hero-page-links") && sliderSource.includes("rcs-hero-introduction"),
    "Hero should retain the logo and order button with editorial navigation, while call actions stay in floating controls"
);

assert(
    sliderSource.includes("https://videos.pexels.com/video-files/5223106/5223106-hd_1920_1080_25fps.mp4")
        && sliderSource.includes("https://videos.pexels.com/video-files/5821371/5821371-hd_1920_1080_30fps.mp4")
        && sliderSource.includes("https://videos.pexels.com/video-files/9371315/9371315-hd_1920_1080_30fps.mp4")
        && !sliderSource.includes("/images/seeder/slider/slider_one.png")
        && !sliderSource.includes("/images/seeder/slider/slider_two.png")
        && !sliderSource.includes("/images/seeder/slider/slider_three.png"),
    "Plain video hero should use restaurant video URLs without local poster fallbacks"
);

assert(
    sliderSource.includes("rcs-plain-video-carousel") && sliderSource.includes("rcs-plain-video"),
    "SliderComponent should expose a plain video carousel structure"
);

assert(
    sliderSource.includes('class="rcs-front-video-hero"') && !sliderSource.includes('class="container mt-5 mb-8 sm:mt-8"'),
    "SliderComponent should render the video hero full-bleed without container margins"
);

const cssSource = fs.readFileSync(path.join(root, "resources/css/app.css"), "utf8");

assert(
    cssSource.includes(".ff-header .container { @apply h-[84px] lg:h-[58px] py-2 lg:py-0 }")
        && cssSource.includes(".rcs-front-video-hero")
        && cssSource.includes("calc(100vh - 58px)")
        && cssSource.includes("calc(100vh - 84px)")
        && !cssSource.includes("calc(100vh - 74px)")
        && !cssSource.includes("calc(100vh - 118px)"),
    "Header and hero CSS should use the shorter menu bar height offsets"
);

assert(
    cssSource.includes(".rcs-hero-centered-logo img")
        && cssSource.includes("width: clamp(132px, 15vw, 172px)")
        && cssSource.includes("height: auto")
        && cssSource.includes("background: transparent")
        && cssSource.includes("border: 0")
        && cssSource.includes("box-shadow: none")
        && cssSource.includes("backdrop-filter: none")
        && cssSource.includes("overflow: hidden")
        && cssSource.includes("display: block")
        && !cssSource.includes(".rcs-hero-centered-logo img {\n    width: 100%;\n    height: 100%;")
        && !cssSource.includes("scale(1.85)")
        && !cssSource.includes("scale(1.7)")
        && !cssSource.includes(".rcs-video-fallback-image"),
    "Hero logo should render as a slightly larger plain current asset without transform scaling that can overlap the Order Online button"
);

assert(
    !cssSource.includes(".rcs-plain-video-carousel .swiper-button-prev")
        && !cssSource.includes(".rcs-plain-video-carousel .swiper-pagination"),
    "Hero CSS should not keep styles for removed side navigation buttons or dot pagination"
);

const navbarSource = compileVueTemplate(navbarPath);

assert(
    !navbarSource.includes("Order Online")
        && !navbarSource.includes("tel:+254712878787")
        && !navbarSource.includes("directions_click")
        && !navbarSource.includes("{{ $t('label.menu') }}")
        && !navbarSource.includes("frontend.menu"),
    "Top menu bar should not render order, menu, call, or directions actions"
);

assert(
    !navbarSource.includes("setting.theme_logo"),
    "Top menu bar should not render the RC's logo"
);

const quickActionsSource = compileVueTemplate(quickActionsPath);
const legacyVideoCarouselSource = compileVueTemplate(legacyVideoCarouselPath);

assert(
    quickActionsSource.includes("rcs-floating-actions")
        && quickActionsSource.includes("whatsappUrl")
        && quickActionsSource.includes("https://wa.me/254712878787")
        && quickActionsSource.includes("tel:+254712878787")
        && quickActionsSource.includes("directionsUrl")
        && quickActionsSource.includes("fa-location-dot")
        && !quickActionsSource.includes("fa-location-arrow"),
    "Floating controls should provide modern call, WhatsApp, and directions actions"
);

assert(
    !quickActionsSource.includes("order_click")
        && !quickActionsSource.includes("pwa_install_click")
        && !quickActionsSource.includes("rcs-floating-action-install")
        && !quickActionsSource.includes("installPrompt")
        && !quickActionsSource.includes("beforeinstallprompt"),
    "Floating controls should not duplicate order or PWA install actions"
);

assert(
    !legacyVideoCarouselSource.includes("fa-utensils")
        && legacyVideoCarouselSource.includes("fa-bowl-food"),
    "Legacy video carousel controls should use the newer food icon instead of the old fork-and-knife icon"
);

assert(
    cssSource.includes(".rcs-hero-brand-overlay")
        && cssSource.includes(".rcs-hero-brand-stack")
        && cssSource.includes(".rcs-hero-order-button")
        && cssSource.includes("grid-template-columns: minmax(0, 1fr) 240px")
        && cssSource.includes("margin-left: auto")
        && cssSource.includes("margin-right: auto")
        && cssSource.includes("align-self: center")
        && cssSource.includes("text-align: center")
        && cssSource.includes("gap: 26px")
        && cssSource.includes(".rcs-hero-page-links")
        && cssSource.includes("align-items: center")
        && cssSource.includes('font-family: "Inter", "Rubik", sans-serif')
        && cssSource.includes("width: clamp(132px, 15vw, 172px)")
        && cssSource.includes("min-width: 212px")
        && cssSource.includes("min-height: 56px")
        && cssSource.includes("border-radius: 6px")
        && cssSource.includes("font-size: 15px")
        && cssSource.includes("font-weight: 700")
        && cssSource.includes("letter-spacing: 0")
        && cssSource.includes("text-transform: none")
        && cssSource.includes(".rcs-hero-menu-button")
        && cssSource.includes("position: fixed")
        && cssSource.includes("top: 74px")
        && cssSource.includes("right: 20px")
        && cssSource.includes("width: 72px")
        && cssSource.includes("background: #F97316")
        && cssSource.includes('font-family: "Inter", "Rubik", sans-serif')
        && cssSource.includes("font-size: 11px")
        && cssSource.includes(".rcs-floating-action-directions")
        && cssSource.includes("background: #E11D48")
        && cssSource.includes(".rcs-floating-action-menu")
        && !cssSource.includes(".rcs-floating-action-install")
        && !cssSource.includes("background: linear-gradient(135deg, #43ab39, #71c344)")
        && !cssSource.includes("background: linear-gradient(135deg, #53ab43, #fbb13c)")
        && cssSource.includes(".rcs-floating-actions")
        && cssSource.includes("right: 18px")
        && cssSource.includes("bottom: 124px")
        && cssSource.includes("flex-direction: column")
        && cssSource.includes("transform: none")
        && cssSource.includes(".rcs-floating-action-whatsapp"),
    "CSS should style the larger centered hero logo, lower rounded-square order button, fixed orange menu button, and lower-right vertical contact icons"
);

console.log("RC's home video hero contract passed");
