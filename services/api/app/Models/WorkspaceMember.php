<?php

namespace App\Models;

if (! class_exists(WorkspaceMember::class, false)) {
    class_alias(\App\Core\Models\WorkspaceMember::class, WorkspaceMember::class);
}
