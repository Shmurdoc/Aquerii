<?php

use App\Core\Jobs\SendNotification;
use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use App\Modules\Chat\Models\ChatChannel;
use App\Modules\Chat\Models\ChatMessage;
use App\Modules\Chat\Models\ChatParticipant;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    $this->owner = User::factory()->create();
    $this->member = User::factory()->create();
    $this->nonParticipant = User::factory()->create();

    $this->workspace = Workspace::factory()->create(['owner_id' => $this->owner->id]);

    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->owner->id,
        'role' => 'owner',
        'status' => 'active',
    ]);

    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->member->id,
        'role' => 'member',
        'status' => 'active',
    ]);

    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->nonParticipant->id,
        'role' => 'member',
        'status' => 'active',
    ]);
});

function idempotency(): array
{
    return ['Idempotency-Key' => Str::uuid()->toString()];
}

it('supports group channel creation plus reply, mentions, and structured attachments', function () {
    Queue::fake();
    Sanctum::actingAs($this->owner);

    $channelRes = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/chat/channels",
        [
            'name' => 'Delivery Squad',
            'type' => 'group',
            'participant_ids' => [$this->member->id],
        ],
        idempotency(),
    );

    $channelRes->assertStatus(201)
        ->assertJsonPath('data.type', 'group');

    $channelId = $channelRes->json('data.id');

    $firstMessage = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/chat/channels/{$channelId}/messages",
        ['body' => 'Initial message'],
        idempotency(),
    );

    $firstMessage->assertStatus(201);
    $replyToId = $firstMessage->json('data.id');

    $res = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/chat/channels/{$channelId}/messages",
        [
            'body' => "@{$this->member->id} please review the plan",
            'reply_to' => $replyToId,
            'mention_user_ids' => [$this->member->id],
            'attachments' => [
                [
                    'type' => 'task',
                    'id' => 'task-123',
                    'label' => 'Finalize launch checklist',
                    'url' => '/boards/abc/items/task-123',
                    'meta' => ['priority' => 'high'],
                ],
                [
                    'type' => 'whiteboard',
                    'id' => 'board-xyz',
                    'label' => 'Sprint planning board',
                    'url' => '/boards/board-xyz?view=whiteboard',
                ],
                [
                    'type' => 'document',
                    'id' => 'doc-88',
                    'label' => 'Scope document',
                    'url' => '/documents/doc-88',
                ],
                [
                    'type' => 'activity',
                    'id' => 'activity-7',
                    'label' => 'Last timeline update',
                ],
            ],
        ],
        idempotency(),
    );

    $res->assertStatus(201)
        ->assertJsonPath('data.reply_to', $replyToId)
        ->assertJsonPath('data.attachments.0.type', 'task')
        ->assertJsonPath('data.attachments.1.type', 'whiteboard')
        ->assertJsonPath('data.attachments.2.type', 'document')
        ->assertJsonPath('data.attachments.3.type', 'activity');

    Queue::assertPushed(SendNotification::class, function (SendNotification $job) {
        return $job->workspaceId === $this->workspace->id
            && $job->userId === $this->member->id
            && $job->type === 'chat.mention'
            && $job->entityType === 'chat_message'
            && $job->entityId !== null;
    });

    $messagesRes = $this->getJson("/api/workspaces/{$this->workspace->id}/chat/channels/{$channelId}/messages");
    $messagesRes->assertStatus(200)
        ->assertJsonCount(2, 'data');

    expect(ChatParticipant::where('channel_id', $channelId)->count())->toBe(2)
        ->and(ChatChannel::where('id', $channelId)->value('type'))->toBe('group')
        ->and(ChatMessage::where('channel_id', $channelId)->count())->toBe(2);
});

it('rejects posting when user is not a channel participant', function () {
    Sanctum::actingAs($this->owner);

    $channel = ChatChannel::create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Private Group',
        'type' => 'group',
        'created_by' => $this->owner->id,
    ]);

    ChatParticipant::create([
        'channel_id' => $channel->id,
        'user_id' => $this->owner->id,
    ]);

    Sanctum::actingAs($this->nonParticipant);

    $res = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/chat/channels/{$channel->id}/messages",
        ['body' => 'Should not be allowed'],
        idempotency(),
    );

    $res->assertStatus(404);
});
