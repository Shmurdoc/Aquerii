<?php

namespace App\Core\Providers;

use App\Modules\Accounting\Providers\AccountingServiceProvider;
use App\Modules\Admin\Providers\AdminServiceProvider;
use App\Modules\AI\Providers\AIServiceProvider;
use App\Modules\Automation\Providers\AutomationServiceProvider;
use App\Modules\Billing\Providers\BillingServiceProvider;
use App\Modules\Chat\Providers\ChatServiceProvider;
use App\Modules\CRM\Providers\CrmServiceProvider;
use App\Modules\Delegation\Providers\DelegationServiceProvider;
use App\Modules\Documents\Providers\DocumentsServiceProvider;
use App\Modules\Email\Providers\EmailServiceProvider;
use App\Modules\HSSE\Providers\HSSEProvider;
use App\Modules\Inventory\Providers\InventoryServiceProvider;
use App\Modules\Invoicing\Providers\InvoicingServiceProvider;
use App\Modules\JobCards\Providers\JobCardsServiceProvider;
use App\Modules\Marketing\Providers\MarketingServiceProvider;
use App\Modules\Purchasing\Providers\PurchasingServiceProvider;
use App\Modules\Sales\Providers\SalesServiceProvider;
use App\Modules\Support\Providers\SupportServiceProvider;
use App\Modules\Templates\Providers\TemplateServiceProvider;
use Illuminate\Support\ServiceProvider;

class ModuleServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->registerIf('MODULE_CRM', CrmServiceProvider::class);
        $this->registerIf('MODULE_DELEGATION', DelegationServiceProvider::class);
        $this->registerIf('MODULE_TEMPLATES', TemplateServiceProvider::class);
        $this->registerIf('MODULE_AUTOMATION', AutomationServiceProvider::class);
        $this->registerIf('MODULE_DOCUMENTS', DocumentsServiceProvider::class);
        $this->registerIf('MODULE_HSSE', HSSEProvider::class);
        $this->registerIf('MODULE_EMAIL', EmailServiceProvider::class);
        $this->registerIf('MODULE_AI', AIServiceProvider::class);
        $this->registerIf('MODULE_ADMIN', AdminServiceProvider::class);
        $this->registerIf('MODULE_BILLING', BillingServiceProvider::class);
        $this->registerIf('MODULE_INVENTORY', InventoryServiceProvider::class);
        $this->registerIf('MODULE_INVOICING', InvoicingServiceProvider::class);
        $this->registerIf('MODULE_JOBCARDS', JobCardsServiceProvider::class);
        $this->registerIf('MODULE_ACCOUNTING', AccountingServiceProvider::class);
        $this->registerIf('MODULE_PURCHASING', PurchasingServiceProvider::class);
        $this->registerIf('MODULE_SALES', SalesServiceProvider::class);
        $this->registerIf('MODULE_SUPPORT', SupportServiceProvider::class);
        $this->registerIf('MODULE_CHAT', ChatServiceProvider::class);
        $this->registerIf('MODULE_MARKETING', MarketingServiceProvider::class);
    }

    private function registerIf(string $envKey, string $providerClass): void
    {
        if (env($envKey, true) !== false) {
            $this->app->register($providerClass);
        }
    }
}
