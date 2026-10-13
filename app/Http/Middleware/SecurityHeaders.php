<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class SecurityHeaders
{
    /**
     * Add browser security headers to every response.
     *
     * The CSP is compatibility-first because this app still uses Mix, inline
     * bootstrap data, payment scripts, maps, media, and optional analytics.
     */
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);

        $contentSecurityPolicy = [
            "default-src 'self'",
            "base-uri 'self'",
            "object-src 'none'",
            "frame-ancestors 'self'",
            "form-action 'self'",
            "img-src 'self' data: blob: https:",
            "media-src 'self' blob: https:",
            "font-src 'self' data: https:",
            "style-src 'self' 'unsafe-inline' https:",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
            "connect-src 'self' https: wss:",
            "frame-src 'self' https:",
            'worker-src \'self\' blob:',
            'manifest-src \'self\'',
        ];

        if ($request->isSecure()) {
            $contentSecurityPolicy[] = 'upgrade-insecure-requests';
        }

        $headers = [
            'X-Content-Type-Options' => 'nosniff',
            'X-Frame-Options' => 'SAMEORIGIN',
            'X-XSS-Protection' => '0',
            'Referrer-Policy' => 'strict-origin-when-cross-origin',
            'Permissions-Policy' => implode(', ', [
                'accelerometer=()',
                'autoplay=(self)',
                'camera=()',
                'display-capture=()',
                'encrypted-media=()',
                'fullscreen=(self)',
                'geolocation=(self)',
                'gyroscope=()',
                'magnetometer=()',
                'microphone=()',
                'payment=(self)',
                'picture-in-picture=(self)',
                'usb=()',
            ]),
            'Content-Security-Policy' => implode('; ', $contentSecurityPolicy),
        ];

        foreach ($headers as $name => $value) {
            $response->headers->set($name, $value);
        }

        if ($request->isSecure()) {
            $response->headers->set(
                'Strict-Transport-Security',
                'max-age=31536000; includeSubDomains'
            );
        }

        return $response;
    }
}
