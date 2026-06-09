<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceMember;

class WorkspacePolicy
{
    public function view(User $user, Workspace $workspace): bool
    {
        return $this->isMember($user, $workspace->id);
    }

    public function update(User $user, Workspace $workspace): bool
    {
        return $this->isAdmin($user, $workspace->id);
    }

    public function delete(User $user, Workspace $workspace): bool
    {
        return $this->isOwner($user, $workspace->id);
    }

    public function manageMembers(User $user, Workspace $workspace): bool
    {
        return $this->isAdmin($user, $workspace->id);
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

    private function isOwner(User $user, string $workspaceId): bool
    {
        return WorkspaceMember::where('workspace_id', $workspaceId)
            ->where('user_id', $user->id)
            ->where('role', 'owner')->exists();
    }
}
