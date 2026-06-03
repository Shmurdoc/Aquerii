<?php

namespace App\Modules\PTW\Services;

use App\Core\Models\User;
use App\Core\Services\AuditService;
use App\Modules\PTW\Models\Permit;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * State machine for permits.
 *
 * Encodes legal status transitions and the role required to perform each
 * one. Every transition is applied inside a DB transaction with `lockForUpdate`
 * so two concurrent requests cannot race the permit into an inconsistent state.
 *
 * Roles are derived from the user's workspace membership pivot (`role`):
 *   - owner / admin: full PTW authority
 *   - member:        can be the holder/recipient of a permit assigned to them
 *   - viewer:        read-only
 */
class PermitWorkflowService
{
    public const TRANSITION_REQUEST = 'request';

    public const TRANSITION_APPROVE = 'approve';

    public const TRANSITION_REJECT = 'reject';

    public const TRANSITION_ISSUE = 'issue';

    public const TRANSITION_ACTIVATE = 'activate';

    public const TRANSITION_SUSPEND = 'suspend';

    public const TRANSITION_RESUME = 'resume';

    public const TRANSITION_CLOSE = 'close';

    public function __construct(
        private AuditService $audit,
    ) {}

    /**
     * Apply a transition to a permit.
     *
     * @param  string  $action  one of the TRANSITION_* constants
     * @param  string|null  $reason  required for suspend/reject; closure notes for close
     * @param  array<string,mixed>  $meta  extra fields to write to the permit
     *                                     (e.g. valid_from, valid_until, approver_id)
     */
    public function transition(
        Permit $permit,
        string $action,
        User $user,
        ?string $reason = null,
        array $meta = []
    ): Permit {
        $from = $permit->status;
        $to = $this->resolveTarget($action);

        $this->assertTransitionAllowed($permit, $from, $to, $action, $user, $reason);
        $this->assertRoleAllowed($permit, $action, $user);

        return DB::transaction(function () use ($permit, $action, $user, $reason, $meta, $from) {
            $locked = Permit::where('id', $permit->id)->lockForUpdate()->first();
            if ($locked === null) {
                throw ValidationException::withMessages([
                    'permit' => 'Permit no longer exists.',
                ]);
            }

            $updates = $this->buildUpdates($action, $reason, $meta);
            $locked->fill($updates);
            $locked->status = $this->resolveTarget($action);
            $locked->save();
            $locked->refresh();

            $this->audit->log(
                action: "ptw.permit.{$action}",
                workspaceId: $locked->workspace_id,
                userId: $user->id,
                resourceType: 'permit',
                resourceId: $locked->id,
                before: ['status' => $from],
                after: ['status' => $locked->status] + $locked->only(array_keys($updates)),
                meta: array_filter([
                    'reference' => $locked->reference,
                    'reason' => $reason,
                    'actor_role' => $this->roleFor($user, $locked),
                ], fn ($v) => $v !== null),
            );

            return $locked;
        });
    }

    public function canTransition(Permit $permit, string $action, User $user, ?string $reason = null): bool
    {
        try {
            $from = $permit->status;
            $to = $this->resolveTarget($action);
            $this->assertTransitionAllowed($permit, $from, $to, $action, $user, $reason);
            $this->assertRoleAllowed($permit, $action, $user);
        } catch (ValidationException) {
            return false;
        }

        return true;
    }

    public function availableTransitions(Permit $permit, User $user): array
    {
        $out = [];
        foreach ([
            self::TRANSITION_REQUEST, self::TRANSITION_APPROVE, self::TRANSITION_REJECT,
            self::TRANSITION_ISSUE, self::TRANSITION_ACTIVATE, self::TRANSITION_SUSPEND,
            self::TRANSITION_RESUME, self::TRANSITION_CLOSE,
        ] as $action) {
            if ($this->canTransition($permit, $action, $user)) {
                $out[] = $action;
            }
        }

        return $out;
    }

    private function resolveTarget(string $action): string
    {
        return match ($action) {
            self::TRANSITION_REQUEST => Permit::STATUS_REQUESTED,
            self::TRANSITION_APPROVE => Permit::STATUS_APPROVED,
            self::TRANSITION_REJECT => Permit::STATUS_REJECTED,
            self::TRANSITION_ISSUE => Permit::STATUS_ISSUED,
            self::TRANSITION_ACTIVATE => Permit::STATUS_ACTIVE,
            self::TRANSITION_SUSPEND => Permit::STATUS_SUSPENDED,
            self::TRANSITION_RESUME => Permit::STATUS_ACTIVE,
            self::TRANSITION_CLOSE => Permit::STATUS_CLOSED,
            default => throw new \InvalidArgumentException("Unknown action: {$action}"),
        };
    }

