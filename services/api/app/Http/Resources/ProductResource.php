<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @property-read \App\Models\Product $resource */
class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->id,
            'name' => $this->resource->name,
            'sku' => $this->resource->sku,
            'description' => $this->resource->description,
            'unit_price' => $this->resource->unit_price,
            'category_id' => $this->resource->category_id,
            'unit' => $this->resource->unit,
            'workspace_id' => $this->resource->workspace_id,
            'created_by' => $this->resource->created_by,
            'created_at' => $this->resource->created_at,
            'updated_at' => $this->resource->updated_at,
        ];
    }
}
