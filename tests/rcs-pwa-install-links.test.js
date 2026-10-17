const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { parse, compileTemplate } = require("@vue/compiler-sfc");

const root = path.resolve(__dirname, "..");
const routePath = path.join(root, "resources/js/router/modules/frontendRoutes.js");
const componentPath = path.join(root, "resources/js/components/frontend/pwa/PwaInstallComponent.vue");
const navbarPath = path.join(root, "resources/js/components/layouts/frontend/FrontendNavBarComponent.vue");
const cssPath = path.join(root, "resources/css/app.css");
const manifestPath = path.join(root, "public/manifest.webmanifest");
const swPath = path.join(root, "public/sw.js");
const publicIndexPath = path.join(root, "public/index.html");

assert(fs.existsSync(componentPath), "PWA install component should exist");

const componentSource = fs.readFileSync(componentPath, "utf8");
const descriptor = parse(componentSource, { filename: componentPath }).descriptor;

assert(descriptor.template, "PWA install component should include a template");

const result = compileTemplate({
    source: descriptor.template.content,
    filename: componentPath,
    id: "PwaInstallComponent"
});

assert.deepStrictEqual(result.errors, [], "PWA install component template should compile without errors");

[
    "rcs-pwa-install-page",
    "rcs-pwa-link-card",
    "installPageUrl",
    "rcs-pwa-ios-guide",
    "rcs-pwa-qr-links",
    "rcs-pwa-share-figure",
    "copyLink",
    "nativeInstall",
    "beforeinstallprompt",
].forEach((needle) => {
    assert(
        componentSource.includes(needle),
        `PWA install page should include ${needle}`
    );
});

assert(componentSource.includes("Download RC's app"), "Customer heading should invite app download");
assert(componentSource.includes('ref="installGuide" tabindex="-1"'), "Installation guide should accept focus");
assert(componentSource.includes('role="status"'), "Install feedback should be announced");
assert(!/navigator\.share|shareInstallPage|Open From QR|Share Link|manifestUrl|serviceWorkerUrl/.test(componentSource),
    "Customer install page should not offer sharing or technical URL cards");
assert(/<details[\s\S]*rcs-pwa-link-card[\s\S]*<\/details>/.test(descriptor.template.content),
    "QR URL copy utility should be collapsed by default");
assert.strictEqual((descriptor.template.content.match(/rcs-pwa-link-card/g) || []).length, 1,
    "Only the public install URL should have a copy card");
assert(descriptor.template.content.includes('<ol>'), "iPhone instructions should be ordered steps");
for (const text of ["Safari", "Page Menu", "More", "Add to Home Screen", "Open as Web App"]) {
    assert(descriptor.template.content.includes(text), `iPhone guide should include ${text}`);
}
assert(/<img\s[^>]*src="\/images\/pwa\/ios-share-button.png"[^>]*width="50"[^>]*height="60"[^>]*alt="Safari Share button: a square with an upward arrow"/s.test(componentSource),
    "Guide should show the actual Apple Share image with dimensions and descriptive alt text");
assert(componentSource.includes("https://support.apple.com/en-lamr/guide/iphone/iphea86e5236/ios"),
    "Apple Share figure should link to the supplied Apple guide");

const routeSource = fs.readFileSync(routePath, "utf8");
assert(
    routeSource.includes("PwaInstallComponent")
        && routeSource.includes('path: "/install-app"')
        && routeSource.includes('name: "frontend.installApp"')
        && routeSource.includes("auth: false"),
    "Frontend routes should expose a public /install-app PWA route for QR codes"
);

const navbarSource = fs.readFileSync(navbarPath, "utf8");
assert(
    navbarSource.includes("frontend.installApp")
        && navbarSource.includes("openPwaInstall")
        && navbarSource.includes("preparePwaInstall")
        && navbarSource.includes("ensurePwaManifest")
        && navbarSource.includes("registerPwaServiceWorker")
        && navbarSource.includes("data-rcs-action=\"pwa_install_link\""),
    "Top-left PWA button should route users to the QR-friendly install page when needed"
);

const publicIndexSource = fs.readFileSync(publicIndexPath, "utf8");
assert(
    !publicIndexSource.includes('<link rel="manifest" href="/manifest.webmanifest">')
        && !publicIndexSource.includes("navigator.serviceWorker.register"),
    "Static Vercel homepage shell should not activate PWA install behavior before the user clicks Download"
);

const cssSource = fs.readFileSync(cssPath, "utf8");
assert(
    cssSource.includes(".rcs-pwa-install-page")
        && cssSource.includes(".rcs-pwa-install-hero")
        && cssSource.includes(".rcs-pwa-link-card")
        && cssSource.includes(".rcs-pwa-copy-button")
        && cssSource.includes("word-break: break-word"),
    "PWA install page should have responsive, copy-friendly styling"
);

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
assert.strictEqual(manifest.start_url, "/", "PWA should start on the website homepage, not an install/download page");

const serviceWorkerSource = fs.readFileSync(swPath, "utf8");
assert(
    serviceWorkerSource.includes('"/install-app"'),
    "Service worker should precache the install URL for QR flows"
);

console.log("RC's PWA install links contract passed");
