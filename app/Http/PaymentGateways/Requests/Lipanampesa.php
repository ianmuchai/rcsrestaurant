<?php

namespace App\Http\PaymentGateways\Requests;

use App\Enums\Activity;
use Illuminate\Foundation\Http\FormRequest;

class Lipanampesa extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array
     */
    public function rules(): array
    {
        if (request()->lipanampesa_status == Activity::ENABLE) {
            return [
                'lipanampesa_shortcode'          => ['required', 'string'],
                'lipanampesa_shortcode_secret'   => ['required', 'string'],
                'lipanampesa_api_key'            => ['required', 'string'],
                'lipanampesa_password'           => ['required', 'string'],
                'lipanampesa_passkey'           => ['required', 'string'],
                'lipanampesa_callback_url'       => ['required', 'url'],
                'lipanampesa_status'             => ['nullable', 'numeric'],
            ];
        } else {
            return [
                'lipanampesa_shortcode'          => ['nullable', 'string'],
                'lipanampesa_shortcode_secret'   => ['nullable', 'string'],
                'lipanampesa_api_key'            => ['nullable', 'string'],
                'lipanampesa_password'           => ['nullable', 'string'],
                'lipanampesa_passkey'           => ['nullable', 'string'],
                'lipanampesa_callback_url'       => ['nullable', 'url'],
                'lipanampesa_status'             => ['nullable', 'numeric'],
            ];
        }
    }
}
