<?php

namespace App\Modules\Email\Models;

use App\Core\Models\Item;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class InboundEmail extends Model
{
    use HasUuids;

    protected $table = 'inbound_emails';

    protected $fillable = [
        'workspace_id', 'project_email_address_id', 'message_id',
        'from_address', 'from_name', 'to_addresses', 'cc_addresses',
        'subject', 'body_text', 'body_html', 'headers', 'attachments_meta',
        'status', 'created_task_id', 'processing_notes',
    ];

    protected function casts(): array
    {
        return [
            'headers' => 'array',
            'attachments_meta' => 'array',
        ];
    }

    public function workspace()
    {
        return $this->belongsTo(\App\Core\Models\Workspace::class);
    }

    public function projectEmailAddress()
    {
        return $this->belongsTo(ProjectEmailAddress::class, 'project_email_address_id');
    }

    public function task()
    {
        return $this->belongsTo(Item::class, 'created_task_id');
    }

    public function scopeProcessed($query)
    {
        return $query->where('status', 'processed');
    }

    public function scopeFailed($query)
    {
        return $query->where('status', 'failed');
    }
}
