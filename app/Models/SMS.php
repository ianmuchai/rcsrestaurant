<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SMS extends Model
{
    //
    use HasFactory;

    // Define the table name explicitly
    protected $table = 'sms';

    protected $fillable = [
        'user_id',    // Reference to the sender
        'recipient',  // Recipient's phone number
        'message',    // SMS content
        'status',     // Delivery status
        'sent_at',    // Time the SMS was sent
    ];

    /**
     * Get the user who sent the SMS.
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }
}
