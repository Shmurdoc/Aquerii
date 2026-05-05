<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

class CrmContactResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'         => $this->id,
            'full_name'  => $this->full_name,
            'email'      => $this->email,
            'phone'      => $this->phone,
            'lead_score' => $this->lead_score,
            'company_id' => $this->company_id,
            'tags'       => $this->tags,
            'created_at' => $this->created_at,
        ];
    }
}
