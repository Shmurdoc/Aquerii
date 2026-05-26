<?php

namespace App\Core\Http\Resources;

use Illuminate\Http\Request;

class BoardResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'workspace_id' => $this->workspace_id,
            'name' => $this->name,
            'description' => $this->description,
            'icon' => $this->icon,
            'color' => $this->color,
            'board_type' => $this->board_type,
            'settings' => $this->settings,
            'excalidraw_state' => $this->excalidraw_state,
            'is_archived' => $this->is_archived,
            'position' => $this->position,
            'created_at' => $this->created_at,
        ];
    }
}
