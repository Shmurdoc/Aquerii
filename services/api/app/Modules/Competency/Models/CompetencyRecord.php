<?php

namespace App\Modules\Competency\Models;

use App\Core\Models\User;
use App\Core\Models\Workspace;
use Database\Factories\Competency\CompetencyRecordFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class CompetencyRecord extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected static function newFactory()
    {
        return CompetencyRecordFactory::new();
    }

    protected $table = 'competency_records';

    protected $fillable = [
        'workspace_id', 'user_id', 'competency_type_id', 'reference_number',
        'status', 'issued_at', 'expires_at', 'verified_at', 'verified_by',
        'document_url', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'issued_at' => 'date',
            'expires_at' => 'date',
            'verified_at' => 'datetime',
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

    public function competencyType(): BelongsTo
    {
        return $this->belongsTo(CompetencyType::class, 'competency_type_id');
    }

    public function verifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }
}
