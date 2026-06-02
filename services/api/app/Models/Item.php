<?php

namespace App\Models;

if (! class_exists(Item::class, false)) {
    class_alias(\App\Core\Models\Item::class, Item::class);
}
