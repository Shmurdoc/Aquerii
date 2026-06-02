<?php

namespace App\Models;

if (! class_exists(Automation::class, false)) {
    class_alias(\App\Core\Models\Automation::class, Automation::class);
}
