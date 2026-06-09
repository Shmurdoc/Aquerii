<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

class WorkspaceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'name'         => $this->name,
            'slug'         => $this->slug,
            'plan'         => $this->plan,
            'owner_id'     => $this->owner_id,
            'member_count' => $this->members()->count(),
            'created_at'   => $this->created_at,
        ];
    }
}
