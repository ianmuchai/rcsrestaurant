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
    "manifestUrl",
    "serviceWorkerUrl",
    "copyLink",
    "shareInstallPage",
    "nativeInstall",
    "beforeinstallprompt",
].forEach((needle) => {
    assert(
        componentSource.includes(needle),
        `PWA install page should include ${needle}`
    );
});

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
        && navbarSource.includes("data-rcs-action=\"pwa_install_link\""),
    "Top-left PWA button should route users to the QR-friendly install page when needed"
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
