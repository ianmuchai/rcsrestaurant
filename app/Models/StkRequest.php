<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StkRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'merchant_request_id',
        'checkout_request_id',
        'phone_number',
        'amount',
        'order_id',
        'status',
        'mpesa_receipt_number',
        'response_description',
        'callback_metadata'
    ];

    protected $casts = [
        'callback_metadata' => 'array',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }
}
