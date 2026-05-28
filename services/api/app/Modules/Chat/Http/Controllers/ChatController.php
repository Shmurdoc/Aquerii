<?php

namespace App\Modules\Chat\Http\Controllers;

use App\Modules\Chat\Models\ChatChannel;
use App\Modules\Chat\Models\ChatMessage;
use App\Modules\Chat\Models\ChatParticipant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

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

        return response()->json(['data' => $channelModel]);
    }

    public function storeMessage(Request $request, string $workspace, string $channel): JsonResponse
    {
        $channelModel = ChatChannel::where('workspace_id', $workspace)->findOrFail($channel);

        $data = $request->validate([
            'body' => 'required|string|max:10000',
            'reply_to' => 'nullable|exists:chat_messages,id',
            'attachments' => 'nullable|array',
        ]);

        $message = ChatMessage::create([
            'channel_id' => $channelModel->id,
            'user_id' => $request->user()->id,
            'body' => $data['body'],
            'reply_to' => $data['reply_to'] ?? null,
            'attachments' => $data['attachments'] ?? [],
        ]);

        // Update channel timestamp
        $channelModel->touch();

        // Update participant last_read_at
        ChatParticipant::where('channel_id', $channelModel->id)
            ->where('user_id', $request->user()->id)
            ->update(['last_read_at' => now()]);

        $message->load('user:id,name');

        return response()->json(['data' => $message], 201);
    }

    public function indexMessages(Request $request, string $workspace, string $channel): JsonResponse
    {
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
        ChatParticipant::where('channel_id', $channel)
            ->where('user_id', $request->user()->id)
            ->update(['last_read_at' => now()]);

        return response()->json(['message' => 'Marked as read']);
    }
}
