<?php

namespace App\Modules\Documents\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ScannedDocument extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'workspace_id', 'title', 'original_filename', 'mime_type',
        'file_size', 'storage_path', 'ocr_text', 'ocr_status',
        'page_count', 'metadata', 'tags', 'uploaded_by',
    ];

    protected $casts = [
        'file_size' => 'integer',
        'page_count' => 'integer',
        'metadata' => 'json',
        'tags' => 'array',
    ];
}
