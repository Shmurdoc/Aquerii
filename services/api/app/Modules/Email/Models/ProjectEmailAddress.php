<?php

namespace App\Modules\Email\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class ProjectEmailAddress extends Model
{
    use HasUuids;

    protected $table = 'project_email_addresses';

    protected $fillable = [
        'workspace_id', 'address', 'label', 'target_board_id', 'is_active', 'settings',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'settings' => 'array',
        ];
    }

    public function workspace()
    {
        return $this->belongsTo(\App\Core\Models\Workspace::class);
    }

    public function inboundEmails()
    {
        return $this->hasMany(InboundEmail::class, 'project_email_address_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
