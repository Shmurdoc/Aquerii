<?php

namespace App\Modules\Marketing\Services;

use App\Modules\Marketing\Models\Campaign;
use App\Modules\Marketing\Models\CampaignAudience;

class CampaignService
{
    public function buildAudience(Campaign $campaign, array $contactIds): void
    {
        $existing = CampaignAudience::where('campaign_id', $campaign->id)
            ->whereIn('contact_id', $contactIds)
            ->pluck('contact_id')
            ->toArray();

        $new = array_diff($contactIds, $existing);

        $rows = array_map(fn ($id) => [
            'campaign_id' => $campaign->id,
            'contact_id' => $id,
            'status' => 'queued',
            'created_at' => now(),
            'updated_at' => now(),
        ], $new);

        CampaignAudience::insert($rows);
    }

    public function calculatePerformance(Campaign $campaign): array
    {
        $total = $campaign->sent_count ?: 1;

        return [
            'open_rate' => $total > 0 ? round(($campaign->opened_count / $total) * 100, 1) : 0,
            'click_rate' => $total > 0 ? round(($campaign->clicked_count / $total) * 100, 1) : 0,
            'conversion_rate' => $total > 0 ? round(($campaign->converted_count / $total) * 100, 1) : 0,
            'roi' => $campaign->budget && $campaign->budget > 0
                ? round((($campaign->converted_count * 100) - $campaign->actual_spend) / $campaign->budget * 100, 1) : null,
        ];
    }
}
