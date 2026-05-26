<?php

namespace App\Modules\CRM\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\Workspace;
use App\Modules\CRM\Models\CrmQuote;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class QuoteController extends Controller
{
    public function index(Request $request, Workspace $workspace): JsonResponse
    {
        $quotes = CrmQuote::where('workspace_id', $workspace->id)
            ->when($request->status, fn ($q, $v) => $q->where('status', $v))
            ->when($request->deal_id, fn ($q, $v) => $q->where('deal_id', $v))
            ->with(['deal:id,title', 'contact:id,first_name,last_name', 'creator:id,name'])
            ->orderBy('created_at', 'desc')
            ->paginate(25);

        return response()->json(['data' => $quotes]);
    }

    public function show(Workspace $workspace, CrmQuote $quote): JsonResponse
    {
        abort_if($quote->workspace_id !== $workspace->id, 404);

        return response()->json(['data' => $quote->load(['deal', 'contact', 'company', 'creator'])]);
    }

    public function store(Request $request, Workspace $workspace): JsonResponse
    {
        $data = $request->validate([
            'deal_id' => 'nullable|uuid|exists:crm_deals,id',
            'contact_id' => 'nullable|uuid|exists:crm_contacts,id',
            'company_id' => 'nullable|uuid|exists:crm_companies,id',
            'line_items' => 'required|array',
            'line_items.*.product_id' => 'required|string',
            'line_items.*.name' => 'required|string',
            'line_items.*.quantity' => 'required|numeric|min:1',
            'line_items.*.unit_price' => 'required|numeric|min:0',
            'discount' => 'nullable|numeric|min:0',
            'tax' => 'nullable|numeric|min:0',
            'currency' => 'sometimes|string|size:3',
            'notes' => 'nullable|string',
            'terms' => 'nullable|string',
            'valid_until' => 'nullable|date',
        ]);

        $lineItems = $data['line_items'];
        $subtotal = collect($lineItems)->sum(fn ($item) => $item['quantity'] * $item['unit_price']);
        $discount = $data['discount'] ?? 0;
        $tax = $data['tax'] ?? 0;
        $total = $subtotal - $discount + $tax;

        $quote = CrmQuote::create([
            'workspace_id' => $workspace->id,
            'quote_number' => 'Q-'.Str::upper(Str::random(8)),
            'deal_id' => $data['deal_id'] ?? null,
            'contact_id' => $data['contact_id'] ?? null,
            'company_id' => $data['company_id'] ?? null,
            'status' => 'draft',
            'line_items' => $lineItems,
            'subtotal' => $subtotal,
            'discount' => $discount,
            'tax' => $tax,
            'total' => $total,
            'currency' => $data['currency'] ?? 'USD',
            'notes' => $data['notes'] ?? null,
            'terms' => $data['terms'] ?? null,
            'valid_until' => $data['valid_until'] ?? null,
            'created_by' => $request->user()->id,
        ]);

        return response()->json(['data' => $quote], 201);
    }

    public function update(Request $request, Workspace $workspace, CrmQuote $quote): JsonResponse
    {
        abort_if($quote->workspace_id !== $workspace->id, 404);

        if ($quote->status !== 'draft') {
            return response()->json(['error' => ['code' => 'QUOTE_LOCKED', 'message' => 'Only draft quotes can be edited']], 422);
        }

        $data = $request->validate([
            'line_items' => 'sometimes|array',
            'line_items.*.product_id' => 'required_with:line_items|string',
            'line_items.*.name' => 'required_with:line_items|string',
            'line_items.*.quantity' => 'required_with:line_items|numeric|min:1',
            'line_items.*.unit_price' => 'required_with:line_items|numeric|min:0',
            'discount' => 'nullable|numeric|min:0',
            'tax' => 'nullable|numeric|min:0',
            'currency' => 'sometimes|string|size:3',
            'notes' => 'nullable|string',
            'terms' => 'nullable|string',
            'valid_until' => 'nullable|date',
        ]);

        if (isset($data['line_items'])) {
            $lineItems = $data['line_items'];
            $subtotal = collect($lineItems)->sum(fn ($item) => $item['quantity'] * $item['unit_price']);
            $data['subtotal'] = $subtotal;
            $data['total'] = $subtotal - ($data['discount'] ?? $quote->discount) + ($data['tax'] ?? $quote->tax);
        }

        $quote->update($data);

        return response()->json(['data' => $quote->fresh()]);
    }

    public function destroy(Workspace $workspace, CrmQuote $quote): JsonResponse
    {
        abort_if($quote->workspace_id !== $workspace->id, 404);
        $quote->delete();

        return response()->json(['message' => 'Deleted'], 200);
    }

    public function send(Request $request, Workspace $workspace, CrmQuote $quote): JsonResponse
    {
        abort_if($quote->workspace_id !== $workspace->id, 404);

        if ($quote->status !== 'draft') {
            return response()->json(['error' => ['code' => 'QUOTE_ALREADY_SENT', 'message' => 'Quote already sent']], 422);
        }

        $quote->update([
            'status' => 'sent',
            'sent_at' => now(),
        ]);

        return response()->json(['data' => $quote->fresh()]);
    }

    public function accept(Workspace $workspace, CrmQuote $quote): JsonResponse
    {
        abort_if($quote->workspace_id !== $workspace->id, 404);
        abort_if($quote->status !== 'sent', 422, 'Only sent quotes can be accepted');

        $quote->update([
            'status' => 'accepted',
            'accepted_at' => now(),
        ]);

        return response()->json(['data' => $quote->fresh()]);
    }

    public function reject(Request $request, Workspace $workspace, CrmQuote $quote): JsonResponse
    {
        abort_if($quote->workspace_id !== $workspace->id, 404);
        abort_if($quote->status !== 'sent', 422, 'Only sent quotes can be rejected');

        $data = $request->validate(['rejection_reason' => 'nullable|string']);

        $quote->update([
            'status' => 'rejected',
            'rejected_at' => now(),
            'rejection_reason' => $data['rejection_reason'] ?? null,
        ]);

        return response()->json(['data' => $quote->fresh()]);
    }

    public function duplicate(Workspace $workspace, CrmQuote $quote): JsonResponse
    {
        abort_if($quote->workspace_id !== $workspace->id, 404);

        $newQuote = $quote->replicate(['quote_number', 'sent_at', 'accepted_at', 'rejected_at', 'rejection_reason']);
        $newQuote->quote_number = 'Q-'.Str::upper(Str::random(8));
        $newQuote->status = 'draft';
        $newQuote->created_by = request()->user()->id;
        $newQuote->push();

        return response()->json(['data' => $newQuote], 201);
    }
}
