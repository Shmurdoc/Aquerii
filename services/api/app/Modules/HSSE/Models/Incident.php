<?php

namespace App\Modules\HSSE\Models;

use App\Core\Models\User;
use App\Core\Models\Workspace;
use Database\Factories\HSSE\IncidentFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Incident extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'hsse_incidents';

    public const TYPE_FATALITY = 'fatality';

    public const TYPE_LOST_TIME = 'lost_time';

    public const TYPE_MEDICAL_TREATMENT = 'medical_treatment';

    public const TYPE_FIRST_AID = 'first_aid';

    public const TYPE_PROPERTY_DAMAGE = 'property_damage';

    public const TYPE_ENVIRONMENTAL = 'environmental';

    public const TYPE_NEAR_MISS = 'near_miss';

    public const TYPE_OTHER = 'other';

    public const SEVERITY_CRITICAL = 'critical';

    public const SEVERITY_HIGH = 'high';

    public const SEVERITY_MEDIUM = 'medium';

    public const SEVERITY_LOW = 'low';

    public const SEVERITY_INFO = 'informational';

    public const STATUS_OPEN = 'open';

    public const STATUS_INVESTIGATING = 'under_investigation';

    public const STATUS_CLOSED = 'closed';

    public const STATUS_ARCHIVED = 'archived';

    public static array $types = [
        self::TYPE_FATALITY, self::TYPE_LOST_TIME, self::TYPE_MEDICAL_TREATMENT,
        self::TYPE_FIRST_AID, self::TYPE_PROPERTY_DAMAGE, self::TYPE_ENVIRONMENTAL,
        self::TYPE_NEAR_MISS, self::TYPE_OTHER,
    ];

    public static array $severities = [
        self::SEVERITY_CRITICAL, self::SEVERITY_HIGH, self::SEVERITY_MEDIUM,
        self::SEVERITY_LOW, self::SEVERITY_INFO,
    ];

    public static array $statuses = [
        self::STATUS_OPEN, self::STATUS_INVESTIGATING, self::STATUS_CLOSED, self::STATUS_ARCHIVED,
    ];

    protected $fillable = [
        'workspace_id', 'reference', 'title', 'description', 'type', 'severity', 'status',
        'occurred_at', 'reported_at', 'location', 'location_details',
        'body_part_affected', 'injury_type',
        'mhsa_classification', 'coida_reportable', 'coida_reference',
        'reporter_id', 'investigator_id',
        'root_cause', 'immediate_cause', 'contributing_factors',
        'closed_at',
    ];

    protected static function newFactory(): IncidentFactory
    {
        return IncidentFactory::new();
    }

    public function casts(): array
    {
        return [
            'occurred_at' => 'datetime',
            'reported_at' => 'datetime',
            'closed_at' => 'datetime',
            'coida_reportable' => 'boolean',
            'location_details' => 'array',
            'contributing_factors' => 'array',
        ];
    }

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }

    public function investigator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'investigator_id');
    }

    public function correctiveActions(): HasMany
    {
        return $this->hasMany(CorrectiveAction::class, 'source_id')
            ->where('source_type', CorrectiveAction::SOURCE_INCIDENT);
    }
}
