<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property-read string $id
 * @property-read string $workspace_id
 * @property string $name
 * @property string|null $description
 * @property string $created_by
 * @property-read string $created_at
 * @property-read string $updated_at
 */
class Category extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'workspace_id', 'name', 'description', 'created_by',
    ];

    public function products()
    {
        return $this->hasMany(Product::class);
    }
}
