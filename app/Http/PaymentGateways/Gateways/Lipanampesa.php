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
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
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

        $this->baseUrl = env('MPESA_BASE_URL', 'https://sandbox.safaricom.co.ke');
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
            $this->validateConfiguration();

            if (empty($request->mpesa_phone)) {
                throw new Exception('Phone number is required');
            }

            $currencyCode = $this->getCurrencyCode();
            if (strtoupper($currencyCode) !== 'KES') {
                throw new Exception('Lipa Na M-Pesa only supports KES currency');
            }

            $timestamp = $this->getFormattedTimeStamp();
            $phoneNumber = $this->formatPhoneNumber($request->mpesa_phone);

            $paymentData = array(
                'BusinessShortCode' => $this->lipaNaMpesaShortcode,
                'Password' => $this->generatePassword($timestamp),
                'Timestamp' => $timestamp,
                'TransactionType' => 'CustomerPayBillOnline',
                'Amount' => number_format($order->total, 0, '.', ''),
                'PartyA' => $phoneNumber,
                'PartyB' => $this->lipaNaMpesaShortcode,
                'PhoneNumber' => $phoneNumber,
                'CallBackURL' =>'https://rcs.co.ke/categories',
//                'CallBackURL' => route('payment.mpesa.callback'),
//                'CallBackURL' => route('payment.success', [
//                    'order' => $order,
//                    'paymentGateway' => 'lipanampesa'
//                ]),
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
            ])->withBody(json_encode($paymentData), 'application/json')
                ->post($url);

            $responseBody = $response->json();
//            Log::debug('M-Pesa STK Push Response', $responseBody);

            if (!$response->successful() || !isset($responseBody['ResponseCode']) || $responseBody['ResponseCode'] != '0') {
                $error = $responseBody['errorMessage'] ?? $responseBody['ResponseDescription'] ?? 'Unknown error';
                throw new Exception('M-Pesa API Error: ' . $error);
            }

            if (isset($responseBody['CheckoutRequestID'])) {
                // Store the STK request in database
                StkRequest::create([
                    'merchant_request_id' => $responseBody['MerchantRequestID'],
                    'checkout_request_id' => $responseBody['CheckoutRequestID'],
                    'phone_number' => $phoneNumber,
                    'amount' => $order->total,
                    'order_id' => $order->id,
                    'response_description' => $responseBody['ResponseDescription'],
                ]);

                // Return success response with payment instructions
                return redirect()->route('payment.index', ['order' => $order->id])
                    ->with([
                        'status' => 'pending',
                        'message' => "A payment prompt has been sent to your phone {$this->maskPhoneNumber($phoneNumber)}. Please enter your M-Pesa PIN to complete the payment.",
                        'checkout_request_id' => $responseBody['CheckoutRequestID'],
                    ]);

            }

            throw new Exception('Missing CheckoutRequestID in response');
        } catch (Exception $e) {
            Log::error("M-Pesa Payment Error: " . $e->__toString(), [
                'order_id' => $order->id,
                'exception' => $e
            ]);
            return redirect()->route('payment.index', [
                'order' => $order,
                'paymentGateway' => 'lipanampesa'
            ])->with('error', 'Payment initiation failed: ' . $e->getMessage());
        }
    }

    /**
     * Handle successful payments
     */
    public function success($order, $request): \Illuminate\Http\RedirectResponse
    {
        try {
            DB::transaction(function () use ($order, $request) {
                // Retrieve the most recent successful STK request for the order
                $stkRequest = StkRequest::where('order_id', $order->id)
                    ->where('status', 'completed') // Assuming 'success' is the completed status
                    ->latest() // Get the most recent
                    ->first();

                // Check if a successful STK request exists and if the amounts match
                if ($stkRequest && $stkRequest->amount == $order->total) {
                    // Proceed with the payment processing logic (You may replace the following with your logic)
                    $this->paymentService->payment($order, 'lipanampesa', $stkRequest->mpesa_receipt_number);

                    // Optionally update the order status to 'paid'
                    $order->update([
                        'payment_status' => '5', // Assuming you have a 'paid' status
                        'status' => '2', // Change the order status to completed
                    ]);

                    // Set a successful response flag
                    $this->response = true;
                } else {
                    // Handle case where STK request failed or amounts don't match
                    $this->response = false;
                }
            });

            // Check response flag and redirect accordingly
            if ($this->response) {
                return redirect()->route('payment.successful', ['order' => $order])->with(
                    'success',
                    trans('all.message.payment_successful')
                );
            }

            return redirect()->route('payment.fail', ['order' => $order, 'paymentGateway' => 'lipanampesa'])->with(
                'error',
                trans('all.message.payment_failed')
            );
        } catch (Exception $e) {
            Log::error($e->getMessage());
            DB::rollBack();
            return redirect()->route('payment.fail', ['order' => $order, 'paymentGateway' => 'lipanampesa'])->with(
                'error',
                $e->getMessage()
            );
        }
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
        ])->get($url);

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

        if (strlen($cleaned) === 9 && strpos($cleaned, '0') === 0) {
            return '254' . substr($cleaned, 1);
        }

        if (strlen($cleaned) === 12 && strpos($cleaned, '254') === 0) {
            return $cleaned;
        }

        if (strlen($cleaned) === 10 && strpos($cleaned, '0') === 0) {
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

    /**
     * Handle M-Pesa callback response
     */
    private function handleCallbackResponse($order, $request): \Illuminate\Http\RedirectResponse
    {
        $callback = $request['Body']['stkCallback'] ?? null;

        if ($callback && isset($callback['ResultCode'])) {
            if ($callback['ResultCode'] == 0) {
                $metadata = $callback['CallbackMetadata']['Item'] ?? [];
                $paymentData = [];

                foreach ($metadata as $item) {
                    $paymentData[$item['Name']] = $item['Value'];
                }

                $paymentReference = $paymentData['MpesaReceiptNumber'] ?? null;
                if ($paymentReference) {
                    $this->paymentService->payment($order, 'lipanampesa', $paymentReference);
                    return redirect()->route('payment.successful', ['order' => $order])
                        ->with('success', 'Payment successful');
                }
            } else {
                $error = $callback['ResultDesc'] ?? 'Payment failed';
                return redirect()->route('payment.index', [
                    'order' => $order,
                    'paymentGateway' => 'lipanampesa'
                ])->with('error', $error);
            }
        }

        return redirect()->route('payment.index', [
            'order' => $order,
            'paymentGateway' => 'lipanampesa'
        ])->with('error', 'Invalid payment response');
    }
}
