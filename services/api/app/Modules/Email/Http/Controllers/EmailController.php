<?php

namespace App\Modules\Email\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Workspace;
use App\Modules\Email\Jobs\SyncEmailAccount;
use App\Modules\Email\Mail\RawEmail;
use App\Modules\Email\Models\Email;
use App\Modules\Email\Models\EmailAccount;
use App\Modules\Email\Models\EmailAiSuggestion;
use App\Modules\Email\Models\EmailThread;
use App\Modules\Sales\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class EmailController extends Controller
{
    // ── Accounts ─────────────────────────────────────────────────────────────

    public function indexAccounts(Workspace $workspace): JsonResponse
    {
        $accounts = EmailAccount::where('workspace_id', $workspace->id)
            ->orderBy('created_at')
            ->get();

        return response()->json(['data' => $accounts]);
    }

    public function storeAccount(Request $request, Workspace $workspace): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:100',
            'email_address' => 'required|email',
            'imap_host' => 'required|string',
            'imap_port' => 'nullable|integer',
            'imap_ssl' => 'nullable|boolean',
            'imap_username' => 'required|string',
            'imap_password' => 'required|string',
            'smtp_host' => 'nullable|string',
            'smtp_port' => 'nullable|integer',
            'smtp_username' => 'nullable|string',
            'smtp_password' => 'nullable|string',
        ]);

        $account = new EmailAccount;
        $account->workspace_id = $workspace->id;
        $account->user_id = $request->user()->id;
        $account->name = $request->name;
        $account->email_address = $request->email_address;
        $account->imap_host = $request->imap_host;
        $account->imap_port = $request->imap_port ?? 993;
        $account->imap_ssl = $request->imap_ssl ?? true;
        $account->imap_username = $request->imap_username;
        $account->imap_password = $request->imap_password; // uses mutator
        $account->smtp_host = $request->smtp_host;
        $account->smtp_port = $request->smtp_port ?? 587;
        $account->smtp_username = $request->smtp_username;
        if ($request->smtp_password) {
            $account->smtp_password = $request->smtp_password;
        }
        $account->save();

        dispatch(new SyncEmailAccount($account));

        return response()->json(['data' => $account], 201);
    }

    public function destroyAccount(Workspace $workspace, string $id): JsonResponse
    {
        $account = EmailAccount::where('workspace_id', $workspace->id)->findOrFail($id);
        $account->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }

    // ── Threads ───────────────────────────────────────────────────────────────

    public function indexThreads(Request $request, Workspace $workspace): JsonResponse
    {
        $query = EmailThread::where('workspace_id', $workspace->id)
            ->with(['emails' => fn ($q) => $q->latest()->limit(1)]);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }
        if ($request->has('account_id')) {
            $query->where('email_account_id', $request->account_id);
        }
        if ($search = $request->search) {
            $query->where('subject', 'like', "%{$search}%");
        }

        $threads = $query->orderByDesc('last_message_at')->paginate(50);

        return response()->json([
            'data' => $threads->items(),
            'meta' => ['total' => $threads->total(), 'current_page' => $threads->currentPage()],
        ]);
    }

    public function showThread(Workspace $workspace, string $id): JsonResponse
    {
        $thread = EmailThread::where('workspace_id', $workspace->id)
            ->with(['emails.attachments', 'emails.aiSuggestions'])
            ->findOrFail($id);

        return response()->json(['data' => $thread]);
    }

    public function updateThread(Request $request, Workspace $workspace, string $id): JsonResponse
    {
        $thread = EmailThread::where('workspace_id', $workspace->id)->findOrFail($id);
        $thread->fill($request->only(['status', 'is_starred']))->save();

        return response()->json(['data' => $thread]);
    }

    // ── Send ──────────────────────────────────────────────────────────────────

    public function send(Request $request, Workspace $workspace): JsonResponse
    {
        $request->validate([
            'account_id' => 'required|uuid',
            'to' => 'required|array',
            'subject' => 'required|string',
            'body_html' => 'required|string',
            'thread_id' => 'nullable|uuid',
        ]);

        $account = EmailAccount::where('workspace_id', $workspace->id)
            ->findOrFail($request->account_id);

        // Build mailer config from account credentials
        config([
            'mail.mailers.smtp_dynamic' => [
                'transport' => 'smtp',
                'host' => $account->smtp_host ?? $account->imap_host,
                'port' => $account->smtp_port,
                'encryption' => $account->smtp_ssl ? 'tls' : null,
                'username' => $account->smtp_username ?? $account->imap_username,
                'password' => $account->getSmtpPasswordDecrypted() ?? $account->getImapPasswordDecrypted(),
            ],
        ]);

        Mail::mailer('smtp_dynamic')
            ->html($request->body_html)
            ->to($request->to)
            ->subject($request->subject)
            ->send(new RawEmail($request->body_html, $request->subject, $account->email_address));

        // Record outbound email
        $threadId = $request->thread_id;
        if (! $threadId) {
            $thread = EmailThread::create([
                'workspace_id' => $workspace->id,
                'email_account_id' => $account->id,
                'subject' => $request->subject,
                'status' => 'read',
                'last_message_at' => now(),
                'message_count' => 1,
            ]);
            $threadId = $thread->id;
        }

        $email = Email::create([
            'workspace_id' => $workspace->id,
            'email_account_id' => $account->id,
            'thread_id' => $threadId,
            'direction' => 'outbound',
            'from_address' => $account->email_address,
            'to_addresses' => $request->to,
            'subject' => $request->subject,
            'body_html' => $request->body_html,
            'is_read' => true,
            'received_at' => now(),
        ]);

        return response()->json(['data' => $email], 201);
    }

    // ── AI suggestions ────────────────────────────────────────────────────────

    public function approveSuggestion(Request $request, Workspace $workspace, string $id): JsonResponse
    {
        $suggestion = EmailAiSuggestion::where('workspace_id', $workspace->id)->findOrFail($id);
        $suggestion->update([
            'status' => 'approved',
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
        ]);

        // If this is a task_extract, create tasks on the specified board
        if ($suggestion->type === 'task_extract' && $request->has('board_id')) {
            foreach ($suggestion->extracted_tasks as $taskData) {
                Task::create([
                    'workspace_id' => $workspace->id,
                    'board_id' => $request->board_id,
                    'title' => $taskData['title'] ?? 'Task from email',
                    'description' => $taskData['description'] ?? null,
                    'created_by' => $request->user()->id,
                ]);
            }
        }

        return response()->json(['data' => $suggestion]);
    }

    public function rejectSuggestion(Workspace $workspace, string $id): JsonResponse
    {
        $suggestion = EmailAiSuggestion::where('workspace_id', $workspace->id)->findOrFail($id);
        $suggestion->update(['status' => 'rejected']);

        return response()->json(['data' => $suggestion]);
    }
}
