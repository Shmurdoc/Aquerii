<?php

return [

    /*
    |--------------------------------------------------------------------------
    | VAPID Subject
    |--------------------------------------------------------------------------
    |
    | The "subject" claim embedded in VAPID JWTs sent to push services. Must be
    | a `mailto:` or `https://` URL identifying the operator. The push services
    | (FCM, Mozilla autopush, Apple) use this to contact the operator if abuse
    | is reported. Defaults to a mailto that can be overridden per environment.
    |
    */

    'vapid_subject' => env('WEBPUSH_SUBJECT', 'mailto:admin@aquerii.app'),

    /*
    |--------------------------------------------------------------------------
    | VAPID Public Key
    |--------------------------------------------------------------------------
    |
    | Public key (base64url-encoded, no padding) handed to the browser during
    | PushManager.subscribe(). The browser encrypts payloads against this key
    | using ECDH(P-256). Empty default is intentional — the service fails
    | loudly if missing rather than silently no-op'ing.
    |
    */

    'vapid_public_key' => env('WEBPUSH_PUBLIC_KEY', ''),

    /*
    |--------------------------------------------------------------------------
    | VAPID Private Key
    |--------------------------------------------------------------------------
    |
    | Private key (base64url-encoded) used to sign the VAPID JWT. MUST never
    | be exposed to the browser. Generate a keypair with:
    |
    |   composer exec minishlink/web-push generate-vapid
    |
    */

    'vapid_private_key' => env('WEBPUSH_PRIVATE_KEY', ''),

];
