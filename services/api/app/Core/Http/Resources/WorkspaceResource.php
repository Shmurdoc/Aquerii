<?php

namespace App\Core\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

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
            // Branding
            'logo_url'     => $this->logo_url,
            'cover_url'    => $this->cover_url,
            'color'        => $this->color,
            'icon'         => $this->icon,
            'settings'     => $this->settings ?? [],
            'created_at'   => $this->created_at,
        ];
    }
}
