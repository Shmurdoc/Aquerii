<?php

namespace App\Core\Http\Controllers\Api;

use App\Core\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class EmployeeController extends Controller
{
    public function directory(Request $request, string $workspaceId)
    {
        $members = DB::table('workspace_members')
            ->join('users', 'workspace_members.user_id', '=', 'users.id')
            ->where('workspace_members.workspace_id', $workspaceId)
            ->where('workspace_members.status', 'active')
            ->select(
                'users.id',
                'users.name',
                'users.email',
                'workspace_members.role',
                'workspace_members.job_title',
                'workspace_members.department',
                'workspace_members.phone',
                'workspace_members.employed_at'
            )
            ->orderBy('workspace_members.department')
            ->orderBy('users.name')
            ->get();

        return response()->json(['employees' => $members]);
    }

    public function updateMember(Request $request, string $workspaceId)
    {
        $userId = $request->route('userId');
        $data = $request->validate([
            'job_title' => 'nullable|string|max:200',
            'department' => 'nullable|string|max:200',
            'phone' => 'nullable|string|max:50',
            'salary' => 'nullable|numeric|min:0',
            'emergency_contact' => 'nullable|string',
            'employed_at' => 'nullable|date',
        ]);

        DB::table('workspace_members')
            ->where('workspace_id', $workspaceId)
            ->where('user_id', $userId)
            ->update($data);

        return response()->json(['success' => true]);
    }

    public function clockIn(Request $request, string $workspaceId)
    {
        $userId = $request->user()->id;

        $existing = DB::table('attendance_logs')
            ->where('workspace_id', $workspaceId)
            ->where('user_id', $userId)
            ->whereNull('clocked_out_at')
            ->whereDate('clocked_in_at', now()->toDateString())
            ->first();

        if ($existing) {
            return response()->json(['message' => 'Already clocked in today.'], 409);
        }

        $id = Str::uuid();
        $now = now();
        $isLate = $now->gt(now()->setTime(9, 15, 0));
        DB::table('attendance_logs')->insert([
            'id' => $id,
            'workspace_id' => $workspaceId,
            'user_id' => $userId,
            'clocked_in_at' => $now,
            'status' => $isLate ? 'late' : 'present',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $log = DB::table('attendance_logs')->where('id', $id)->first();

        return response()->json(['attendance' => $log]);
    }

    public function clockOut(Request $request, string $workspaceId)
    {
        $userId = $request->user()->id;

        $log = DB::table('attendance_logs')
            ->where('workspace_id', $workspaceId)
            ->where('user_id', $userId)
            ->whereNull('clocked_out_at')
            ->whereDate('clocked_in_at', now()->toDateString())
            ->first();

        if (! $log) {
            return response()->json(['message' => 'Not clocked in today.'], 404);
        }

        DB::table('attendance_logs')
            ->where('id', $log->id)
            ->update(['clocked_out_at' => now(), 'updated_at' => now()]);

        $log = DB::table('attendance_logs')->where('id', $log->id)->first();

        return response()->json(['attendance' => $log]);
    }

    public function attendanceHistory(Request $request, string $workspaceId)
    {
        $userId = $request->user()->id;
        $days = (int) $request->query('days', 30);

        $logs = DB::table('attendance_logs')
            ->where('workspace_id', $workspaceId)
            ->where('user_id', $userId)
            ->where('clocked_in_at', '>=', now()->subDays($days))
            ->orderByDesc('clocked_in_at')
            ->get();

        return response()->json(['attendance' => $logs]);
    }

    public function leaveIndex(Request $request, string $workspaceId)
    {
        $query = DB::table('leave_requests')
            ->where('leave_requests.workspace_id', $workspaceId)
            ->join('users', 'leave_requests.user_id', '=', 'users.id')
            ->select('leave_requests.*', 'users.name as user_name', 'users.email as user_email');

        if ($request->query('status')) {
            $query->where('leave_requests.status', $request->query('status'));
        }

        $leaves = $query->orderByDesc('leave_requests.created_at')->get();

        return response()->json(['leave_requests' => $leaves]);
    }

    public function leaveStore(Request $request, string $workspaceId)
    {
        $data = $request->validate([
            'type' => 'required|in:annual,sick,personal,bereavement,maternity,paternity,other',
            'start_date' => 'required|date|after_or_equal:today',
            'end_date' => 'required|date|after_or_equal:start_date',
            'reason' => 'nullable|string|max:1000',
        ]);

        $id = Str::uuid();
        DB::table('leave_requests')->insert([
            'id' => $id,
            'workspace_id' => $workspaceId,
            'user_id' => $request->user()->id,
            'type' => $data['type'],
            'start_date' => $data['start_date'],
            'end_date' => $data['end_date'],
            'reason' => $data['reason'] ?? null,
            'status' => 'pending',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $leave = DB::table('leave_requests')->where('id', $id)->first();

        return response()->json(['leave_request' => $leave], 201);
    }

    public function leaveApprove(Request $request, string $workspaceId, string $leaveId)
    {
        $data = $request->validate([
            'action' => 'required|in:approved,declined',
            'decline_reason' => 'nullable|string|max:1000',
        ]);

        DB::table('leave_requests')
            ->where('id', $leaveId)
            ->where('workspace_id', $workspaceId)
            ->update([
                'status' => $data['action'],
                'approved_by' => $request->user()->id,
                'approved_at' => now(),
                'decline_reason' => $data['action'] === 'declined' ? ($data['decline_reason'] ?? null) : null,
                'updated_at' => now(),
            ]);

        return response()->json(['success' => true]);
    }

    public function expenseIndex(Request $request, string $workspaceId)
    {
        $query = DB::table('expense_claims')
            ->where('expense_claims.workspace_id', $workspaceId)
            ->join('users', 'expense_claims.user_id', '=', 'users.id')
            ->select('expense_claims.*', 'users.name as user_name', 'users.email as user_email');

        if ($request->query('status')) {
            $query->where('expense_claims.status', $request->query('status'));
        }

        $expenses = $query->orderByDesc('expense_claims.created_at')->get();

        return response()->json(['expenses' => $expenses]);
    }

    public function expenseStore(Request $request, string $workspaceId)
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'category' => 'required|in:travel,meals,office_supplies,utilities,other',
            'amount' => 'required|numeric|min:0.01',
            'currency' => 'nullable|string|size:3',
            'expense_date' => 'required|date',
            'receipt' => 'nullable|file|mimes:pdf,jpg,png|max:5120',
        ]);

        $receiptPath = null;
        if ($request->hasFile('receipt')) {
            $receiptPath = $request->file('receipt')->store('receipts', 'public');
        }

        $id = Str::uuid();
        DB::table('expense_claims')->insert([
            'id' => $id,
            'workspace_id' => $workspaceId,
            'user_id' => $request->user()->id,
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'category' => $data['category'],
            'amount' => $data['amount'],
            'currency' => $data['currency'] ?? 'USD',
            'expense_date' => $data['expense_date'],
            'status' => 'pending',
            'receipt_path' => $receiptPath,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $expense = DB::table('expense_claims')->where('id', $id)->first();

        return response()->json(['expense' => $expense], 201);
    }

    public function expenseApprove(Request $request, string $workspaceId, string $expenseId)
    {
        $data = $request->validate([
            'action' => 'required|in:approved,declined,reimbursed',
        ]);

        DB::table('expense_claims')
            ->where('id', $expenseId)
            ->where('workspace_id', $workspaceId)
            ->update([
                'status' => $data['action'],
                'approved_by' => $request->user()->id,
                'approved_at' => now(),
                'updated_at' => now(),
            ]);

        return response()->json(['success' => true]);
    }

    public function leaveBalance(Request $request, string $workspaceId)
    {
        $userId = $request->user()->id;

        $used = DB::table('leave_requests')
            ->where('workspace_id', $workspaceId)
            ->where('user_id', $userId)
            ->where('status', 'approved')
            ->whereYear('start_date', now()->year)
            ->select('type', DB::raw('SUM(end_date - start_date + 1) as days'))
            ->groupBy('type')
            ->pluck('days', 'type');

        $entitlements = [
            'annual' => 20,
            'sick' => 10,
            'personal' => 5,
        ];

        $balances = [];
        foreach ($entitlements as $type => $total) {
            $usedDays = (int) ($used[$type] ?? 0);
            $balances[$type] = [
                'total' => $total,
                'used' => $usedDays,
                'remaining' => $total - $usedDays,
            ];
        }

        return response()->json(['balances' => $balances]);
    }
}
