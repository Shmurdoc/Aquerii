<?php

return [

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_filter([
        env('FRONTEND_URL', 'http://localhost:5173'),
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:80',
        'http://localhost',
    ]),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Workspace-ID', 'Accept', 'Idempotency-Key'],

    'exposed_headers' => [],

    'max_age' => 86400,

    'supports_credentials' => true,

];
