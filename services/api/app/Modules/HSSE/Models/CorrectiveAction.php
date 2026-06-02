<?php

namespace App\Modules\HSSE\Models;

use App\Core\Models\User;
use App\Core\Models\Workspace;
use Database\Factories\HSSE\CorrectiveActionFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class CorrectiveAction extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'hsse_corrective_actions';

    public const SOURCE_INCIDENT = 'incident';

    public const SOURCE_HAZARD = 'hazard';

    public const SOURCE_INSPECTION = 'inspection';

    public const SOURCE_AUDIT = 'audit';

    public const SOURCE_OBSERVATION = 'observation';

    public const SOURCE_OTHER = 'other';

    public const PRIORITY_LOW = 'low';

    public const PRIORITY_MEDIUM = 'medium';

    public const PRIORITY_HIGH = 'high';

    public const PRIORITY_URGENT = 'urgent';

    public const STATUS_OPEN = 'open';

    public const STATUS_IN_PROGRESS = 'in_progress';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_VERIFIED = 'verified';

    public const STATUS_OVERDUE = 'overdue';

    public const STATUS_CANCELLED = 'cancelled';

    public static array $sourceTypes = [
        self::SOURCE_INCIDENT, self::SOURCE_HAZARD, self::SOURCE_INSPECTION,
        self::SOURCE_AUDIT, self::SOURCE_OBSERVATION, self::SOURCE_OTHER,
    ];

    public static array $priorities = [
        self::PRIORITY_LOW, self::PRIORITY_MEDIUM, self::PRIORITY_HIGH, self::PRIORITY_URGENT,
    ];

    public static array $statuses = [
        self::STATUS_OPEN, self::STATUS_IN_PROGRESS, self::STATUS_COMPLETED,
        self::STATUS_VERIFIED, self::STATUS_OVERDUE, self::STATUS_CANCELLED,
    ];

    protected $fillable = [
        'workspace_id', 'reference', 'source_type', 'source_id', 'description',
        'assigned_to', 'priority', 'status', 'due_date',
        'completed_at', 'verified_at', 'verified_by', 'completion_evidence',
    ];

    protected static function newFactory(): CorrectiveActionFactory
    {
        return CorrectiveActionFactory::new();
    }

    public function casts(): array
    {
        return [
            'due_date' => 'date',
            'completed_at' => 'datetime',
            'verified_at' => 'datetime',
        ];
    }

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function source(): MorphTo
    {
        return $this->morphTo();
    }
}
