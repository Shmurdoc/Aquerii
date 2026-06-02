<?php

namespace App\Models;

if (! class_exists(BoardGroup::class, false)) {
    class_alias(\App\Core\Models\BoardGroup::class, BoardGroup::class);
}
