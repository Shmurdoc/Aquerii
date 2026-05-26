<?php

namespace App\Modules\CRM\Models;

use App\Core\Models\User;
use App\Core\Models\Workspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class CrmSequence extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'crm_sequences';

    protected $fillable = [
        'workspace_id', 'name', 'description', 'steps',
        'is_active', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'steps' => 'array',
            'is_active' => 'boolean',
        ];
    }

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function enrollments()
    {
        return $this->hasMany(CrmSequenceEnrollment::class, 'sequence_id');
    }
}
