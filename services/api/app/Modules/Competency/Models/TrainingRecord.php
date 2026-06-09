<?php

namespace App\Modules\Competency\Models;

use App\Core\Models\User;
use App\Core\Models\Workspace;
use Database\Factories\Competency\TrainingRecordFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class TrainingRecord extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected static function newFactory()
    {
        return TrainingRecordFactory::new();
    }

    protected $table = 'training_records';

    protected $fillable = [
        'workspace_id', 'user_id', 'competency_type_id', 'training_name',
        'provider', 'date_completed', 'expiry_date', 'result', 'score',
        'notes', 'document_url',
    ];

    protected function casts(): array
    {
        return [
            'date_completed' => 'date',
            'expiry_date' => 'date',
            'score' => 'decimal:2',
        ];
    }

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function competencyType(): BelongsTo
    {
        return $this->belongsTo(CompetencyType::class, 'competency_type_id');
    }
}
