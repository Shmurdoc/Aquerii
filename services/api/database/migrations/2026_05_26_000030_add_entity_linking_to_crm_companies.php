<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('crm_companies', function (Blueprint $table) {
            // Contact info (missing from original schema — useful for entity search display)
            if (! Schema::hasColumn('crm_companies', 'email')) {
                $table->string('email', 255)->nullable()->after('name');
            }
            if (! Schema::hasColumn('crm_companies', 'phone')) {
                $table->string('phone', 50)->nullable()->after('email');
            }

            // entity_type: 'customer' | 'supplier' | 'both' | 'prospect'
            if (! Schema::hasColumn('crm_companies', 'entity_type')) {
                $table->string('entity_type', 30)->default('customer')->after('phone');
            }

            // Denormalized activity counters — updated by application logic
            if (! Schema::hasColumn('crm_companies', 'invoice_count')) {
                $table->unsignedInteger('invoice_count')->default(0)->after('entity_type');
            }
            if (! Schema::hasColumn('crm_companies', 'sales_order_count')) {
                $table->unsignedInteger('sales_order_count')->default(0)->after('invoice_count');
            }
            if (! Schema::hasColumn('crm_companies', 'purchase_order_count')) {
                $table->unsignedInteger('purchase_order_count')->default(0)->after('sales_order_count');
            }
            if (! Schema::hasColumn('crm_companies', 'total_revenue')) {
                $table->decimal('total_revenue', 15, 2)->default(0)->after('purchase_order_count');
            }
            if (! Schema::hasColumn('crm_companies', 'total_spend')) {
                $table->decimal('total_spend', 15, 2)->default(0)->after('total_revenue');
            }
            if (! Schema::hasColumn('crm_companies', 'last_activity_at')) {
                $table->timestampTz('last_activity_at')->nullable()->after('total_spend');
            }
        });

        // Link invoices → crm_companies (customer side)
        if (Schema::hasTable('invoices') && ! Schema::hasColumn('invoices', 'customer_company_id')) {
            Schema::table('invoices', function (Blueprint $table) {
                $table->uuid('customer_company_id')->nullable()->after('customer_id');
                $table->foreign('customer_company_id')
                    ->references('id')->on('crm_companies')
                    ->nullOnDelete();
            });
        }

        // Link sales_orders → crm_companies (customer side)
        if (Schema::hasTable('sales_orders') && ! Schema::hasColumn('sales_orders', 'customer_company_id')) {
            Schema::table('sales_orders', function (Blueprint $table) {
                $table->uuid('customer_company_id')->nullable()->after('customer_id');
                $table->foreign('customer_company_id')
                    ->references('id')->on('crm_companies')
                    ->nullOnDelete();
            });
        }

        // Link purchase_orders → crm_companies (supplier side)
        if (Schema::hasTable('purchase_orders') && ! Schema::hasColumn('purchase_orders', 'supplier_company_id')) {
            Schema::table('purchase_orders', function (Blueprint $table) {
                $table->uuid('supplier_company_id')->nullable()->after('supplier_id');
                $table->foreign('supplier_company_id')
                    ->references('id')->on('crm_companies')
                    ->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('purchase_orders') && Schema::hasColumn('purchase_orders', 'supplier_company_id')) {
            Schema::table('purchase_orders', function (Blueprint $table) {
                $table->dropForeign(['supplier_company_id']);
                $table->dropColumn('supplier_company_id');
            });
        }

        if (Schema::hasTable('sales_orders') && Schema::hasColumn('sales_orders', 'customer_company_id')) {
            Schema::table('sales_orders', function (Blueprint $table) {
                $table->dropForeign(['customer_company_id']);
                $table->dropColumn('customer_company_id');
            });
        }

        if (Schema::hasTable('invoices') && Schema::hasColumn('invoices', 'customer_company_id')) {
            Schema::table('invoices', function (Blueprint $table) {
                $table->dropForeign(['customer_company_id']);
                $table->dropColumn('customer_company_id');
            });
        }

        Schema::table('crm_companies', function (Blueprint $table) {
            $cols = ['email', 'phone', 'entity_type', 'invoice_count', 'sales_order_count',
                     'purchase_order_count', 'total_revenue', 'total_spend', 'last_activity_at'];
            foreach ($cols as $col) {
                if (Schema::hasColumn('crm_companies', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
