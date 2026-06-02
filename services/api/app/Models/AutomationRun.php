<?php

namespace App\Models;

if (! class_exists(AutomationRun::class, false)) {
    class_alias(\App\Core\Models\AutomationRun::class, AutomationRun::class);
}
