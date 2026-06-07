<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'sometimes|string|max:255',
            'sku' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'unit_price' => 'sometimes|numeric|min:0',
            'category_id' => 'nullable|string|exists:categories,id',
            'unit' => 'nullable|string|max:50',
        ];
    }
}
