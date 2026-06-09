<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

class DocumentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'workspace_id'   => $this->workspace_id,
            'folder_id'      => $this->folder_id,
            'title'          => $this->title,
            'created_by'     => new UserResource($this->whenLoaded('creator')),
            'last_edited_by' => $this->last_edited_by,
            'last_edited_at' => $this->last_edited_at,
            'created_at'     => $this->created_at,
        ];
    }
}
