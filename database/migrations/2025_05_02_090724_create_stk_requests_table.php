<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('stk_requests', function (Blueprint $table) {
            $table->id();
            $table->string('merchant_request_id');
            $table->string('checkout_request_id');
            $table->string('phone_number');
            $table->decimal('amount', 10, 2);
            $table->unsignedBigInteger('order_id')->nullable(); // Make order_id nullable
            $table->foreign('order_id')->references('id')->on('orders')->onDelete('set null'); // Set null on delete
            $table->string('status')->default('pending'); // pending, completed, failed
            $table->string('mpesa_receipt_number')->nullable();
            $table->text('response_description')->nullable();
            $table->text('callback_metadata')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('stk_requests');
    }
};
