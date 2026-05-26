<?php

namespace App\Core\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource as BaseResource;

class JsonResource extends BaseResource
{
    public static $wrap = 'data';
}
