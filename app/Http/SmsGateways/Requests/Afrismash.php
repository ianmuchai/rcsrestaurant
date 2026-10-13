<?php
namespace App\Http\SmsGateways\Requests;


use App\Enums\Activity;
use Illuminate\Foundation\Http\FormRequest;

class Afrismash extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */
    public function authorize()
    {
        return true;
    }


    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules()
    {
        if (request()->afrismash_status == Activity::ENABLE) {
            return [
                'clientId' => ['required', 'string'],
                'clientSecret' => ['required', 'string'],
                'senderId' => ['required', 'string'],
                'afrismash_status'   => ['nullable', 'numeric'],
            ];
        } else {
            return [
                'clientId' => ['nullable', 'string'],
                'clientSecret' => ['nullable', 'string'],
                'senderId' => ['nullable', 'string'],
                'afrismash_status'   => ['nullable', 'string'],
            ];
        }
    }


}
