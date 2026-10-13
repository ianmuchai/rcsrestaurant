const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const vercelPath = path.join(root, "vercel.json");
const vercelOutputScriptPath = path.join(root, "scripts/prepare-vercel-output.js");

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
    "20.x",
    "package.json should pin Node 20 for Vercel because Laravel Mix 6 is not reliable on newer local Node runtimes"
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

assert(
    fs.existsSync(vercelOutputScriptPath),
    "Vercel output preparation script should exist"
);

const vercelOutputScript = fs.readFileSync(vercelOutputScriptPath, "utf8");

assert(
    vercelOutputScript.includes("vercel-public")
        && vercelOutputScript.includes("index.html")
        && vercelOutputScript.includes("index.php")
        && vercelOutputScript.includes("fs.rmSync")
        && vercelOutputScript.includes("<default-component />"),
    "Vercel output script should copy assets, remove PHP entrypoints, and write a Vue HTML shell"
);

assert(
    !Object.values(packageJson.scripts).includes("vite build"),
    "Project scripts should not point Vercel at vite build because this repo has no index.html entry"
);

console.log("RC's Vercel build config contract passed");
