<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class CrmContact extends Model
{
    use HasUuids;

    protected $table = 'crm_contacts';

    protected $fillable = [
        'workspace_id', 'company_id', 'first_name', 'last_name',
        'email', 'phone', 'lead_score', 'tags', 'deal_value',
        'stage_id', 'notes', 'custom_fields',
    ];

    protected $appends = ['full_name'];

    protected function casts(): array
    {
        return [
            'lead_score'    => 'integer',
            'tags'          => 'array',
            'custom_fields' => 'array',
            'deal_value'    => 'float',
        ];
    }

    public function getFullNameAttribute(): string
    {
        return "{$this->first_name} {$this->last_name}";
    }

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }

    public function company()
    {
        return $this->belongsTo(CrmCompany::class, 'company_id');
    }

    public function deals()
    {
        return $this->belongsToMany(CrmDeal::class, 'crm_deal_contacts', 'contact_id', 'deal_id');
    }
}
