<?php

namespace App\Modules\Marketing\Models;

use App\Core\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class EmailTemplate extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'marketing_email_templates';

    protected $fillable = [
        'workspace_id', 'name', 'description', 'subject',
        'content_html', 'content_text', 'tokens',
        'category', 'thumbnail_url', 'is_shared',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'tokens' => 'array',
            'is_shared' => 'boolean',
        ];
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
