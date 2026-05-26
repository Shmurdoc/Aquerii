<?php

namespace App\Modules\Inventory\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'workspace_id', 'category_id', 'name', 'sku', 'barcode',
        'description', 'unit_price', 'unit', 'currency',
        'image_path', 'attributes', 'created_by',
    ];

    protected $casts = [
        'unit_price' => 'decimal:2',
        'attributes' => 'json',
    ];

    public function category()
    {
        return $this->belongsTo(InventoryCategory::class, 'category_id');
    }

    public function stockItems()
    {
        return $this->hasMany(StockItem::class);
    }

    public function totalStock(): int
    {
        return (int) $this->stockItems()
            ->where('status', 'in_stock')
            ->sum('quantity');
    }
}
