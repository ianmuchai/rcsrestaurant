<?php

namespace App\Services;

use Google\Client;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\ValidationException;
use Throwable;

class GoogleIdentityService
{
    private Client $client;
    private string $clientId;

    public function __construct(Client $client)
    {
        $this->client = $client;
        $this->clientId = (string) config('services.google_sign_in.client_id', '');
        if ($this->clientId !== '') {
            $this->client->setClientId($this->clientId);
        }
    }

    public function challenge(): array
    {
        if ($this->clientId === '') {
            return ['enabled' => false];
        }

        $nonce = bin2hex(random_bytes(32));
        Cache::put('google-sign-in:' . $nonce, true, 600);
        return ['enabled' => true, 'client_id' => $this->clientId, 'nonce' => $nonce];
    }

    public function verify(string $credential, string $nonce): array
    {
        $claims = false;
        if ($this->clientId !== '' && Cache::has('google-sign-in:' . $nonce)) {
            try {
                // The Google client verifies signature, audience, issuer and expiry.
                $claims = $this->client->verifyIdToken($credential);
            } catch (Throwable $exception) {
                $claims = false;
            }
        }

        if (!is_array($claims)
            || !is_string($claims['sub'] ?? null)
            || strlen($claims['sub']) > 191
            || empty($claims['sub'])
            || !filter_var($claims['email'] ?? '', FILTER_VALIDATE_EMAIL)
            || ($claims['email_verified'] ?? false) !== true
            || !hash_equals($nonce, (string) ($claims['nonce'] ?? ''))
            || !Cache::add('google-sign-in-used:' . $nonce, true, 600)) {
            throw ValidationException::withMessages([
                'credential' => ['Google could not verify this sign-in. Please try again.'],
            ]);
        }

        Cache::forget('google-sign-in:' . $nonce);
        return $claims;
    }
}
