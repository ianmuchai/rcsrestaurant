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
        Schema::create('sms', function (Blueprint $table) {
            $table->id();
            // Regular column definition
            $table->unsignedBigInteger('user_id');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->string('recipient', 20); // Phone number field
            $table->text('message'); // For longer SMS content
            $table->string('status', 50)->default('pending'); // e.g., pending, sent, delivered, failed
            $table->timestamp('sent_at')->nullable(); // Will be set when SMS is actually sent
            $table->timestamps(); // created_at and updated_at

            // Optional index for better performance on frequent queries
            $table->index('user_id');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('sms');
    }
};
