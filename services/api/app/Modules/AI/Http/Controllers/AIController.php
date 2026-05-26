<?php

namespace App\Modules\AI\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Workspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;

class AIController extends Controller
{
    // POST /workspaces/{workspace}/ai/chat
    public function chat(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate([
            'message' => 'required|string|max:8000',
            'history' => 'sometimes|array',
            'context_ids' => 'sometimes|array',
        ]);

        $cost = $this->creditCost('chat');

        $this->deductCredits($workspace, $cost);

        try {
            $response = Http::withToken(config('services.ai.internal_token'))
                ->timeout(60)
                ->post(config('services.ai.base_url').'/chat', [
                    'workspace_id' => $workspace->id,
                    'message' => $validated['message'],
                    'history' => $validated['history'] ?? [],
                    'context_ids' => $validated['context_ids'] ?? [],
                ]);

            if ($response->failed()) {
                $this->refundCredits($workspace, $cost);

                return response()->json(['error' => 'AI service error'], 502);
            }

            return response()->json(['data' => $response->json('data')]);
        } catch (\Throwable $e) {
            $this->refundCredits($workspace, $cost);
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

        $cost = $this->creditCost('summarize');
        $this->deductCredits($workspace, $cost);

        try {
            $response = Http::withToken(config('services.ai.internal_token'))
                ->timeout(30)
                ->post(config('services.ai.base_url').'/documents/summarize', [
                    'workspace_id' => $workspace->id,
                    'text' => $validated['text'],
                ]);

            if ($response->failed()) {
                $this->refundCredits($workspace, $cost);

                return response()->json(['error' => 'AI service error'], 502);
            }

            return response()->json(['data' => $response->json('data')]);
        } catch (\Throwable $e) {
            $this->refundCredits($workspace, $cost);

            return response()->json(['error' => 'AI unavailable'], 503);
        }
    }

    // POST /workspaces/{workspace}/ai/score-deal
    public function scoreDeal(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate([
            'deal_id' => 'required|uuid',
        ]);

        $cost = $this->creditCost('score_deal');
        $this->deductCredits($workspace, $cost);

        try {
            $response = Http::withToken(config('services.ai.internal_token'))
                ->timeout(30)
                ->post(config('services.ai.base_url').'/crm/score', [
                    'workspace_id' => $workspace->id,
                    'deal_id' => $validated['deal_id'],
                ]);

            if ($response->failed()) {
                $this->refundCredits($workspace, $cost);

                return response()->json(['error' => 'AI service error'], 502);
            }

            $score = $response->json('data.score');

            // Persist score back to deal
            DB::table('crm_deals')
                ->where('id', $validated['deal_id'])
                ->where('workspace_id', $workspace->id)
                ->update(['ai_score' => $score, 'updated_at' => now()]);

            return response()->json(['data' => ['score' => $score]]);
        } catch (\Throwable $e) {
            $this->refundCredits($workspace, $cost);

            return response()->json(['error' => 'AI unavailable'], 503);
        }
    }

    // GET /workspaces/{workspace}/ai/credits
    public function credits(Workspace $workspace): JsonResponse
    {
        $plan = $workspace->plan ?? 'free';
        $limits = config('ai.credit_limits') ?? ['free' => 100, 'starter' => 500, 'growth' => 2000, 'business' => 10000];
        $limit = $limits[$plan] ?? 100;

        $used = (int) Redis::get("ai_credits:{$workspace->id}") ?? 0;

        return response()->json([
            'data' => [
                'used' => $used,
                'limit' => $limit,
                'remaining' => max(0, $limit - $used),
            ],
        ]);
    }

    // POST /workspaces/{workspace}/ai/task/generate-description
    public function generateTaskDescription(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:500',
            'context' => 'nullable|string|max:2000',
        ]);

        $cost = $this->creditCost('generate_task_description');
        $this->deductCredits($workspace, $cost);

