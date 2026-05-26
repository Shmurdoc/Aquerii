<?php

return [
    'credit_costs' => [
        'chat' => env('AI_CREDIT_COST_CHAT', 5),
        'summarize' => env('AI_CREDIT_COST_SUMMARIZE', 3),
        'score_deal' => env('AI_CREDIT_COST_SCORE_DEAL', 10),
        'generate_task_description' => env('AI_CREDIT_COST_GENERATE_TASK_DESC', 3),
        'generate_document' => env('AI_CREDIT_COST_GENERATE_DOC', 5),
        'generate_automation' => env('AI_CREDIT_COST_GENERATE_AUTO', 3),
        'generate_flowchart' => env('AI_CREDIT_COST_FLOWCHART', 8),
        'analyze_document' => env('AI_CREDIT_COST_ANALYZE_DOC', 6),
        'auto_tag_document' => env('AI_CREDIT_COST_AUTO_TAG_DOC', 4),
        'link_document_to_deal' => env('AI_CREDIT_COST_LINK_DEAL', 5),
    ],

    'credit_limits' => [
        'free' => env('AI_CREDIT_LIMIT_FREE', 100),
        'starter' => env('AI_CREDIT_LIMIT_STARTER', 500),
        'growth' => env('AI_CREDIT_LIMIT_GROWTH', 2000),
        'business' => env('AI_CREDIT_LIMIT_BUSINESS', 10000),
    ],
];
