<?php

namespace App\Core\Observers;

use App\Core\Models\WorkspaceMember;
use App\Modules\Competency\Models\CofRecord;
use App\Modules\Competency\Models\CompetencyRecord;
use App\Modules\Competency\Models\TrainingRecord;

class ComplianceObserver
{
    public function saved(CompetencyRecord|CofRecord|TrainingRecord $record): void
    {
        $this->touchWorker($record);
    }

    public function deleted(CompetencyRecord|CofRecord|TrainingRecord $record): void
    {
        $this->touchWorker($record);
    }

    private function touchWorker(CompetencyRecord|CofRecord|TrainingRecord $record): void
    {
        WorkspaceMember::where('workspace_id', $record->workspace_id)
            ->where('user_id', $record->user_id)
            ->touch();
    }
}
