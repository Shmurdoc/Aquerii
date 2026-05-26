<?php

namespace App\Modules\CRM\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CrmContactResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'full_name' => $this->full_name,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'email' => $this->email,
            'phone' => $this->phone,
            'lead_score' => $this->lead_score,
            'company_id' => $this->company_id,
            'stage_id' => $this->stage_id,
            'notes' => $this->notes,
            'deal_value' => $this->deal_value,
            'tags' => $this->tags,
            'created_at' => $this->created_at,
        ];
    }
}
