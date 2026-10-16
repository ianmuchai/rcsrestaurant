<?php

namespace Tests\Feature;

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Http\PaymentGateways\Gateways\Lipanampesa;
use App\Models\Order;
use App\Models\StkRequest;
use App\Models\Transaction;
use App\Services\MpesaPaymentConfirmationService;
use App\Services\PaymentService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use Mockery;
use Tests\TestCase;

class MpesaPaymentConfirmationTest extends TestCase
{
    private Order $order;
    private StkRequest $attempt;
    private array $providerResult;

    protected function setUp(): void
    {
        parent::setUp();
        config(['database.default' => 'sqlite', 'database.connections.sqlite.database' => ':memory:', 'cache.default' => 'array']);
        DB::purge('sqlite');
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->decimal('total', 19, 6);
            $table->integer('status');
            $table->integer('payment_status');
            $table->timestamps();
        });
        (require database_path('migrations/2023_03_23_143747_create_transactions_table.php'))->up();
        (require database_path('migrations/2025_05_02_090724_create_stk_requests_table.php'))->up();
        $this->order = Order::create(['total' => 1250, 'status' => OrderStatus::PENDING, 'payment_status' => PaymentStatus::UNPAID]);
        $this->attempt = StkRequest::create([
            'merchant_request_id' => 'merchant-1', 'checkout_request_id' => 'checkout-1',
            'order_id' => $this->order->id, 'phone_number' => '254712345678', 'amount' => 1250,
        ]);
        $this->providerResult = ['CheckoutRequestID' => 'checkout-1', 'MerchantRequestID' => 'merchant-1', 'ResultCode' => '0', 'ResultDesc' => 'Payment confirmed'];
    }

    private function service(): MpesaPaymentConfirmationService
    {
        $gateway = Mockery::mock(Lipanampesa::class);
        $gateway->shouldReceive('queryStatus')->andReturnUsing(fn () => $this->providerResult);
        return new MpesaPaymentConfirmationService($gateway, new PaymentService());
    }

    private function callbackPayload(): array
    {
        return [
            'CheckoutRequestID' => 'checkout-1', 'MerchantRequestID' => 'merchant-1', 'ResultCode' => 0,
            'ResultDesc' => 'Success', 'CallbackMetadata' => ['Item' => [
                ['Name' => 'Amount', 'Value' => 1250],
                ['Name' => 'MpesaReceiptNumber', 'Value' => 'TESTRECEIPT01'],
                ['Name' => 'PhoneNumber', 'Value' => 254712345678],
            ]],
        ];
    }

    public function test_verified_callback_marks_payment_paid_without_a_browser_visit(): void
    {
        $this->service()->handleCallback($this->callbackPayload());
        $this->assertSame(PaymentStatus::PAID, $this->order->fresh()->payment_status);
        $this->assertSame(OrderStatus::PENDING, $this->order->fresh()->status);
        $this->assertSame('completed', $this->attempt->fresh()->status);
        $this->assertSame('TESTRECEIPT01', Transaction::first()->transaction_no);
    }

    public function test_duplicate_callbacks_create_only_one_payment(): void
    {
        $service = $this->service();
        $service->handleCallback($this->callbackPayload());
        $service->handleCallback($this->callbackPayload());
        $this->assertSame(1, Transaction::count());
    }

    public function test_a_forged_success_callback_cannot_override_provider_failure(): void
    {
        $this->providerResult['ResultCode'] = '1032';
        $this->service()->handleCallback($this->callbackPayload());
        $this->assertSame(PaymentStatus::UNPAID, $this->order->fresh()->payment_status);
        $this->assertSame(0, Transaction::count());
    }

    public function test_request_acceptance_is_not_payment_confirmation(): void
    {
        unset($this->providerResult['ResultCode']);
        $this->providerResult['ResponseCode'] = '0';
        $this->service()->handleCallback($this->callbackPayload());
        $this->assertSame('pending', $this->attempt->fresh()->status);
        $this->assertSame(PaymentStatus::UNPAID, $this->order->fresh()->payment_status);
    }

    public function test_callback_amount_must_match_the_order(): void
    {
        $callback = $this->callbackPayload();
        $callback['CallbackMetadata']['Item'][0]['Value'] = 1;
        $this->expectException(ValidationException::class);
        $this->service()->handleCallback($callback);
    }

    public function test_provider_query_must_match_the_checkout_request(): void
    {
        $this->providerResult['CheckoutRequestID'] = 'another-order';
        $this->expectException(ValidationException::class);
        $this->service()->handleCallback($this->callbackPayload());
    }

    public function test_missing_callback_can_be_recovered_without_charging_again(): void
    {
        $this->service()->reconcile($this->attempt);
        $this->assertSame(PaymentStatus::PAID, $this->order->fresh()->payment_status);
        $this->assertSame('checkout-1', Transaction::first()->transaction_no);
    }

    public function test_late_failure_cannot_downgrade_a_confirmed_payment(): void
    {
        $service = $this->service();
        $service->handleCallback($this->callbackPayload());
        $callback = $this->callbackPayload();
        $callback['ResultCode'] = 1032;
        unset($callback['CallbackMetadata']);
        $this->providerResult['ResultCode'] = '1032';
        $service->handleCallback($callback);
        $this->assertSame(PaymentStatus::PAID, $this->order->fresh()->payment_status);
        $this->assertSame('completed', $this->attempt->fresh()->status);
    }

    public function test_fractional_provider_result_is_not_success(): void
    {
        $this->providerResult['ResultCode'] = '0.5';
        $this->service()->reconcile($this->attempt);
        $this->assertSame(PaymentStatus::UNPAID, $this->order->fresh()->payment_status);
    }

    public function test_late_callback_adds_receipt_without_creating_another_transaction(): void
    {
        $service = $this->service();
        $service->reconcile($this->attempt);
        $service->handleCallback($this->callbackPayload());
        $this->assertSame(1, Transaction::count());
        $this->assertSame('TESTRECEIPT01', Transaction::first()->transaction_no);
    }

    public function test_legacy_invalid_order_status_is_repaired(): void
    {
        $this->order->update(['status' => 2]);
        $this->service()->reconcile($this->attempt);
        $this->assertSame(OrderStatus::PENDING, $this->order->fresh()->status);
    }

    public function test_payment_does_not_change_an_existing_fulfillment_status(): void
    {
        $this->order->update(['status' => OrderStatus::PREPARING]);
        $this->service()->reconcile($this->attempt);
        $this->assertSame(OrderStatus::PREPARING, $this->order->fresh()->status);
    }

    public function test_reconciliation_command_confirms_an_order_without_a_browser(): void
    {
        $this->app->instance(MpesaPaymentConfirmationService::class, $this->service());
        $this->artisan('payments:reconcile-mpesa', ['--order' => $this->order->id])
            ->expectsOutput('Confirmed: 1. Awaiting confirmation or review: 0.')->assertExitCode(0);
        $this->assertSame(PaymentStatus::PAID, $this->order->fresh()->payment_status);
    }

    public function test_polling_confirms_payment_without_exposing_phone_or_receipt(): void
    {
        $this->app->instance(MpesaPaymentConfirmationService::class, $this->service());
        $controller = $this->app->make(\App\Http\Controllers\Frontend\PaymentController::class);
        $response = $controller->checkPaymentStatus('checkout-1');
        $this->assertSame(['status' => 'completed', 'order_id' => $this->order->id], $response->getData(true));
        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
    }

    private function realGatewayWithTestCredentials(): Lipanampesa
    {
        return new class extends Lipanampesa {
            public function __construct()
            {
                $this->baseUrl = 'https://mpesa.example.test';
                $this->shortcode = $this->lipaNaMpesaShortcode = '174379';
                $this->shortcodeSecret = $this->lipaNaMpesaKey = $this->lipaNaMpesaPassKey = 'test-only';
            }
        };
    }

    public function test_gateway_queries_provider_with_the_stored_checkout_id(): void
    {
        \Illuminate\Support\Facades\Http::fake([
            '*/oauth/*' => \Illuminate\Support\Facades\Http::response(['access_token' => 'fake-token']),
            '*/mpesa/stkpushquery/v1/query' => \Illuminate\Support\Facades\Http::response($this->providerResult),
            '*' => \Illuminate\Support\Facades\Http::response([], 500),
        ]);
        $result = $this->realGatewayWithTestCredentials()->queryStatus($this->attempt);
        $this->assertSame('0', $result['ResultCode']);
        \Illuminate\Support\Facades\Http::assertSent(fn ($request) =>
            str_ends_with($request->url(), '/mpesa/stkpushquery/v1/query')
            && $request['CheckoutRequestID'] === 'checkout-1'
            && $request['BusinessShortCode'] === '174379');
    }

    public function test_repeated_initiation_reuses_pending_request_without_a_charge(): void
    {
        \Illuminate\Support\Facades\Http::fake();
        $response = $this->realGatewayWithTestCredentials()->payment($this->order, new \Illuminate\Http\Request());
        $this->assertSame(route('payment.index', ['order' => $this->order->id]), $response->getTargetUrl());
        \Illuminate\Support\Facades\Http::assertNothingSent();
        $this->assertSame(1, StkRequest::count());
    }

    public function test_new_charge_uses_backend_callback_and_exact_amount(): void
    {
        $this->attempt->delete();
        \Smartisan\Settings\Facades\Settings::shouldReceive('group')->with('site')->andReturnSelf();
        \Smartisan\Settings\Facades\Settings::shouldReceive('get')->with('site_default_currency')->andReturn(null);
        \Illuminate\Support\Facades\Http::fake([
            '*/oauth/*' => \Illuminate\Support\Facades\Http::response(['access_token' => 'fake-token']),
            '*/mpesa/stkpush/v1/processrequest' => \Illuminate\Support\Facades\Http::response([
                'ResponseCode' => '0', 'CheckoutRequestID' => 'checkout-new',
                'MerchantRequestID' => 'merchant-new', 'ResponseDescription' => 'Accepted',
            ]),
            '*' => \Illuminate\Support\Facades\Http::response([], 500),
        ]);
        $this->realGatewayWithTestCredentials()->payment($this->order, new \Illuminate\Http\Request(['mpesa_phone' => '0712345678']));
        \Illuminate\Support\Facades\Http::assertSent(fn ($request) =>
            str_ends_with($request->url(), '/mpesa/stkpush/v1/processrequest')
            && $request['CallBackURL'] === route('payment.mpesa.callback')
            && $request['Amount'] === 1250);
        $this->assertSame('checkout-new', StkRequest::first()->checkout_request_id);
    }

    public function test_phone_validation_accepts_full_kenyan_numbers_and_rejects_wrong_lengths(): void
    {
        $rules = (new \App\Http\PaymentGateways\PaymentRequests\Lipanampesa())->rules();
        foreach (['0712345678', '0112345678', '254712345678', '254112345678'] as $phone) {
            $this->assertTrue(\Illuminate\Support\Facades\Validator::make(['mpesa_phone' => $phone], $rules)->passes(), $phone);
        }
        foreach (['071234567', '25471234567', '2547123456789', '254000000000'] as $phone) {
            $this->assertFalse(\Illuminate\Support\Facades\Validator::make(['mpesa_phone' => $phone], $rules)->passes(), $phone);
        }
    }
}
