<?php

namespace App\Policies;

use App\Models\Automation;
use App\Models\User;
use App\Models\WorkspaceMember;

class AutomationPolicy
{
    public function view(User $user, Automation $automation): bool
    {
        return $this->isMember($user, $automation->workspace_id);
    }

    public function create(User $user, string $workspaceId): bool
    {
        return $this->isAdmin($user, $workspaceId);
    }

    public function update(User $user, Automation $automation): bool
    {
        return $this->isAdmin($user, $automation->workspace_id);
    }

    public function delete(User $user, Automation $automation): bool
    {
        return $this->isAdmin($user, $automation->workspace_id);
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
