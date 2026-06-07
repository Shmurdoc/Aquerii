<?php

namespace App\Modules\CRM\Policies;

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use App\Modules\CRM\Models\CrmDeal;

class CrmDealPolicy
{
    public function viewAny(User $user, Workspace $workspace): bool
    {
        return $this->isMember($user, $workspace->id);
    }

    public function view(User $user, Workspace $workspace, CrmDeal $deal): bool
    {
        return $this->isMember($user, $workspace->id) && $deal->workspace_id === $workspace->id;
    }

    public function create(User $user, Workspace $workspace): bool
    {
        return $this->isMember($user, $workspace->id);
    }

    public function update(User $user, CrmDeal $deal): bool
    {
        return $this->isMember($user, $deal->workspace_id);
    }

    public function delete(User $user, Workspace $workspace, CrmDeal $deal): bool
    {
        return $this->isAdmin($user, $workspace->id) && $deal->workspace_id === $workspace->id;
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