        try {
            $response = Http::withToken(config('services.ai.internal_token'))
                ->timeout(30)
                ->post(config('services.ai.base_url').'/task/generate-description', [
                    'workspace_id' => $workspace->id,
                    'title' => $validated['title'],
                    'context' => $validated['context'] ?? '',
                ]);

            if ($response->failed()) {
                $this->refundCredits($workspace, $cost);

                return response()->json(['error' => ['code' => 'AI_ERROR', 'message' => 'AI service error']], 502);
            }

            return response()->json($response->json());
        } catch (\Throwable $e) {
            $this->refundCredits($workspace, $cost);
            Log::error('AI generateTaskDescription error', ['error' => $e->getMessage()]);

            return response()->json(['error' => ['code' => 'AI_UNAVAILABLE', 'message' => 'AI unavailable']], 503);
        }
    }

    // POST /workspaces/{workspace}/ai/document/generate
    public function generateDocument(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate([
            'prompt' => 'required|string|max:2000',
            'style' => 'nullable|string|in:professional,casual,technical,creative',
        ]);

        $cost = $this->creditCost('generate_document');
        $this->deductCredits($workspace, $cost);

        try {
            $response = Http::withToken(config('services.ai.internal_token'))
                ->timeout(60)
                ->post(config('services.ai.base_url').'/document/generate', [
                    'workspace_id' => $workspace->id,
                    'prompt' => $validated['prompt'],
                    'style' => $validated['style'] ?? 'professional',
                ]);

            if ($response->failed()) {
                $this->refundCredits($workspace, $cost);

                return response()->json(['error' => ['code' => 'AI_ERROR', 'message' => 'AI service error']], 502);
            }

            return response()->json($response->json());
        } catch (\Throwable $e) {
            $this->refundCredits($workspace, $cost);
            Log::error('AI generateDocument error', ['error' => $e->getMessage()]);

            return response()->json(['error' => ['code' => 'AI_UNAVAILABLE', 'message' => 'AI unavailable']], 503);
        }
    }

    // POST /workspaces/{workspace}/ai/automation/generate
    public function generateAutomation(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate([
            'description' => 'required|string|max:500',
        ]);

        $cost = $this->creditCost('generate_automation');
        $this->deductCredits($workspace, $cost);

        try {
            $response = Http::withToken(config('services.ai.internal_token'))
                ->timeout(30)
                ->post(config('services.ai.base_url').'/automation/generate', [
                    'workspace_id' => $workspace->id,
                    'description' => $validated['description'],
                ]);

            if ($response->failed()) {
                $this->refundCredits($workspace, $cost);

                return response()->json(['error' => ['code' => 'AI_ERROR', 'message' => 'AI service error']], 502);
            }

            return response()->json($response->json());
        } catch (\Throwable $e) {
            $this->refundCredits($workspace, $cost);
            Log::error('AI generateAutomation error', ['error' => $e->getMessage()]);

            return response()->json(['error' => ['code' => 'AI_UNAVAILABLE', 'message' => 'AI unavailable']], 503);
        }
    }

    // POST /workspaces/{workspace}/ai/flowchart/generate
    public function generateFlowchart(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate([
            'description' => 'required|string|max:2000',
        ]);

        $cost = $this->creditCost('generate_flowchart');
        $this->deductCredits($workspace, $cost);

        try {
            $response = Http::withToken(config('services.ai.internal_token'))
                ->timeout(60)
                ->post(config('services.ai.base_url').'/ai/flowchart/generate', [
                    'workspace_id' => $workspace->id,
                    'description' => $validated['description'],
                ]);

            if ($response->failed()) {
                $this->refundCredits($workspace, $cost);

                return response()->json(['error' => ['code' => 'AI_ERROR', 'message' => 'AI service error']], 502);
            }

            return response()->json($response->json());
        } catch (\Throwable $e) {
            $this->refundCredits($workspace, $cost);
            Log::error('AI generateFlowchart error', ['error' => $e->getMessage()]);

            return response()->json(['error' => ['code' => 'AI_UNAVAILABLE', 'message' => 'AI unavailable']], 503);
        }
    }

    // POST /workspaces/{workspace}/ai/document/analyze
    // Sends a scanned document UUID to the AI service for text extraction + analysis.
    public function analyzeDocument(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate([
            'document_id' => 'required|uuid',
        ]);

        $cost = $this->creditCost('analyze_document');
        $this->deductCredits($workspace, $cost);

        try {
            $response = Http::withToken(config('services.ai.internal_token'))
                ->timeout(60)
                ->post(config('services.ai.base_url').'/ai/document/analyze', [
                    'workspace_id' => $workspace->id,
                    'document_id' => $validated['document_id'],
                ]);

            if ($response->failed()) {
                $this->refundCredits($workspace, $cost);

                return response()->json(['error' => ['code' => 'AI_ERROR', 'message' => 'AI service error']], 502);
            }

            return response()->json($response->json());
        } catch (\Throwable $e) {
            $this->refundCredits($workspace, $cost);
            Log::error('AI analyzeDocument error', ['error' => $e->getMessage()]);

            return response()->json(['error' => ['code' => 'AI_UNAVAILABLE', 'message' => 'AI unavailable']], 503);
        }
    }

    // POST /workspaces/{workspace}/ai/document/auto-tag
    // Asks AI to suggest tags for a scanned document.
    public function autoTagDocument(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate([
            'document_id' => 'required|uuid',
        ]);

        $cost = $this->creditCost('auto_tag_document');
        $this->deductCredits($workspace, $cost);

        try {
            $response = Http::withToken(config('services.ai.internal_token'))
                ->timeout(60)
                ->post(config('services.ai.base_url').'/ai/document/auto-tag', [
                    'workspace_id' => $workspace->id,
                    'document_id' => $validated['document_id'],
                ]);

            if ($response->failed()) {
                $this->refundCredits($workspace, $cost);

                return response()->json(['error' => ['code' => 'AI_ERROR', 'message' => 'AI service error']], 502);
            }

            return response()->json($response->json());
        } catch (\Throwable $e) {
            $this->refundCredits($workspace, $cost);
            Log::error('AI autoTagDocument error', ['error' => $e->getMessage()]);

            return response()->json(['error' => ['code' => 'AI_UNAVAILABLE', 'message' => 'AI unavailable']], 503);
        }
    }

    // POST /workspaces/{workspace}/ai/document/link-deal
    // Extracts totals from a scanned document and links it to a CRM deal.
    public function linkDocumentToDeal(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate([
            'document_id' => 'required|uuid',
            'deal_id' => 'required|uuid',
        ]);

        $cost = $this->creditCost('link_document_to_deal');
        $this->deductCredits($workspace, $cost);

        try {
            $response = Http::withToken(config('services.ai.internal_token'))
                ->timeout(60)
                ->post(config('services.ai.base_url').'/ai/document/link-deal', [
                    'workspace_id' => $workspace->id,
                    'document_id' => $validated['document_id'],
                    'deal_id' => $validated['deal_id'],
                ]);

            if ($response->failed()) {
                $this->refundCredits($workspace, $cost);

                return response()->json(['error' => ['code' => 'AI_ERROR', 'message' => 'AI service error']], 502);
            }

            return response()->json($response->json());
        } catch (\Throwable $e) {
            $this->refundCredits($workspace, $cost);
            Log::error('AI linkDocumentToDeal error', ['error' => $e->getMessage()]);

            return response()->json(['error' => ['code' => 'AI_UNAVAILABLE', 'message' => 'AI unavailable']], 503);
        }
    }

    // ─── Helpers ───────────────────────────────────────────────────────────────

    private function creditCost(string $op): int
    {
        return (int) config("ai.credit_costs.$op", 5);
    }

    /**
     * Atomically check and deduct AI credits using a Lua script to prevent
     * the TOCTOU race that existed with separate GET + INCRBY calls.
     *
     * Also enforces plan-level AI access gate:
     *   free    → 100 credits/month, basic AI only (no score-deal)
     *   starter → 500 credits/month, full AI
     *   growth  → 2000 credits/month, full AI
     *   business→ 10000 credits/month, full AI
     */
    private function deductCredits(Workspace $workspace, int $amount): void
    {
        $plan = $workspace->plan ?? 'free';
        $limits = config('ai.credit_limits') ?? ['free' => 100, 'starter' => 500, 'growth' => 2000, 'business' => 10000];
        $limit = $limits[$plan] ?? 100;

        $key = "ai_credits:{$workspace->id}";
        $expires = now()->endOfMonth()->timestamp;

        // Atomic Lua: increment only if result would not exceed limit.
        // Returns new value if allowed, or -1 if limit would be exceeded.
        $lua = <<<'LUA'
local key     = KEYS[1]
local amount  = tonumber(ARGV[1])
local limit   = tonumber(ARGV[2])
local expires = tonumber(ARGV[3])
local current = tonumber(redis.call('GET', key) or 0)
if current + amount > limit then
    return -1
end
local new = redis.call('INCRBY', key, amount)
redis.call('EXPIREAT', key, expires)
return new
LUA;

        $result = Redis::eval($lua, 1, $key, $amount, $limit, $expires);

        abort_if($result === -1, 402, 'AI credit limit reached for your plan.');
    }

    private function refundCredits(Workspace $workspace, int $amount): void
    {
        $key = "ai_credits:{$workspace->id}";
        Redis::decrby($key, $amount);
        // Prevent going below zero on refund (e.g. if key expired)
        $current = (int) Redis::get($key);
        if ($current < 0) {
            Redis::set($key, 0);
        }
    }
}
