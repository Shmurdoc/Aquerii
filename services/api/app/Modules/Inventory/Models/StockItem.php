<?php

namespace App\Modules\Inventory\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class StockItem extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'workspace_id', 'product_id', 'lot_number', 'serial_number',
        'quantity', 'location', 'expiry_date', 'status', 'created_by',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'expiry_date' => 'date',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
