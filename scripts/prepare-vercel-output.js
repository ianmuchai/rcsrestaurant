const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const source = path.join(root, "public");
const output = path.join(root, "vercel-public");

fs.rmSync(output, { recursive: true, force: true });
fs.cpSync(source, output, { recursive: true });

[
    "index.php",
    ".htaccess",
    ".gitignore"
].forEach((file) => {
    fs.rmSync(path.join(output, file), { force: true });
});

const html = fs.readFileSync(path.join(source, "index.html"), "utf8");

fs.writeFileSync(path.join(output, "index.html"), html);

console.log("Prepared Vercel static output in vercel-public");
