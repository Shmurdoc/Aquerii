<?php

namespace App\Modules\CRM\Models;

use App\Core\Models\User;
use App\Core\Models\Workspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class CrmLead extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'crm_leads';

    protected $fillable = [
        'workspace_id', 'contact_id', 'email', 'phone',
        'first_name', 'last_name', 'company_name',
        'source', 'source_url', 'score', 'status',
        'assigned_to', 'notes', 'custom_fields',
    ];

    protected function casts(): array
    {
        return [
            'score' => 'integer',
            'custom_fields' => 'array',
        ];
    }

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }

    public function contact()
    {
        return $this->belongsTo(CrmContact::class, 'contact_id');
    }

    public function assignee()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }
}
