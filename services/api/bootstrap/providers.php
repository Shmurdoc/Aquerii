<?php

use App\Core\Providers\AppServiceProvider;
use App\Core\Providers\AuthServiceProvider;
use App\Core\Providers\HorizonServiceProvider;
use App\Core\Providers\ModuleServiceProvider;

return [
    AppServiceProvider::class,
    AuthServiceProvider::class,
    HorizonServiceProvider::class,
    ModuleServiceProvider::class,
];
