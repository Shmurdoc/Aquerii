<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Workspace;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Log;

class AIController extends Controller
{
    // POST /workspaces/{workspace}/ai/chat
    public function chat(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate([
            'message'     => 'required|string|max:8000',
            'history'     => 'sometimes|array',
            'context_ids' => 'sometimes|array',
        ]);

        $this->deductCredits($workspace, 5);

        try {
            $response = Http::withToken(config('services.ai.internal_token'))
                ->timeout(60)
                ->post(config('services.ai.base_url') . '/chat', [
                    'workspace_id' => $workspace->id,
                    'message'      => $validated['message'],
                    'history'      => $validated['history'] ?? [],
                    'context_ids'  => $validated['context_ids'] ?? [],
                ]);

            if ($response->failed()) {
                $this->refundCredits($workspace, 5);
                return response()->json(['error' => 'AI service error'], 502);
            }

            return response()->json(['data' => $response->json('data')]);
        } catch (\Throwable $e) {
            $this->refundCredits($workspace, 5);
            Log::error('AI chat error', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'AI unavailable'], 503);
        }
    }

    // POST /workspaces/{workspace}/ai/summarize
    public function summarize(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate([
            'text' => 'required|string|max:20000',
        ]);

        $this->deductCredits($workspace, 3);

        try {
            $response = Http::withToken(config('services.ai.internal_token'))
                ->timeout(30)
                ->post(config('services.ai.base_url') . '/documents/summarize', [
                    'workspace_id' => $workspace->id,
                    'text'         => $validated['text'],
                ]);

            if ($response->failed()) {
                $this->refundCredits($workspace, 3);
                return response()->json(['error' => 'AI service error'], 502);
            }

            return response()->json(['data' => $response->json('data')]);
        } catch (\Throwable $e) {
            $this->refundCredits($workspace, 3);
            return response()->json(['error' => 'AI unavailable'], 503);
        }
    }

    // POST /workspaces/{workspace}/ai/score-deal
    public function scoreDeal(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate([
            'deal_id' => 'required|uuid',
        ]);

        $this->deductCredits($workspace, 10);

        try {
            $response = Http::withToken(config('services.ai.internal_token'))
                ->timeout(30)
                ->post(config('services.ai.base_url') . '/crm/score', [
                    'workspace_id' => $workspace->id,
                    'deal_id'      => $validated['deal_id'],
                ]);

            if ($response->failed()) {
                $this->refundCredits($workspace, 10);
                return response()->json(['error' => 'AI service error'], 502);
            }

            $score = $response->json('data.score');

            // Persist score back to deal
            \Illuminate\Support\Facades\DB::table('crm_deals')
                ->where('id', $validated['deal_id'])
                ->where('workspace_id', $workspace->id)
                ->update(['ai_score' => $score, 'updated_at' => now()]);

            return response()->json(['data' => ['score' => $score]]);
        } catch (\Throwable $e) {
            $this->refundCredits($workspace, 10);
            return response()->json(['error' => 'AI unavailable'], 503);
        }
    }

    // GET /workspaces/{workspace}/ai/credits
    public function credits(Workspace $workspace): JsonResponse
    {
        $plan   = $workspace->plan ?? 'free';
        $limits = ['free' => 100, 'starter' => 500, 'growth' => 2000, 'business' => 10000];
        $limit  = $limits[$plan] ?? 100;

        $used = (int) Redis::get("ai_credits:{$workspace->id}") ?? 0;

        return response()->json([
            'data' => [
                'used'      => $used,
                'limit'     => $limit,
                'remaining' => max(0, $limit - $used),
            ],
        ]);
    }

    // ─── Helpers ───────────────────────────────────────────────────────────────

    private function deductCredits(Workspace $workspace, int $amount): void
    {
        $plan   = $workspace->plan ?? 'free';
        $limits = ['free' => 100, 'starter' => 500, 'growth' => 2000, 'business' => 10000];
        $limit  = $limits[$plan] ?? 100;

        $key  = "ai_credits:{$workspace->id}";
        $used = (int) Redis::get($key) ?? 0;

        abort_if($used + $amount > $limit, 402, 'AI credit limit reached.');

        Redis::incrby($key, $amount);
        Redis::expireat($key, now()->endOfMonth()->timestamp);
    }

    private function refundCredits(Workspace $workspace, int $amount): void
    {
        Redis::decrby("ai_credits:{$workspace->id}", $amount);
    }
}
