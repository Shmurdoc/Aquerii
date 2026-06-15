<?php

namespace App\Models;

if (! class_exists(Alert::class, false)) {
    class_alias(\App\Core\Models\Alert::class, Alert::class);
}
