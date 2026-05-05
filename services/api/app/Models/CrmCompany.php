<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class CrmCompany extends Model
{
    use HasUuids;

    protected $table = 'crm_companies';

    protected $fillable = [
        'workspace_id', 'name', 'domain', 'industry', 'size', 'website', 'notes', 'custom_fields',
    ];

    protected function casts(): array
    {
        return [
            'custom_fields' => 'array',
        ];
    }

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }

    public function contacts()
    {
        return $this->hasMany(CrmContact::class, 'company_id');
    }

    public function deals()
    {
        return $this->hasMany(CrmDeal::class, 'company_id');
    }
}
