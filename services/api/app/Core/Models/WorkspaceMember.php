<?php

namespace App\Core\Models;

use App\Modules\CRM\Models\CrmCompany;
use App\Services\ComplianceService;
use Database\Factories\WorkspaceMemberFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Permission\Models\Role;

class WorkspaceMember extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected static function newFactory()
    {
        return WorkspaceMemberFactory::new();
    }

    protected $table = 'workspace_members';

    // updated_at was added in migration 2026_05_11_000014. Laravel manages
    // the column automatically — no need to override UPDATED_AT.

    protected $fillable = [
        'workspace_id', 'user_id', 'role', 'invited_by', 'joined_at',
        'status', 'invited_email', 'invite_token',
        'job_title', 'department', 'phone', 'salary', 'salary_currency',
        'emergency_contact', 'employed_at',
        'employee_group_id', 'reports_to',
        'company_id', 'is_company_owner',
        'weekly_capacity_hours', 'capacity_notes',
        'position_id', 'department_role_id',
        'badge_id', 'employment_type', 'labour_broker_company',
        'union_membership', 'blood_type',
        'emergency_contact_name', 'emergency_contact_phone',
        'site_induction_date', 'site_induction_expiry',
        'overall_compliance_status',
    ];

    // Salary is sensitive PII; do not leak in any JSON response.
    // Only owner/admin controllers should read these via ->makeVisible() or direct DB access.
    protected $hidden = [
        'salary', 'salary_currency',
    ];

    protected function casts(): array
    {
        return [
            'joined_at' => 'datetime',
            'is_company_owner' => 'boolean',
            'site_induction_date' => 'date',
            'site_induction_expiry' => 'date',
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

    public function position(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'position_id');
    }

    public function departmentRole(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'department_role_id');
    }

    public function getOverallComplianceStatusAttribute(): string
    {
        return app(ComplianceService::class)->calculateWorkerStatus($this);
    }
}
