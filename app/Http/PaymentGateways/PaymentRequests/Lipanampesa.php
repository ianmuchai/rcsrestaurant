<?php

namespace App\Http\PaymentGateways\PaymentRequests;

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
    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'mpesa_phone' => [
                'required',
                'regex:/^(254|07|01)\d{7,8}$/'
            ],
        ];
    }

    /**
     * Custom error messages for validation.
     */
    public function messages(): array
    {
        return [
            'mpesa_phone.required' => 'Please provide your M-Pesa phone number.',
            'mpesa_phone.regex' => 'Invalid phone number format. Use 2547..., 07... or 01...',
        ];
    }
}
