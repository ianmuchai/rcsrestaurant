<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">

<head>
    <!-- REQUIRED META TAGS -->
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#00A800">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-title" content="RC's">
    <link rel="apple-touch-icon" href="{{ asset('images/pwa/icon-192.png') }}">

    @php
        $path = trim(request()->path(), '/');
        $path = $path === '' ? 'home' : $path;

        $canonicalUrl = $path === 'home'
            ? url('/')
            : url()->current();

        $noIndex = request()->is('admin*')
            || request()->is('login')
            || request()->is('signup*')
            || request()->is('forget-password*')
            || request()->is('guest-login*')
            || request()->is('checkout*')
            || request()->is('my-orders*')
            || request()->is('edit-profile')
            || request()->is('change-password')
            || request()->is('address')
            || request()->is('chat')
            || request()->is('exception');

        $seoDefaults = [
            'title' => "RC's Nairobi & Eastleigh | Halal Restaurant, Shawarma, Grills & Catering",
            'description' => "Visit RC's at Moon Palace Hotel on General Waruingi Rd, Nairobi for halal dining, Somali-inspired meals, shawarma, grilled platters, family meals, desserts and catering.",
            'keywords' => "RC's Nairobi, RC's Eastleigh, halal restaurant Nairobi, halal restaurant Eastleigh, Somali restaurant Nairobi, shawarma Nairobi, grills Nairobi, catering Nairobi, Moon Palace Hotel restaurant",
        ];

        $seoPages = [
            'home' => [
                'title' => "RC's Nairobi & Eastleigh | Halal Restaurant, Shawarma, Grills & Catering",
                'description' => "Visit RC's at Moon Palace Hotel on General Waruingi Rd, Nairobi for halal dining, Somali-inspired meals, shawarma, grilled platters, family meals, desserts and catering.",
                'keywords' => "RC's, restaurant Nairobi, restaurant Eastleigh, halal restaurant Nairobi, halal restaurant Eastleigh, Somali restaurant Nairobi, shawarma Nairobi, Moon Palace Hotel",
            ],
            'menu' => [
                'title' => "RC's Menu Nairobi & Eastleigh | Halal Meals, Shawarma, Grills & Platters",
                'description' => "Explore the RC's menu in Nairobi and Eastleigh, including halal meals, shawarma, grilled platters, Somali-inspired dishes, breakfast, juices, tea and coffee.",
                'keywords' => "RC's menu, restaurant menu Nairobi, restaurant menu Eastleigh, halal food Nairobi, shawarma menu Nairobi, grilled platters Nairobi",
            ],
            'menu/rcs-signatures' => [
                'title' => "RC's Signature Dishes Nairobi | Halal Grills, Platters & Somali Meals",
                'description' => "Discover RC's signature dishes in Eastleigh, Nairobi, including halal grills, Somali-inspired meals, shawarma, platters, chicken, meat and family favorites.",
                'keywords' => "RC's signatures, signature dishes Nairobi, halal grills Nairobi, Somali food Nairobi, platters Eastleigh",
            ],
            'menu/breakfast' => [
                'title' => "Breakfast In Nairobi & Eastleigh | RC's Halal Breakfast Menu",
                'description' => "Start your day at RC's with halal breakfast in Eastleigh, Nairobi, including tea, coffee, fresh juices, eggs, chapati, anjera, porridge and morning meals.",
                'keywords' => "breakfast Nairobi, breakfast Eastleigh, halal breakfast Nairobi, Somali breakfast Nairobi, tea coffee Eastleigh",
            ],
            'menu/fast-foods' => [
                'title' => "Fast Food Nairobi & Eastleigh | Shawarma, Burgers, Chips & Wraps",
                'description' => "Order fast food at RC's in Eastleigh, Nairobi, including shawarma, burgers, chips, sandwiches, wraps and quick halal meals for dine-in or takeaway.",
                'keywords' => "fast food Nairobi, fast food Eastleigh, shawarma Nairobi, burgers Nairobi, chips Eastleigh, halal fast food Nairobi",
            ],
            'menu/fish-chicken-meat' => [
                'title' => "Fish, Chicken & Meat In Nairobi | Halal Grills At RC's",
                'description' => "Enjoy halal fish, chicken and meat dishes at RC's in Eastleigh, Nairobi, including grilled meats, chicken meals, fish dishes and hearty plates.",
                'keywords' => "fish Nairobi, chicken Nairobi, halal meat Nairobi, grilled chicken Eastleigh, fish restaurant Nairobi",
            ],
            'menu/kenyan-food-soups' => [
                'title' => "Kenyan Food & Soups Nairobi | RC's Eastleigh",
                'description' => "Explore Kenyan food and soups at RC's in Nairobi and Eastleigh, with warm halal meals, soups, rice dishes and local favorites.",
                'keywords' => "Kenyan food Nairobi, soups Nairobi, Kenyan restaurant Eastleigh, halal meals Nairobi",
            ],
            'menu/platters-mexican-ethiopian-foods' => [
                'title' => "Platters, Mexican & Ethiopian-Inspired Meals In Nairobi | RC's",
                'description' => "Share generous platters and flavorful Mexican and Ethiopian-inspired dishes at RC's in Eastleigh, Nairobi, ideal for groups and family dining.",
                'keywords' => "platters Nairobi, Ethiopian food Nairobi, Mexican food Nairobi, family platters Eastleigh, halal platters Nairobi",
            ],
            'menu/rice-pastas' => [
                'title' => "Rice & Pasta Dishes Nairobi | Biryani, Chicken Rice & Pasta At RC's",
                'description' => "Enjoy rice and pasta dishes at RC's in Nairobi and Eastleigh, including biryani, chicken rice, pasta dishes and halal comfort meals.",
                'keywords' => "rice dishes Nairobi, pasta Nairobi, biryani Nairobi, chicken rice Eastleigh, halal pasta Nairobi",
            ],
            'menu/juices-other-beverages' => [
                'title' => "Fresh Juices & Beverages Nairobi | RC's Eastleigh",
                'description' => "Refresh yourself with fresh juices, smoothies, slush drinks, milkshakes, soft drinks, water and desserts at RC's in Eastleigh, Nairobi.",
                'keywords' => "fresh juice Nairobi, juices Eastleigh, milkshakes Nairobi, smoothies Eastleigh, beverages Nairobi",
            ],
            'menu/teas-coffee' => [
                'title' => "Tea & Coffee Nairobi | Somali Tea, Moroccan Tea & Cafe Drinks At RC's",
                'description' => "Enjoy tea and coffee at RC's in Nairobi, including Somali tea, Moroccan tea, coffee and hot drinks served with breakfast, desserts and meals.",
                'keywords' => "tea Nairobi, coffee Nairobi, Somali tea Eastleigh, Moroccan tea Nairobi, cafe Eastleigh",
            ],
            'page/about-us' => [
                'title' => "About RC's | Halal Somali-Inspired Dining In Nairobi",
                'description' => "Learn about RC's in Eastleigh, Nairobi, serving halal Somali-inspired meals, grills, shawarma, Kenyan dishes, desserts and family dining.",
                'keywords' => "about RC's, Somali restaurant Nairobi, halal dining Eastleigh, restaurant in Nairobi",
            ],
            'page/locations' => [
                'title' => "RC's Location | Moon Palace Hotel, General Waruingi Rd, Nairobi",
                'description' => "Find RC's at Moon Palace Hotel on General Waruingi Rd, Nairobi for halal dining, shawarma, grills, family meals, takeaway and catering enquiries.",
                'keywords' => "RC's location, Moon Palace Hotel, General Waruingi Rd Nairobi, restaurant Eastleigh, restaurant Nairobi",
            ],
            'page/contact-us' => [
                'title' => "Contact RC's Nairobi | Orders, Catering, Events & Directions",
                'description' => "Contact RC's at Moon Palace Hotel on General Waruingi Rd, Nairobi for dining, takeaway, online orders, catering, events and directions.",
                'keywords' => "contact RC's, catering Nairobi, restaurant contact Eastleigh, food orders Nairobi, General Waruingi Rd",
            ],
            'page/privacy-policy' => [
                'title' => "Privacy Policy | RC's",
                'description' => "Read the RC's privacy policy for information about how customer data is handled when using our website and ordering services.",
                'keywords' => "RC's privacy policy",
            ],
        ];

        $seo = $seoPages[$path] ?? $seoDefaults;
    @endphp

    <!-- PAGE TITLE -->
    <title>{{ $seo['title'] }}</title>

    <!-- FAV ICON -->
    <link rel="icon" type="image" href="{{ $favicon }}">

    <!-- SEO Meta Tags -->
    <meta name="description" content="{{ $seo['description'] }}">
    <meta name="keywords" content="{{ $seo['keywords'] }}">
    <meta name="author" content="RC's">
    <meta name="robots" content="{{ $noIndex ? 'noindex, nofollow' : 'index, follow' }}">
    <link rel="canonical" href="{{ $canonicalUrl }}">

    <!-- Open Graph Meta -->
    <meta property="og:title" content="{{ $seo['title'] }}">
    <meta property="og:description" content="{{ $seo['description'] }}">
    <meta property="og:type" content="restaurant">
    <meta property="og:url" content="{{ $canonicalUrl }}">
    <meta property="og:image" content="{{ asset('images/rcs-cafe-cover.jpg') }}">
    <meta property="og:site_name" content="RC's">
    <meta property="og:locale" content="en_KE">

    <!-- Twitter Card Meta -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{{ $seo['title'] }}">
    <meta name="twitter:description" content="{{ $seo['description'] }}">
    <meta name="twitter:image" content="{{ asset('images/rcs-cafe-cover.jpg') }}">

    <!-- Local Business Schema -->
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "Restaurant",
        "name": "RC's",
        "url": "{{ url('/') }}",
        "image": "{{ asset('images/rcs-cafe-cover.jpg') }}",
        "description": "RC's serves Nairobi and Eastleigh with halal dining, Somali-inspired meals, shawarma, grilled platters, nyama choma, family meals, desserts, events and catering.",
        "telephone": "+254712878787",
        "email": "info@rcs.co.ke",
        "priceRange": "$$",
        "servesCuisine": ["Halal", "Somali", "Kenyan", "Grill", "Shawarma", "Cafe"],
        "menu": "{{ url('/menu') }}",
        "hasMap": "https://www.google.com/maps/place/RC's+Restaurant/",
        "containedInPlace": {
            "@type": "Hotel",
            "name": "Moon Palace Hotel",
            "address": {
                "@type": "PostalAddress",
                "streetAddress": "General Waruingi Rd",
                "addressLocality": "Nairobi",
                "addressRegion": "Nairobi",
                "addressCountry": "KE"
            }
        },
        "address": {
            "@type": "PostalAddress",
            "streetAddress": "General Waruingi Rd",
            "addressLocality": "Nairobi",
            "addressRegion": "Nairobi",
            "addressCountry": "KE"
        },
        "geo": {
            "@type": "GeoCoordinates",
            "latitude": -1.2786827,
            "longitude": 36.8510157
        },
        "areaServed": ["Nairobi", "Eastleigh"],
        "amenityFeature": [
            {
                "@type": "LocationFeatureSpecification",
                "name": "Private dining room",
                "value": true
            }
        ]
    }
    </script>

    <!-- Website Schema -->
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "RC's",
        "url": "{{ url('/') }}",
        "potentialAction": {
            "@type": "SearchAction",
            "target": "{{ url('/search') }}?s={search_term_string}",
            "query-input": "required name=search_term_string"
        }
    }
    </script>

    <!-- FONTS -->
    <link rel="stylesheet" href="{{ asset('themes/default/fonts/fontawesome/fontawesome.css') }}">
    <link rel="stylesheet" href="{{ asset('themes/default/fonts/lab/lab.css') }}">
    <link rel="stylesheet" href="{{ asset('themes/default/fonts/typography/public/public.css') }}">
    <link rel="stylesheet" href="{{ asset('themes/default/fonts/typography/rubik/rubik.css') }}">

    <!-- CUSTOM STYLE -->
    <link rel="stylesheet" href="{{ asset('themes/default/css/custom.css?v1') }}">
    <link rel="stylesheet" href="{{ mix('css/app.css') }}?v=20260723g">

    @if (!blank($analytics))
        @foreach ($analytics as $analytic)
            @if (!blank($analytic->analyticSections))
                @foreach ($analytic->analyticSections as $section)
                    @if ($section->section == \App\Enums\AnalyticSection::HEAD)
                        {!! $section->data !!}
                    @endif
                @endforeach
            @endif
        @endforeach
    @endif
