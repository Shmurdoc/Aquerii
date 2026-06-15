<?php

namespace App\Core\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SiteHoliday extends Model
{
    use HasUuids;

    protected $table = 'site_holidays';

    protected $fillable = [
        'workspace_id',
        'date',
        'name',
        'overtime_threshold_hours',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date:Y-m-d',
            'overtime_threshold_hours' => 'decimal:2',
        ];
    }

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function isHoliday(): bool
    {
        return true;
    }
}
