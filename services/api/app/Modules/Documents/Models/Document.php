<?php

namespace App\Modules\Documents\Models;

use App\Core\Models\Item;
use App\Core\Models\User;
use App\Core\Models\Workspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Laravel\Scout\Searchable;

class Document extends Model
{
    use HasUuids, Searchable;

    protected $table = 'documents';

    protected $fillable = [
        'workspace_id', 'folder_id', 'linked_item_id', 'created_by', 'title',
        'content', 'ydoc_state', 'is_locked', 'last_edited_by', 'last_edited_at',
    ];

    protected function casts(): array
    {
        return [
            'content' => 'array',
            'is_locked' => 'boolean',
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

    public function linkedItem()
    {
        return $this->belongsTo(Item::class, 'linked_item_id');
    }

    public function toSearchableArray(): array
    {
        return [
            'id' => $this->id,
            'workspace_id' => $this->workspace_id,
            'folder_id' => $this->folder_id,
            'title' => $this->title,
            'created_by' => $this->created_by,
            'last_edited_at' => $this->last_edited_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
