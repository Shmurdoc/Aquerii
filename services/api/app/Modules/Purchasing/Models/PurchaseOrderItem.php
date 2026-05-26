<?php

namespace App\Modules\Purchasing\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class PurchaseOrderItem extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false;

    protected $fillable = [
        'purchase_order_id', 'product_id', 'description',
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

    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class);
    }
}
