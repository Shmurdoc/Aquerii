<?php

namespace App\Core\Models;

use App\Modules\CRM\Models\CrmCompany;
use Database\Factories\WorkspaceMemberFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class WorkspaceMember extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected static function newFactory()
    {
        return WorkspaceMemberFactory::new();
    }

    protected $table = 'workspace_members';

    const UPDATED_AT = null;

    protected $fillable = [
        'workspace_id', 'user_id', 'role', 'invited_by', 'joined_at',
        'status', 'invited_email', 'invite_token',
        'job_title', 'department', 'phone', 'salary', 'salary_currency',
        'emergency_contact', 'employed_at',
        'employee_group_id', 'reports_to',
        'company_id', 'is_company_owner',
    ];

    protected function casts(): array
    {
        return [
            'joined_at' => 'datetime',
            'is_company_owner' => 'boolean',
        ];
    }

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function employeeGroup(): BelongsTo
    {
        return $this->belongsTo(EmployeeGroup::class);
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(CrmCompany::class, 'company_id');
    }

    public function reportsTo(): BelongsTo
    {
        return $this->belongsTo(self::class, 'reports_to');
    }

    public function subordinates(): HasMany
    {
        return $this->hasMany(self::class, 'reports_to');
    }
}
