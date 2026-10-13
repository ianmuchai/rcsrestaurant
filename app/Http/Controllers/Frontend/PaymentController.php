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
use Exception;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Log;
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

        return response()->json([
            'status' => $stkRequest->status,
            'order_id' => $stkRequest->order_id,
            'mpesa_receipt_number' => $stkRequest->mpesa_receipt_number,
            'amount' => $stkRequest->amount,
            'phone_number' => $stkRequest->phone_number,
            'updated_at' => $stkRequest->updated_at,
        ]);
    }

    public function handleMpesaCallback(Request $request)
    {
        Log::info('M-Pesa Callback Received:', $request->all());

        try {
            $callbackData = $request->json('Body.stkCallback');

            if (!$callbackData) {
                throw new Exception('Invalid callback format');
            }

            $checkoutRequestId = $callbackData['CheckoutRequestID'];
            $stkRequest = StkRequest::where('checkout_request_id', $checkoutRequestId)->first();

            if (!$stkRequest) {
                throw new Exception("STK request not found: {$checkoutRequestId}");
            }

            $resultCode = $callbackData['ResultCode'];
            $resultDesc = $callbackData['ResultDesc'];
            $status = ($resultCode === 0 && isset($callbackData['CallbackMetadata'])) ? 'completed' : 'failed';

            $updateData = [
                'status' => $status,
                'response_description' => $resultDesc,
            ];

            if ($status === 'completed') {
                $metadata = collect($callbackData['CallbackMetadata']['Item'])
                    ->pluck('Value', 'Name')
                    ->toArray();

                $updateData['mpesa_receipt_number'] = $metadata['MpesaReceiptNumber'] ?? null;
                $updateData['phone_number'] = $metadata['PhoneNumber'] ?? null;
                $updateData['amount'] = $metadata['Amount'] ?? null;
                $updateData['callback_metadata'] = $metadata;
            }

            $stkRequest->update($updateData);

            return response()->json([
                'ResultCode' => 0,
                'ResultDesc' => 'Callback processed successfully'
            ]);

        } catch (Exception $e) {
            Log::error("M-Pesa Callback Error: " . $e->getMessage(), [
                'callback_data' => $request->all()
            ]);

            return response()->json([
                'ResultCode' => 1,
                'ResultDesc' => 'Error processing callback: ' . $e->getMessage()
            ], 500);
        }
    }




    public function index(
        Order $order
    ): \Illuminate\Contracts\View\Factory | \Illuminate\Contracts\View\View | \Illuminate\Contracts\Foundation\Application | \Illuminate\Http\RedirectResponse {
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

        if (!blank($order->transaction)) {
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
