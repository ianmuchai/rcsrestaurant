const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const { parse } = require("@vue/compiler-sfc");

const componentPath = path.resolve(__dirname, "../resources/js/components/frontend/pwa/PwaInstallComponent.vue");
const { descriptor } = parse(fs.readFileSync(componentPath, "utf8"));
const componentModule = import(`data:text/javascript;base64,${Buffer.from(descriptor.script.content).toString("base64")}`);

async function setup({ userAgent = "Android", maxTouchPoints = 0, standalone = false, secure = true, clipboard } = {}) {
    const { default: component } = await componentModule;
    const events = new Map();
    const calls = { copies: [], focus: 0, prompts: 0, prevented: 0 };
    global.window = {
        location: { origin: "https://rcs.example" },
        isSecureContext: secure,
        matchMedia: () => ({ matches: standalone }),
        addEventListener: (name, handler) => events.set(name, handler),
        removeEventListener: (name, handler) => { if (events.get(name) === handler) events.delete(name); },
    };
    const navigator = {
        userAgent, maxTouchPoints,
        clipboard: clipboard || { writeText: async (url) => calls.copies.push(url) },
    };
    Object.defineProperty(global, "navigator", { value: navigator, configurable: true });
    window.navigator = navigator;
    global.document = { querySelector: () => ({}) };
    const vm = {
        ...component.data(),
        $refs: { installGuide: { focus: () => calls.focus++ } },
        $nextTick: (callback) => Promise.resolve().then(callback),
    };
    for (const [name, method] of Object.entries(component.methods)) vm[name] = method.bind(vm);
    for (const [name, getter] of Object.entries(component.computed)) {
        Object.defineProperty(vm, name, { get: () => getter.call(vm) });
    }
    component.mounted.call(vm);
    const capture = (prompt = async () => {}, userChoice = Promise.resolve({ outcome: "accepted" })) => {
        events.get("beforeinstallprompt")({
            preventDefault: () => calls.prevented++,
            prompt: async () => { calls.prompts++; await prompt(); },
            userChoice,
        });
    };
    return { vm, calls, events, capture, component };
}

test("page load and deferred event never prompt or copy until Download App is clicked", async () => {
    const { vm, calls, capture } = await setup();
    assert.equal(vm.installButtonLabel, "Download App");
    capture();
    assert.equal(calls.prevented, 1);
    assert.equal(calls.prompts, 0);
    assert.deepEqual(calls.copies, []);
    await vm.nativeInstall();
    assert.equal(calls.prompts, 1);
    assert.equal(vm.isInstalled, false, "acceptance alone does not confirm installation");
    assert.equal(vm.installPrompt, null);
    assert.equal(vm.isInstalling, false);
});

test("without native prompt Download App focuses real steps and never copies", async () => {
    const { vm, calls } = await setup();
    await vm.nativeInstall();
    assert.equal(calls.focus, 1);
    assert.deepEqual(calls.copies, []);
    assert.match(vm.copyStatus, /Android.*menu.*(Install app|Add to Home Screen)/i);
});

for (const [label, options] of [
    ["iPhone", { userAgent: "Mozilla/5.0 (iPhone)" }],
    ["iPad", { userAgent: "Mozilla/5.0 (iPad)" }],
    ["touch Mac iPad", { userAgent: "Mozilla/5.0 (Macintosh)", maxTouchPoints: 5 }],
]) {
    test(`${label} fallback directs customers to Safari`, async () => {
        const { vm, calls } = await setup(options);
        await vm.nativeInstall();
        assert.match(vm.copyStatus, /Safari/);
        assert.equal(calls.focus, 1);
        assert.deepEqual(calls.copies, []);
    });
}

test("dismissed prompt gives steps without claiming installed", async () => {
    const { vm, calls, capture } = await setup();
    capture(undefined, Promise.resolve({ outcome: "dismissed" }));
    await vm.nativeInstall();
    assert.equal(vm.isInstalled, false);
    assert.equal(vm.isInstalling, false);
    assert.equal(calls.focus, 1);
    assert.deepEqual(calls.copies, []);
});

for (const phase of ["prompt", "userChoice"]) {
    test(`${phase} rejection is handled and offers installation steps`, async () => {
        const { vm, calls, capture } = await setup();
        capture(phase === "prompt" ? async () => { throw Error("unavailable"); } : undefined,
            phase === "userChoice" ? { then: (_, reject) => reject(Error("unavailable")) } : undefined);
        await assert.doesNotReject(vm.nativeInstall());
        assert.equal(vm.isInstalled, false);
        assert.equal(vm.isInstalling, false);
        assert.equal(vm.installPrompt, null);
        assert.equal(calls.focus, 1);
        assert.deepEqual(calls.copies, []);
    });
}

test("installing guard prevents repeated clicks and appinstalled confirms installation", async () => {
    const { vm, calls, capture, events } = await setup();
    let finish;
    capture(() => new Promise((resolve) => { finish = resolve; }));
    const pending = vm.nativeInstall();
    assert.equal(vm.isInstalling, true);
    await vm.nativeInstall();
    assert.equal(calls.prompts, 1);
    assert.equal(calls.focus, 0);
    events.get("appinstalled")();
    finish();
    await pending;
    assert.equal(vm.isInstalled, true);
    assert.equal(vm.installButtonLabel, "Installed");
    await vm.nativeInstall();
    assert.equal(calls.prompts, 1);
});

test("standalone devices stay installed even when a deferred event arrives", async () => {
    const { vm, calls, capture } = await setup({ standalone: true });
    capture();
    await vm.nativeInstall();
    assert.equal(vm.isInstalled, true);
    assert.equal(calls.prompts, 0);
    assert.equal(calls.focus, 0);
});

test("iOS standalone state confirms installation", async () => {
    const { vm } = await setup();
    window.navigator.standalone = true;
    vm.syncInstalledState();
    assert.equal(vm.isInstalled, true);
});

test("QR utility copies the stable install URL only when explicitly requested", async () => {
    const { vm, calls } = await setup();
    await vm.copyLink(vm.installPageUrl);
    assert.deepEqual(calls.copies, ["https://rcs.example/install-app"]);
    assert.match(vm.copyStatus, /copied/i);
});

for (const options of [
    { clipboard: { writeText: async () => { throw Error("denied"); } } },
    { secure: false },
    { clipboard: {} },
]) {
    test("unavailable or denied clipboard is handled with a manual URL", async () => {
        const { vm } = await setup(options);
        await assert.doesNotReject(vm.copyLink(vm.installPageUrl));
        assert.match(vm.copyStatus, /https:\/\/rcs\.example\/install-app/);
    });
}

test("unmount removes the registered prompt and installed listeners", async () => {
    const { vm, component, events } = await setup();
    component.beforeUnmount.call(vm);
    assert.equal(events.size, 0);
});
