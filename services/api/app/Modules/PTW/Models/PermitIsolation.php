<?php

namespace App\Modules\PTW\Models;

use App\Core\Models\User;
use App\Core\Models\Workspace;
use Database\Factories\PTW\PermitIsolationFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PermitIsolation extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'permit_isolations';

    public const ENERGY_ELECTRICAL = 'electrical';

    public const ENERGY_MECHANICAL = 'mechanical';

    public const ENERGY_HYDRAULIC = 'hydraulic';

    public const ENERGY_PNEUMATIC = 'pneumatic';

    public const ENERGY_THERMAL = 'thermal';

    public const ENERGY_CHEMICAL = 'chemical';

    public const ENERGY_GRAVITATIONAL = 'gravitational';

    public const ENERGY_RADIOACTIVE = 'radioactive';

    public static array $energyTypes = [
        self::ENERGY_ELECTRICAL, self::ENERGY_MECHANICAL, self::ENERGY_HYDRAULIC,
        self::ENERGY_PNEUMATIC, self::ENERGY_THERMAL, self::ENERGY_CHEMICAL,
        self::ENERGY_GRAVITATIONAL, self::ENERGY_RADIOACTIVE,
    ];

    protected $fillable = [
        'workspace_id', 'permit_id', 'isolation_point', 'energy_type', 'method',
        'lock_number', 'tag_number', 'applied_by', 'applied_at',
        'removed_by', 'removed_at', 'verified', 'verified_by', 'verified_at',
    ];

    protected static function newFactory(): PermitIsolationFactory
    {
        return PermitIsolationFactory::new();
    }

    public function casts(): array
    {
        return [
            'verified' => 'boolean',
            'applied_at' => 'datetime',
            'removed_at' => 'datetime',
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

    public function applier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'applied_by');
    }

    public function remover(): BelongsTo
    {
        return $this->belongsTo(User::class, 'removed_by');
    }

    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }
}
