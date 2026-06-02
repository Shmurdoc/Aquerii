<?php

namespace App\Models;

if (! class_exists(Board::class, false)) {
    class_alias(\App\Core\Models\Board::class, Board::class);
}
