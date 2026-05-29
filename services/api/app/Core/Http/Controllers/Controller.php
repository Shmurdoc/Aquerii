<?php

namespace App\Core\Http\Controllers;

abstract class Controller
{
    /**
     * Escape LIKE wildcard characters to prevent injection.
     * User-supplied search strings should be passed through this
     * before being used in LIKE clauses.
     */
    protected function escapeLike(string $value): string
    {
        return addcslashes($value, '%_\\');
    }
}
