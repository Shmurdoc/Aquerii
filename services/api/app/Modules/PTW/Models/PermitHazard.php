<?php

namespace App\Modules\PTW\Models;

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Modules\HSSE\Models\Hazard;
use Database\Factories\PTW\PermitHazardFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PermitHazard extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'permit_hazards';

    public const RISK_LOW = 'low';

    public const RISK_MEDIUM = 'medium';

    public const RISK_HIGH = 'high';

    public static array $residualRisks = [
        self::RISK_LOW, self::RISK_MEDIUM, self::RISK_HIGH,
    ];

    protected $fillable = [
        'workspace_id', 'permit_id', 'hazard_id', 'description',
        'control_measure', 'residual_risk', 'sort_order',
        'verified', 'verified_by', 'verified_at',
    ];

    protected static function newFactory(): PermitHazardFactory
    {
        return PermitHazardFactory::new();
    }

    public function casts(): array
    {
        return [
            'verified' => 'boolean',
            'verified_at' => 'datetime',
        ];
    }

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function permit(): BelongsTo
    {
        return $this->belongsTo(Permit::class, 'permit_id');
    }

    public function hazard(): BelongsTo
    {
        return $this->belongsTo(Hazard::class, 'hazard_id');
    }

    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }
}
