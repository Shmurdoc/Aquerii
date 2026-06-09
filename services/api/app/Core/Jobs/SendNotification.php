<?php

namespace App\Core\Jobs;

require_once __DIR__.'/../../Jobs/SendNotification.php';

class_alias(\App\Jobs\SendNotification::class, SendNotification::class);
