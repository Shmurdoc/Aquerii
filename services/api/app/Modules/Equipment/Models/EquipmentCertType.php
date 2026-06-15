<?php

namespace App\Modules\Equipment\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class EquipmentCertType extends Model
{
    use HasUuids;

    protected $table = 'equipment_cert_types';

    protected $fillable = [
        'workspace_id', 'name', 'description', 'required',
    ];

    protected function casts(): array
    {
        return [
            'required' => 'boolean',
        ];
    }
}
