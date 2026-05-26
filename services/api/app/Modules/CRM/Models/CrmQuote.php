<?php

namespace App\Modules\CRM\Models;

use App\Core\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class CrmQuote extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'crm_quotes';

    protected $fillable = [
        'workspace_id', 'quote_number', 'deal_id', 'contact_id',
        'company_id', 'status', 'line_items', 'subtotal', 'discount',
        'tax', 'total', 'currency', 'notes', 'terms', 'valid_until',
        'sent_at', 'accepted_at', 'rejected_at', 'rejection_reason', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'line_items' => 'array',
            'subtotal' => 'decimal:2',
            'discount' => 'decimal:2',
            'tax' => 'decimal:2',
            'total' => 'decimal:2',
            'valid_until' => 'datetime',
            'sent_at' => 'datetime',
            'accepted_at' => 'datetime',
            'rejected_at' => 'datetime',
        ];
    }

    public function deal()
    {
        return $this->belongsTo(CrmDeal::class, 'deal_id');
    }

    public function contact()
    {
        return $this->belongsTo(CrmContact::class, 'contact_id');
    }

    public function company()
    {
        return $this->belongsTo(CrmCompany::class, 'company_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
