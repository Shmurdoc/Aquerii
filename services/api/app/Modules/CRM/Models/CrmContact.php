<?php

namespace App\Modules\CRM\Models;

use App\Core\Models\Workspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class CrmContact extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'crm_contacts';

    protected $fillable = [
        'workspace_id', 'company_id', 'first_name', 'last_name',
        'email', 'phone', 'job_title', 'social_links',
        'lifecycle_stage', 'consent_gdpr', 'consent_marketing',
        'consent_preferences', 'last_touched_at', 'source', 'source_url',
        'lead_score', 'tags', 'deal_value',
        'stage_id', 'notes', 'custom_fields',
    ];

    protected $appends = ['full_name'];

    protected function casts(): array
    {
        return [
            'lead_score' => 'integer',
            'tags' => 'array',
            'custom_fields' => 'array',
            'deal_value' => 'float',
            'social_links' => 'array',
            'consent_preferences' => 'array',
            'consent_gdpr' => 'boolean',
            'consent_marketing' => 'boolean',
            'last_touched_at' => 'datetime',
        ];
    }

    public function getFullNameAttribute(): ?string
    {
        return trim("{$this->first_name} {$this->last_name}") ?: null;
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

    public function relationships()
    {
        return $this->hasMany(CrmContactRelationship::class, 'contact_id');
    }

    public function relatedTo()
    {
        return $this->hasMany(CrmContactRelationship::class, 'related_contact_id');
    }

    public function stageHistory()
    {
        return $this->hasMany(CrmContactStageHistory::class, 'contact_id');
    }

    public function leads()
    {
        return $this->hasMany(CrmLead::class, 'contact_id');
    }

    public function activities()
    {
        return $this->hasMany(CrmActivity::class, 'contact_id');
    }

    public function touchContact(): void
    {
        $this->update(['last_touched_at' => now()]);
    }
}
