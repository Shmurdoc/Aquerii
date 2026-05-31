<?php

use Tests\TestCase;

uses(TestCase::class)
    ->beforeEach(function () {
        config(['scout.queue' => false]);
    })
    ->in('Feature', 'Unit');
