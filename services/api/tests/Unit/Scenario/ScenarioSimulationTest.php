<?php

use App\Core\Models\ScenarioAdjustment;
use App\Http\Controllers\Api\ScenarioController;
use Illuminate\Support\Collection;

function invokeApplyAdjustment(ScenarioAdjustment $adj, Collection &$tasks, Collection &$teamCapacity): void
{
    $controller = new ScenarioController;
    $ref = new ReflectionClass($controller);
    $method = $ref->getMethod('applyAdjustment');
    $method->setAccessible(true);
    $method->invokeArgs($controller, [$adj, &$tasks, &$teamCapacity]);
}

it('applies add_delay adjustment to a specific task due date', function () {
    $tasks = collect([
        ['id' => 't1', 'due_date' => '2026-06-10', 'estimated_hours' => 8, 'status' => 'todo'],
    ]);
    $team = collect([]);

    $adj = new ScenarioAdjustment([
        'adjustment_type' => 'add_delay',
        'parameters' => ['task_id' => 't1', 'days' => 5],
    ]);

    invokeApplyAdjustment($adj, $tasks, $team);

    expect($tasks[0]['due_date'])->toBe('2026-06-15');
});

it('applies add_resource adjustment to team capacity', function () {
    $tasks = collect([]);
    $team = collect([
        ['user_id' => 'u1', 'weekly_capacity_hours' => 40],
    ]);

    $adj = new ScenarioAdjustment([
        'adjustment_type' => 'add_resource',
        'parameters' => ['user_id' => 'u2', 'hours_per_week' => 30],
    ]);

    invokeApplyAdjustment($adj, $tasks, $team);

    expect($team)->toHaveCount(2)
        ->and($team[1]['user_id'])->toBe('u2')
        ->and($team[1]['weekly_capacity_hours'])->toBe(30);
});

it('applies remove_task adjustment to remove scoped task', function () {
    $tasks = collect([
        ['id' => 't1', 'estimated_hours' => 8, 'status' => 'todo'],
        ['id' => 't2', 'estimated_hours' => 5, 'status' => 'todo'],
    ]);
    $team = collect([]);

    $adj = new ScenarioAdjustment([
        'adjustment_type' => 'remove_task',
        'parameters' => ['task_id' => 't2'],
    ]);

    invokeApplyAdjustment($adj, $tasks, $team);

    expect($tasks->pluck('id')->all())->toBe(['t1']);
});

it('applies change_scope adjustment to change estimated hours for a task', function () {
    $tasks = collect([
        ['id' => 't1', 'estimated_hours' => 10, 'status' => 'todo'],
        ['id' => 't2', 'estimated_hours' => 4, 'status' => 'todo'],
    ]);
    $team = collect([]);

    $adj = new ScenarioAdjustment([
        'adjustment_type' => 'change_scope',
        'parameters' => ['task_id' => 't1', 'hours_change' => -3],
    ]);

    invokeApplyAdjustment($adj, $tasks, $team);

    expect($tasks->firstWhere('id', 't1')['estimated_hours'])->toBe(7.0)
        ->and($tasks->firstWhere('id', 't2')['estimated_hours'])->toBe(4);
});

it('applies change_deadline adjustment with new_date for a specific task', function () {
    $tasks = collect([
        ['id' => 't1', 'due_date' => '2026-06-10', 'estimated_hours' => 10, 'status' => 'todo'],
    ]);
    $team = collect([]);

    $adj = new ScenarioAdjustment([
        'adjustment_type' => 'change_deadline',
        'parameters' => ['task_id' => 't1', 'new_date' => '2026-06-20'],
    ]);

    invokeApplyAdjustment($adj, $tasks, $team);

    expect($tasks[0]['due_date'])->toBe('2026-06-20');
});

it('applies change_deadline days_change to all tasks with due dates', function () {
    $tasks = collect([
        ['id' => 't1', 'due_date' => '2026-06-10', 'estimated_hours' => 10, 'status' => 'todo'],
        ['id' => 't2', 'due_date' => '2026-06-12', 'estimated_hours' => 5, 'status' => 'todo'],
        ['id' => 't3', 'due_date' => null, 'estimated_hours' => 2, 'status' => 'todo'],
    ]);
    $team = collect([]);

    $adj = new ScenarioAdjustment([
        'adjustment_type' => 'change_deadline',
        'parameters' => ['days_change' => 2],
    ]);

    invokeApplyAdjustment($adj, $tasks, $team);

    expect($tasks->firstWhere('id', 't1')['due_date'])->toBe('2026-06-12')
        ->and($tasks->firstWhere('id', 't2')['due_date'])->toBe('2026-06-14')
        ->and($tasks->firstWhere('id', 't3')['due_date'])->toBeNull();
});

it('never drops estimated_hours below zero during change_scope', function () {
    $tasks = collect([
        ['id' => 't1', 'estimated_hours' => 2, 'status' => 'todo'],
    ]);
    $team = collect([]);

    $adj = new ScenarioAdjustment([
        'adjustment_type' => 'change_scope',
        'parameters' => ['task_id' => 't1', 'hours_change' => -10],
    ]);

    invokeApplyAdjustment($adj, $tasks, $team);

    expect($tasks->firstWhere('id', 't1')['estimated_hours'])->toBe(0);
});
