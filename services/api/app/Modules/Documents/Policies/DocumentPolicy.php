<?php

namespace App\Modules\Documents\Policies;

use App\Core\Models\User;
use App\Core\Models\WorkspaceMember;
use App\Modules\Documents\Models\Document;

class DocumentPolicy
{
    public function view(User $user, Document $document): bool
    {
        return $this->isMember($user, $document->workspace_id);
    }

    public function create(User $user, string $workspaceId): bool
    {
        return $this->isMember($user, $workspaceId);
    }

    public function update(User $user, Document $document): bool
    {
        if ($this->isAdmin($user, $document->workspace_id)) {
            return true;
        }

        return $document->last_edited_by === $user->id || $document->created_by === $user->id;
    }

    public function delete(User $user, Document $document): bool
    {
        return $this->isAdmin($user, $document->workspace_id);
    }

    private function isMember(User $user, string $workspaceId): bool
    {
        return WorkspaceMember::where('workspace_id', $workspaceId)
            ->where('user_id', $user->id)->exists();
    }

    private function isAdmin(User $user, string $workspaceId): bool
    {
        return WorkspaceMember::where('workspace_id', $workspaceId)
            ->where('user_id', $user->id)
            ->whereIn('role', ['owner', 'admin'])->exists();
    }
}
