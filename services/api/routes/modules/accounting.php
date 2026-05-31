<?php

use App\Modules\Accounting\Http\Controllers\AccountController;
use App\Modules\Accounting\Http\Controllers\JournalEntryController;
use App\Modules\Accounting\Models\Account;
use App\Modules\Accounting\Models\JournalEntry;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    Route::prefix('workspaces/{workspace}')->middleware('workspace')->group(function () {
        Route::apiResource('accounts', AccountController::class)->middleware('idempotent');
        Route::post('journal-entries', [JournalEntryController::class, 'store'])->middleware('idempotent');
        Route::get('journal-entries', [JournalEntryController::class, 'index']);
        Route::patch('journal-entries/{journal_entry}', [JournalEntryController::class, 'update'])->middleware('idempotent');
        Route::delete('journal-entries/{journal_entry}', [JournalEntryController::class, 'destroy']);

        // Financial Reports
        Route::get('reports/trial-balance', function (string $workspace) {
            $accounts = Account::where('workspace_id', $workspace)->get();
            $entries = JournalEntry::where('workspace_id', $workspace)->get();

            $trialBalance = $accounts->map(function ($account) use ($entries) {
                $debit = $entries->where('account_id', $account->id)->sum('debit_amount');
                $credit = $entries->where('account_id', $account->id)->sum('credit_amount');

                return [
                    'account_id' => $account->id,
                    'code' => $account->code,
                    'name' => $account->name,
                    'type' => $account->type,
                    'debit' => $debit,
                    'credit' => $credit,
                    'balance' => $debit - $credit,
                ];
            });

            return response()->json(['data' => $trialBalance]);
        });

        Route::get('reports/profit-loss', function (string $workspace) {
            $accounts = Account::where('workspace_id', $workspace)->whereIn('type', ['income', 'expense'])->get();
            $entries = JournalEntry::where('workspace_id', $workspace)->get();

            $revenue = $entries->whereIn('account_id', $accounts->where('type', 'income')->pluck('id'))->sum('credit_amount');
            $expenses = $entries->whereIn('account_id', $accounts->where('type', 'expense')->pluck('id'))->sum('debit_amount');

            return response()->json(['data' => [
                'revenue' => $revenue,
                'expenses' => $expenses,
                'net_income' => $revenue - $expenses,
                'accounts' => $accounts->map(function ($account) use ($entries) {
                    $amount = $entries->where('account_id', $account->id)->sum($account->type === 'income' ? 'credit_amount' : 'debit_amount');

                    return ['id' => $account->id, 'name' => $account->name, 'type' => $account->type, 'amount' => $amount];
                }),
            ]]);
        });

        Route::get('reports/balance-sheet', function (string $workspace) {
            $accounts = Account::where('workspace_id', $workspace)->get();
            $entries = JournalEntry::where('workspace_id', $workspace)->get();

            $assets = $entries->whereIn('account_id', $accounts->where('type', 'asset')->pluck('id'))->sum('debit_amount');
            $liabilities = $entries->whereIn('account_id', $accounts->where('type', 'liability')->pluck('id'))->sum('credit_amount');
            $equity = $entries->whereIn('account_id', $accounts->where('type', 'equity')->pluck('id'))->sum('credit_amount');

            return response()->json(['data' => [
                'assets' => $assets,
                'liabilities' => $liabilities,
                'equity' => $equity,
                'total_liabilities_and_equity' => $liabilities + $equity,
            ]]);
        });

        Route::get('reports/cash-flow', function (string $workspace) {
            $entries = JournalEntry::where('workspace_id', $workspace)->get();
            $accounts = Account::where('workspace_id', $workspace)->get();

            $operating = $entries->whereIn('account_id', $accounts->whereIn('type', ['income', 'expense'])->pluck('id'))->sum('credit_amount') - $entries->whereIn('account_id', $accounts->where('type', 'expense')->pluck('id'))->sum('debit_amount');
            $investing = $entries->whereIn('account_id', $accounts->where('type', 'asset')->pluck('id'))->sum('debit_amount') * -1;
            $financing = $entries->whereIn('account_id', $accounts->where('type', 'liability')->pluck('id'))->sum('credit_amount');

            return response()->json(['data' => [
                'operating' => $operating,
                'investing' => $investing,
                'financing' => $financing,
                'net_cash_flow' => $operating + $investing + $financing,
            ]]);
        });
    });
});
