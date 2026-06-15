<?php

namespace App\Services;

use App\Data\FatigueResult;
use Illuminate\Support\Facades\DB;

class FatigueService
{
    public function check(string $userId, ?string $workspaceId = null): FatigueResult
    {
        $lastClockIn = DB::selectOne('
            SELECT MAX(clocked_in_at) AS last_clock_in
            FROM attendance_logs
            WHERE user_id = ?
        ', [$userId]);

        $absentDays = null;
        if ($lastClockIn?->last_clock_in) {
            $absentDays = now()->diffInDays($lastClockIn->last_clock_in);
        }

        $row = DB::selectOne('
            SELECT COALESCE(SUM(
                EXTRACT(EPOCH FROM COALESCE(clocked_out_at, NOW()) - clocked_in_at)
            ), 0) AS total_seconds
            FROM attendance_logs
            WHERE user_id = ?
            AND clocked_in_at >= NOW() - INTERVAL \'24 hours\'
        ', [$userId]);

        $hours = (float) ($row->total_seconds ?? 0) / 3600;

        $softBlocked = $hours >= 12;
        $hardBlocked = $hours >= 16;

        if ($absentDays !== null && $absentDays >= 30) {
            $softBlocked = true;
        }

        return new FatigueResult(
            hours_worked: round($hours, 2),
            soft_blocked: $softBlocked,
            hard_blocked: $hardBlocked,
            absent_days: $absentDays,
            observation_period: $absentDays !== null && $absentDays >= 30 ? 3 : null,
        );
    }
}
