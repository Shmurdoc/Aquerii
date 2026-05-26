<?php

namespace App\Modules\Email\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmailAttachment extends Model
{
    use HasUuids;

    protected $fillable = ['email_id', 'filename', 'mime_type', 'file_size', 'storage_path'];

    protected $casts = ['file_size' => 'integer'];

    public function email(): BelongsTo
    {
        return $this->belongsTo(Email::class, 'email_id');
    }
}
