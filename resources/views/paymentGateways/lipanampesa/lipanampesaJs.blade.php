<script>
    $(document).ready(function () {
        $('#mpesa_phone').on('input', function () {
            let phone = $(this).val().trim();
            let $responseDiv = $('#mpesa_response');

            if (!phone) {
                $responseDiv
                    .removeClass('text-success hidden')
                    .addClass('text-danger')
                    .text('Please enter your M-Pesa phone number.');
                return;
            }

            const isValid = /^(254|07|01)\d{7,8}$/.test(phone);

            if (!isValid) {
                $responseDiv
                    .removeClass('text-success hidden')
                    .addClass('text-danger')
                    .text('Invalid phone number format. Use 2547..., 07... or 01...');
            } else {
                $responseDiv
                    .removeClass('text-danger hidden')
                    .addClass('text-success')
                    .text('Phone number is valid.');
            }
        });
    });

    function lipanampesa_payment() {
        let phone = $('#mpesa_phone').val().trim();
        let $responseDiv = $('#mpesa_response');
        const isValid = /^(254|07|01)\d{7,8}$/.test(phone);

        if (!phone || !isValid) {
            $responseDiv
                .removeClass('text-success hidden')
                .addClass('text-danger')
                .text('Please correct your phone number before submitting.');
            return;
        }

        // Optional form submission
        $('#paymentForm').submit();
    }

    window.lipanampesa_payment = lipanampesa_payment;
</script>
