<?php

namespace App\Core\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class BurnoutScore extends Model
{
    use HasUuids;

    protected $table = 'burnout_scores';

    protected $fillable = [
        'workspace_id', 'user_id', 'score', 'risk_level', 'factors', 'recommendations', 'calculated_at',
    ];

    protected function casts(): array
    {
        return [
            'score' => 'decimal:2',
            'factors' => 'array',
            'calculated_at' => 'datetime',
        ];
    }

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function scopeAtRisk($query)
    {
        return $query->whereIn('risk_level', ['high', 'critical']);
    }
}
