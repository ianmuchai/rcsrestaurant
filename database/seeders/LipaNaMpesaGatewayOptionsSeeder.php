<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\GatewayOption;
use App\Models\PaymentGateway;

class LipaNaMpesaGatewayOptionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        $paymentGateway = PaymentGateway::firstOrCreate(
            ['slug' => 'lipanampesa'],
            ['name' => 'Lipa Na M-Pesa', 'status' => 5] // Default Payment Gateway setup
        );

        // Default configuration for Lipa Na M-Pesa
        GatewayOption::create([
            'model_id'   => $paymentGateway->id,
            'model_type' => PaymentGateway::class,
            'option'     => 'lipanampesa_shortcode',
            'value'      => 'your_shortcode',
            'type'       => 5, // Assuming 1 indicates it's a string type
            'activities' => '[]', // Optionally, define activities if needed
        ]);

        GatewayOption::create([
            'model_id'   => $paymentGateway->id,
            'model_type' => PaymentGateway::class,
            'option'     => 'lipanampesa_shortcode_secret',
            'value'      => 'your_shortcode_secret',
            'type'       => 5,
            'activities' => '[]',
        ]);

        GatewayOption::create([
            'model_id'   => $paymentGateway->id,
            'model_type' => PaymentGateway::class,
            'option'     => 'lipanampesa_api_key',
            'value'      => 'your_api_key',
            'type'       => 5,
            'activities' => '[]',
        ]);

        GatewayOption::create([
            'model_id'   => $paymentGateway->id,
            'model_type' => PaymentGateway::class,
            'option'     => 'lipanampesa_password',
            'value'      => 'your_password',
            'type'       => 5,
            'activities' => '[]',
        ]);

        GatewayOption::create([
            'model_id'   => $paymentGateway->id,
            'model_type' => PaymentGateway::class,
            'option'     => 'lipanampesa_callback_url',
            'value'      => 'https://your-website.com/payment/callback',
            'type'       => 5,
            'activities' => '[]',
        ]);
        GatewayOption::create([
            'model_id'   => $paymentGateway->id,
            'model_type' => PaymentGateway::class,
            'option'     => 'lipanampesa_status',
            'value'      => '5',
            'type'       => 10,
            'activities' => '{"5":"enable","10":"disable"}',
        ]);
        GatewayOption::create([
            'model_id'   => $paymentGateway->id,
            'model_type' => PaymentGateway::class,
            'option'     => 'lipanampesa_passkey',
            'value'      => 'lipanampesa_passkey',
            'type'       => 5,
            'activities' => '[]',
        ]);
    }
}