    private function assertTransitionAllowed(
        Permit $permit,
        string $from,
        string $to,
        string $action,
        User $user,
        ?string $reason
    ): void {
        $legal = match ($action) {
            self::TRANSITION_REQUEST => $from === Permit::STATUS_DRAFT,
            self::TRANSITION_APPROVE => $from === Permit::STATUS_REQUESTED,
            self::TRANSITION_REJECT => $from === Permit::STATUS_REQUESTED,
            self::TRANSITION_ISSUE => $from === Permit::STATUS_APPROVED,
            self::TRANSITION_ACTIVATE => $from === Permit::STATUS_ISSUED,
            self::TRANSITION_SUSPEND => $from === Permit::STATUS_ACTIVE,
            self::TRANSITION_RESUME => $from === Permit::STATUS_SUSPENDED,
            self::TRANSITION_CLOSE => in_array($from, [
                Permit::STATUS_ACTIVE, Permit::STATUS_SUSPENDED, Permit::STATUS_EXPIRED,
            ], true),
            default => false,
        };

        if (! $legal) {
            throw ValidationException::withMessages([
                'status' => "Cannot {$action} a permit in status '{$from}'.",
            ]);
        }

        if (in_array($action, [self::TRANSITION_REJECT, self::TRANSITION_SUSPEND], true)
            && (trim((string) $reason) === '')) {
            throw ValidationException::withMessages([
                'reason' => ucfirst(str_replace('_', ' ', $action)).' requires a reason.',
            ]);
        }

        if ($action === self::TRANSITION_ACTIVATE && $permit->isExpired()) {
            throw ValidationException::withMessages([
                'valid_until' => 'Cannot activate an expired permit. Issue a new one.',
            ]);
        }
    }

    private function assertRoleAllowed(Permit $permit, string $action, User $user): void
    {
        $role = $this->roleFor($user, $permit);
        $isOwnerLike = in_array($role, ['owner', 'admin'], true);
        $isIssuer = $isOwnerLike || (string) $user->id === (string) $permit->issuer_id;
        $isApprover = $isOwnerLike;
        $isHolder = (string) $user->id === (string) $permit->holder_id;

        $allowed = match ($action) {
            self::TRANSITION_REQUEST => $isIssuer,
            self::TRANSITION_APPROVE, self::TRANSITION_REJECT => $isApprover,
            self::TRANSITION_ISSUE => $isIssuer,
            self::TRANSITION_ACTIVATE => $isHolder || $isOwnerLike,
            self::TRANSITION_SUSPEND => $isIssuer || $isHolder,
            self::TRANSITION_RESUME => $isIssuer,
            self::TRANSITION_CLOSE => $isIssuer,
            default => false,
        };

        if (! $allowed) {
            throw ValidationException::withMessages([
                'actor' => "Your role ({$role}) is not permitted to perform '{$action}'.",
            ]);
        }
    }

    private function roleFor(User $user, Permit $permit): string
    {
        $member = $user->workspaces()
            ->where('workspace_id', $permit->workspace_id)
            ->first();

        return $member?->pivot?->role ?? 'none';
    }

    private function buildUpdates(string $action, ?string $reason, array $meta): array
    {
        $now = ['updated_at' => now()];

        return match ($action) {
            self::TRANSITION_REQUEST => $now + ['requested_at' => now()],
            self::TRANSITION_APPROVE => $now + [
                'approved_at' => now(),
                'rejection_reason' => null,
            ],
            self::TRANSITION_REJECT => $now + [
                'rejection_reason' => $reason,
                'approved_at' => null,
            ],
            self::TRANSITION_ISSUE => $now + [
                'issued_at' => now(),
                'valid_from' => $meta['valid_from'] ?? now(),
                'valid_until' => $meta['valid_until'] ?? now()->addHours(8),
                'max_extension_minutes' => $meta['max_extension_minutes'] ?? 60,
            ],
            self::TRANSITION_ACTIVATE => $now + ['activated_at' => now()],
            self::TRANSITION_SUSPEND => $now + [
                'suspended_at' => now(),
                'suspension_reason' => $reason,
            ],
            self::TRANSITION_RESUME => $now + [
                'suspended_at' => null,
                'suspension_reason' => null,
            ],
            self::TRANSITION_CLOSE => $now + [
                'closed_at' => now(),
                'closure_notes' => $reason,
            ],
            default => $now,
        };
    }
}
