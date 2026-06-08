<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property-read string $id
 * @property-read string $workspace_id
 * @property string $name
 * @property string|null $sku
 * @property string|null $description
 * @property string|null $unit_price
 * @property string|null $category_id
 * @property string|null $unit
 * @property string $created_by
 * @property-read string $created_at
 * @property-read string $updated_at
 */
class Product extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'workspace_id', 'category_id', 'name', 'sku',
        'description', 'unit_price', 'unit', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'unit_price' => 'decimal:2',
        ];
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function stockMovements()
    {
        return $this->hasMany(StockMovement::class);
    }
}
