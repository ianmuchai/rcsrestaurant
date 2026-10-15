const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const { parse, compileTemplate } = require('@vue/compiler-sfc');

for (const name of ['GoogleAuthComponent', 'SignupPhoneComponent', 'LoginComponent']) {
    const filename = `resources/js/components/frontend/auth/${name}.vue`;
    const { descriptor } = parse(fs.readFileSync(filename, 'utf8'));
    const result = compileTemplate({ source: descriptor.template.content, filename, id: name });
    assert.deepStrictEqual(result.errors, []);
}

async function main() {
    let rejected = false;
    const response = { data: { token: 'application-session-token', user: { id: 42 } } };
    const credential = { credential: 'signed-google-token', nonce: 'nonce' };
    const commits = [];
    const context = { axios: { post: async (route, payload) => {
        assert.strictEqual(route, 'auth/google');
        assert.strictEqual(payload, credential);
        if (rejected) throw new Error('Account conflict');
        return response;
    } } };
    const source = fs.readFileSync('resources/js/store/modules/auth.js', 'utf8')
        .replace("import axios from 'axios'", '')
        .replace('export const auth =', 'globalThis.auth =');
    vm.runInNewContext(source, context);
    const store = { commit: (name, payload) => commits.push({ name, payload }) };
    const result = await context.auth.actions.googleLogin(store, credential);
    assert.strictEqual(result, response);
    assert.deepStrictEqual(commits, [{ name: 'authLogin', payload: response.data }]);
    rejected = true;
    await assert.rejects(context.auth.actions.googleLogin(store, credential), /Account conflict/);
    assert.strictEqual(commits.length, 1, 'A rejected Google sign-in must not change authentication state');
    console.log('Google auth Vue templates and session handling passed');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
