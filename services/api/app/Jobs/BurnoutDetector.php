<?php

namespace App\Core\Jobs;

use App\Core\Models\BurnoutScore;
use App\Core\Models\Item;
use App\Core\Models\TeamActivityMetric;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use App\Modules\Chat\Models\ChatMessage;
use Carbon\Carbon;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;

class BurnoutDetector implements ShouldQueue
{
    use Dispatchable, Queueable;

    public function __construct(
        public string $workspaceId,
    ) {}

    public function handle(): void
    {
        $workspace = Workspace::find($this->workspaceId);
        if (! $workspace) {
            return;
        }

        // Get all active members
        $members = WorkspaceMember::where('workspace_id', $this->workspaceId)
            ->where('status', 'active')
            ->whereNotNull('user_id')
            ->pluck('user_id');

        $today = Carbon::today();

        foreach ($members as $userId) {
            $this->collectDailyMetrics($userId, $today);
            $this->calculateBurnoutScore($userId);
        }
    }

    private function collectDailyMetrics(string $userId, Carbon $date): void
    {
        // Skip if already collected today
        $exists = TeamActivityMetric::where('workspace_id', $this->workspaceId)
            ->where('user_id', $userId)
            ->where('date', $date)
            ->exists();

        if ($exists) {
            return;
        }

        // Task metrics
        $tasksAssigned = Item::where('workspace_id', $this->workspaceId)
            ->whereHas('assignees', fn ($q) => $q->where('users.id', $userId))
            ->whereNull('deleted_at')
            ->count();

        $tasksCompleted = Item::where('workspace_id', $this->workspaceId)
            ->whereHas('assignees', fn ($q) => $q->where('users.id', $userId))
            ->where('status', 'done')
            ->whereNull('deleted_at')
            ->count();

        $tasksOverdue = Item::where('workspace_id', $this->workspaceId)
            ->whereHas('assignees', fn ($q) => $q->where('users.id', $userId))
            ->where('status', '!=', 'done')
            ->where('due_date', '<', $date)
            ->whereNull('deleted_at')
            ->count();

        $estimatedHours = Item::where('workspace_id', $this->workspaceId)
            ->whereHas('assignees', fn ($q) => $q->where('users.id', $userId))
            ->whereNull('deleted_at')
            ->whereNotNull('estimated_hours')
            ->sum('estimated_hours');

        $trackedHours = Item::where('workspace_id', $this->workspaceId)
            ->whereHas('assignees', fn ($q) => $q->where('users.id', $userId))
            ->whereNull('deleted_at')
            ->sum('tracked_hours');

        // Chat metrics
        $messagesSent = ChatMessage::where('user_id', $userId)
            ->where('created_at', '>=', $date->startOfDay())
            ->where('created_at', '<=', $date->endOfDay())
            ->count();

        // Simple sentiment (positive/negative word counting)
        $messages = ChatMessage::where('user_id', $userId)
            ->where('created_at', '>=', $date->startOfDay())
            ->where('created_at', '<=', $date->endOfDay())
            ->pluck('body');

        $positiveCount = 0;
        $negativeCount = 0;
        foreach ($messages as $body) {
            $lower = strtolower($body);
            if (preg_match_all('/\b(good|great|awesome|thanks|helpful|done|complete|fixed|solved|happy)\b/', $lower)) {
                $positiveCount++;
            }
            if (preg_match_all('/\b(bad|stuck|broken|error|fail|frustrated|angry|urgent|help|problem|issue)\b/', $lower)) {
                $negativeCount++;
            }
        }

        $sentimentScore = ($positiveCount + $negativeCount) > 0
            ? round(($positiveCount - $negativeCount) / ($positiveCount + $negativeCount), 2)
            : 0;

        // Late night sessions (after 10pm)
        $lateNight = ChatMessage::where('user_id', $userId)
            ->where('created_at', '>=', $date->startOfDay())
            ->where('created_at', '<=', $date->endOfDay())
            ->where('created_at', '>=', $date->copy()->hour(22)->minute(0))
            ->count() > 0 ? 1 : 0;

        // Weekend sessions
        $isWeekend = $date->isSaturday() || $isWeekend = $date->isSunday();
        $weekendActivity = $isWeekend && $messagesSent > 0 ? 1 : 0;

        TeamActivityMetric::create([
            'workspace_id' => $this->workspaceId,
            'user_id' => $userId,
            'date' => $date,
            'active_hours' => max(1, intval($trackedHours)),
            'messages_sent' => $messagesSent,
            'messages_received' => $messagesSent, // approximation
            'tasks_assigned' => $tasksAssigned,
            'tasks_completed' => $tasksCompleted,
            'tasks_overdue' => $tasksOverdue,
            'estimated_hours_total' => $estimatedHours,
            'tracked_hours_total' => $trackedHours,
            'sentiment_score' => $sentimentScore,
            'positive_messages' => $positiveCount,
            'negative_messages' => $negativeCount,
            'late_night_sessions' => $lateNight,
            'weekend_sessions' => $weekendActivity,
            'flagged' => $tasksOverdue > 3 || $lateNight > 0 || $sentimentScore < -0.5,
        ]);
    }

