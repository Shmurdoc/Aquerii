<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

class CommentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'        => $this->id,
            'item_id'   => $this->item_id,
            'body'      => $this->body,
            'author'    => new UserResource($this->whenLoaded('author')),
            'edited_at' => $this->edited_at,
            'created_at'=> $this->created_at,
        ];
    }
}
