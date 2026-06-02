<?php

namespace App\Models;

if (! class_exists(Workspace::class, false)) {
    class_alias(\App\Core\Models\Workspace::class, Workspace::class);
}
