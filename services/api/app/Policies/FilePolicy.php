<?php

namespace App\Policies;

use App\Models\File;
use App\Models\User;
use App\Models\WorkspaceMember;

class FilePolicy
{
    public function view(User $user, File $file): bool
    {
        return $this->isMember($user, $file->workspace_id);
    }

    public function upload(User $user, string $workspaceId): bool
    {
        return $this->isMember($user, $workspaceId);
    }

    public function delete(User $user, File $file): bool
    {
        return $file->uploaded_by === $user->id
            || $this->isAdmin($user, $file->workspace_id);
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
