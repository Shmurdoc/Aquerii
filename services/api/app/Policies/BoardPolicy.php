<?php

namespace App\Policies;

use App\Models\Board;
use App\Models\User;
use App\Models\WorkspaceMember;

class BoardPolicy
{
    public function view(User $user, Board $board): bool
    {
        return $this->isMember($user, $board->workspace_id);
    }

    public function create(User $user, string $workspaceId): bool
    {
        return $this->isMember($user, $workspaceId);
    }

    public function update(User $user, Board $board): bool
    {
        return $this->isAdmin($user, $board->workspace_id);
    }

    public function delete(User $user, Board $board): bool
    {
        return $this->isAdmin($user, $board->workspace_id);
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
