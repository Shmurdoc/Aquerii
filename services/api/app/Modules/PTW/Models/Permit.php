<?php

namespace App\Modules\PTW\Models;

use App\Core\Models\User;
use App\Core\Models\Workspace;
use Database\Factories\PTW\PermitFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Permit extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'permits';

    public const TYPE_HOT_WORK = 'hot_work';

    public const TYPE_CONFINED_SPACE = 'confined_space';

    public const TYPE_WORK_AT_HEIGHT = 'work_at_height';

    public const TYPE_ELECTRICAL_ISOLATION = 'electrical_isolation';

    public const TYPE_BLASTING = 'blasting';

    public const TYPE_LIFTING = 'lifting';

    public const TYPE_EXCAVATION = 'excavation';

    public const STATUS_DRAFT = 'draft';

    public const STATUS_REQUESTED = 'requested';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_ISSUED = 'issued';

    public const STATUS_ACTIVE = 'active';

    public const STATUS_SUSPENDED = 'suspended';

    public const STATUS_HSSE_REVIEWED = 'hsse_reviewed';

    public const STATUS_CLOSED = 'closed';

    public const STATUS_REJECTED = 'rejected';

    public const STATUS_EXPIRED = 'expired';

    public const RISK_LOW = 'low';

    public const RISK_MEDIUM = 'medium';

    public const RISK_HIGH = 'high';

    public const RISK_EXTREME = 'extreme';

    public const HIGH_RISK_TYPES = [
        self::TYPE_CONFINED_SPACE,
        self::TYPE_ELECTRICAL_ISOLATION,
        self::TYPE_BLASTING,
        self::TYPE_LIFTING,
    ];

    public static array $types = [
        self::TYPE_HOT_WORK, self::TYPE_CONFINED_SPACE, self::TYPE_WORK_AT_HEIGHT,
        self::TYPE_ELECTRICAL_ISOLATION, self::TYPE_BLASTING, self::TYPE_LIFTING,
        self::TYPE_EXCAVATION,
    ];

    public static array $statuses = [
        self::STATUS_DRAFT, self::STATUS_REQUESTED, self::STATUS_APPROVED,
        self::STATUS_HSSE_REVIEWED, self::STATUS_ISSUED, self::STATUS_ACTIVE,
        self::STATUS_SUSPENDED,
        self::STATUS_CLOSED, self::STATUS_REJECTED, self::STATUS_EXPIRED,
    ];

    public static array $riskLevels = [
        self::RISK_LOW, self::RISK_MEDIUM, self::RISK_HIGH, self::RISK_EXTREME,
    ];

    protected $fillable = [
        'workspace_id', 'reference', 'type', 'status', 'title', 'description',
        'location', 'location_details', 'equipment_id',
        'issuer_id', 'approver_id', 'holder_id', 'recipient_id',
        'valid_from', 'valid_until', 'max_extension_minutes', 'extensions_used_minutes',
        'risk_level', 'pre_conditions', 'work_method_statement', 'ppe_required',
        'requested_at', 'approved_at', 'hsse_reviewed_at', 'issued_at', 'activated_at',
        'suspended_at', 'closed_at', 'closed_by', 'closure_notes',
        'rejection_reason', 'suspension_reason',
        'updated_at',
    ];

    protected static function newFactory(): PermitFactory
    {
        return PermitFactory::new();
    }

    public function casts(): array
    {
        return [
            'location_details' => 'array',
            'pre_conditions' => 'array',
            'valid_from' => 'datetime',
            'valid_until' => 'datetime',
            'requested_at' => 'datetime',
            'approved_at' => 'datetime',
            'hsse_reviewed_at' => 'datetime',
            'issued_at' => 'datetime',
            'activated_at' => 'datetime',
            'suspended_at' => 'datetime',
            'closed_at' => 'datetime',
        ];
    }

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function issuer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'issuer_id');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approver_id');
    }

    public function holder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'holder_id');
    }

    public function recipient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recipient_id');
    }

    public function closer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    public function hazards(): HasMany
    {
        return $this->hasMany(PermitHazard::class, 'permit_id')->orderBy('sort_order');
    }

    public function isolations(): HasMany
    {
        return $this->hasMany(PermitIsolation::class, 'permit_id')->orderBy('created_at');
    }

    public function isHighRisk(): bool
    {
        return in_array($this->type, self::HIGH_RISK_TYPES, true);
    }

    public function isExpired(): bool
    {
        return $this->valid_until !== null
            && $this->valid_until->isPast()
            && ! in_array($this->status, [self::STATUS_CLOSED, self::STATUS_EXPIRED, self::STATUS_REJECTED], true);
    }
}
