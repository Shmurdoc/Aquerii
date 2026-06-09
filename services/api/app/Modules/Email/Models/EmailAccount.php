<?php

namespace App\Modules\Email\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Crypt;

class EmailAccount extends Model
{
    use HasUuids;

    protected $fillable = [
        'workspace_id', 'user_id', 'name', 'email_address',
        'imap_host', 'imap_port', 'imap_ssl', 'imap_username', 'imap_password_encrypted',
        'smtp_host', 'smtp_port', 'smtp_ssl', 'smtp_username', 'smtp_password_encrypted',
        'status', 'last_error', 'last_synced_at',
    ];

    protected $casts = [
        'imap_port' => 'integer',
        'imap_ssl' => 'boolean',
        'smtp_port' => 'integer',
        'smtp_ssl' => 'boolean',
        'last_synced_at' => 'datetime',
    ];

    protected $hidden = ['imap_password_encrypted', 'smtp_password_encrypted'];

    public function setImapPasswordAttribute(string $value): void
    {
        $this->attributes['imap_password_encrypted'] = Crypt::encryptString($value);
    }

    public function getImapPasswordDecrypted(): string
    {
        return Crypt::decryptString($this->imap_password_encrypted);
    }

    public function setSmtpPasswordAttribute(?string $value): void
    {
        $this->attributes['smtp_password_encrypted'] = $value ? Crypt::encryptString($value) : null;
    }

    public function getSmtpPasswordDecrypted(): ?string
    {
        return $this->smtp_password_encrypted ? Crypt::decryptString($this->smtp_password_encrypted) : null;
    }

    public function threads(): HasMany
    {
        return $this->hasMany(EmailThread::class, 'email_account_id');
    }
}
