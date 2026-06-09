<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

class CrmDealResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                   => $this->id,
            'title'                => $this->title,
            'value'                => $this->value,
            'currency'             => $this->currency,
            'probability'          => $this->probability,
            'stage_id'             => $this->stage_id,
            'pipeline_id'          => $this->pipeline_id,
            'contact'              => $this->whenLoaded('contact'),
            'owner'                => new UserResource($this->whenLoaded('owner')),
            'expected_close_date'  => $this->expected_close_date,
            'won_at'               => $this->won_at,
            'lost_at'              => $this->lost_at,
        ];
    }
}
