<?php

namespace App\Modules\Inventory\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class InventoryCategory extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'workspace_id', 'parent_id', 'name', 'description',
        'color', 'position', 'created_by',
    ];

    protected $casts = [
        'position' => 'integer',
    ];

    public function children()
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    public function parent()
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function products()
    {
        return $this->hasMany(Product::class, 'category_id');
    }
}
