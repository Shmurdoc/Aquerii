<?php

namespace App\Modules\CRM\Http\Controllers;

use App\Core\Http\Controllers\Controller;
use App\Core\Models\OAuthAccount;
use App\Core\Models\Workspace;
use App\Modules\CRM\Models\CrmCalendarSync;
use App\Modules\CRM\Services\CalendarSyncService;
use App\Modules\CRM\Services\TelephonyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CalendarSyncController extends Controller
{
    public function __construct(
        protected CalendarSyncService $syncService,
    ) {}

    public function index(Workspace $workspace): JsonResponse
    {
        $syncs = CrmCalendarSync::where('workspace_id', $workspace->id)
            ->with('user:id,name')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['data' => $syncs]);
    }

    public function store(Request $request, Workspace $workspace): JsonResponse
    {
        $data = $request->validate([
            'provider' => 'required|string|in:google,microsoft',
            'calendar_id' => 'required|string',
            'calendar_name' => 'nullable|string|max:255',
        ]);

        $data['workspace_id'] = $workspace->id;
        $data['user_id'] = $request->user()->id;

        $sync = CrmCalendarSync::updateOrCreate(
            ['user_id' => $request->user()->id, 'provider' => $data['provider'], 'calendar_id' => $data['calendar_id']],
            $data
        );

        return response()->json(['data' => $sync], 201);
    }

    public function destroy(Workspace $workspace, CrmCalendarSync $sync): JsonResponse
    {
        abort_if($sync->workspace_id !== $workspace->id, 404);
        $sync->delete();

        return response()->json(['message' => 'Deleted'], 200);
    }

    public function sync(Request $request, Workspace $workspace, CrmCalendarSync $sync): JsonResponse
    {
        abort_if($sync->workspace_id !== $workspace->id, 404);

        $result = $this->syncService->syncEvents($sync);

        if (! $result['success']) {
            return response()->json(['error' => ['code' => 'SYNC_FAILED', 'message' => $result['error']]], 502);
        }

        return response()->json(['data' => $result]);
    }

    public function listProviderCalendars(Request $request, Workspace $workspace): JsonResponse
    {
        $data = $request->validate(['provider' => 'required|string|in:google,microsoft']);

        $account = OAuthAccount::where('user_id', $request->user()->id)
            ->where('provider', $data['provider'])
            ->first();

        if (! $account) {
            return response()->json(['data' => []]);
        }

        $calendars = $this->syncService->getCalendars($account, $data['provider']);

        return response()->json(['data' => $calendars]);
    }

    public function telephony(Request $request, Workspace $workspace): JsonResponse
    {
        $data = $request->validate([
            'action' => 'required|string|in:call,sms,status',
            'to' => 'required_if:action,call,sms|string',
            'message' => 'required_if:action,sms|string',
            'call_sid' => 'required_if:action,status|string',
        ]);

        $service = app(TelephonyService::class);

        return match ($data['action']) {
            'call' => response()->json(['data' => $service->initiateCall($data['to'])]),
            'sms' => response()->json(['data' => $service->sendSms($data['to'], $data['message'])]),
            'status' => response()->json(['data' => $service->getCallStatus($data['call_sid'])]),
        };
    }
}
