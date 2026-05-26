<?php

namespace App\Core\Enums;

enum WorkspaceRole: string
{
    case Owner   = 'owner';
    case Admin   = 'admin';
    case Manager = 'manager';
    case Member  = 'member';
    case Viewer  = 'viewer';

    public function canDo(string $permission): bool
    {
        return in_array($permission, $this->permissions());
    }

    public function permissions(): array
    {
        return match($this) {
            self::Owner, self::Admin => self::allPermissions(),
            self::Manager => [
                'workspace.view', 'workspace.update',
                'members.view', 'members.invite',
                'invoices.*', 'sales_orders.*', 'purchase_orders.*',
                'crm.*', 'boards.*', 'files.*', 'reports.view',
                'meetings.*', 'employees.view', 'leave.approve', 'expenses.approve',
            ],
            self::Member => [
                'workspace.view',
                'boards.*', 'crm.view', 'invoices.view',
                'files.upload', 'meetings.view', 'meetings.create',
                'employees.view_own', 'leave.request', 'expenses.submit',
            ],
            self::Viewer => ['workspace.view', 'boards.view', 'crm.view'],
        };
    }

    public static function allPermissions(): array
    {
        return [
            'workspace.view', 'workspace.update', 'workspace.delete',
            'members.view', 'members.invite', 'members.remove', 'members.update_role',
            'invoices.*', 'sales_orders.*', 'purchase_orders.*',
            'crm.*', 'boards.*', 'files.*', 'reports.*',
            'meetings.*', 'employees.*', 'leave.*', 'expenses.*',
            'settings.*', 'billing.*',
        ];
    }
}
