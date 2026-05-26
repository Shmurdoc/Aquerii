<?php

namespace App\Modules\CRM\Models;

use App\Core\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class CrmProduct extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'crm_products';

    protected $fillable = [
        'workspace_id', 'name', 'description', 'sku',
        'unit_price', 'currency', 'category', 'attributes',
        'image_url', 'is_active', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'unit_price'  => 'decimal:2',
            'attributes'  => 'array',
            'is_active'   => 'boolean',
        ];
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
