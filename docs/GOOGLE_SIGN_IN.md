# Google Signup Activation

Google signup supplements the existing phone signup. Returning Google customers
can use the same button on the login page. It is disabled until the RC's Laravel
API is configured; deploying the static Vercel frontend alone cannot enable it.

## Configure Google

1. Create an OAuth client with application type **Web application** in Google
   Cloud, and configure the Google Auth consent screen for RC's. Add test users
   while testing; publish the consent app before enabling signup for all customers.
2. Add these authorized JavaScript origins:
   - `https://rcsrestaurant-c8zv.vercel.app`
   - `https://rcs.co.ke`
   - Any additional custom domain actually used to serve the frontend.
3. Set `GOOGLE_SIGN_IN_CLIENT_ID` on the Laravel API server to that web client ID.
   This Google Identity Services flow does not need a client secret or an OAuth
   redirect URI. Never put a client secret in the frontend.

## Deploy The API

Deploy the updated PHP controllers, services, routes, model, configuration and
migration to the server hosting `https://rcs.co.ke/api`. With the correct
production database configured, run:

```sh
php artisan migrate --force
php artisan config:cache
php artisan route:clear
```

The migration adds a nullable unique `users.google_id`; it does not modify existing
passwords or phone accounts. The existing Google PHP client dependency is reused.
The configured cache driver must persist between requests so nonces can be checked.

## Verify

- `GET /api/auth/google/config` (with the existing API key header) should return
  `enabled: true`, the public client ID and a short-lived nonce. Do not cache it.
- On mobile and desktop, select Google signup, choose a test Google account, and
  confirm that a customer account is created and the cart is preserved.
- Sign out and sign in with Google again. It must return the same customer.
- An email belonging to an existing phone/password account must be rejected,
  rather than automatically linking accounts. Existing methods remain available.
- Test on the installed PWA as well as the browser. Live Google consent cannot be
  verified with mock credentials or without configuring the authorized origins.

Tokens are verified by Google's PHP client, bound to a single-use server nonce,
and exchanged for the application's existing Sanctum token response. The Google
subject identifies the account; inactive and deleted accounts cannot sign in.

References: [Google token verification](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token)
and [Google Identity Services JavaScript API](https://developers.google.com/identity/gsi/web/reference/js-reference).
