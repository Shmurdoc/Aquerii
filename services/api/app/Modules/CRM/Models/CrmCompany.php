<?php

namespace App\Modules\CRM\Models;

use App\Core\Enums\SubscriptionPlan;
use App\Core\Models\User;
use App\Core\Models\Workspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class CrmCompany extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'crm_companies';

    protected $fillable = [
        'workspace_id', 'name', 'domain', 'industry', 'size', 'website', 'notes', 'custom_fields',
        'owner_id', 'subscription_plan', 'billing_email', 'billing_address', 'tax_id',
        'employee_count', 'auto_invoice',
    ];

    protected function casts(): array
    {
        return [
            'custom_fields' => 'array',
            'subscription_plan' => SubscriptionPlan::class,
            'auto_invoice' => 'boolean',
            'employee_count' => 'integer',
        ];
    }

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function contacts(): HasMany
    {
        return $this->hasMany(CrmContact::class, 'company_id');
    }

    public function deals(): HasMany
    {
        return $this->hasMany(CrmDeal::class, 'company_id');
    }
}
