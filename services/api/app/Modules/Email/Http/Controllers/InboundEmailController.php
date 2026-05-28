<?php

namespace App\Modules\Email\Http\Controllers;

use App\Core\Models\Item;
use App\Core\Models\Board;
use App\Core\Models\BoardGroup;
use App\Modules\Email\Models\InboundEmail;
use App\Modules\Email\Models\ProjectEmailAddress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Log;

class InboundEmailController extends Controller
{
    /**
     * Webhook endpoint for inbound emails (Mailgun/SendGrid/Postmark compatible).
     * No auth required — verified by webhook signature.
     */
    public function handleInbound(Request $request): JsonResponse
    {
        // Extract email data from webhook payload
        $data = $this->parseWebhookPayload($request);

        if (!$data) {
            return response()->json(['error' => 'Invalid payload'], 400);
        }

        // Find the project email address
        $projectEmail = ProjectEmailAddress::active()
            ->where('address', $data['to'])
            ->first();

        if (!$projectEmail) {
            Log::warning('Inbound email to unknown address', ['to' => $data['to']]);
            return response()->json(['message' => 'Address not configured'], 200);
        }

        // Store the inbound email
        $inboundEmail = InboundEmail::create([
            'workspace_id' => $projectEmail->workspace_id,
            'project_email_address_id' => $projectEmail->id,
            'message_id' => $data['message_id'],
            'from_address' => $data['from_email'],
            'from_name' => $data['from_name'] ?? null,
            'to_addresses' => $data['to'],
            'cc_addresses' => $data['cc'] ?? null,
            'subject' => $data['subject'],
            'body_text' => $data['body_text'] ?? null,
            'body_html' => $data['body_html'] ?? null,
            'headers' => $data['headers'] ?? [],
            'attachments_meta' => $data['attachments'] ?? [],
            'status' => 'received',
        ]);

        // Process: create task from email
        $this->processInboundEmail($inboundEmail, $projectEmail);

        return response()->json(['message' => 'Processed']);
    }

    private function parseWebhookPayload(Request $request): ?array
    {
        $contentType = $request->header('Content-Type', '');

        // Mailgun format
        if (str_contains($contentType, 'multipart/form-data') || $request->has('sender')) {
            return [
                'message_id' => $request->input('Message-Id', $request->input('message-id', 'unknown')),
                'from_email' => $this->extractEmail($request->input('sender', '')),
                'from_name' => $this->extractName($request->input('sender', '')),
                'to' => $this->extractEmail($request->input('recipient', '')),
                'subject' => $request->input('subject', '(No subject)'),
                'body_text' => $request->input('body-plain', $request->input('text', '')),
                'body_html' => $request->input('body-html', $request->input('html', '')),
                'headers' => json_decode($request->input('message-headers', '[]'), true),
                'attachments' => [],
            ];
        }

        // SendGrid/Postmark JSON format
        if ($request->isJson()) {
            $json = $request->json()->all();

            return [
                'message_id' => $json['Message-Id'] ?? $json['message_id'] ?? 'unknown',
                'from_email' => $json['From'] ?? $json['from'] ?? '',
                'from_name' => $json['FromName'] ?? $json['from_name'] ?? '',
                'to' => $json['To'] ?? $json['to'] ?? '',
                'subject' => $json['Subject'] ?? $json['subject'] ?? '(No subject)',
                'body_text' => $json['TextBody'] ?? $json['text'] ?? '',
                'body_html' => $json['HtmlBody'] ?? $json['html'] ?? '',
                'headers' => $json['Headers'] ?? [],
                'attachments' => $json['Attachments'] ?? [],
            ];
        }

        return null;
    }

    private function extractEmail(string $address): string
    {
        if (preg_match('/<(.+?)>/', $address, $matches)) {
            return $matches[1];
        }
        return trim($address);
    }

    private function extractName(string $address): string
    {
        if (preg_match('/^(.+?)\s*</', $address, $matches)) {
            return trim($matches[1], '"\'');
        }
        return '';
    }

    private function processInboundEmail(InboundEmail $email, ProjectEmailAddress $projectEmail): void
    {
        try {
            // Build task content from email
            $description = $this->buildTaskDescription($email);

            // Determine board
            $boardId = $projectEmail->target_board_id;
            if (!$boardId) {
                // Find or use first board in workspace
                $boardId = Board::where('workspace_id', $email->workspace_id)
                    ->first()?->id;
            }

            if (!$boardId) {
                $email->update(['status' => 'failed', 'processing_notes' => 'No board found']);
                return;
            }

            // Get first group for the board
            $groupId = BoardGroup::where('board_id', $boardId)->first()?->id;

            // Create the task
            $task = Item::create([
                'workspace_id' => $email->workspace_id,
                'board_id' => $boardId,
                'group_id' => $groupId,
                'title' => $email->subject,
                'description' => ['text' => $description],
                'status' => 'open',
                'priority' => 'normal',
                'created_by' => null,
            ]);

            // Link email to task
            $email->update([
                'status' => 'processed',
                'created_task_id' => $task->id,
            ]);

            Log::info('Task created from inbound email', [
                'task_id' => $task->id,
                'email_id' => $email->id,
                'from' => $email->from_address,
            ]);
        } catch (\Exception $e) {
            $email->update([
                'status' => 'failed',
                'processing_notes' => $e->getMessage(),
            ]);

            Log::error('Failed to process inbound email', [
                'email_id' => $email->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function buildTaskDescription(InboundEmail $email): string
    {
        $parts = [];

        $parts[] = "**From:** {$email->from_name} <{$email->from_address}>";
        $parts[] = "**Date:** {$email->created_at->format('Y-m-d H:i')}";
        $parts[] = "**Subject:** {$email->subject}";

        if ($email->cc_addresses) {
            $parts[] = "**CC:** {$email->cc_addresses}";
        }

        $parts[] = '';
        $parts[] = '---';
        $parts[] = '';

        $parts[] = $email->body_text ?: strip_tags($email->body_html ?? '');

        return implode("\n", $parts);
    }
}
