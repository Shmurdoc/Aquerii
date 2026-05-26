<?php

namespace App\Modules\Automation\Policies;

use App\Core\Models\User;
use App\Core\Models\WorkspaceMember;
use App\Modules\Automation\Models\Automation;

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