    private function calculateBurnoutScore(string $userId): void
    {
        // Get last 7 days of metrics
        $metrics = TeamActivityMetric::where('workspace_id', $this->workspaceId)
            ->where('user_id', $userId)
            ->where('date', '>=', Carbon::today()->subDays(7))
            ->get();

        if ($metrics->isEmpty()) {
            return;
        }

        $factors = [];

        // Factor 1: Overdue tasks (0-25 points)
        $avgOverdue = $metrics->avg('tasks_overdue');
        $overdueScore = min(25, $avgOverdue * 8);
        $factors['overdue_tasks'] = round($overdueScore, 1);

        // Factor 2: Work hours overload (0-25 points)
        $avgHours = $metrics->avg('active_hours');
        $hoursScore = $avgHours > 8 ? min(25, ($avgHours - 8) * 5) : 0;
        $factors['work_hours'] = round($hoursScore, 1);

        // Factor 3: Late night/weekend work (0-20 points)
        $lateNightDays = $metrics->sum('late_night_sessions');
        $weekendDays = $metrics->sum('weekend_sessions');
        $afterHoursScore = min(20, ($lateNightDays * 8) + ($weekendDays * 5));
        $factors['after_hours'] = round($afterHoursScore, 1);

        // Factor 4: Negative sentiment (0-20 points)
        $avgSentiment = $metrics->avg('sentiment_score');
        $sentimentScore = $avgSentiment < 0 ? min(20, abs($avgSentiment) * 25) : 0;
        $factors['negative_sentiment'] = round($sentimentScore, 1);

        // Factor 5: Task completion rate (0-10 points)
        $totalAssigned = $metrics->sum('tasks_assigned');
        $totalCompleted = $metrics->sum('tasks_completed');
        $completionRate = $totalAssigned > 0 ? $totalCompleted / $totalAssigned : 1;
        $completionScore = $completionRate < 0.5 ? 10 : ($completionRate < 0.7 ? 5 : 0);
        $factors['low_completion'] = round($completionScore, 1);

        // Total score
        $totalScore = array_sum($factors);
        $totalScore = min(100, max(0, $totalScore));

        // Risk level
        $riskLevel = match (true) {
            $totalScore >= 70 => 'critical',
            $totalScore >= 50 => 'high',
            $totalScore >= 30 => 'medium',
            default => 'low',
        };

        // Generate recommendations
        $recommendations = $this->generateRecommendations($factors, $riskLevel);

        BurnoutScore::updateOrCreate(
            ['workspace_id' => $this->workspaceId, 'user_id' => $userId],
            [
                'score' => $totalScore,
                'risk_level' => $riskLevel,
                'factors' => $factors,
                'recommendations' => $recommendations,
                'calculated_at' => now(),
            ]
        );
    }

    private function generateRecommendations(array $factors, string $riskLevel): string
    {
        $recs = [];

        if ($factors['overdue_tasks'] > 10) {
            $recs[] = 'Reassign or reprioritize overdue tasks';
        }
        if ($factors['work_hours'] > 10) {
            $recs[] = 'Reduce workload — team member is consistently over capacity';
        }
        if ($factors['after_hours'] > 10) {
            $recs[] = 'Encourage work-life balance — frequent late night/weekend work detected';
        }
        if ($factors['negative_sentiment'] > 10) {
            $recs[] = 'Schedule a check-in — negative sentiment trend detected';
        }
        if ($factors['low_completion'] > 5) {
            $recs[] = 'Review task assignments — completion rate is below target';
        }

        if ($riskLevel === 'critical') {
            array_unshift($recs, 'URGENT: Immediate intervention recommended');
        }

        return implode("\n", $recs) ?: 'No specific recommendations at this time';
    }
}
