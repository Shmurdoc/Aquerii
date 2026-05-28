<?php

use Laravel\Horizon\Horizon;

Horizon::auth(function ($request) {
    // Only workspace owners or super admins may access Horizon dashboard
    return $request->user() && in_array($request->user()->email, explode(',', env('HORIZON_ADMIN_EMAILS', '')));
});

return [
    'use'              => 'default',
    'prefix'           => env('HORIZON_PREFIX', 'horizon:'),
    'middleware'       => ['web', 'auth'],
    'waits'            => ['redis:default' => 60],
    'trim'             => [
        'recent'           => 60,
        'pending'          => 60,
        'completed'        => 60,
        'recent_failed'    => 10080,
        'failed'           => 10080,
        'monitored'        => 10080,
    ],
    'silenced'         => [],
    'metrics'          => [
        'trim_snapshots' => ['job' => 24, 'queue' => 24],
    ],
    'fast_termination' => false,
    'memory_limit'     => 256,
    'defaults'         => [
        'supervisor-1' => [
            'connection' => 'redis',
            'queue'      => ['default', 'notifications', 'automations', 'ai'],
            'balance'    => 'auto',
            'autoScalingStrategy' => 'time',
            'minProcesses' => 1,
            'maxProcesses' => 10,
            'balanceMaxShift'   => 1,
            'balanceCooldown'   => 3,
            'tries'      => 3,
            'timeout'    => 90,
        ],
    ],
    'environments' => [
        'production' => [
            'supervisor-default' => [
                'connection'   => 'redis',
                'queue'        => ['default'],
                'balance'      => 'auto',
                'minProcesses' => 2,
                'maxProcesses' => 20,
                'tries'        => 3,
                'timeout'      => 90,
            ],
            'supervisor-notifications' => [
                'connection'   => 'redis',
                'queue'        => ['notifications'],
                'balance'      => 'simple',
                'processes'    => 3,
                'tries'        => 3,
            ],
            'supervisor-automations' => [
                'connection'   => 'redis',
                'queue'        => ['automations'],
                'balance'      => 'auto',
                'minProcesses' => 1,
                'maxProcesses' => 8,
                'tries'        => 3,
                'timeout'      => 120,
            ],
            'supervisor-ai' => [
                'connection'   => 'redis',
                'queue'        => ['ai'],
                'balance'      => 'auto',
                'minProcesses' => 1,
                'maxProcesses' => 5,
                'tries'        => 2,
                'timeout'      => 60,
            ],
        ],
        'local' => [
            'supervisor-1' => [
                'connection'   => 'redis',
                'queue'        => ['default', 'notifications', 'automations', 'ai'],
                'balance'      => 'simple',
                'processes'    => 3,
                'tries'        => 3,
            ],
        ],
    ],
];
