<?php

namespace App\Core\Models;

use App\Modules\CRM\Models\CrmDeal;
use App\Modules\Documents\Models\Document;
use Database\Factories\ItemFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Http\Exceptions\HttpResponseException;
use Laravel\Scout\Searchable;

class Item extends Model
{
    use HasFactory, HasUuids, Searchable, SoftDeletes;

    protected static function newFactory()
    {
        return ItemFactory::new();
    }

    protected $fillable = [
        'workspace_id', 'board_id', 'group_id', 'parent_id',
        'title', 'description', 'position', 'status', 'priority',
        'due_date', 'reminder_at', 'estimated_hours',
        'column_values', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'description' => 'array',
            'column_values' => 'array',
            'due_date' => 'datetime',
            'reminder_at' => 'datetime',
            'tracked_hours' => 'float',
            'estimated_hours' => 'float',
            'version' => 'integer',
        ];
    }

    public function board()
    {
        return $this->belongsTo(Board::class);
    }

    public function group()
    {
        return $this->belongsTo(BoardGroup::class);
    }

    public function parent()
    {
        return $this->belongsTo(Item::class, 'parent_id');
    }

    public function subitems()
    {
        return $this->hasMany(Item::class, 'parent_id');
    }

    public function assignees()
    {
        return $this->belongsToMany(User::class, 'item_assignees')
            ->withPivot('assigned_by', 'assigned_at');
    }

    public function comments()
    {
        return $this->hasMany(Comment::class, 'entity_id')
            ->where('entity_type', 'item')
            ->whereNull('deleted_at');
    }

    public function files()
    {
        return $this->hasMany(File::class, 'entity_id')
            ->where('entity_type', 'item');
    }

    public function linkedDocuments()
    {
        return $this->hasMany(Document::class, 'linked_item_id');
    }

    public function linkedDeals()
    {
        return $this->hasMany(CrmDeal::class, 'linked_item_id');
    }

    /**
     * Optimistic lock check.
     * Throws if expected_version doesn't match current version.
     */
    public function assertVersion(int $expectedVersion): void
    {
        if ($this->version !== $expectedVersion) {
            throw new HttpResponseException(
                response()->json([
                    'error' => [
                        'code' => 'CONCURRENT_EDIT',
                        'message' => 'Item was modified by another user. Reload and retry.',
                        'current_version' => $this->version,
                        'expected_version' => $expectedVersion,
                    ],
                ], 409)
            );
        }
    }

    public function toSearchableArray(): array
    {
        return [
            'id' => $this->id,
            'workspace_id' => $this->workspace_id,
            'board_id' => $this->board_id,
            'group_id' => $this->group_id,
            'title' => $this->title,
            'description' => is_array($this->description)
                ? strip_tags(json_encode($this->description))
                : (string) $this->description,
            'status' => $this->status,
            'priority' => $this->priority,
            'due_date' => $this->due_date?->toISOString(),
            'created_by' => $this->created_by,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
