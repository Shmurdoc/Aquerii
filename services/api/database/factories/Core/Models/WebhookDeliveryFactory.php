<?php

namespace Database\Factories\Core\Models;

use App\Core\Models\WebhookDelivery;
use App\Core\Models\WebhookEndpoint;
use Illuminate\Database\Eloquent\Factories\Factory;

class WebhookDeliveryFactory extends Factory
{
    protected $model = WebhookDelivery::class;

    public function definition(): array
    {
        return [
            'webhook_endpoint_id' => WebhookEndpoint::factory(),
            'event' => fake()->word(),
            'payload' => ['test' => true],
            'response_status' => fake()->randomElement([200, 201, 400, 500]),
            'response_body' => fake()->optional()->sentence(),
            'attempt' => 1,
            'delivered_at' => fake()->optional()->dateTime(),
        ];
    }
}
