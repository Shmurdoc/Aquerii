<?php

namespace App\Policies;

use App\Models\Comment;
use App\Models\User;
use App\Models\WorkspaceMember;

class CommentPolicy
{
    public function view(User $user, Comment $comment): bool
    {
        return $this->isMember($user, $comment->workspace_id);
    }

    public function create(User $user, string $workspaceId): bool
    {
        return $this->isMember($user, $workspaceId);
    }

    public function update(User $user, Comment $comment): bool
    {
        return $comment->user_id === $user->id;
    }

    public function delete(User $user, Comment $comment): bool
    {
        return $comment->user_id === $user->id
            || $this->isAdmin($user, $comment->workspace_id);
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
