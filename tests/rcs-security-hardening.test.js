const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const kernelPath = path.join(root, "app/Http/Kernel.php");
const middlewarePath = path.join(root, "app/Http/Middleware/SecurityHeaders.php");
const webRoutesPath = path.join(root, "routes/web.php");
const apiRoutesPath = path.join(root, "routes/api.php");

const kernelSource = fs.readFileSync(kernelPath, "utf8");
const webRoutesSource = fs.readFileSync(webRoutesPath, "utf8");
const apiRoutesSource = fs.readFileSync(apiRoutesPath, "utf8");

assert(
    fs.existsSync(middlewarePath),
    "SecurityHeaders middleware should exist"
);

const middlewareSource = fs.readFileSync(middlewarePath, "utf8");

assert(
    kernelSource.includes("\\App\\Http\\Middleware\\SecurityHeaders::class"),
    "SecurityHeaders middleware should be registered globally"
);

[
    "X-Content-Type-Options",
    "nosniff",
    "X-Frame-Options",
    "SAMEORIGIN",
    "Referrer-Policy",
    "strict-origin-when-cross-origin",
    "Permissions-Policy",
    "Content-Security-Policy",
    "Strict-Transport-Security",
    "max-age=31536000",
].forEach((needle) => {
    assert(
        middlewareSource.includes(needle),
        `SecurityHeaders middleware should set ${needle}`
    );
});

[
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
].forEach((directive) => {
    assert(
        middlewareSource.includes(directive),
        `CSP should include ${directive}`
    );
});

assert(
    middlewareSource.includes("$request->isSecure()"),
    "HSTS should only be applied to HTTPS requests"
);

assert(
    !webRoutesSource.includes("Route::get('/cronttt'")
        && !webRoutesSource.includes("Artisan::call('storage:link')")
        && !webRoutesSource.includes("Investment Creation Happened"),
    "Exposed maintenance route should be removed from web routes"
);

assert(
    apiRoutesSource.includes("Route::prefix('admin')->name('admin.')->middleware(['installed', 'apiKey', 'auth:sanctum', 'localization'])->group(function () {"),
    "Admin API routes should require Sanctum auth in addition to the browser API key"
);

console.log("RC's security hardening contract passed");
