<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class File extends Model
{
    use HasUuids;

    protected $table = 'files';

    protected $fillable = [
        'workspace_id', 'item_id', 'uploaded_by', 'filename',
        'mime_type', 'size_bytes', 'storage_path', 'storage_provider', 'is_public',
    ];

    protected function casts(): array
    {
        return [
            'size_bytes' => 'integer',
            'is_public'  => 'boolean',
        ];
    }

    public function item()
    {
        return $this->belongsTo(Item::class);
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
