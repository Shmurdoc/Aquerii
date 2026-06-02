<?php

namespace App\Modules\Admin\Models;

use App\Core\Models\User;
use Filament\Models\Contracts\FilamentUser;
use Filament\Panel;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SuperAdmin extends Model implements FilamentUser
{
    use HasUuids;

    protected $table = 'platform_admins';

    protected $fillable = ['user_id', 'level', 'granted_by'];

    protected $casts = [
        'level' => 'string',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function canAccessPanel(Panel $panel): bool
    {
        return in_array($this->level, ['super', 'admin'], true);
    }
}
