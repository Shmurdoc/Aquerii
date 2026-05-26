<?php

namespace App\Core\Http\Middleware;

use Illuminate\Routing\Middleware\ThrottleRequests as BaseThrottleRequests;

class ThrottleRequests extends BaseThrottleRequests
{
    // Inherits all default throttle behaviour from Laravel core.
    // Extend here if custom rate-limit responses (e.g. JSON envelope) are needed.
}
