<?php

namespace App\Http\SmsGateways\Gateways;
use App\Models\SMS;
use App\Models\User;
use App\Enums\Activity;
use App\Models\SmsGateway;
use App\Services\SmsAbstract;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Auth;
class Afrismash extends SmsAbstract
{
    public string $clientId;
    public string $password;
    public string $clientSecret;
    public string $senderId;


    public function __construct()
    {
        parent::__construct();
//        Log::info("sms called");
        $this->smsGateway = SmsGateway::with('gatewayOptions')->where(['slug' => 'afrismash'])->first();
        if (!blank($this->smsGateway)) {
            $this->smsGatewayOption = $this->smsGateway->gatewayOptions->pluck('value', 'option');
            $this->baseUrl = 'https://portal.afrismashtech.co.ke/send-message';
            $this->clientId = $this->smsGatewayOption['clientId'];
            $this->clientSecret = $this->smsGatewayOption['clientSecret'];
            $this->senderId = $this->smsGatewayOption['senderId'];
        }
    }

    public function status(): bool
    {
        $paymentGateways = SmsGateway::where(['slug' => 'afrismash', 'status' => Activity::ENABLE])->first();
        if ($paymentGateways) {
            return true;
        }
        return false;
    }

    public function send($code, $phone, $message): void
    {

        $client_phone="";
        // Remove all non-digit characters
        $cleanCode = preg_replace('/\D/', '', $code);
        $cleanPhone = preg_replace('/\D/', '', $phone);

        // Handle Kenyan numbers specially (they often start with 0)
        if ($cleanCode === '254') {
            // Remove leading 0 if present in the 10-digit number
            $cleanPhone = ltrim($cleanPhone, '0');

            // Kenyan numbers should be 9 digits after 254 (excluding prefix)
            if (strlen($cleanPhone) === 9) {
                $client_phone= $cleanCode . $cleanPhone;
            }
        }else{
            $client_phone= $cleanCode . $cleanPhone;
        }


        // Get the user ID - logged in user or first user
        $userId = Auth::id() ?? User::query()->orderBy('id')->value('id');
        try {
            // Make the GET request with parameters
            $response = Http::get($this->baseUrl, [
                'clientId' => $this->clientId,
                'clientSecret' => $this->clientSecret,
                'senderId' => $this->senderId,
                'numbers' => $client_phone,
                'contents' => $message,
            ]);

//            Log::info("SMS API Response: " . $response->body());

            // Determine the status
            $status = $response->successful() ? 'sent' : 'failed';

            // Save SMS details to the database
            $sms = SMS::create([
                'user_id' => $userId,
                'recipient' => $client_phone,
                'message' => $message,
                'status' => $status,
                'sent_at' => $response->successful() ? now() : null,
            ]);
            Log::info("sms sent");
            // Return the response
//            return [
//                'status' => $status,
//                'data' => $sms,
//                'apiResponse' => $response->json(),
//            ];
        } catch (\Exception $e) {
            // Log the error and save failed SMS to the database
            Log::error('SMS sending failed', ['error' => $e->getMessage()]);

            SMS::create([
                'user_id' => $userId,
                'numbers' => $client_phone,
                'contents' => $message,
                'status' => 'failed',
                'sent_at' => null,
            ]);


        }

    }

}
