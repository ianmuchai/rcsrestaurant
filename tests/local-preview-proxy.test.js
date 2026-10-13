const assert = require("assert");
const http = require("http");
const path = require("path");
const { spawn } = require("child_process");

const root = path.resolve(__dirname, "..", "..", "..");
const proxyPath = path.join(root, "local-rcs-live-proxy.js");
const port = 8097;

function request(pathname) {
    return new Promise((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${port}${pathname}`, (res) => {
            let body = "";
            res.setEncoding("utf8");
            res.on("data", (chunk) => {
                body += chunk;
            });
            res.on("end", () => resolve({ statusCode: res.statusCode, headers: res.headers, body }));
        });

        req.on("error", reject);
        req.setTimeout(5000, () => {
            req.destroy(new Error("Timed out waiting for local preview proxy"));
        });
    });
}

async function waitForServer(child) {
    const deadline = Date.now() + 8000;
    let lastError;

    while (Date.now() < deadline) {
        if (child.exitCode !== null) {
            throw new Error(`Proxy exited early with code ${child.exitCode}`);
        }

        try {
            await request("/css/app.css");
            return;
        } catch (error) {
            lastError = error;
            await new Promise((resolve) => setTimeout(resolve, 150));
        }
    }

    throw lastError || new Error("Proxy did not start");
}

(async () => {
    const child = spawn(process.execPath, [proxyPath], {
        cwd: root,
        env: { ...process.env, PORT: String(port) },
        stdio: "ignore"
    });

    try {
        await waitForServer(child);
        const response = await request("/");

        assert.strictEqual(response.statusCode, 200, "Local preview root should respond successfully");
        assert.strictEqual(
            response.headers["x-rcs-preview-shell"],
            "local",
            "Local preview root should be served by the local shell instead of the upstream TLS proxy"
        );
        assert(
            response.body.includes("<default-component />") && response.body.includes("/js/app.js"),
            "Local shell should mount the Vue app with the compiled local bundle"
        );

        console.log("Local preview proxy contract passed");
    } finally {
        child.kill();
    }
})().catch((error) => {
    console.error(error);
    process.exit(1);
});
