<?php

namespace Database\Factories\Core\Models;

use App\Core\Models\User;
use App\Core\Models\WebhookEndpoint;
use App\Core\Models\Workspace;
use Illuminate\Database\Eloquent\Factories\Factory;

class WebhookEndpointFactory extends Factory
{
    protected $model = WebhookEndpoint::class;

    public function definition(): array
    {
        return [
            'workspace_id' => Workspace::factory(),
            'name' => fake()->words(2, true).' Webhook',
            'url' => 'https://example.com/'.fake()->uuid(),
            'secret' => base64_encode(random_bytes(32)),
            'events' => ['item.created', 'item.updated'],
            'is_active' => true,
            'created_by' => User::factory(),
        ];
    }
}
