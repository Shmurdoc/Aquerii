<?php

namespace App\Modules\Invoicing\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class InvoiceItem extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'invoice_id', 'description', 'quantity', 'unit_price', 'tax_rate', 'total',
    ];

    public function casts(): array
    {
        return [
            'quantity' => 'integer',
            'unit_price' => 'float',
            'tax_rate' => 'float',
            'total' => 'float',
        ];
    }

    protected static function boot(): void
    {
        parent::boot();
        static::creating(fn ($model) => $model->id ??= (string) Str::uuid());
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }
}
