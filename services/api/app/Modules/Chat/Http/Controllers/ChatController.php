<?php

namespace App\Modules\Chat\Http\Controllers;

use App\Core\Jobs\SendNotification;
use App\Modules\Chat\Models\ChatChannel;
use App\Modules\Chat\Models\ChatMessage;
use App\Modules\Chat\Models\ChatParticipant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

class ChatController extends Controller
{
    public function indexChannels(Request $request, string $workspace): JsonResponse
    {
        $userId = $request->user()->id;

        $channels = ChatChannel::where('workspace_id', $workspace)
            ->where('is_archived', false)
            ->whereHas('participants', fn ($q) => $q->where('user_id', $userId))
            ->with(['participants.user:id,name', 'creator:id,name'])
            ->withCount(['messages' => fn ($q) => $q->where('created_at', '>', $request->user()->last_login_at ?? now()->subDays(30))])
            ->orderBy('updated_at', 'desc')
            ->get();

        return response()->json(['data' => $channels]);
    }

    public function storeChannel(Request $request, string $workspace): JsonResponse
    {
        $data = $request->validate([
            'name' => 'nullable|string|max:255',
            'type' => 'required|string|in:dm,group,channel',
            'participant_ids' => 'required|array|min:1',
            'participant_ids.*' => 'exists:users,id',
            'description' => 'nullable|string|max:500',
        ]);

        $workspaceMembers = DB::table('workspace_members')
            ->where('workspace_id', $workspace)
            ->where('status', 'active')
            ->whereIn('user_id', $data['participant_ids'])
            ->pluck('user_id')
            ->all();

        if (count($workspaceMembers) !== count(array_unique($data['participant_ids']))) {
            return response()->json([
                'message' => 'All participants must be active members of the workspace.',
            ], 422);
        }

        // For DMs, check if one already exists between these users
        if ($data['type'] === 'dm' && count($data['participant_ids']) === 1) {
            $otherUserId = $data['participant_ids'][0];
            $myChannels = ChatParticipant::where('user_id', $request->user()->id)->pluck('channel_id');
            $existing = ChatChannel::where('workspace_id', $workspace)
                ->where('type', 'dm')
                ->whereIn('id', $myChannels)
                ->whereHas('participants', fn ($q) => $q->where('user_id', $otherUserId))
                ->first();

            if ($existing) {
                return response()->json(['data' => $existing->load('participants.user:id,name')]);
            }
        }

        $channel = ChatChannel::create([
            'workspace_id' => $workspace,
            'name' => $data['name'],
            'type' => $data['type'],
            'created_by' => $request->user()->id,
            'description' => $data['description'] ?? null,
        ]);

        // Add creator as participant
        $allParticipantIds = array_unique(array_merge([$request->user()->id], $data['participant_ids']));
        foreach ($allParticipantIds as $userId) {
            ChatParticipant::create([
                'channel_id' => $channel->id,
                'user_id' => $userId,
            ]);
        }

        return response()->json(['data' => $channel->load('participants.user:id,name')], 201);
    }

    public function showChannel(Request $request, string $workspace, string $channel): JsonResponse
    {
        $channelModel = ChatChannel::where('workspace_id', $workspace)
            ->with(['participants.user:id,name', 'creator:id,name'])
            ->findOrFail($channel);

        $this->ensureParticipant($request, $channelModel->id);

        return response()->json(['data' => $channelModel]);
    }

