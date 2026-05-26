<?php

namespace App\Core\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Generates sequential document numbers within a workspace.
 * Uses SELECT ... FOR UPDATE to prevent race conditions.
 *
 * Number format examples:
 *   INV-2026-00042
 *   SO-2026-00001
 *   QT-2026-00005
 */
class SequenceService
{
    /**
     * @param  string  $type  One of: invoice, sales_order, quote, purchase_order, credit_note, receipt, delivery_note
     * @param  string|null  $prefix  Override the default prefix (e.g. 'INV')
     * @return string The formatted document number
     */
    public function next(string $workspaceId, string $type, ?string $prefix = null): string
    {
        $prefix = $prefix ?? $this->defaultPrefix($type);
        $year = now()->year;

        $sequence = DB::transaction(function () use ($workspaceId, $type, $year) {
            $row = DB::table('document_sequences')
                ->where('workspace_id', $workspaceId)
                ->where('document_type', $type)
                ->where('year', $year)
                ->lockForUpdate()
                ->first();

            if ($row) {
                $next = $row->last_number + 1;
                DB::table('document_sequences')
                    ->where('id', $row->id)
                    ->update(['last_number' => $next, 'updated_at' => now()]);
            } else {
                $next = 1;
                DB::table('document_sequences')->insert([
                    'id' => Str::uuid(),
                    'workspace_id' => $workspaceId,
                    'document_type' => $type,
                    'year' => $year,
                    'last_number' => 1,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            return $next;
        });

        return sprintf('%s-%d-%05d', $prefix, $year, $sequence);
    }

    private function defaultPrefix(string $type): string
    {
        return match ($type) {
            'invoice' => 'INV',
            'sales_order' => 'SO',
            'quote' => 'QT',
            'purchase_order' => 'PO',
            'credit_note' => 'CN',
            'receipt' => 'REC',
            'delivery_note' => 'DN',
            default => strtoupper(substr($type, 0, 3)),
        };
    }
}
