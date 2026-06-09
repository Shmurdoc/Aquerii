<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class UpdateClickHouseAnalytics implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 5;
    public int $backoff = 60;

    public function __construct(
        public readonly string $eventType,
        public readonly array  $payload,
    ) {}

    public function handle(): void
    {
        $host = config('database.connections.clickhouse.host', 'clickhouse');
        $port = config('database.connections.clickhouse.port', 8123);

        $row = array_merge($this->payload, [
            'event_type'  => $this->eventType,
            'occurred_at' => now()->toIso8601String(),
        ]);

        $query = 'INSERT INTO aquerii_analytics.events FORMAT JSONEachRow ' . json_encode($row);

        $response = Http::withBasicAuth(
            config('database.connections.clickhouse.username', 'default'),
            config('database.connections.clickhouse.password', '')
        )->post("http://{$host}:{$port}/", $query);

        if (!$response->successful()) {
            Log::error('ClickHouse insert failed', ['status' => $response->status(), 'body' => $response->body()]);
            $this->fail(new \RuntimeException('ClickHouse insert failed: ' . $response->body()));
        }
    }
}
