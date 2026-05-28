<?php

namespace App\Modules\Support\Listeners;

use App\Modules\Support\Events\TicketResolved;
use App\Modules\Support\Models\KnowledgeBaseArticle;
use App\Modules\Support\Models\TicketMessage;
use Illuminate\Support\Facades\Log;

class GenerateKbFromTicket
{
    public function handle(TicketResolved $event): void
    {
        $ticket = $event->ticket;

        // Skip if no description or resolution summary
        if (empty($ticket->description) && empty($ticket->resolution_summary)) {
            return;
        }

        // Build KB content from ticket data
        $content = $this->buildContent($ticket);

        // Derive category from channel or source
        $category = $this->deriveCategory($ticket);

        // Carry over tags
        $tags = $ticket->tags ?? [];

        $article = KnowledgeBaseArticle::create([
            'workspace_id' => $ticket->workspace_id,
            'ticket_id' => $ticket->id,
            'title' => $ticket->subject,
            'content' => $content,
            'category' => $category,
            'tags' => $tags,
            'is_published' => false, // Draft — review before publishing
            'author_id' => $ticket->assigned_to,
        ]);

        Log::info('KB article auto-generated from ticket', [
            'ticket_id' => $ticket->id,
            'article_id' => $article->id,
            'workspace_id' => $ticket->workspace_id,
        ]);
    }

    private function buildContent($ticket): string
    {
        $sections = [];

        // Section 1: Problem description
        if (!empty($ticket->description)) {
            $sections[] = "## Problem\n\n{$ticket->description}";
        }

        // Section 2: Resolution
        if (!empty($ticket->resolution_summary)) {
            $sections[] = "## Resolution\n\n{$ticket->resolution_summary}";
        }

        // Section 3: Conversation summary (last 5 non-internal messages)
        $messages = TicketMessage::where('ticket_id', $ticket->id)
            ->where('is_internal', false)
            ->orderBy('created_at', 'asc')
            ->limit(20)
            ->get();

        if ($messages->isNotEmpty()) {
            $conversation = $messages->map(function ($msg) {
                $sender = $msg->user ? $msg->user->name : 'Customer';
                $body = strip_tags($msg->body);
                return "**{$sender}:** {$body}";
            })->implode("\n\n");

            $sections[] = "## Conversation\n\n{$conversation}";
        }

        return implode("\n\n---\n\n", $sections);
    }

    private function deriveCategory($ticket): string
    {
        // Map channel/source to category
        $channel = strtolower($ticket->channel ?? '');
        $source = strtolower($ticket->source ?? '');

        if (str_contains($channel, 'email') || str_contains($source, 'email')) {
            return 'email-support';
        }
        if (str_contains($channel, 'chat') || str_contains($source, 'chat')) {
            return 'live-chat';
        }
        if (str_contains($channel, 'phone') || str_contains($source, 'phone')) {
            return 'phone-support';
        }
        if (str_contains($channel, 'form') || str_contains($source, 'form')) {
            return 'form-submission';
        }

        return 'general';
    }
}
