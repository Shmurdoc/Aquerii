<?php

namespace App\Core\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class EmployeeGroup extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'workspace_id', 'name', 'description', 'color', 'manager_id',
    ];

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }

    public function manager()
    {
        return $this->belongsTo(WorkspaceMember::class, 'manager_id');
    }

    public function members()
    {
        return $this->hasMany(WorkspaceMember::class, 'employee_group_id');
    }
}
