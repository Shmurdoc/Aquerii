<?php

namespace App\Modules\Accounting\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Workspace;
use App\Modules\Accounting\Models\JournalEntry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class JournalEntryController extends Controller
{
    public function index(Request $request, Workspace $workspace): JsonResponse
    {
        abort_unless(auth()->user()->workspaces()->where('workspace_id', $workspace->id)->exists(), 403);

        $query = JournalEntry::where('workspace_id', $workspace->id)
            ->with('account');

        if ($from = $request->query('from')) {
            $query->where('entry_date', '>=', $from);
        }
        if ($to = $request->query('to')) {
            $query->where('entry_date', '<=', $to);
        }
        if ($accountId = $request->query('account_id')) {
            $query->where('account_id', $accountId);
        }

        $entries = $query->orderBy('entry_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate($request->query('per_page', 50));

        return response()->json(['data' => $entries]);
    }

    public function store(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate([
            'entries' => 'required|array|min:2',
            'entries.*.account_id' => 'required|string|exists:accounts,id',
            'entries.*.description' => 'required|string|max:500',
            'entries.*.debit_amount' => 'required|numeric|min:0',
            'entries.*.credit_amount' => 'required|numeric|min:0',
            'entry_date' => 'required|date',
            'reference_type' => 'nullable|string|max:50',
            'reference_id' => 'nullable|string',
        ]);

        $totalDebits = collect($validated['entries'])->sum('debit_amount');
        $totalCredits = collect($validated['entries'])->sum('credit_amount');

        if (abs($totalDebits - $totalCredits) > 0.01) {
            return response()->json([
                'error' => ['code' => 'UNBALANCED_ENTRY', 'message' => 'Debits must equal credits'],
            ], 422);
        }

        $created = [];
        foreach ($validated['entries'] as $entry) {
            $created[] = JournalEntry::create([
                'workspace_id' => $workspace->id,
                'account_id' => $entry['account_id'],
                'entry_date' => $validated['entry_date'],
                'description' => $entry['description'],
                'debit_amount' => $entry['debit_amount'],
                'credit_amount' => $entry['credit_amount'],
                'reference_type' => $validated['reference_type'] ?? null,
                'reference_id' => $validated['reference_id'] ?? null,
                'created_by' => $request->user()->id,
            ]);
        }

        return response()->json(['data' => $created], 201);
    }
}
