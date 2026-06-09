<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * @property-read string $id
 * @property-read string $workspace_id
 * @property-read string $product_id
 * @property int $quantity
 * @property string $type
 * @property string|null $reference
 * @property string|null $notes
 * @property string $created_by
 * @property-read string $created_at
 * @property-read string $updated_at
 */
class StockMovement extends Model
{
    use HasUuids;

    protected $fillable = [
        'id', 'workspace_id', 'product_id', 'quantity', 'type',
        'reference', 'notes', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
        ];
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