    public function storeMessage(Request $request, string $workspace, string $channel): JsonResponse
    {
        $channelModel = ChatChannel::where('workspace_id', $workspace)->findOrFail($channel);
        $this->ensureParticipant($request, $channelModel->id);

        $data = $request->validate([
            'body' => 'nullable|string|max:10000|required_without:attachments',
            'reply_to' => 'nullable|exists:chat_messages,id',
            'attachments' => 'nullable|array|max:20|required_without:body',
            'attachments.*.type' => 'required_with:attachments|string|in:user,task,activity,whiteboard,document,file,link',
            'attachments.*.id' => 'nullable|string|max:120',
            'attachments.*.label' => 'nullable|string|max:255',
            'attachments.*.url' => 'nullable|string|max:2000',
            'attachments.*.meta' => 'nullable|array',
            'mention_user_ids' => 'nullable|array|max:25',
            'mention_user_ids.*' => 'exists:users,id',
        ]);

        if (! empty($data['reply_to'])) {
            $replyMessage = ChatMessage::where('id', $data['reply_to'])->first();
            if (! $replyMessage || $replyMessage->channel_id !== $channelModel->id) {
                return response()->json(['message' => 'Reply target must belong to this channel.'], 422);
            }
        }

        $body = trim((string) ($data['body'] ?? ''));
        $attachments = $this->normalizeAttachments($data['attachments'] ?? []);
        $mentionUserIds = $this->collectMentionUserIds(
            $workspace,
            $channelModel->id,
            $request->user()->id,
            $body,
            $data['mention_user_ids'] ?? [],
        );

        foreach ($mentionUserIds as $userId) {
            $attachments[] = [
                'type' => 'user',
                'id' => $userId,
                'label' => null,
                'url' => null,
                'meta' => ['source' => 'mention'],
            ];
        }

        $message = ChatMessage::create([
            'channel_id' => $channelModel->id,
            'user_id' => $request->user()->id,
            'body' => $body,
            'reply_to' => $data['reply_to'] ?? null,
            'attachments' => $attachments,
        ]);

        // Update channel timestamp
        $channelModel->touch();

        // Update participant last_read_at
        ChatParticipant::where('channel_id', $channelModel->id)
            ->where('user_id', $request->user()->id)
            ->update(['last_read_at' => now()]);

        foreach ($mentionUserIds as $userId) {
            SendNotification::dispatch(
                $workspace,
                $userId,
                'chat.mention',
                'You were mentioned in chat',
                null,
                'chat_message',
                $message->id,
            );
        }

        $message->load('user:id,name');

        return response()->json(['data' => $message], 201);
    }

    public function indexMessages(Request $request, string $workspace, string $channel): JsonResponse
    {
        $channelModel = ChatChannel::where('workspace_id', $workspace)->findOrFail($channel);
        $this->ensureParticipant($request, $channelModel->id);

        $messages = ChatMessage::where('channel_id', $channel)
            ->with('user:id,name')
            ->with('replyTo:id,body,user_id')
            ->orderBy('created_at', 'asc')
            ->when($request->before, fn ($q, $v) => $q->where('created_at', '<', $v))
            ->limit(50)
            ->get();

        return response()->json(['data' => $messages]);
    }

    public function markRead(Request $request, string $workspace, string $channel): JsonResponse
    {
        $channelModel = ChatChannel::where('workspace_id', $workspace)->findOrFail($channel);
        $this->ensureParticipant($request, $channelModel->id);

        ChatParticipant::where('channel_id', $channel)
            ->where('user_id', $request->user()->id)
            ->update(['last_read_at' => now()]);

        return response()->json(['message' => 'Marked as read']);
    }

    private function ensureParticipant(Request $request, string $channelId): void
    {
        $isParticipant = ChatParticipant::where('channel_id', $channelId)
            ->where('user_id', $request->user()->id)
            ->exists();

        abort_unless($isParticipant, 403, 'You are not a participant in this channel.');
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function normalizeAttachments(array $attachments): array
    {
        return collect($attachments)
            ->filter(fn ($att) => is_array($att) && isset($att['type']))
            ->map(fn ($att) => [
                'type' => (string) ($att['type'] ?? ''),
                'id' => isset($att['id']) ? (string) $att['id'] : null,
                'label' => isset($att['label']) ? (string) $att['label'] : null,
                'url' => isset($att['url']) ? (string) $att['url'] : null,
                'meta' => is_array($att['meta'] ?? null) ? $att['meta'] : [],
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<int, string>
     */
    private function collectMentionUserIds(
        string $workspaceId,
        string $channelId,
        string $authorId,
        string $body,
        array $explicitMentionIds,
    ): array {
        preg_match_all('/@([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i', $body, $matches);

        $candidateIds = collect($matches[1] ?? [])
            ->merge($explicitMentionIds)
            ->map(fn ($id) => (string) $id)
            ->unique()
            ->reject(fn ($id) => $id === $authorId)
            ->values();

        if ($candidateIds->isEmpty()) {
            return [];
        }

        return DB::table('workspace_members')
            ->join('chat_participants', function ($join) use ($channelId) {
                $join->on('chat_participants.user_id', '=', 'workspace_members.user_id')
                    ->where('chat_participants.channel_id', '=', $channelId);
            })
            ->where('workspace_members.workspace_id', $workspaceId)
            ->where('workspace_members.status', 'active')
            ->whereIn('workspace_members.user_id', $candidateIds->all())
            ->pluck('workspace_members.user_id')
            ->unique()
            ->values()
            ->all();
    }
}
