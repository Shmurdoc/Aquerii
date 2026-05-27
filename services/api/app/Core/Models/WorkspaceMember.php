<?php

namespace App\Core\Models;

use Database\Factories\WorkspaceMemberFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WorkspaceMember extends Model
{
    use HasFactory, HasUuids;

    protected static function newFactory()
    {
        return WorkspaceMemberFactory::new();
    }

    protected $table = 'workspace_members';

    // The workspace_members table has only created_at, no updated_at
    const UPDATED_AT = null;

    protected $fillable = [
        'workspace_id', 'user_id', 'role', 'invited_by', 'joined_at',
        'status', 'invited_email', 'invite_token',
        'job_title', 'department', 'phone', 'salary', 'salary_currency',
        'emergency_contact', 'employed_at',
        'employee_group_id', 'reports_to',
    ];

    protected function casts(): array
    {
        return [
            'joined_at' => 'datetime',
        ];
    }

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function employeeGroup()
    {
        return $this->belongsTo(EmployeeGroup::class);
    }

    public function reportsTo()
    {
        return $this->belongsTo(self::class, 'reports_to');
    }

    public function subordinates()
    {
        return $this->hasMany(self::class, 'reports_to');
    }
}
