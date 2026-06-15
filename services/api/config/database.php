<?php

use Illuminate\Support\Str;

return [

    'default' => env('DB_CONNECTION', 'pgsql'),

    'connections' => [

        'sqlite' => [
            'driver' => 'sqlite',
            'url' => env('DB_URL'),
            'database' => env('DB_DATABASE', database_path('database.sqlite')),
            'prefix' => '',
            'foreign_key_constraints' => env('DB_FOREIGN_KEYS', true),
            'busy_timeout' => null,
            'journal_mode' => null,
            'synchronous' => null,
        ],

        'pgsql' => [
            'driver' => 'pgsql',
            'url' => env('DB_URL'),
            'host' => env('DB_HOST', '127.0.0.1'),
            'port' => env('DB_PORT', '5432'),
            'database' => env('DB_DATABASE', 'aquerii'),
            'username' => env('DB_USERNAME', 'postgres'),
            'password' => env('DB_PASSWORD', ''),
            'charset' => env('DB_CHARSET', 'utf8'),
            'prefix' => '',
            'prefix_indexes' => true,
            'search_path' => 'public',
            'sslmode' => env('DB_SSLMODE', 'prefer'),
        ],

        'mysql' => [
            'driver' => 'mysql',
            'url' => env('DB_URL'),
            'host' => env('DB_HOST', '127.0.0.1'),
            'port' => env('DB_PORT', '3306'),
            'database' => env('DB_DATABASE', 'aquerii'),
            'username' => env('DB_USERNAME', 'root'),
            'password' => env('DB_PASSWORD', ''),
            'unix_socket' => env('DB_SOCKET', ''),
            'charset' => env('DB_CHARSET', 'utf8mb4'),
            'collation' => env('DB_COLLATION', 'utf8mb4_unicode_ci'),
            'prefix' => '',
            'prefix_indexes' => true,
            'strict' => true,
            'engine' => null,
        ],

        'superadmin' => [
            'driver' => 'pgsql',
            'host' => env('DB_HOST', 'postgres'),
            'port' => env('DB_PORT', '5432'),
            'database' => env('DB_DATABASE', 'aquerii'),
            'username' => env('DB_SUPERADMIN_USERNAME', 'aquerii_superadmin'),
            'password' => env('DB_SUPERADMIN_PASSWORD', ''),
            'charset' => 'utf8',
            'schema' => 'superadmin',
        ],

        'clickhouse' => [
            'driver' => 'clickhouse',
            'host' => env('CLICKHOUSE_HOST', 'clickhouse'),
            'port' => env('CLICKHOUSE_PORT', 8123),
            'database' => env('CLICKHOUSE_DATABASE', 'aquerii_analytics'),
            'username' => env('CLICKHOUSE_USERNAME', 'default'),
            'password' => env('CLICKHOUSE_PASSWORD', ''),
        ],

    ],

    'pool' => [
        'min' => env('DB_POOL_MIN', 2),
        'max' => env('DB_POOL_MAX', 20),
        'idle_timeout' => env('DB_POOL_IDLE_TIMEOUT', 600),
        'retry_delay' => env('DB_POOL_RETRY_DELAY', 1),
        'max_lifetime' => env('DB_POOL_MAX_LIFETIME', 3600),
    ],

    'pgbouncer' => [
        'enabled' => env('PGBOUNCER_ENABLED', false),
        'host' => env('PGBOUNCER_HOST', 'pgbouncer'),
        'port' => env('PGBOUNCER_PORT', '6432'),
        'pool_mode' => env('PGBOUNCER_POOL_MODE', 'transaction'),
        'default_pool_size' => env('PGBOUNCER_DEFAULT_POOL_SIZE', 25),
        'max_client_conn' => env('PGBOUNCER_MAX_CLIENT_CONN', 100),
        'server_idle_timeout' => env('PGBOUNCER_SERVER_IDLE_TIMEOUT', 600),
        'query_timeout' => env('PGBOUNCER_QUERY_TIMEOUT', 0),
    ],

    'migrations' => [
        'table' => 'migrations',
        'update_date_on_publish' => true,
    ],

    'redis' => [

        'client' => env('REDIS_CLIENT', 'phpredis'),

        'options' => [
            'cluster' => env('REDIS_CLUSTER', 'redis'),
            'prefix' => env('REDIS_PREFIX', Str::slug(env('APP_NAME', 'laravel'), '_').'_database_'),
        ],

        'default' => [
            'url' => env('REDIS_URL'),
            'host' => env('REDIS_HOST', '127.0.0.1'),
            'username' => env('REDIS_USERNAME'),
            'password' => env('REDIS_PASSWORD'),
            'port' => env('REDIS_PORT', '6379'),
            'database' => env('REDIS_DB', '0'),
        ],

        'cache' => [
            'url' => env('REDIS_URL'),
            'host' => env('REDIS_HOST', '127.0.0.1'),
            'username' => env('REDIS_USERNAME'),
            'password' => env('REDIS_PASSWORD'),
            'port' => env('REDIS_PORT', '6379'),
            'database' => env('REDIS_CACHE_DB', '1'),
        ],

    ],

];
