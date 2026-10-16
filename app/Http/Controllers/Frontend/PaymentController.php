<?php

namespace App\Http\Controllers\Frontend;


use App\Enums\Activity;
use App\Enums\PaymentStatus;
use App\Http\Requests\PaymentRequest;
use App\Libraries\AppLibrary;
use App\Models\Currency;
use App\Models\Order;
use App\Models\PaymentGateway;
use App\Models\StkRequest;
use App\Models\ThemeSetting;
use App\Services\PaymentManagerService;
use App\Services\MpesaPaymentConfirmationService;
use Exception;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\ValidationException;
use Smartisan\Settings\Facades\Settings;

class PaymentController extends Controller
{
    private PaymentManagerService $paymentManagerService;

    public function __construct(PaymentManagerService $paymentManagerService)
    {
        $this->paymentManagerService = $paymentManagerService;
    }

    /**
     * Payment status polling endpoint
     */
    public function checkPaymentStatus($checkoutRequestId)
    {
        $stkRequest = StkRequest::where('checkout_request_id', $checkoutRequestId)->first();

        if (!$stkRequest) {
            return response()->json([
                'status' => 'not_found',
                'message' => 'Payment request not found'
            ], 404);
        }

        if ($stkRequest->status === 'pending'
            || ($stkRequest->status === 'completed' && $stkRequest->order?->payment_status !== PaymentStatus::PAID)) {
            try {
                Cache::lock('mpesa-confirm-' . $stkRequest->id, 45)->get(function () use ($stkRequest) {
                    app(MpesaPaymentConfirmationService::class)->reconcile($stkRequest);
                });
                $stkRequest->refresh();
            } catch (\Throwable $exception) {
                Log::warning('M-Pesa confirmation is pending', ['attempt_id' => $stkRequest->id]);
            }
        }
        $paid = $stkRequest->order?->payment_status === PaymentStatus::PAID;
        return response()->json([
            'status' => $stkRequest->status === 'completed' && !$paid ? 'pending' : $stkRequest->status,
            'order_id' => $stkRequest->order_id,
        ])->header('Cache-Control', 'no-store');
    }

    public function handleMpesaCallback(Request $request)
    {
        try {
            $request->validate([
                'Body.stkCallback.CheckoutRequestID' => ['required', 'string', 'max:191'],
                'Body.stkCallback.MerchantRequestID' => ['required', 'string', 'max:191'],
                'Body.stkCallback.ResultCode' => ['required', 'integer'],
                'Body.stkCallback.CallbackMetadata.Item' => ['sometimes', 'array'],
            ]);
            app(MpesaPaymentConfirmationService::class)->handleCallback($request->input('Body.stkCallback'));

            return response()->json([
                'ResultCode' => 0,
                'ResultDesc' => 'Callback processed successfully'
            ]);

        } catch (ValidationException $exception) {
            return response()->json(['ResultCode' => 1, 'ResultDesc' => 'Invalid payment confirmation.'], 422);
        } catch (\Throwable $exception) {
            Log::error('M-Pesa callback requires reconciliation', ['exception' => get_class($exception)]);

            return response()->json([
                'ResultCode' => 1,
                'ResultDesc' => 'Payment confirmation is temporarily unavailable.'
            ], 503);
        }
    }




    public function index(
        Order $order
    ): \Illuminate\Contracts\View\Factory | \Illuminate\Contracts\View\View | \Illuminate\Contracts\Foundation\Application | \Illuminate\Http\RedirectResponse {
        if ($order->payment_status === PaymentStatus::PAID && $order->transaction) {
            return redirect()->route('payment.successful', ['order' => $order]);
        }
        $credit          = false;
        $paymentGateways = PaymentGateway::with('gatewayOptions')->whereNotIn('id', [1])->where(['status' => Activity::ENABLE])->get();
        $company         = Settings::group('company')->all();
        $logo            = ThemeSetting::where(['key' => 'theme_logo'])->first();
        $faviconLogo     = ThemeSetting::where(['key' => 'theme_favicon_logo'])->first();
        $currency        = Currency::findOrFail(Settings::group('site')->get('site_default_currency'));
        if ($order?->user?->balance >= $order->total) {
            $credit = true;
        }

        if (blank($order->transaction) && $order->payment_status === PaymentStatus::UNPAID) {
            return view('payment', [
                'company'         => $company,
                'logo'            => $logo,
                'currency'        => $currency,
                'faviconLogo'     => $faviconLogo,
                'paymentGateways' => $paymentGateways,
                'order'           => $order,
                'creditAmount'    => AppLibrary::currencyAmountFormat($order?->user?->balance),
                'credit'          => $credit
            ]);
        }
        return redirect()->route('home')->with('error', trans('all.message.payment_canceled'));
    }

    public function payment(Order $order, PaymentRequest $request)
    {
        if ($this->paymentManagerService->gateway($request->paymentMethod)->status()) {
            $className = 'App\\Http\\PaymentGateways\\PaymentRequests\\' . ucfirst($request->paymentMethod);
            $gateway   = new $className;
            $request->validate($gateway->rules());
            return $this->paymentManagerService->gateway($request->paymentMethod)->payment($order, $request);
        } else {
            return redirect()->route('payment.index', ['order' => $order])->with(
                'error',
                trans('all.message.payment_gateway_disable')
            );
        }
    }

    public function success(PaymentGateway $paymentGateway, Order $order, Request $request)
    {
        return $this->paymentManagerService->gateway($paymentGateway->slug)->success($order, $request);
    }

    public function fail(PaymentGateway $paymentGateway, Order $order, Request $request)
    {
        return $this->paymentManagerService->gateway($paymentGateway->slug)->fail($order, $request);
    }

    public function cancel(PaymentGateway $paymentGateway, Order $order, Request $request)
    {
        return $this->paymentManagerService->gateway($paymentGateway->slug)->cancel($order, $request);
    }

    public function successful(
        Order $order
    ): \Illuminate\Contracts\View\Factory | \Illuminate\Contracts\View\View | \Illuminate\Contracts\Foundation\Application | \Illuminate\Http\RedirectResponse {
        $company     = Settings::group('company')->all();
        $logo        = ThemeSetting::where(['key' => 'theme_logo'])->first();
        $faviconLogo = ThemeSetting::where(['key' => 'theme_favicon_logo'])->first();

        if ($order->payment_status === PaymentStatus::PAID && !blank($order->transaction)) {
            return view('paymentSuccess', [
                'company'     => $company,
                'logo'        => $logo,
                'faviconLogo' => $faviconLogo,
                'order'       => $order,
            ]);
        }
        return redirect()->route('home')->with('error', trans('all.message.payment_canceled'));
    }
}
