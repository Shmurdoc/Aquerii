<?php

namespace App\Policies;

use App\Models\Item;
use App\Models\User;
use App\Models\WorkspaceMember;

class ItemPolicy
{
    public function view(User $user, Item $item): bool
    {
        return $this->isMember($user, $item->workspace_id);
    }

    public function create(User $user, string $workspaceId): bool
    {
        return $this->isMember($user, $workspaceId);
    }

    public function update(User $user, Item $item): bool
    {
        if ($this->isAdmin($user, $item->workspace_id)) {
            return true;
        }
        // Assignee check
        return $item->assignees()->where('user_id', $user->id)->exists();
    }

    public function delete(User $user, Item $item): bool
    {
        return $this->isAdmin($user, $item->workspace_id);
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
