<?php

namespace App\Modules\CRM\Services;

use App\Modules\CRM\Models\CrmContact;
use Illuminate\Support\Collection;

class DuplicateDetectionService
{
    public function findDuplicates(CrmContact $contact, float $threshold = 0.8): Collection
    {
        $candidates = collect();
        $workspaceId = $contact->workspace_id;

        if ($contact->email) {
            $emailMatches = CrmContact::where('workspace_id', $workspaceId)
                ->where('email', $contact->email)
                ->where('id', '!=', $contact->id)
                ->get();
            $candidates = $candidates->merge($emailMatches->map(fn ($c) => [
                'contact' => $c,
                'score' => 1.0,
                'match_on' => ['email'],
            ]));
        }

        if ($contact->phone) {
            $phoneMatches = CrmContact::where('workspace_id', $workspaceId)
                ->where('phone', $contact->phone)
                ->where('id', '!=', $contact->id)
                ->get();
            $candidates = $candidates->merge($phoneMatches->map(fn ($c) => [
                'contact' => $c,
                'score' => 0.95,
                'match_on' => ['phone'],
            ]));
        }

        if ($contact->first_name && $contact->last_name) {
            $nameMatches = CrmContact::where('workspace_id', $workspaceId)
                ->where('first_name', 'ilike', $contact->first_name)
                ->where('last_name', 'ilike', $contact->last_name)
                ->where('id', '!=', $contact->id)
                ->get();
            $candidates = $candidates->merge($nameMatches->map(fn ($c) => [
                'contact' => $c,
                'score' => 0.7,
                'match_on' => ['name'],
            ]));
        }

        return $candidates
            ->unique(fn ($item) => $item['contact']->id)
            ->filter(fn ($item) => $item['score'] >= $threshold)
            ->sortByDesc('score')
            ->values();
    }

    public function mergeContacts(CrmContact $primary, CrmContact $duplicate): CrmContact
    {
        if ($primary->id === $duplicate->id) {
            return $primary;
        }

        $primary->fill([
            'email' => $primary->email ?? $duplicate->email,
            'phone' => $primary->phone ?? $duplicate->phone,
            'job_title' => $primary->job_title ?? $duplicate->job_title,
            'company_id' => $primary->company_id ?? $duplicate->company_id,
            'notes' => trim(($primary->notes ?? '') . "\n\n[Merged from duplicate] " . ($duplicate->notes ?? '')),
            'lead_score' => max($primary->lead_score ?? 0, $duplicate->lead_score ?? 0),
        ]);
        $primary->save();

        $duplicate->deals()->syncWithoutDetaching($duplicate->deals->pluck('id')->toArray());

        CrmContactStageHistory::where('contact_id', $duplicate->id)
            ->update(['contact_id' => $primary->id]);

        $duplicate->delete();

        return $primary->fresh();
    }

    public function scanWorkspaceDuplicates(string $workspaceId, float $threshold = 0.8): Collection
    {
        $contacts = CrmContact::where('workspace_id', $workspaceId)->get();
        $duplicates = collect();

        foreach ($contacts as $contact) {
            $founds = $this->findDuplicates($contact, $threshold);
            foreach ($founds as $found) {
                $duplicates->push([
                    'primary' => $contact,
                    'duplicate' => $found['contact'],
                    'score' => $found['score'],
                    'match_on' => $found['match_on'],
                ]);
            }
        }

        return $duplicates->unique(fn ($item) => collect([$item['primary']->id, $item['duplicate']->id])->sort()->implode('-'));
    }
}
