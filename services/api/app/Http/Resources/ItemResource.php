<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

class ItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'          => $this->id,
            'board_id'    => $this->board_id,
            'group_id'    => $this->group_id,
            'title'       => $this->title,
            'description' => $this->description,
            'status'      => $this->status,
            'priority'    => $this->priority,
            'assignees'   => UserResource::collection($this->whenLoaded('assignees')),
            'due_date'    => $this->due_date,
            'position'    => $this->position,
            'version'     => $this->version,
            'created_at'  => $this->created_at,
            'updated_at'  => $this->updated_at,
        ];
    }
}
