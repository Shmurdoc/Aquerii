<?php

namespace App\Core\Console\Commands;

use App\Core\Models\User;
use App\Core\Models\WorkspaceMember;
use App\Modules\Competency\Models\CofRecord;
use App\Modules\Competency\Models\CompetencyRecord;
use App\Notifications\CertExpiryNotification;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CheckCertExpiry extends Command
{
    protected $signature = 'app:check-cert-expiry';

    protected $description = 'Check certificate expiry dates and send tiered notifications (90/30/7/0 days)';

    public function handle(): int
    {
        $now = now()->startOfDay();
        $this->processRecords('competency', CompetencyRecord::class, $now);
        $this->processRecords('cof', CofRecord::class, $now);

        return self::SUCCESS;
    }

    private function processRecords(string $recordType, string $modelClass, Carbon $now): void
    {
        $records = $modelClass::whereNotNull('expires_at')
            ->whereNull('deleted_at')
            ->get();

        foreach ($records as $record) {
            $expiresAt = $record->expires_at instanceof Carbon
                ? $record->expires_at->copy()->startOfDay()
                : Carbon::parse($record->expires_at)->startOfDay();

            $daysUntilExpiry = (int) $now->diffInDays($expiresAt, false);

            $tier = $this->determineTier($daysUntilExpiry);

            if ($tier === null) {
                continue;
            }

            if ($this->alreadyNotified($recordType, $record->id, $tier)) {
                continue;
            }

            $workers = WorkspaceMember::where('user_id', $record->user_id)
                ->where('workspace_id', $record->workspace_id)
                ->where('status', 'active')
                ->get();

            if ($workers->isEmpty()) {
                continue;
            }

            $worker = $workers->first();
            $workerUser = User::find($record->user_id);
            $workerName = $workerUser?->name ?? 'Unknown Worker';

            $certName = $recordType === 'competency'
                ? ($record->competencyType?->name ?? 'Competency')
                : $record->type ?? 'Certificate of Fitness';

            $notifiedUserIds = [];

            $parties = $this->getNotificationParties($record->workspace_id, $worker, $tier);

            foreach ($parties as $party) {
                $user = $party['user'];
                if (! $user) {
                    continue;
                }

                $notification = new CertExpiryNotification(
                    workerName: $workerName,
                    certType: $recordType === 'competency' ? 'Competency' : 'Certificate of Fitness',
                    certName: $certName,
                    daysRemaining: max(0, $daysUntilExpiry),
                    recordType: $recordType,
                    recordId: $record->id,
                );

                $user->notify($notification);
                $notifiedUserIds[] = $user->id;
            }

            if ($daysUntilExpiry <= 0) {
                WorkspaceMember::where('user_id', $record->user_id)
                    ->where('workspace_id', $record->workspace_id)
                    ->where('status', 'active')
                    ->update(['overall_compliance_status' => 'non_compliant']);

                $this->info("Flipped worker {$record->user_id} to non_compliant in workspace {$record->workspace_id}");
            }

            $this->logNotification($recordType, $record, $tier, $notifiedUserIds);
        }
    }

    private function determineTier(int $daysUntilExpiry): ?string
    {
        if ($daysUntilExpiry <= 0) {
            return '0';
        }
        if ($daysUntilExpiry <= 7) {
            return '7';
        }
        if ($daysUntilExpiry <= 30) {
            return '30';
        }
        if ($daysUntilExpiry <= 90) {
            return '90';
        }

        return null;
    }

    private function alreadyNotified(string $recordType, string $recordId, string $tier): bool
    {
        return DB::table('cert_notification_logs')
            ->where('record_type', $recordType)
            ->where('record_id', $recordId)
            ->where('tier', $tier)
            ->exists();
    }

    private function getNotificationParties(string $workspaceId, WorkspaceMember $worker, string $tier): array
    {
        $parties = [];

        $hsseRoleIds = DB::table('roles')
            ->where('name', 'contractor_hsse_officer')
            ->where('workspace_id', $workspaceId)
            ->pluck('id');

        $adminRoleIds = DB::table('roles')
            ->where('name', 'contractor_admin')
            ->where('workspace_id', $workspaceId)
            ->pluck('id');

        $hsseUserIds = [];
        if ($hsseRoleIds->isNotEmpty()) {
            $hsseUserIds = DB::table('model_has_roles')
                ->whereIn('role_id', $hsseRoleIds)
                ->pluck('model_id');
        }

        $adminUserIds = [];
        if ($adminRoleIds->isNotEmpty()) {
            $adminUserIds = DB::table('model_has_roles')
                ->whereIn('role_id', $adminRoleIds)
                ->pluck('model_id');
        }

        if ($tier === '90') {
            foreach ($hsseUserIds as $uid) {
                $user = User::find($uid);
                if ($user) {
                    $parties[] = ['user' => $user, 'role' => 'hsse_officer'];
                }
            }
        }

        if ($tier === '30') {
            foreach ($hsseUserIds as $uid) {
                $user = User::find($uid);
                if ($user) {
                    $parties[] = ['user' => $user, 'role' => 'hsse_officer'];
                }
            }
            foreach ($adminUserIds as $uid) {
                $user = User::find($uid);
                if ($user) {
                    $parties[] = ['user' => $user, 'role' => 'contractor_admin'];
                }
            }
        }

        if ($tier === '7') {
            if ($worker->reports_to) {
                $supervisor = User::find(
                    WorkspaceMember::where('id', $worker->reports_to)->value('user_id')
                );
                if ($supervisor) {
                    $parties[] = ['user' => $supervisor, 'role' => 'supervisor'];
                }
            }

            foreach ($hsseUserIds as $uid) {
                $user = User::find($uid);
                if ($user) {
                    $parties[] = ['user' => $user, 'role' => 'hsse_officer'];
                }
            }
        }

        if ($tier === '0') {
            foreach ($hsseUserIds as $uid) {
                $user = User::find($uid);
                if ($user) {
                    $parties[] = ['user' => $user, 'role' => 'hsse_officer'];
                }
            }
            foreach ($adminUserIds as $uid) {
                $user = User::find($uid);
                if ($user) {
                    $parties[] = ['user' => $user, 'role' => 'contractor_admin'];
                }
            }
            if ($worker->reports_to) {
                $supervisor = User::find(
                    WorkspaceMember::where('id', $worker->reports_to)->value('user_id')
                );
                if ($supervisor) {
                    $parties[] = ['user' => $supervisor, 'role' => 'supervisor'];
                }
            }
        }

        return $parties;
    }

    private function logNotification(string $recordType, $record, string $tier, array $notifiedUserIds): void
    {
        DB::table('cert_notification_logs')->insert([
            'id' => (string) Str::uuid(),
            'workspace_id' => $record->workspace_id,
            'record_type' => $recordType,
            'record_id' => $record->id,
            'tier' => $tier,
            'notified_user_ids' => json_encode($notifiedUserIds),
            'expires_at' => $record->expires_at,
            'notified_at' => now(),
        ]);
    }
}
