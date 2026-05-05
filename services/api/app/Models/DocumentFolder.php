<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class DocumentFolder extends Model
{
    use HasUuids;

    protected $table = 'document_folders';

    protected $fillable = [
        'workspace_id', 'parent_id', 'created_by', 'name', 'position',
    ];

    protected function casts(): array
    {
        return [
            'position' => 'float',
        ];
    }

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }

    public function documents()
    {
        return $this->hasMany(Document::class, 'folder_id');
    }

    public function children()
    {
        return $this->hasMany(DocumentFolder::class, 'parent_id');
    }

    public function parent()
    {
        return $this->belongsTo(DocumentFolder::class, 'parent_id');
    }
}
