<?php

namespace App\Modules\Admin\Filament\Resources\WorkspaceResource\Pages;

use App\Modules\Admin\Filament\Resources\WorkspaceResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditWorkspace extends EditRecord
{
    protected static string $resource = WorkspaceResource::class;

    protected function getHeaderActions(): array
    {
        return [Actions\DeleteAction::make()];
    }
}
