<?php

use App\Core\Models\User;
use App\Core\Models\Workspace;
use App\Core\Models\WorkspaceMember;
use App\Models\Product;
use App\Models\StockMovement;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->workspace = Workspace::factory()->create(['owner_id' => $this->user->id]);
    WorkspaceMember::factory()->create([
        'workspace_id' => $this->workspace->id,
        'user_id' => $this->user->id,
        'role' => 'owner',
    ]);
    Sanctum::actingAs($this->user);
});

it('creates a product', function () {
    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/products",
        [
            'name' => 'Widget',
            'unit_price' => 19.99,
            'sku' => 'WDG-001',
            'description' => 'A useful widget',
            'unit' => 'pcs',
        ],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(201)
        ->assertJsonPath('data.name', 'Widget');

    $this->assertDatabaseHas('products', [
        'name' => 'Widget',
        'sku' => 'WDG-001',
    ]);
});

it('lists products', function () {
    DB::table('products')->where('workspace_id', $this->workspace->id)->delete();

    DB::table('products')->insert([
        ['id' => Str::uuid()->toString(), 'workspace_id' => $this->workspace->id, 'name' => 'Product A', 'unit_price' => 10, 'created_by' => $this->user->id, 'created_at' => now(), 'updated_at' => now()],
        ['id' => Str::uuid()->toString(), 'workspace_id' => $this->workspace->id, 'name' => 'Product B', 'unit_price' => 20, 'created_by' => $this->user->id, 'created_at' => now(), 'updated_at' => now()],
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/products");

    $response->assertStatus(200)
        ->assertJsonCount(2, 'data.data');
});

it('shows a product', function () {
    $product = Product::create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Visible Product',
        'unit_price' => 15.50,
        'created_by' => $this->user->id,
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/products/{$product->id}");

    $response->assertStatus(200)
        ->assertJsonPath('data.name', 'Visible Product');
});

it('updates a product', function () {
    $product = Product::create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Old Name',
        'unit_price' => 10,
        'created_by' => $this->user->id,
    ]);

    $response = $this->patchJson(
        "/api/workspaces/{$this->workspace->id}/products/{$product->id}",
        ['name' => 'New Name', 'unit_price' => 25],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(200)
        ->assertJsonPath('data.name', 'New Name');
});

it('deletes a product', function () {
    $product = Product::create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Delete Me',
        'unit_price' => 5,
        'created_by' => $this->user->id,
    ]);

    $response = $this->deleteJson(
        "/api/workspaces/{$this->workspace->id}/products/{$product->id}",
        [],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(204);
});

it('shows stock information for a product', function () {
    $product = Product::create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Stocked Product',
        'unit_price' => 10,
        'created_by' => $this->user->id,
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/products/{$product->id}/stock");

    $response->assertStatus(200)
        ->assertJsonStructure([
            'data' => ['product_id', 'current_stock', 'is_low_stock', 'low_stock_threshold'],
        ]);
});

it('adjusts stock with an inbound movement', function () {
    $product = Product::create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Restocked Product',
        'unit_price' => 10,
        'created_by' => $this->user->id,
    ]);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/products/{$product->id}/stock/adjust",
        ['type' => 'in', 'quantity' => 50, 'reference' => 'PO-001'],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(201);

    $this->assertDatabaseHas('stock_movements', [
        'product_id' => $product->id,
        'type' => 'in',
        'quantity' => 50,
    ]);
});

it('adjusts stock with an outward movement', function () {
    $product = Product::create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Shipped Product',
        'unit_price' => 10,
        'created_by' => $this->user->id,
    ]);

    // First add stock, then ship some
    StockMovement::create([
        'workspace_id' => $this->workspace->id,
        'product_id' => $product->id,
        'type' => 'in',
        'quantity' => 100,
        'created_by' => $this->user->id,
    ]);

    $response = $this->postJson(
        "/api/workspaces/{$this->workspace->id}/products/{$product->id}/stock/adjust",
        ['type' => 'out', 'quantity' => 30, 'notes' => 'Shipped to customer'],
        ['Idempotency-Key' => Str::uuid()->toString()]
    );

    $response->assertStatus(201);
});

it('detects low stock threshold', function () {
    $product = Product::create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Low Stock Item',
        'unit_price' => 5,
        'created_by' => $this->user->id,
    ]);

    // Add minimal stock (below default threshold of 10)
    StockMovement::create([
        'workspace_id' => $this->workspace->id,
        'product_id' => $product->id,
        'type' => 'in',
        'quantity' => 3,
        'created_by' => $this->user->id,
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/products/{$product->id}/stock");

    $response->assertStatus(200)
        ->assertJsonPath('data.is_low_stock', true)
        ->assertJsonPath('data.current_stock', 3);
});

it('lists stock movements for a product', function () {
    $product = Product::create([
        'workspace_id' => $this->workspace->id,
        'name' => 'Tracked Product',
        'unit_price' => 10,
        'created_by' => $this->user->id,
    ]);

    StockMovement::create([
        'workspace_id' => $this->workspace->id,
        'product_id' => $product->id,
        'type' => 'in',
        'quantity' => 20,
        'created_by' => $this->user->id,
    ]);
    StockMovement::create([
        'workspace_id' => $this->workspace->id,
        'product_id' => $product->id,
        'type' => 'out',
        'quantity' => 5,
        'created_by' => $this->user->id,
    ]);

    $response = $this->getJson("/api/workspaces/{$this->workspace->id}/products/{$product->id}/stock/movements");

    $response->assertStatus(200)
        ->assertJsonCount(2, 'data');
});
