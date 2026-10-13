<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>{{ $company['company_name'] }}</title>
    <link rel="icon" href="{{ $faviconLogo->faviconLogo }}">
    <link rel="stylesheet" href="{{ asset('themes/default/css/style.css') }}">
    <link rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;600;700;800;900&display=swap">
    <link rel="stylesheet" href="{{ asset('themes/default/fonts/lab/lab.css') }}">
    <link rel="stylesheet" href="{{ asset('themes/default/css/custom.css') }}">
    <style>
        .loader {
            border-style: solid;
            border-width: 4px;
            border-radius: 9999px;
            border-top-color: #3490dc;
            border-right-color: transparent;
            border-bottom-color: transparent;
            border-left-color: transparent;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            to {
                transform: rotate(360deg);
            }
        }

    </style>
</head>

<body>
    <div class="py-14 px-4 w-full max-w-3xl mx-auto">
        <a id="home-route1"  href="{{ route('home') }}" class="block mx-auto w-36 mb-8 home-routes">
            <img class="w-full" src="{{ $logo->logo }}" alt="logo">
        </a>
        <h3 class="text-[22px] text-center font-medium leading-[34px] mb-6">
            {{ __('all.message.select_your_payment_method') }}</h3>

        @if (session()->has('status'))
            <div id="waitingOverlay" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
                <div class="bg-white text-center rounded-lg p-8 shadow-lg max-w-md w-full">
                    <div class="mb-4">
                        <div class="loader mb-4 mx-auto border-4 border-blue-200 border-t-blue-600 rounded-full w-12 h-12 animate-spin"></div>
                        <p class="text-lg font-semibold">{{ session('message') }}...</p>
                    </div>
                    <button id="cancelPayment" class="btn btn-danger">
                        Cancel Payment
                    </button>

                </div>
            </div>
        @endif


    @if ($errors->any())
            @foreach ($errors->all() as $error)
                <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 mb-5 rounded relative"
                    role="alert">
                    <span class="block sm:inline">{{ $error }}</span>
                    <span class="absolute top-0 bottom-0 right-0 px-4 py-3 cursor-pointer close-button">
                        <i class="lab lab-close-circle-line margin-top-5-px"></i>
                    </span>
                </div>
            @endforeach
        @endif

        @if (session()->has('error'))
            <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 mb-5 rounded relative" role="alert">
                <span class="block sm:inline">{{ session('error') }}</span>
                <span class="absolute top-0 bottom-0 right-0 px-4 py-3 cursor-pointer close-button">
                    <i class="lab lab-close-circle-line margin-top-5-px"></i>
                </span>
            </div>
        @endif

        <form id="paymentForm" method="POST" action="{{ route('payment.store', ['order' => $order]) }}">
            @csrf
            <fieldset class="payment-fieldset">
                @if (!blank($paymentGateways))
                    @foreach ($paymentGateways as $paymentGateway)
                        @if (!$credit && $paymentGateway->slug === 'credit')
                            @continue
                        @endif
                        <label class="payment-label" for="{{ $paymentGateway->slug }}">
                            <input class="paymentMethod" id="{{ $paymentGateway->slug }}" type="radio"
                                name="paymentMethod" value="{{ $paymentGateway->slug }}"
                                @if (old('paymentMethod') == $paymentGateway->slug) checked @endif>
                            <img src="{{ $paymentGateway->image }}" alt="payment">
                            <span>{{ $paymentGateway->name }}</span>
                            @if ($paymentGateway->slug === 'credit')
                                <span>
                                    {{ $creditAmount }}
                                </span>
                            @endif
                        </label>
                    @endforeach
                @endif
            </fieldset>

            @if (!blank($paymentGateways))
                @foreach ($paymentGateways as $paymentGateway)
                    @if ($paymentGateway->misc !== null)
                        @if (!blank(json_decode($paymentGateway->misc)))
                            @if (!blank(json_decode($paymentGateway->misc)->input))
                                @foreach (json_decode($paymentGateway->misc)->input as $input)
                                    @include('paymentGateways.' . str_replace('.blade.php', '', $input))
                                @endforeach
                            @endif
                        @endif
                    @endif
                @endforeach
            @endif

            @if (!blank($paymentGateways))
                <button type="submit"
                    class="py-3 w-full rounded-3xl text-center text-base font-medium bg-primary text-white"
                    id="confirmBtn">
                    {{ __('all.label.confirm') }}
                </button>
            @endif

            <div class="py-5 px-4 w-full max-w-3xl mx-auto flex flex-col items-center justify-center">
                <a id="home-route"  class="text-primary" href="{{ route('home') }}">{{ __('all.label.back_to_home') }}</a>
            </div>
        </form>

    </div>
    <script src="{{ asset('lib/jquery-v3.2.1.min.js') }}"></script>
    @php
        $jsGateway = [];
        $submitGateway = [];
    @endphp
    @if (!blank($paymentGateways))
        @foreach ($paymentGateways as $paymentGateway)
            @if ($paymentGateway->misc != null)

                @if (!blank(json_decode($paymentGateway->misc)))
                    @if (!blank(json_decode($paymentGateway->misc)->js))
                        @foreach (json_decode($paymentGateway->misc)->js as $js)
                            @include('paymentGateways.' . str_replace('.blade.php', '', $js))
                        @endforeach
                    @endif
                    @if (!blank(json_decode($paymentGateway->misc)->input))
                        @if (isset(json_decode($paymentGateway->misc)->input[0]))
                            @php $jsGateway[$paymentGateway->slug] = isset(json_decode($paymentGateway->misc)->input[0]); @endphp
                        @endif
                    @endif
                    @if (!blank(json_decode($paymentGateway->misc)->submit))
                        @if (isset(json_decode($paymentGateway->misc)->submit) && json_decode($paymentGateway->misc)->submit)
                            @php $submitGateway[$paymentGateway->slug] = json_decode($paymentGateway->misc)->submit; @endphp
                        @endif
                    @endif
                @endif
            @endif
        @endforeach
    @endif

    @if (session()->has('status') && session('checkout_request_id'))
        <script>
            const checkoutRequestId = "{{ session('checkout_request_id') }}";
            const paymentGateway = "lipanampesa";
            const orderId = "{{ $order->id }}";

            const successUrl = `{{ route('payment.success', ['paymentGateway' => "lipanampesa", 'order' => $order->id]) }}`;
            const failUrl = `{{ route('payment.fail', ['paymentGateway' => "lipanampesa", 'order' => $order->id]) }}`;
            const cancelUrl = `{{ route('payment.cancel',['paymentGateway' => "lipanampesa", 'order' => $order->id]) }}`;
            const paymentStatusUrl = "{{ route('payment.api.payment.status', ['checkoutRequestId' => session('checkout_request_id')]) }}";

            let checkInterval = setInterval(() => {
                fetch(paymentStatusUrl)
                    .then(response => response.json())
                    .then(data => {
                        if (data.status === 'completed') {
                            clearInterval(checkInterval);
                            window.location.href = successUrl;
                        } else if (data.status === 'failed') {
                            clearInterval(checkInterval);
                            window.location.href = failUrl;
                        }
                    })
                    .catch(err => {
                        console.error('Error checking payment status:', err);
                    });
            }, 5000);

            document.getElementById('cancelPayment')?.addEventListener('click', () => {
                clearInterval(checkInterval);
                window.location.href = cancelUrl;
            });
        </script>
    @endif


    @php
        $jsGateway = json_encode($jsGateway);
        $submitGateway = json_encode($submitGateway);
    @endphp
    <script>
        const gateway = <?= $jsGateway ?>;
        const submitGateway = <?= $submitGateway ?>;
    </script>
    <script src="{{ asset('paymentGateways/payment.js') }}"></script>
    <script type="application/javascript">
        let data       = JSON.parse(localStorage.getItem('vuex'));
        const url      = '<?=URL::to('/') . "/menu/"?>';
        if (data.tableCart.paymentMethod) {
            document.getElementById('home-route').setAttribute('href', url + data.tableCart.table.slug);
            document.getElementById('home-route1').setAttribute('href', url + data.tableCart.table.slug);
        }
    </script>



</body>

</html>
