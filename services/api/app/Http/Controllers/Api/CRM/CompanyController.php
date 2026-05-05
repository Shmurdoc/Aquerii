<?php

namespace App\Http\Controllers\Api\CRM;

use App\Http\Controllers\Controller;
use App\Models\Workspace;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CompanyController extends Controller
{
    // GET /workspaces/{workspace}/crm/companies
    public function index(Workspace $workspace): JsonResponse
    {
        $companies = DB::table('crm_companies')
            ->where('workspace_id', $workspace->id)
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $companies]);
    }

    // POST /workspaces/{workspace}/crm/companies
    public function store(Request $request, Workspace $workspace): JsonResponse
    {
        $validated = $request->validate([
            'name'    => 'required|string|max:150',
            'domain'  => 'sometimes|nullable|string|max:100',
            'industry'=> 'sometimes|nullable|string|max:100',
            'size'    => 'sometimes|nullable|string|max:50',
        ]);

        $id = Str::uuid()->toString();
        DB::table('crm_companies')->insert([
            'id'           => $id,
            'workspace_id' => $workspace->id,
            ...$validated,
            'created_at'   => now(),
            'updated_at'   => now(),
        ]);

        return response()->json(['data' => ['id' => $id]], 201);
    }

    // PATCH /workspaces/{workspace}/crm/companies/{company}
    public function update(Request $request, Workspace $workspace, string $companyId): JsonResponse
    {
        $validated = $request->validate([
            'name'     => 'sometimes|string|max:150',
            'domain'   => 'sometimes|nullable|string|max:100',
            'industry' => 'sometimes|nullable|string|max:100',
            'size'     => 'sometimes|nullable|string|max:50',
        ]);
        $validated['updated_at'] = now();

        DB::table('crm_companies')
            ->where('id', $companyId)
            ->where('workspace_id', $workspace->id)
            ->update($validated);

        return response()->json(['data' => ['updated' => true]]);
    }

    // DELETE /workspaces/{workspace}/crm/companies/{company}
    public function destroy(Workspace $workspace, string $companyId): JsonResponse
    {
        DB::table('crm_companies')
            ->where('id', $companyId)
            ->where('workspace_id', $workspace->id)
            ->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }
}
