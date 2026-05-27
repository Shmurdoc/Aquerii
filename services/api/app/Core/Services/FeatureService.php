<?php

namespace App\Core\Services;

use App\Core\Enums\SubscriptionPlan;
use App\Core\Models\FeatureFlag;
use App\Core\Models\Workspace;

class FeatureService
{
    private array $overrides = [];

    public function __construct(?Workspace $workspace = null)
    {
        if ($workspace) {
            $this->loadOverrides($workspace);
        }
    }

    public function isEnabled(string $featureKey, Workspace $workspace): bool
    {
        if (isset($this->overrides[$featureKey])) {
            return $this->overrides[$featureKey];
        }

        $globalFlag = FeatureFlag::isEnabled($featureKey, $workspace->id);

        if (! $globalFlag) {
            return false;
        }

        $plan = SubscriptionPlan::fromWorkspace($workspace);

        return $plan->hasFeature($featureKey);
    }

    public function assertEnabled(string $featureKey, Workspace $workspace): void
    {
        if (! $this->isEnabled($featureKey, $workspace)) {
            abort(402, __('Feature not available on your plan.'));
        }
    }

    public function setOverride(string $key, bool $value): void
    {
        $this->overrides[$key] = $value;
    }

    private function loadOverrides(Workspace $workspace): void
    {
        if (empty($workspace->settings['feature_overrides'])) {
            return;
        }

        foreach ($workspace->settings['feature_overrides'] as $key => $value) {
            $this->overrides[$key] = (bool) $value;
        }
    }
}
