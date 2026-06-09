<?php

namespace App\Modules\HSSE\Models;

use App\Core\Models\User;
use App\Core\Models\Workspace;
use Database\Factories\HSSE\HazardFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Hazard extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'hsse_hazards';

    public const CATEGORY_PHYSICAL = 'physical';

    public const CATEGORY_CHEMICAL = 'chemical';

    public const CATEGORY_BIOLOGICAL = 'biological';

    public const CATEGORY_ERGONOMIC = 'ergonomic';

    public const CATEGORY_PSYCHOSOCIAL = 'psychosocial';

    public const CATEGORY_ENVIRONMENTAL = 'environmental';

    public const CATEGORY_MECHANICAL = 'mechanical';

    public const CATEGORY_ELECTRICAL = 'electrical';

    public const CATEGORY_OTHER = 'other';

    public const RISK_LOW = 'low';

    public const RISK_MEDIUM = 'medium';

    public const RISK_HIGH = 'high';

    public const RISK_EXTREME = 'extreme';

    public const STATUS_IDENTIFIED = 'identified';

    public const STATUS_ASSESSED = 'assessed';

    public const STATUS_CONTROLLED = 'controlled';

    public const STATUS_MONITORED = 'monitored';

    public const STATUS_CLOSED = 'closed';

    public static array $categories = [
        self::CATEGORY_PHYSICAL, self::CATEGORY_CHEMICAL, self::CATEGORY_BIOLOGICAL,
        self::CATEGORY_ERGONOMIC, self::CATEGORY_PSYCHOSOCIAL, self::CATEGORY_ENVIRONMENTAL,
        self::CATEGORY_MECHANICAL, self::CATEGORY_ELECTRICAL, self::CATEGORY_OTHER,
    ];

    public static array $statuses = [
        self::STATUS_IDENTIFIED, self::STATUS_ASSESSED, self::STATUS_CONTROLLED,
        self::STATUS_MONITORED, self::STATUS_CLOSED,
    ];

    protected $fillable = [
        'workspace_id', 'reference', 'title', 'description', 'category',
        'location', 'source', 'potential_consequence',
        'likelihood', 'severity', 'risk_score', 'risk_level',
        'control_measures',
        'residual_likelihood', 'residual_severity', 'residual_risk_score', 'residual_risk_level',
        'status', 'owner_id', 'reviewer_id', 'next_review_date',
    ];

    protected static function newFactory(): HazardFactory
    {
        return HazardFactory::new();
    }

    public function casts(): array
    {
        return [
            'likelihood' => 'integer',
            'severity' => 'integer',
            'risk_score' => 'integer',
            'residual_likelihood' => 'integer',
            'residual_severity' => 'integer',
            'residual_risk_score' => 'integer',
            'next_review_date' => 'date',
            'control_measures' => 'array',
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

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewer_id');
    }

    public static function computeRiskLevel(int $score): string
    {
        return match (true) {
            $score <= 4 => self::RISK_LOW,
            $score <= 9 => self::RISK_MEDIUM,
            $score <= 16 => self::RISK_HIGH,
            default => self::RISK_EXTREME,
        };
    }
}
