<?php

namespace App\Modules\Invoicing\Models;

use App\Core\Models\User;
use App\Core\Models\Workspace;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Invoice extends Model
{
    use SoftDeletes;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'workspace_id', 'invoice_number', 'status', 'currency',
        'subtotal', 'tax_total', 'total',
        'customer_id', 'customer_name', 'customer_email', 'billing_address',
        'issue_date', 'due_date', 'paid_at', 'notes', 'created_by',
    ];

    public function casts(): array
    {
        return [
            'subtotal' => 'float',
            'tax_total' => 'float',
            'total' => 'float',
            'issue_date' => 'date',
            'due_date' => 'date',
            'paid_at' => 'datetime',
        ];
    }

    protected static function boot(): void
    {
        parent::boot();
        static::creating(fn ($model) => $model->id ??= (string) Str::uuid());
    }

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class);
    }
}
