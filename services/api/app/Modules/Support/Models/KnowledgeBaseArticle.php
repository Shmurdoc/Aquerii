<?php

namespace App\Modules\Support\Models;

use App\Core\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class KnowledgeBaseArticle extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'support_kb_articles';

    protected $fillable = [
        'workspace_id', 'ticket_id', 'title', 'content', 'category',
        'tags', 'is_published', 'views', 'helpful_count',
        'not_helpful_count', 'author_id',
    ];

    protected function casts(): array
    {
        return [
            'tags' => 'array',
            'is_published' => 'boolean',
        ];
    }

    public function author()
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function ticket()
    {
        return $this->belongsTo(Ticket::class, 'ticket_id');
    }
}
