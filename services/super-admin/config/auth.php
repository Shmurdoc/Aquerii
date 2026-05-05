<?php
return [
    'defaults' => ['guard' => 'web', 'passwords' => 'super_admins'],
    'guards' => [
        'web' => ['driver' => 'session', 'provider' => 'super_admins'],
    ],
    'providers' => [
        'super_admins' => ['driver' => 'eloquent', 'model' => App\Models\SuperAdmin::class],
    ],
    'passwords' => [
        'super_admins' => ['provider' => 'super_admins', 'table' => 'password_reset_tokens', 'expire' => 60, 'throttle' => 60],
    ],
    'password_timeout' => 10800,
];
