<?php

namespace App\Modules\Sales\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class SalesOrderItem extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false;

    protected $fillable = [
        'sales_order_id', 'product_id', 'description',
        'quantity', 'unit_price', 'tax_rate', 'total',
    ];

    public function casts(): array
    {
        return [
            'quantity' => 'float',
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

    public function salesOrder(): BelongsTo
    {
        return $this->belongsTo(SalesOrder::class);
    }
}
