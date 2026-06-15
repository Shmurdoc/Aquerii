<?php

namespace App\Models;

if (! class_exists(WorkspaceGeofence::class, false)) {
    class_alias(\App\Core\Models\WorkspaceGeofence::class, WorkspaceGeofence::class);
}
