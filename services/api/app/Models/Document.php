<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Document extends Model
{
    use HasUuids;

    protected $table = 'documents';

    protected $fillable = [
        'workspace_id', 'folder_id', 'created_by', 'title',
        'content', 'ydoc_state', 'is_locked', 'last_edited_by', 'last_edited_at',
    ];

    protected function casts(): array
    {
        return [
            'content'        => 'array',
            'is_locked'      => 'boolean',
            'last_edited_at' => 'datetime',
        ];
    }

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }

    public function folder()
    {
        return $this->belongsTo(DocumentFolder::class, 'folder_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function lastEditor()
    {
        return $this->belongsTo(User::class, 'last_edited_by');
    }
}
