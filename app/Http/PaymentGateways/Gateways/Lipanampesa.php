<?php
namespace App\Http\PaymentGateways\Gateways;

use App\Models\StkRequest;
use Carbon\Carbon;
use Exception;
use App\Enums\Activity;
use App\Models\Currency;
use App\Models\PaymentGateway;
use App\Services\PaymentService;
use App\Services\PaymentAbstract;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Contracts\Cache\LockTimeoutException;
use App\Enums\PaymentStatus;
use App\Services\MpesaPaymentConfirmationService;
use Smartisan\Settings\Facades\Settings;

class Lipanampesa extends PaymentAbstract
{
    public mixed $response;
    protected $baseUrl;
    protected $shortcode;
    protected $shortcodeSecret;
    protected $lipaNaMpesaShortcode;
    protected $lipaNaMpesaKey;
    protected $lipaNaMpesaPassword;
    protected $lipaNaMpesaPassKey;

    /**
     * Initialize the Lipa Na M-Pesa Gateway
     */
    public function __construct()
    {
        $paymentService = new PaymentService();
        parent::__construct($paymentService);

        $this->paymentGateway = PaymentGateway::with('gatewayOptions')
            ->where(['slug' => 'lipanampesa'])
            ->first();

        $this->paymentGatewayOption = $this->paymentGateway->gatewayOptions->pluck('value', 'option');

        $this->baseUrl = config('services.mpesa.base_url', 'https://sandbox.safaricom.co.ke');
        $this->shortcode = $this->paymentGatewayOption['lipanampesa_shortcode'] ?? '174379';
        $this->shortcodeSecret = $this->paymentGatewayOption['lipanampesa_shortcode_secret'] ?? '';
        $this->lipaNaMpesaShortcode = $this->paymentGatewayOption['lipanampesa_shortcode'] ?? '174379';
        $this->lipaNaMpesaKey = $this->paymentGatewayOption['lipanampesa_api_key'] ?? '';
        $this->lipaNaMpesaPassword = $this->paymentGatewayOption['lipanampesa_password'] ?? '';
        $this->lipaNaMpesaPassKey = $this->paymentGatewayOption['lipanampesa_passkey'] ?? '';
    }

    /**
     * Make the payment request to Lipa Na M-Pesa
     */
    public function payment($order, $request): \Illuminate\Http\RedirectResponse
    {
        try {
            return Cache::lock('mpesa-initiate-order-' . $order->id, 90)
                ->block(3, fn () => $this->initiatePayment($order, $request));
        } catch (LockTimeoutException $exception) {
            return redirect()->route('payment.index', ['order' => $order])
                ->with('error', 'A payment request is already being sent. Please wait before trying again.');
        }
    }

    private function initiatePayment($order, $request): \Illuminate\Http\RedirectResponse
    {
        try {
            $this->validateConfiguration();
            $order->refresh();
            if ($order->payment_status === PaymentStatus::PAID) {
                return redirect()->route('payment.successful', ['order' => $order]);
            }
            $existing = StkRequest::where('order_id', $order->id)
                ->whereIn('status', ['pending', 'completed'])->latest()->first();
            if ($existing) {
                if ($existing->status === 'completed' || $existing->created_at->lt(now()->subMinutes(5))) {
                    $existing = app(MpesaPaymentConfirmationService::class)->reconcile($existing);
                }
                if ($existing->status === 'completed') {
                    return redirect()->route('payment.successful', ['order' => $order]);
                }
                if ($existing->status === 'pending') return $this->pendingRedirect($order, $existing);
            }

            if (empty($request->mpesa_phone)) {
                throw new Exception('Phone number is required');
            }

            $currencyCode = $this->getCurrencyCode();
            if (strtoupper($currencyCode) !== 'KES') {
                throw new Exception('Lipa Na M-Pesa only supports KES currency');
            }

            $timestamp = $this->getFormattedTimeStamp();
            $phoneNumber = $this->formatPhoneNumber($request->mpesa_phone);
            $amount = round((float) $order->total, 2);
            if ($amount < 1 || $amount !== floor($amount)) {
                throw new Exception('M-Pesa requires a whole-shilling KES amount. Please contact the restaurant or choose another payment method.');
            }

            $paymentData = array(
                'BusinessShortCode' => $this->lipaNaMpesaShortcode,
                'Password' => $this->generatePassword($timestamp),
                'Timestamp' => $timestamp,
                'TransactionType' => 'CustomerPayBillOnline',
                'Amount' => (int) $amount,
                'PartyA' => $phoneNumber,
                'PartyB' => $this->lipaNaMpesaShortcode,
                'PhoneNumber' => $phoneNumber,
                'CallBackURL' => route('payment.mpesa.callback'),
                'AccountReference' => "Order-{$order->id}",
                'TransactionDesc' => "Payment for Order #{$order->id}",
            );

//            Log::debug('M-Pesa STK Push Request Data', $paymentData);

            $url = $this->baseUrl.'/mpesa/stkpush/v1/processrequest';
//            $response = Http::withHeaders([
//                'Content-Type' => 'application/json',
//                'Authorization' => 'Bearer ' . $this->getToken(),
//
//            ])->timeout(30)->retry(3, 100)->post($url, $paymentData);
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->getToken(),
                'Content-Type' => 'application/json',
            ])->connectTimeout(10)->timeout(30)->withBody(json_encode($paymentData), 'application/json')
                ->post($url);

