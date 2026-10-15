<template>
    <div class="rcs-google-auth" :aria-busy="busy">
        <div ref="googleButton" v-show="ready" class="rcs-google-button-slot"></div>
        <button v-if="!ready" type="button" class="rcs-google-auth-button" :disabled="busy" @click="prepare(true)">
            <i :class="busy ? 'fa-solid fa-circle-notch fa-spin' : 'fa-brands fa-google'" aria-hidden="true"></i>
            <span>{{ mode === 'signup' ? 'Sign up with Google' : 'Continue with Google' }}</span>
        </button>
        <p v-if="error" class="rcs-google-auth-error" role="alert">{{ error }}</p>
        <span class="rcs-auth-divider">or</span>
    </div>
</template>

<script>
import axios from 'axios';
import { loadGoogleIdentity } from '../../../services/googleIdentity';

export default {
    name: 'GoogleAuthComponent',
    props: { mode: { type: String, default: 'signup' } },
    data() {
        return { busy: false, ready: false, active: true, challenge: null, error: '' };
    },
    mounted() {
        this.prepare();
    },
    beforeUnmount() {
        this.active = false;
    },
    methods: {
        async prepare(reportError = false) {
            if (this.busy) return;
            this.busy = true;
            this.error = '';
            try {
                const { data } = await axios.get('auth/google/config');
                if (!data.enabled || !data.client_id || !data.nonce) throw new Error('Google sign-in is unavailable');
                const google = await loadGoogleIdentity();
                if (!this.active) return;
                this.challenge = data;
                google.initialize({
                    client_id: data.client_id,
                    nonce: data.nonce,
                    auto_select: false,
                    callback: response => this.signIn(response),
                });
                google.renderButton(this.$refs.googleButton, {
                    theme: 'outline', size: 'large', shape: 'rectangular',
                    text: this.mode === 'signup' ? 'signup_with' : 'continue_with',
                    width: Math.min(400, Math.floor(this.$el.clientWidth)),
                });
                this.ready = true;
            } catch (error) {
                if (reportError && this.active) {
                    this.error = 'Google sign-in is currently unavailable. Please use the existing signup or login option.';
                }
            } finally {
                if (this.active) this.busy = false;
            }
        },
        async signIn(response) {
            if (!this.active || this.busy || !response.credential || !this.challenge) return;
            this.busy = true;
            this.error = '';
            try {
                await this.$store.dispatch('googleLogin', {
                    credential: response.credential,
                    nonce: this.challenge.nonce,
                });
                if (!this.active) return;
                const cart = this.$store.getters['frontendCart/lists'] || [];
                await this.$router.push({ name: cart.length ? 'frontend.checkout' : 'frontend.home' });
            } catch (error) {
                if (!this.active) return;
                this.error = error.response?.data?.errors?.credential?.[0]
                    || 'Google sign-in could not be completed. Please try again.';
                this.ready = false;
                this.challenge = null;
            } finally {
                if (this.active) this.busy = false;
            }
        },
    },
};
</script>
