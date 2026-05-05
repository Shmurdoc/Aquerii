<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

class BoardResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'workspace_id' => $this->workspace_id,
            'name'         => $this->name,
            'description'  => $this->description,
            'board_type'   => $this->board_type,
            'settings'     => $this->settings,
            'is_archived'  => $this->is_archived,
            'position'     => $this->position,
            'created_at'   => $this->created_at,
        ];
    }
}
