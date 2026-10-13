const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const envConfigPath = path.join(root, "resources/js/config/env.js");
const vercelPath = path.join(root, "vercel.json");
const vercelOutputScriptPath = path.join(root, "scripts/prepare-vercel-output.js");
const publicIndexHtmlPath = path.join(root, "public/index.html");
const vercelIgnorePath = path.join(root, ".vercelignore");

assert(
    fs.existsSync(vercelPath),
    "Repository should include vercel.json so Vercel does not auto-detect this Laravel Mix app as Vite"
);

const vercelConfig = JSON.parse(fs.readFileSync(vercelPath, "utf8"));

assert.strictEqual(
    packageJson.scripts.build,
    "npm run production",
    "package.json should expose a build script that runs the existing Laravel Mix production build"
);

assert.strictEqual(
    packageJson.scripts["vercel-build"],
    "npm run production && node scripts/prepare-vercel-output.js",
    "package.json should expose a Vercel build that creates a static HTML output directory"
);

assert.strictEqual(
    packageJson.engines.node,
    "24.x",
    "package.json should pin Node 24 for Vercel because Node 20 is discontinued on the deployment platform"
);

assert.strictEqual(
    vercelConfig.buildCommand,
    "npm run vercel-build",
    "vercel.json should run the Vercel static-output build instead of publishing Laravel PHP directly"
);

assert.strictEqual(
    vercelConfig.outputDirectory,
    "vercel-public",
    "vercel.json should publish the generated static directory, not Laravel public with index.php"
);

const htmlHeaders = Array.isArray(vercelConfig.headers)
    ? vercelConfig.headers.filter((entry) => ["/", "/index.html"].includes(entry.source))
    : [];

assert.strictEqual(
    htmlHeaders.length,
    2,
    "Vercel should define explicit homepage HTML headers so the deployment URL opens the site"
);

htmlHeaders.forEach((entry) => {
    const headers = Object.fromEntries(entry.headers.map((header) => [header.key.toLowerCase(), header.value]));
    assert.strictEqual(
        headers["content-type"],
        "text/html; charset=utf-8",
        `${entry.source} should be served as HTML instead of a downloadable file`
    );
    assert.strictEqual(
        headers["content-disposition"],
        "inline",
        `${entry.source} should open inline and not download automatically`
    );
});

assert(
    fs.existsSync(vercelOutputScriptPath),
    "Vercel output preparation script should exist"
);

assert(
    fs.existsSync(publicIndexHtmlPath),
    "Public directory should include index.html so Vercel never serves public/index.php as a download"
);

assert(
    fs.existsSync(vercelIgnorePath),
    "Repository should include .vercelignore so Vercel cannot upload Laravel PHP entrypoints"
);

const vercelIgnore = fs.existsSync(vercelIgnorePath)
    ? fs.readFileSync(vercelIgnorePath, "utf8")
    : "";

assert(
    vercelIgnore.includes("public/index.php")
        && vercelIgnore.includes("public/.htaccess")
        && !vercelIgnore.includes("public/index.html"),
    ".vercelignore should exclude public/index.php while keeping public/index.html deployable"
);

const publicIndexHtml = fs.existsSync(publicIndexHtmlPath)
    ? fs.readFileSync(publicIndexHtmlPath, "utf8")
    : "";
const envConfigSource = fs.readFileSync(envConfigPath, "utf8");

assert(
    publicIndexHtml.includes("<!DOCTYPE html>")
        && publicIndexHtml.includes("<default-component />")
        && publicIndexHtml.includes('/js/app.js?v=20260723g')
        && publicIndexHtml.includes('/css/app.css?v=20260723g')
        && publicIndexHtml.includes('const APP_URL = "https://rcs.co.ke";')
        && publicIndexHtml.includes("const APP_KEY = ")
        && !publicIndexHtml.includes("const APP_URL = window.location.origin;")
        && !publicIndexHtml.includes('const APP_KEY = "";')
        && !publicIndexHtml.includes("<?php"),
    "public/index.html should be a static Vue shell with live API runtime config, not PHP"
);

assert(
    envConfigSource.includes("runtimeWindow.APP_URL")
        && envConfigSource.includes("runtimeWindow.APP_KEY")
        && envConfigSource.includes("runtimeWindow.APP_URL || process.env.MIX_HOST")
        && envConfigSource.includes("runtimeWindow.APP_KEY || process.env.MIX_API_KEY"),
    "Vue env config should prefer runtime APP_URL and APP_KEY for static Vercel deployments"
);

const vercelOutputScript = fs.readFileSync(vercelOutputScriptPath, "utf8");

assert(
    vercelOutputScript.includes("vercel-public")
        && vercelOutputScript.includes("index.html")
        && vercelOutputScript.includes("index.php")
        && vercelOutputScript.includes("fs.rmSync")
        && vercelOutputScript.includes('path.join(source, "index.html")')
        && vercelOutputScript.includes("readFileSync"),
    "Vercel output script should copy assets, remove PHP entrypoints, and reuse the public Vue HTML shell"
);

assert(
    !Object.values(packageJson.scripts).includes("vite build"),
    "Project scripts should not point Vercel at vite build because this repo has no index.html entry"
);

console.log("RC's Vercel build config contract passed");
