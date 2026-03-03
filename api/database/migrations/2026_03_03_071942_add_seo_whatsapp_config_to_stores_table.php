<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            // Contact
            $table->string('email')->nullable()->after('whatsapp');
            $table->string('phone')->nullable()->after('email');

            // WhatsApp order config
            $table->text('whatsapp_message')->nullable()->after('phone');
            $table->boolean('whatsapp_orders_enabled')->default(true)->after('whatsapp_message');

            // Business hours
            $table->json('business_hours')->nullable()->after('whatsapp_orders_enabled');

            // SEO
            $table->string('meta_title')->nullable()->after('business_hours');
            $table->text('meta_description')->nullable()->after('meta_title');
            $table->string('meta_keywords')->nullable()->after('meta_description');

            // Policies
            $table->text('return_policy')->nullable()->after('meta_keywords');
            $table->text('shipping_policy')->nullable()->after('return_policy');
            $table->text('terms')->nullable()->after('shipping_policy');

            // Announcement banner
            $table->string('announcement')->nullable()->after('terms');
            $table->boolean('announcement_active')->default(false)->after('announcement');

            // Delivery
            $table->json('delivery_zones')->nullable()->after('announcement_active');
            $table->decimal('min_order_value', 10, 2)->nullable()->after('delivery_zones');
        });
    }

    public function down(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->dropColumn([
                'email', 'phone',
                'whatsapp_message', 'whatsapp_orders_enabled',
                'business_hours',
                'meta_title', 'meta_description', 'meta_keywords',
                'return_policy', 'shipping_policy', 'terms',
                'announcement', 'announcement_active',
                'delivery_zones', 'min_order_value',
            ]);
        });
    }
};