</head>

<body>
    @if (!blank($analytics))
        @foreach ($analytics as $analytic)
            @if (!blank($analytic->analyticSections))
                @foreach ($analytic->analyticSections as $section)
                    @if ($section->section == \App\Enums\AnalyticSection::BODY)
                        {!! $section->data !!}
                    @endif
                @endforeach
            @endif
        @endforeach
    @endif

    <div id="app">
        <default-component />
    </div>

    @if (!blank($analytics))
        @foreach ($analytics as $analytic)
            @if (!blank($analytic->analyticSections))
                @foreach ($analytic->analyticSections as $section)
                    @if ($section->section == \App\Enums\AnalyticSection::FOOTER)
                        {!! $section->data !!}
                    @endif
                @endforeach
            @endif
        @endforeach
    @endif

    <script>
        window.APP_URL = "{{ env('MIX_HOST') }}";
        window.APP_KEY = "{{ env('MIX_API_KEY') }}";
        window.GOOGLE_TOKEN = "{{ env('MIX_GOOGLE_MAP_KEY') }}";
        window.APP_DEMO = "{{ env('MIX_DEMO') }}";
    </script>

    <script src="{{ mix('js/app.js') }}?v=20260723g"></script>
    <script src="{{ asset('themes/default/js/drawer.js') }}"></script>
    <script src="{{ asset('themes/default/js/modal.js') }}"></script>
    <script src="{{ asset('themes/default/js/customScript.js') }}"></script>
    <script src="{{ asset('themes/default/js/tabs.js') }}"></script>
    <script src="{{ asset('themes/default/js/dropdown.js') }}"></script>
</body>

</html>
