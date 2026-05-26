<?php

return [
    'driver' => env('SCOUT_DRIVER', 'meilisearch'),

    'prefix' => env('SCOUT_PREFIX', ''),

    'queue' => [
        'connection' => env('SCOUT_QUEUE_CONNECTION', 'redis'),
        'queue' => env('SCOUT_QUEUE', 'search'),
    ],

    'after_commit' => true,

    'chunk' => [
        'searchable' => 500,
        'unsearchable' => 500,
    ],

    'soft_delete' => true,

    'identify' => false,

    'meilisearch' => [
        'host' => env('MEILISEARCH_HOST', 'http://localhost:7700'),
        'key' => env('MEILISEARCH_KEY'),
        'index-settings' => [
            'items' => [
                'filterableAttributes' => ['workspace_id', 'board_id', 'group_id', 'status', 'priority', 'created_by'],
                'sortableAttributes' => ['position', 'due_date', 'created_at', 'updated_at'],
                'searchableAttributes' => ['title', 'description'],
            ],
            'boards' => [
                'filterableAttributes' => ['workspace_id', 'type', 'visibility'],
                'sortableAttributes' => ['position', 'created_at'],
                'searchableAttributes' => ['name', 'description'],
            ],
            'documents' => [
                'filterableAttributes' => ['workspace_id', 'folder_id', 'created_by'],
                'sortableAttributes' => ['created_at', 'updated_at', 'last_edited_at'],
                'searchableAttributes' => ['title'],
            ],
        ],
    ],
];
