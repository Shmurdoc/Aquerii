<?php

namespace App\Modules\Purchasing\Models;

use App\Core\Models\User;
use App\Core\Models\Workspace;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class PurchaseOrder extends Model
{
    use SoftDeletes;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'workspace_id', 'order_number', 'supplier_id', 'supplier_name', 'supplier_email',
        'status', 'currency', 'subtotal', 'tax_total', 'total',
        'order_date', 'expected_date', 'notes', 'created_by',
    ];

    public function casts(): array
    {
        return [
            'subtotal' => 'float',
            'tax_total' => 'float',
            'total' => 'float',
            'order_date' => 'date',
            'expected_date' => 'date',
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

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(PurchaseOrderItem::class);
    }
}
