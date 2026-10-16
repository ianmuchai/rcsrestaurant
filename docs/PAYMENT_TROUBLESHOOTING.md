# Payment troubleshooting and activation

## Scope

The checkout links now target the configured Laravel backend, not the static
frontend deployment. M-Pesa confirmation is independently checked against
Daraja before recording payment. Callback processing, status polling and a
scheduled reconciliation command use the same order-locked confirmation path.
No customer payment was initiated during development; tests use simulated results.

Payment and fulfillment are separate: verified payment marks the order PAID.
The order remains pending for restaurant staff to accept, prepare and dispatch.
Payment must not automatically mark an order delivered.

## Backend activation required

Deploy the changed PHP files to the existing Laravel host as well as publishing
the frontend. Vercel's static build does not execute Laravel callbacks or jobs.

- Set APP_URL to the public HTTPS Laravel host so generated callback URLs are correct.
- Set STOREFRONT_URL to the customer-facing frontend origin.
- Set MPESA_BASE_URL to the provider environment matching the gateway credentials;
  sandbox is the safe default, not the production setting.
- Verify the configured M-Pesa shortcode, API key, secret, passkey and KES currency.
- Refresh Laravel's configuration cache after updating environment settings.
- Keep the existing stk_requests and transactions migrations applied.
- Configure shared persistent cache storage with atomic locks when using multiple
  backend instances. Local file locks only coordinate workers on the same host.
- Run Laravel's scheduler every minute using the hosting account's cron service:

```cron
* * * * * cd /path/to/laravel && php artisan schedule:run >> /dev/null 2>&1
```

The job queries recent pending requests; it never initiates a new charge. An older
order can be checked explicitly after reviewing its payment history:

```sh
php artisan payments:reconcile-mpesa --order=123
```

Confirm that POST /payment/mpesa/callback is publicly reachable over HTTPS and
reaches Laravel, not a frontend fallback. Keep provider credentials server-side.

## Safe incident investigation

Collect the payment method, order ID, approximate time, provider result code and
whether funds were deducted. Do not ask for a PIN, OTP, password or full card data.
Correlate stk_requests.checkout_request_id with the provider result and the order
transaction. If the customer was charged, reconcile first rather than asking them
to pay again. Escalate missing or conflicting references to the restaurant's
payment operator. Query-confirmed payments may initially use the checkout request
ID as their ledger reference; a later valid callback adds the receipt number.

## Remaining audit findings

- The actual reported live failure is not yet reproduced: the affected payment
  method and server-side failure evidence have not been supplied.
- Existing Pesapal confirmation compares order.amount with the provider amount,
  although checkout uses order.total. It also needs order-reference and currency
  binding tests before being considered production-verified.
- Checkout routes use sequential order IDs without an ownership or signed-link
  guard, and PaymentRequest.authorize currently returns true. Introduce a
  server-issued, expiring checkout capability that also supports cross-domain and
  table ordering; simply adding session authentication can break those flows.
- Other gateway callbacks still need a separate provider-by-provider review.
- A network timeout after an STK request was accepted but before its ID was saved
  remains an ambiguous charge window. Do not blindly retry; a durable initiation
  journal and provider-assisted reconciliation are needed to fully cover it.
- A late payment for a canceled order remains paid/canceled for staff review;
  it does not silently reopen or fulfill the order. Refund handling is separate.
- This work does not prove successful restaurant notification, dispatch, refunds,
  or a real end-to-end production payment. Validate those with an authorized
  controlled transaction after backend activation.
