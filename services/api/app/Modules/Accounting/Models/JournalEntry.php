<?php

namespace App\Modules\Accounting\Models;

use App\Core\Models\User;
use App\Core\Models\Workspace;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class JournalEntry extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'workspace_id', 'account_id', 'entry_date', 'description',
        'debit_amount', 'credit_amount', 'reference_type', 'reference_id', 'created_by',
    ];

    public function casts(): array
    {
        return [
            'entry_date' => 'date',
            'debit_amount' => 'float',
            'credit_amount' => 'float',
        ];
    }

    protected static function boot(): void
    {
        parent::boot();
        static::creating(fn ($model) => $model->id ??= (string) Str::uuid());
    }

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
