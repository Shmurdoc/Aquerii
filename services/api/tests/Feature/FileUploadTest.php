<?php

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('s3');
    $this->user = User::factory()->create();
    $this->workspace = Workspace::factory()->create(['owner_id' => $this->user->id]);
    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->user->id,
        'role' => 'owner',
    ]);
    $this->token = $this->user->createToken('test')->plainTextToken;
});

test('user can upload avatar', function () {
    $file = UploadedFile::fake()->image('avatar.png', 100, 100);

    $response = $this->withToken($this->token)
        ->postJson('/api/me/avatar', ['avatar' => $file]);

    $response->assertStatus(200);
    $response->assertJsonStructure(['data' => ['id', 'name', 'avatar_url']]);
});

test('avatar upload rejects non-image file', function () {
    $file = UploadedFile::fake()->create('document.pdf', 100);

    $response = $this->withToken($this->token)
        ->postJson('/api/me/avatar', ['avatar' => $file]);

    $response->assertStatus(422);
});

test('avatar upload rejects oversized file', function () {
    $file = UploadedFile::fake()->image('large.png', 2000, 2000);
    $file->size(3000);

    $response = $this->withToken($this->token)
        ->postJson('/api/me/avatar', ['avatar' => $file]);

    $response->assertStatus(422);
});

test('scanned document upload stores file and creates record', function () {
    $file = UploadedFile::fake()->create('invoice.pdf', 512, 'application/pdf');

    $response = $this->withToken($this->token)
        ->postJson("/api/workspaces/{$this->workspace->id}/scanned-documents", [
            'file' => $file,
            'title' => 'Test Invoice',
        ]);

    $response->assertStatus(201);
    $response->assertJsonStructure(['data' => ['id', 'title', 'original_filename', 'file_size', 'ocr_status']]);
    expect($response->json('data.original_filename'))->toBe('invoice.pdf');
    expect($response->json('data.ocr_status'))->toBe('pending');
});

test('scanned document upload rejects missing title', function () {
    $file = UploadedFile::fake()->create('doc.pdf', 100, 'application/pdf');

    $response = $this->withToken($this->token)
        ->postJson("/api/workspaces/{$this->workspace->id}/scanned-documents", [
            'file' => $file,
        ]);

    $response->assertStatus(201);
});

test('document upload returns 422 for invalid file type', function () {
    $file = UploadedFile::fake()->create('script.exe', 100);

    $response = $this->withToken($this->token)
        ->postJson("/api/workspaces/{$this->workspace->id}/scanned-documents", [
            'file' => $file,
            'title' => 'Malicious File',
        ]);

    $response->assertStatus(422);
});

test('unauthenticated upload returns 401', function () {
    $file = UploadedFile::fake()->image('avatar.png', 100, 100);

    $response = $this->postJson('/api/me/avatar', ['avatar' => $file]);
    $response->assertStatus(401);

    $response2 = $this->postJson("/api/workspaces/{$this->workspace->id}/scanned-documents", [
        'file' => $file,
        'title' => 'Test',
    ]);
    $response2->assertStatus(401);
});
