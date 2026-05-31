<?php

namespace App\Core\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Routing\Controller as BaseController;

abstract class Controller extends BaseController
{
    use AuthorizesRequests;

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