            $responseBody = $response->json();
//            Log::debug('M-Pesa STK Push Response', $responseBody);

            if (!$response->successful() || !isset($responseBody['ResponseCode']) || $responseBody['ResponseCode'] != '0') {
                $error = $responseBody['errorMessage'] ?? $responseBody['ResponseDescription'] ?? 'Unknown error';
                throw new Exception('M-Pesa API Error: ' . $error);
            }

            if (isset($responseBody['CheckoutRequestID'])) {
                // Store the STK request in database
                $attempt = StkRequest::create([
                    'merchant_request_id' => $responseBody['MerchantRequestID'],
                    'checkout_request_id' => $responseBody['CheckoutRequestID'],
                    'phone_number' => $phoneNumber,
                    'amount' => $order->total,
                    'order_id' => $order->id,
                    'response_description' => $responseBody['ResponseDescription'],
                ]);

                // Return success response with payment instructions
                return $this->pendingRedirect($order, $attempt);

            }

            throw new Exception('Missing CheckoutRequestID in response');
        } catch (Exception $e) {
            Log::error('M-Pesa initiation requires review', [
                'order_id' => $order->id,
                'exception' => get_class($e)
            ]);
            return redirect()->route('payment.index', [
                'order' => $order,
                'paymentGateway' => 'lipanampesa'
            ])->with('error', 'The payment request could not be confirmed. If a phone prompt appeared or money was deducted, check with the restaurant before paying again.');
        }
    }

    /**
     * Handle successful payments
     */
    public function success($order, $request): \Illuminate\Http\RedirectResponse
    {
        try {
            $attempt = StkRequest::where('order_id', $order->id)->latest()->first();
            if ($attempt) app(MpesaPaymentConfirmationService::class)->reconcile($attempt);
            $order->refresh();
            if ($order->payment_status === PaymentStatus::PAID && $order->transaction) {
                return redirect()->route('payment.successful', ['order' => $order])->with(
                    'success',
                    trans('all.message.payment_successful')
                );
            }

            if ($attempt && $attempt->fresh()->status === 'pending') return $this->pendingRedirect($order, $attempt);
            return $this->fail($order, $request);
        } catch (Exception $e) {
            Log::error($e->getMessage());
            return redirect()->route('payment.index', ['order' => $order])
                ->with('error', 'Payment confirmation is temporarily unavailable. Please check the order before paying again.');
        }
    }

    public function queryStatus(StkRequest $attempt): array
    {
        $this->validateConfiguration();
        $timestamp = $this->getFormattedTimeStamp();
        return Http::withToken($this->getToken())->acceptJson()->connectTimeout(10)->timeout(20)
            ->post($this->baseUrl . '/mpesa/stkpushquery/v1/query', [
                'BusinessShortCode' => $this->shortcode,
                'Password' => $this->generatePassword($timestamp),
                'Timestamp' => $timestamp,
                'CheckoutRequestID' => $attempt->checkout_request_id,
            ])->throw()->json();
    }

    private function pendingRedirect($order, StkRequest $attempt): \Illuminate\Http\RedirectResponse
    {
        return redirect()->route('payment.index', ['order' => $order->id])->with([
            'status' => 'pending',
            'message' => 'Waiting for M-Pesa confirmation for ' . $this->maskPhoneNumber($attempt->phone_number) . '. Please complete the phone prompt and avoid paying again.',
            'checkout_request_id' => $attempt->checkout_request_id,
        ]);
    }

    /**
     * Handle failed payments
     */
    public function fail($order, $request): \Illuminate\Http\RedirectResponse
    {
        return redirect()->route('payment.index', ['order' => $order])
            ->with('error', 'Payment failed. Please try again.');
    }

    /**
     * Handle canceled payments
     */
    public function cancel($order, $request): \Illuminate\Http\RedirectResponse
    {
        return redirect()->route('payment.index', ['order' => $order])
            ->with('error', 'Payment was canceled.');
    }

    /**
     * Check if Lipa Na M-Pesa is enabled
     */
    public function status(): bool
    {
        $paymentGateways = PaymentGateway::where([
            'slug' => 'lipanampesa',
            'status' => Activity::ENABLE
        ])->first();

        return $paymentGateways ? true : false;
    }

    /**
     * Generate Lipa Na M-Pesa Password
     */
    private function generatePassword($timestamp): string
    {
        if (empty($this->shortcode) || empty($this->lipaNaMpesaPassKey) || empty($timestamp)) {
            throw new Exception('Missing required parameters for password generation');
        }
        return base64_encode($this->shortcode . $this->lipaNaMpesaPassKey . $timestamp);
    }

    /**
     * Get the OAuth token required for making API requests
     */
    private function getToken(): string
    {
        $url = $this->baseUrl . '/oauth/v1/generate?grant_type=client_credentials';

        if (empty($this->lipaNaMpesaKey) || empty($this->shortcodeSecret)) {
            throw new Exception('Missing API credentials for token generation');
        }

        $response = Http::withHeaders([
            'Authorization' => 'Basic ' . base64_encode($this->lipaNaMpesaKey . ':' . $this->shortcodeSecret)
        ])->connectTimeout(10)->timeout(20)->get($url);

        if (!$response->successful()) {
            Log::error('Token generation failed', [
                'status' => $response->status(),
                'response' => $response->body(),
                'url' => $url
            ]);
            throw new Exception('Unable to generate M-Pesa access token: ' . $response->body());
        }

        $data = $response->json();
        if (!isset($data['access_token'])) {
            throw new Exception('Invalid token response format');
        }

        return $data['access_token'];
    }

    /**
     * Get formatted timestamp
     */
    private function getFormattedTimeStamp(): string
    {
        return Carbon::now()->format('YmdHis');
    }

    /**
     * Format phone number to M-Pesa format (2547XXXXXXXX)
     */
    private function formatPhoneNumber(string $phone): string
    {
        $cleaned = preg_replace('/[^0-9]/', '', $phone);

        if (preg_match('/\A254[17]\d{8}\z/', $cleaned)) {
            return $cleaned;
        }

        if (preg_match('/\A0[17]\d{8}\z/', $cleaned)) {
            return '254' . substr($cleaned, 1);
        }

        throw new Exception('Invalid phone number format. Expected format: 07XXXXXXXX or 2547XXXXXXXX');
    }

    /**
     * Get currency code from settings
     */
    private function getCurrencyCode(): string
    {
        $currencyCode = 'KES';
        $currencyId = Settings::group('site')->get('site_default_currency');

        if (!blank($currencyId)) {
            $currency = Currency::find($currencyId);
            if ($currency) {
                $currencyCode = $currency->code;
            }
        }

        return $currencyCode;
    }

    /**
     * Validate gateway configuration
     */
    private function validateConfiguration(): void
    {
        $required = [
            'baseUrl' => $this->baseUrl,
            'shortcode' => $this->shortcode,
            'shortcodeSecret' => $this->shortcodeSecret,
            'lipaNaMpesaShortcode' => $this->lipaNaMpesaShortcode,
            'lipaNaMpesaKey' => $this->lipaNaMpesaKey,
            'lipaNaMpesaPassKey' => $this->lipaNaMpesaPassKey,
        ];

        foreach ($required as $key => $value) {
            if (empty($value)) {
                throw new Exception("Missing required configuration: $key");
            }
        }
    }

    private function maskPhoneNumber($phone)
    {
        return substr($phone, 0, 4) . '****' . substr($phone, -3);
    }

}
