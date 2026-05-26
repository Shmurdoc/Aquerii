<?php

namespace App\Core\Http\Resources;

use Illuminate\Http\Resources\Json\ResourceCollection as BaseCollection;

class ResourceCollection extends BaseCollection
{
    public static $wrap = 'data';
}
