<?php

namespace App\Modules\CRM\Models;

use App\Core\Models\Workspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class CrmContactRelationship extends Model
{
    use HasUuids;

    protected $table = 'crm_contact_relationships';

    protected $fillable = [
        'workspace_id', 'contact_id', 'related_contact_id', 'relationship_type',
    ];

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }

    public function contact()
    {
        return $this->belongsTo(CrmContact::class, 'contact_id');
    }

    public function relatedContact()
    {
        return $this->belongsTo(CrmContact::class, 'related_contact_id');
    }
}
