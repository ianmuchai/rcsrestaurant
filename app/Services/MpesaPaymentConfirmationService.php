<?php

namespace App\Services;

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Http\PaymentGateways\Gateways\Lipanampesa;
use App\Models\Order;
use App\Models\Scopes\BranchScope;
use App\Models\StkRequest;
use App\Models\Transaction;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class MpesaPaymentConfirmationService
{
    public function __construct(private Lipanampesa $gateway, private PaymentService $payments)
    {
    }

    public function handleCallback(array $callback): StkRequest
    {
        $attempt = StkRequest::where('checkout_request_id', $callback['CheckoutRequestID'] ?? '')->firstOrFail();
        return $this->reconcile($attempt, $callback);
    }

    public function reconcile(StkRequest $attempt, ?array $callback = null): StkRequest
    {
        $attempt = $attempt->fresh();
        $order = Order::withoutGlobalScope(BranchScope::class)->findOrFail($attempt->order_id);
        if ($attempt->status === 'completed' && $order->payment_status === PaymentStatus::PAID
            && $order->status !== 2 && $order->transaction
            && ($callback === null || $attempt->mpesa_receipt_number)) {
            return $attempt;
        }

        if ($callback !== null) {
            $this->validateCallback($attempt, $callback);
            // Preserve the callback for reconciliation if the provider query is unavailable.
            $attempt->update(['callback_metadata' => ['stk_callback' => $callback]]);
        } else {
            $callback = $attempt->callback_metadata['stk_callback'] ?? null;
        }

        $result = $this->gateway->queryStatus($attempt);
        if (($result['CheckoutRequestID'] ?? '') !== $attempt->checkout_request_id
            || (isset($result['MerchantRequestID']) && $result['MerchantRequestID'] !== $attempt->merchant_request_id)) {
            $this->invalid('The provider response does not match this payment request.');
        }
        // ResponseCode only acknowledges a request. Only ResultCode confirms payment.
        if (!isset($result['ResultCode']) || filter_var($result['ResultCode'], FILTER_VALIDATE_INT) === false) {
            return $attempt;
        }

        return DB::transaction(function () use ($attempt, $callback, $result) {
            $order = Order::withoutGlobalScope(BranchScope::class)->lockForUpdate()->findOrFail($attempt->order_id);
            $locked = StkRequest::lockForUpdate()->findOrFail($attempt->id);
            if ($locked->status === 'completed' && $order->payment_status === PaymentStatus::PAID
                && (int) $result['ResultCode'] !== 0) {
                return $locked;
            }
            if ((int) $result['ResultCode'] !== 0) {
                $locked->update(['status' => 'failed', 'response_description' => $result['ResultDesc'] ?? 'Payment was not completed.']);
                return $locked;
            }

            $expected = $this->cents($locked->amount);
            if ($expected <= 0 || $expected % 100 !== 0 || $expected !== $this->cents($order->total)) {
                $this->invalid('The paid amount needs review before this order can be confirmed.');
            }

            $receipt = $locked->mpesa_receipt_number;
            if ($callback !== null && (int) ($callback['ResultCode'] ?? -1) === 0) {
                $metadata = $this->validateCallback($locked, $callback);
                $receipt = $metadata['MpesaReceiptNumber'];
            }
            if ($receipt && Transaction::where('payment_method', 'lipanampesa')->where('transaction_no', $receipt)
                ->where('order_id', '!=', $order->id)->exists()) {
                $this->invalid('This payment reference is already assigned to another order.');
            }

            $transaction = $this->payments->payment($order, 'lipanampesa', $receipt ?: $locked->checkout_request_id);
            if ($receipt && $transaction->payment_method === 'lipanampesa'
                && $transaction->transaction_no === $locked->checkout_request_id) {
                $transaction->update(['transaction_no' => $receipt]);
            }
            // Repair the old gateway's invalid status, without completing or delivering an order.
            if ($order->status === 2) {
                $order->status = OrderStatus::PENDING;
                $order->save();
            }
            $locked->update([
                'status' => 'completed',
                'mpesa_receipt_number' => $receipt,
                'response_description' => $result['ResultDesc'] ?? 'Payment confirmed.',
            ]);
            return $locked;
        });
    }

    private function validateCallback(StkRequest $attempt, array $callback): array
    {
        if (($callback['CheckoutRequestID'] ?? '') !== $attempt->checkout_request_id
            || ($callback['MerchantRequestID'] ?? '') !== $attempt->merchant_request_id) {
            $this->invalid('The callback does not match this payment request.');
        }
        if ((int) ($callback['ResultCode'] ?? -1) !== 0) return [];

        $metadata = collect($callback['CallbackMetadata']['Item'] ?? [])->pluck('Value', 'Name')->all();
        if (!is_numeric($metadata['Amount'] ?? null)
            || $this->cents($metadata['Amount']) !== $this->cents($attempt->amount)
            || (string) ($metadata['PhoneNumber'] ?? '') !== $attempt->phone_number
            || !preg_match('/\A[A-Za-z0-9]{8,30}\z/', (string) ($metadata['MpesaReceiptNumber'] ?? ''))) {
            $this->invalid('The callback amount, phone or receipt does not match the payment request.');
        }
        return $metadata;
    }

    private function cents($amount): int
    {
        return (int) round((float) $amount * 100);
    }

    private function invalid(string $message): void
    {
        throw ValidationException::withMessages(['payment' => [$message]]);
    }
}
