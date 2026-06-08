<?php

namespace App\Modules\Equipment\Models;

use App\Core\Models\User;
use App\Core\Models\Workspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class EquipmentCertRecord extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'equipment_cert_records';

    protected $fillable = [
        'workspace_id', 'equipment_id', 'equipment_cert_type_id',
        'cert_number', 'issued_at', 'expires_at', 'verified_at', 'verified_by',
        'file_path', 'notes', 'status', 'metadata',
    ];

    protected function casts(): array
    {
        return [
            'issued_at' => 'date',
            'expires_at' => 'date',
            'verified_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function equipment(): BelongsTo
    {
        return $this->belongsTo(Equipment::class, 'equipment_id');
    }

    public function certType(): BelongsTo
    {
        return $this->belongsTo(EquipmentCertType::class, 'equipment_cert_type_id');
    }

    public function verifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }
}
