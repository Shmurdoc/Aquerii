<?php

namespace App\Data;

class FatigueResult
{
    public function __construct(
        public readonly float $hours_worked,
        public readonly bool $soft_blocked,
        public readonly bool $hard_blocked,
        public readonly ?int $absent_days = null,
        public readonly ?int $observation_period = null,
    ) {}
}
