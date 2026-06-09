<?php

namespace App\Models;

use Illuminate\Notifications\DatabaseNotification;

class Notification extends DatabaseNotification
{
    // Uses Laravel's built-in notifications table structure:
    // id, type, notifiable_type, notifiable_id, data (JSON), read_at, created_at, updated_at
}
