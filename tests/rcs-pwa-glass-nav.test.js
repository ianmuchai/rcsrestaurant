const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { parse, compileTemplate } = require("@vue/compiler-sfc");

const root = path.resolve(__dirname, "..");
const navbarPath = path.join(root, "resources/js/components/layouts/frontend/FrontendNavBarComponent.vue");
const quickActionsPath = path.join(root, "resources/js/components/layouts/frontend/FrontendQuickActionsComponent.vue");
const cssPath = path.join(root, "resources/css/app.css");
const masterPath = path.join(root, "resources/views/master.blade.php");
const tailwindPath = path.join(root, "tailwind.config.js");
const manifestPath = path.join(root, "public/manifest.webmanifest");
const serviceWorkerPath = path.join(root, "public/sw.js");
const offlinePath = path.join(root, "public/offline.html");
const icon192Path = path.join(root, "public/images/pwa/icon-192.png");
const icon512Path = path.join(root, "public/images/pwa/icon-512.png");

function compileVueTemplate(filePath) {
    const source = fs.readFileSync(filePath, "utf8");
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

const navbarSource = compileVueTemplate(navbarPath);
const quickActionsSource = compileVueTemplate(quickActionsPath);
const cssSource = fs.readFileSync(cssPath, "utf8");
const masterSource = fs.readFileSync(masterPath, "utf8");
const tailwindSource = fs.readFileSync(tailwindPath, "utf8");

assert(
    navbarSource.includes("rcs-glass-header")
        && navbarSource.includes("rcs-glass-nav-container")
        && navbarSource.includes("rcs-main-nav")
        && navbarSource.includes("rcs-nav-link")
        && navbarSource.includes("rcs-nav-link-active")
        && navbarSource.includes("rcs-nav-tools"),
    "FrontendNavBarComponent should expose dedicated glass navigation structure classes"
);

assert(
    cssSource.includes(".rcs-glass-header")
        && cssSource.includes("backdrop-filter: blur(18px)")
        && cssSource.includes("-webkit-backdrop-filter: blur(18px)")
        && cssSource.includes("background: rgba(255, 255, 255, 0.74)")
        && cssSource.includes("border-bottom: 1px solid rgba(0, 168, 0, 0.16)")
        && cssSource.includes("box-shadow: 0 18px 48px rgba(15, 23, 42, 0.08)")
        && cssSource.includes(".rcs-glass-nav-container")
        && cssSource.includes(".rcs-main-nav")
        && cssSource.includes(".rcs-nav-link")
        && cssSource.includes(".rcs-nav-link-active")
        && cssSource.includes(".rcs-nav-tools"),
    "CSS should style the top bar as a modern glass header with improved spacing"
);

assert(
    cssSource.includes(".ff-header .container { @apply h-[84px] lg:h-[58px] py-2 lg:py-0 }")
        && cssSource.includes("calc(100vh - 58px)")
        && cssSource.includes("calc(100vh - 84px)"),
    "Glass navbar should stay compact and keep the hero height aligned below it"
);

assert(
    cssSource.includes("--rcs-logo-green: #00A800")
        && cssSource.includes("--primary: 0 168 0")
        && tailwindSource.includes('"primary":"#00A800"')
        && tailwindSource.includes('"primary-light": "#E8FFE8"'),
    "Global theme green should match the sampled RC logo green"
);

assert(
    !masterSource.includes('<link rel="manifest" href="{{ asset(\'manifest.webmanifest\') }}">')
        && masterSource.includes('<meta name="theme-color" content="#00A800">')
        && masterSource.includes('<meta name="mobile-web-app-capable" content="yes">')
        && masterSource.includes('<meta name="apple-mobile-web-app-capable" content="yes">')
        && masterSource.includes('<link rel="apple-touch-icon" href="{{ asset(\'images/pwa/icon-192.png\') }}">')
        && !masterSource.includes("navigator.serviceWorker.register(\"{{ asset('sw.js') }}\")"),
    "Master Blade template should not load the PWA manifest or service worker until the user clicks Download"
);

assert(fs.existsSync(manifestPath), "PWA manifest should exist");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

assert.strictEqual(manifest.name, "RC's Restaurant");
assert.strictEqual(manifest.short_name, "RC's");
assert.strictEqual(manifest.start_url, "/");
assert.strictEqual(manifest.scope, "/");
assert.strictEqual(manifest.display, "standalone");
assert.strictEqual(manifest.theme_color, "#00A800");
assert.strictEqual(manifest.background_color, "#ffffff");
assert(
    manifest.icons.some((icon) => icon.src === "/images/pwa/icon-192.png" && icon.sizes === "192x192" && icon.type === "image/png")
        && manifest.icons.some((icon) => icon.src === "/images/pwa/icon-512.png" && icon.sizes === "512x512" && icon.type === "image/png" && icon.purpose.includes("maskable")),
    "PWA manifest should include 192px and maskable 512px icons"
);

assert(fs.existsSync(serviceWorkerPath), "Service worker should exist");
const serviceWorkerSource = fs.readFileSync(serviceWorkerPath, "utf8");

assert(
    serviceWorkerSource.includes("rcs-pwa-v1")
        && serviceWorkerSource.includes("install")
        && serviceWorkerSource.includes("activate")
        && serviceWorkerSource.includes("fetch")
        && serviceWorkerSource.includes("/offline.html")
        && serviceWorkerSource.includes("request.mode === \"navigate\""),
    "Service worker should cache app assets and provide an offline navigation fallback"
);

assert(fs.existsSync(offlinePath), "Offline fallback page should exist");
assert(fs.existsSync(icon192Path), "192px PWA icon should exist");
assert(fs.existsSync(icon512Path), "512px PWA icon should exist");

assert(
    navbarSource.includes("installPrompt")
        && navbarSource.includes("preparePwaInstall")
        && navbarSource.includes("ensurePwaManifest")
        && navbarSource.includes("registerPwaServiceWorker")
        && navbarSource.includes("beforeinstallprompt")
        && navbarSource.includes("prompt()")
        && navbarSource.includes("userChoice")
        && navbarSource.includes("appinstalled")
        && navbarSource.includes("installPwaApp")
        && navbarSource.includes("openPwaInstall")
        && navbarSource.includes("isPwaDialogOpen")
        && navbarSource.includes("showPwaDialog")
        && navbarSource.includes("closePwaDialog")
        && navbarSource.includes("confirmPwaInstall")
        && navbarSource.includes("rcs-pwa-dialog-backdrop")
        && navbarSource.includes("rcs-pwa-dialog-card")
        && navbarSource.includes("frontend.installApp")
        && navbarSource.includes("rcs-nav-install-button")
        && navbarSource.includes("data-rcs-action=\"pwa_install_link\"")
        && navbarSource.indexOf("rcs-nav-install-button") < navbarSource.indexOf("rcs-main-nav"),
    "Frontend nav should expose a visible top-left PWA install button that opens a branded install dialog"
);

assert(
    !navbarSource.includes("await this.installPwaApp();\n                return;"),
    "Download button should not jump straight to the native browser install dialog"
);

assert(
    cssSource.includes(".rcs-nav-install-button")
        && cssSource.includes("background: #00A800")
        && cssSource.includes(".rcs-nav-install-button[disabled]")
        && !cssSource.includes(".rcs-floating-action-install"),
    "PWA install button should be styled as a clear green top-bar action with no floating install icon"
);

console.log("RC's PWA and glass nav contract passed");
