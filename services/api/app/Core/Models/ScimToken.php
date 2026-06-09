<?php

namespace App\Core\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class ScimToken extends Model
{
    use HasUuids;

    protected $table = 'scim_tokens';

    protected $fillable = [
        'workspace_id', 'name', 'token_hash', 'scope', 'is_active', 'last_used_at',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'last_used_at' => 'datetime',
        ];
    }

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }

    /**
     * Generate a new SCIM token (returns raw token, store hash).
     */
    public static function generate(string $workspaceId, string $name, string $scope = 'users'): string
    {
        $rawToken = 'scim_'.Str::random(32);
        $hash = hash('sha256', $rawToken);

        static::create([
            'workspace_id' => $workspaceId,
            'name' => $name,
            'token_hash' => $hash,
            'scope' => $scope,
        ]);

        return $rawToken;
    }

    /**
     * Verify a SCIM token.
     */
    public static function verify(string $token): ?self
    {
        $hash = hash('sha256', $token);

        $model = static::where('token_hash', $hash)
            ->where('is_active', true)
            ->first();

        if (! $model) {
            return null;
        }

        $model->forceFill(['last_used_at' => now()])->save();

        return $model;
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function hasScope(string $requiredScope): bool
    {
        $scopes = collect(explode(',', (string) $this->scope))
            ->map(fn (string $scope) => trim(strtolower($scope)))
            ->filter();

        return $scopes->contains($requiredScope);
    }
}
