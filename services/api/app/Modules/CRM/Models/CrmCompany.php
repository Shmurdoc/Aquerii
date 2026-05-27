<?php

namespace App\Modules\CRM\Models;

use App\Core\Models\Workspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class CrmCompany extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

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
