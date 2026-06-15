<?php

namespace App\Modules\Equipment\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EquipmentCertRecord extends Model
{
    use HasUuids;

    protected $table = 'equipment_cert_records';

    protected $fillable = [
        'workspace_id', 'equipment_id', 'cert_type_id', 'cert_number',
        'issued_at', 'expires_at', 'status', 'verified',
        'verified_at', 'verified_by', 'file_url', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'issued_at' => 'datetime',
            'expires_at' => 'datetime',
            'verified_at' => 'datetime',
            'verified' => 'boolean',
        ];
    }

    public function certType(): BelongsTo
    {
        return $this->belongsTo(EquipmentCertType::class, 'cert_type_id');
    }
}
