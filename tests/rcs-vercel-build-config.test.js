const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const vercelPath = path.join(root, "vercel.json");

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
    vercelConfig.buildCommand,
    "npm run production",
    "vercel.json should force Vercel to run the Laravel Mix production build instead of vite build"
);

assert.strictEqual(
    vercelConfig.outputDirectory,
    "public",
    "vercel.json should publish the Laravel public directory after the Mix build"
);

assert(
    !Object.values(packageJson.scripts).includes("vite build"),
    "Project scripts should not point Vercel at vite build because this repo has no index.html entry"
);

console.log("RC's Vercel build config contract passed");
