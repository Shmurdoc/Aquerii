<?php
return [
    'default' => 'pgsql',
    'connections' => [
        'pgsql' => [
            'driver'   => 'pgsql',
            'host'     => env('DB_HOST', 'postgres'),
            'port'     => env('DB_PORT', '5432'),
            'database' => env('DB_DATABASE', 'aquerii'),
            'username' => env('DB_SUPERADMIN_USERNAME', 'aquerii_superadmin'),
            'password' => env('DB_SUPERADMIN_PASSWORD', ''),
            'charset'  => 'utf8',
            'schema'   => 'public',
        ],
        'superadmin' => [
            'driver'   => 'pgsql',
            'host'     => env('DB_HOST', 'postgres'),
            'port'     => env('DB_PORT', '5432'),
            'database' => env('DB_DATABASE', 'aquerii'),
            'username' => env('DB_SUPERADMIN_USERNAME', 'aquerii_superadmin'),
            'password' => env('DB_SUPERADMIN_PASSWORD', ''),
            'charset'  => 'utf8',
            'schema'   => 'superadmin',
        ],
    ],
    'migrations' => ['table' => 'migrations', 'update_date_on_publish' => true],
];
