<?php

namespace App\Models;

if (! class_exists(User::class, false)) {
    class_alias(\App\Core\Models\User::class, User::class);
}
