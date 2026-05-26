<?php

namespace App\Modules\Admin\Filament\Resources\FeatureFlagResource\Pages;

use App\Modules\Admin\Filament\Resources\FeatureFlagResource;
use Filament\Resources\Pages\CreateRecord;

class CreateFeatureFlag extends CreateRecord
{
    protected static string $resource = FeatureFlagResource::class;
}
