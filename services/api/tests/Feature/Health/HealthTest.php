<?php

it('returns healthy status', function () {
    $response = $this->getJson('/api/healthz');
    $response->assertStatus(200)
             ->assertJson(['status' => 'ok']);
});

it('includes service name in health response', function () {
    $response = $this->getJson('/api/healthz');
    $response->assertStatus(200)
             ->assertJsonPath('service', 'api');
});
