<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Jitsi App ID
    |--------------------------------------------------------------------------
    |
    | Identifies the Aquerii tenant to the Jitsi Meet JWT app. The same value
    | is used for both the `iss` and `aud` claims. Obtain the app_id and
    | matching app_secret from https://jaas.8x8.com/ for a managed deployment,
    | or from your self-hosted Jitsi prosody config for the on-prem path.
    |
    */

    'app_id' => env('JITSI_APP_ID', 'aquerii'),

    /*
    |--------------------------------------------------------------------------
    | Jitsi App Secret
    |--------------------------------------------------------------------------
    |
    | HMAC secret used by tymon/jwt-auth to sign every Jitsi room token. MUST
    | be set in any non-local environment — an empty value causes the token
    | endpoint to refuse with 500.
    |
    */

    'app_secret' => env('JITSI_APP_SECRET', ''),

    /*
    |--------------------------------------------------------------------------
    | Jitsi Subdomain / Domain
    |--------------------------------------------------------------------------
    |
    | Public Jitsi deployment that hosts the conference iframe. Defaults to
    | the public meet.jit.si server. For POPI compliance, swap to a self-
    | hosted Jitsi instance (Phase 4).
    |
    */

    'subdomain' => env('JITSI_SUBDOMAIN', 'meet.jit.si'),

    /*
    |--------------------------------------------------------------------------
    | Token TTL (seconds)
    |--------------------------------------------------------------------------
    |
    | Lifetime of a Jitsi room JWT. Matches the Aquerii standard 1-hour
    | meeting window; rotate per request.
    |
    */

    'ttl' => (int) env('JITSI_TOKEN_TTL', 3600),

];
