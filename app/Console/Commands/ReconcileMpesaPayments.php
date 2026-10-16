<?php

namespace App\Console\Commands;

use App\Enums\PaymentStatus;
use App\Models\StkRequest;
use App\Services\MpesaPaymentConfirmationService;
use Illuminate\Console\Command;

class ReconcileMpesaPayments extends Command
{
    protected $signature = 'payments:reconcile-mpesa {--order= : Recheck a specific order, including older attempts}';
    protected $description = 'Verify outstanding M-Pesa requests without initiating new charges';

    public function handle(): int
    {
        $query = StkRequest::whereIn('status', ['pending', 'completed'])->where(function ($query) {
            $query->where('status', 'pending')->orWhereHas('order', function ($query) {
                $query->where('payment_status', PaymentStatus::UNPAID)->orWhere('status', 2);
            });
        });
        if ($this->option('order')) {
            if (!ctype_digit((string) $this->option('order')) || (int) $this->option('order') < 1) {
                $this->error('A valid order ID is required.');
                return 1;
            }
            $query->where('order_id', (int) $this->option('order'));
        } else {
            $query->where('created_at', '>=', now()->subDay())->where('created_at', '<=', now()->subSeconds(20));
        }
        $confirmed = 0;
        $pending = 0;
        if (!$query->exists()) {
            $this->info('No outstanding M-Pesa requests.');
            return 0;
        }
        $confirmation = app(MpesaPaymentConfirmationService::class);
        $query->chunkById(50, function ($attempts) use ($confirmation, &$confirmed, &$pending) {
            foreach ($attempts as $attempt) {
                try {
                    $result = $confirmation->reconcile($attempt);
                    if ($result->status === 'completed') $confirmed++;
                    elseif ($result->status === 'pending') $pending++;
                } catch (\Throwable $exception) {
                    $pending++;
                }
            }
        });
        $this->info("Confirmed: {$confirmed}. Awaiting confirmation or review: {$pending}.");
        return 0;
    }
}
