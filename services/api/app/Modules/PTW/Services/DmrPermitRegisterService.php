<?php

namespace App\Modules\PTW\Services;

use App\Modules\PTW\Models\Permit;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Department of Mineral Resources (DMR) Permit Register.
 *
 * South African mines are required to maintain a register of all permits
 * issued for high-risk work (MHSA Section 11). The register must be
 * available for inspection by Principal Inspectors of Mines.
 *
 * Output is structured JSON; callers (e.g. a future export endpoint) can
 * serialise to CSV/XLSX without re-traversing relationships.
 */
class DmrPermitRegisterService
{
    public function buildRegister(string $workspaceId, ?Carbon $from = null, ?Carbon $to = null): array
    {
        $query = Permit::with([
            'issuer:id,name', 'approver:id,name', 'holder:id,name', 'recipient:id,name',
            'closer:id,name', 'hazards', 'isolations',
        ])
            ->where('workspace_id', $workspaceId)
            ->whereIn('status', [
                Permit::STATUS_APPROVED, Permit::STATUS_ISSUED,
                Permit::STATUS_ACTIVE, Permit::STATUS_SUSPENDED,
                Permit::STATUS_CLOSED, Permit::STATUS_EXPIRED,
            ]);

        if ($from) {
            $query->where(function ($q) use ($from) {
                $q->where('issued_at', '>=', $from)
                    ->orWhere('approved_at', '>=', $from)
                    ->orWhere('created_at', '>=', $from);
            });
        }
        if ($to) {
            $query->where('created_at', '<=', $to);
        }

        $permits = $query->orderByDesc('created_at')->get();

        return [
            'register' => [
                'authority' => 'Department of Mineral Resources (DMR)',
                'regulation' => 'Mineral and Petroleum Resources Development Act 28 of 2002, Section 11',
                'generated_at' => now()->toIso8601String(),
                'workspace_id' => $workspaceId,
                'period' => [
                    'from' => $from?->toDateString(),
                    'to' => $to?->toDateString(),
                ],
                'summary' => $this->summarise($permits),
                'permits' => $permits->map(fn (Permit $p) => $this->serialisePermit($p))->all(),
            ],
        ];
    }

    public function toCsv(array $register): string
    {
        $rows = [];

        $rows[] = [
            'Reference', 'Type', 'Status', 'Risk', 'Title', 'Location',
            'Issuer', 'Approver', 'Holder', 'Recipient',
            'Issued At', 'Activated At', 'Closed At',
            'Hazard Count', 'Isolation Count', 'Closure Notes',
        ];

        foreach ($register['register']['permits'] as $p) {
            $rows[] = [
                $p['reference'],
                $p['type'],
                $p['status'],
                $p['risk_level'],
                $p['title'],
                $p['location'],
                $p['issuer']['name'] ?? '',
                $p['approver']['name'] ?? '',
                $p['holder']['name'] ?? '',
                $p['recipient']['name'] ?? '',
                $p['issued_at'] ?? '',
                $p['activated_at'] ?? '',
                $p['closed_at'] ?? '',
                count($p['hazards']),
                count($p['isolations']),
                $p['closure_notes'] ?? '',
            ];
        }

        $out = fopen('php://temp', 'r+');
        foreach ($rows as $r) {
            fputcsv($out, $r);
        }
        rewind($out);
        $csv = stream_get_contents($out);
        fclose($out);

        return $csv ?: '';
    }

    private function summarise(Collection $permits): array
    {
        return [
            'total' => $permits->count(),
            'by_type' => $permits->groupBy('type')
                ->map(fn ($g) => $g->count())->all(),
            'by_status' => $permits->groupBy('status')
                ->map(fn ($g) => $g->count())->all(),
            'high_risk_count' => $permits->filter(fn (Permit $p) => $p->isHighRisk())->count(),
            'active_count' => $permits->where('status', Permit::STATUS_ACTIVE)->count(),
            'suspended_count' => $permits->where('status', Permit::STATUS_SUSPENDED)->count(),
            'closed_count' => $permits->where('status', Permit::STATUS_CLOSED)->count(),
        ];
    }

    private function serialisePermit(Permit $p): array
    {
        return [
            'id' => $p->id,
            'reference' => $p->reference,
            'type' => $p->type,
            'is_high_risk' => $p->isHighRisk(),
            'status' => $p->status,
            'risk_level' => $p->risk_level,
            'title' => $p->title,
            'description' => $p->description,
            'location' => $p->location,
            'location_details' => $p->location_details,
            'equipment_id' => $p->equipment_id,
            'issuer' => $p->issuer ? ['id' => $p->issuer->id, 'name' => $p->issuer->name] : null,
            'approver' => $p->approver ? ['id' => $p->approver->id, 'name' => $p->approver->name] : null,
            'holder' => $p->holder ? ['id' => $p->holder->id, 'name' => $p->holder->name] : null,
            'recipient' => $p->recipient ? ['id' => $p->recipient->id, 'name' => $p->recipient->name] : null,
            'closer' => $p->closer ? ['id' => $p->closer->id, 'name' => $p->closer->name] : null,
            'valid_from' => $p->valid_from?->toIso8601String(),
            'valid_until' => $p->valid_until?->toIso8601String(),
            'max_extension_minutes' => $p->max_extension_minutes,
            'extensions_used_minutes' => $p->extensions_used_minutes,
            'pre_conditions' => $p->pre_conditions,
            'work_method_statement' => $p->work_method_statement,
            'ppe_required' => $p->ppe_required,
            'requested_at' => $p->requested_at?->toIso8601String(),
            'approved_at' => $p->approved_at?->toIso8601String(),
            'issued_at' => $p->issued_at?->toIso8601String(),
            'activated_at' => $p->activated_at?->toIso8601String(),
            'suspended_at' => $p->suspended_at?->toIso8601String(),
            'closed_at' => $p->closed_at?->toIso8601String(),
            'closure_notes' => $p->closure_notes,
            'rejection_reason' => $p->rejection_reason,
            'suspension_reason' => $p->suspension_reason,
            'hazards' => $p->hazards->map(fn ($h) => [
                'description' => $h->description,
                'control_measure' => $h->control_measure,
                'residual_risk' => $h->residual_risk,
                'verified' => (bool) $h->verified,
            ])->all(),
            'isolations' => $p->isolations->map(fn ($i) => [
                'isolation_point' => $i->isolation_point,
                'energy_type' => $i->energy_type,
                'method' => $i->method,
                'lock_number' => $i->lock_number,
                'tag_number' => $i->tag_number,
                'applied_at' => $i->applied_at?->toIso8601String(),
                'removed_at' => $i->removed_at?->toIso8601String(),
            ])->all(),
        ];
    }
}
