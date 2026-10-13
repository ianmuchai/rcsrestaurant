<fieldset id="lipanampesa_div" class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 hidden">
    <div class="w-full">
        <label for="mpesa_phone" class="block text-sm font-medium text-gray-700 mb-1">M-Pesa Phone Number</label>
        <input type="text" name="mpesa_phone" id="mpesa_phone"
               value="{{ old('mpesa_phone', $order->user->phone ?? '') }}"
               class="w-full h-12 rounded-lg px-4 border border-[#D9DBE9] py-3"
               placeholder="e.g. 254712345678" required>
        <div id="mpesa_response" class="text-success mt-2 hidden"></div>
    </div>
</fieldset>
