<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A supplier_order represents a purchase WE place on AliExpress to fulfil
     * a customer order (dropshipping). It links our internal order to the
     * AliExpress order so we can track status, tracking number and margin.
     */
    public function up(): void
    {
        Schema::create('supplier_orders', function (Blueprint $table) {
            $table->id();
            $table->string('supplier', 32)->default('aliexpress')->index();
            $table->foreignId('order_id')->nullable()->constrained('orders')->nullOnDelete();
            $table->foreignId('store_id')->nullable()->constrained('stores')->nullOnDelete();

            $table->string('ae_order_id', 64)->nullable()->index();
            $table->string('status', 32)->default('draft')->index(); // draft, placed, shipped, delivered, cancelled
            $table->string('tracking_number', 128)->nullable();
            $table->string('carrier', 64)->nullable();

            $table->decimal('cost', 12, 2)->nullable();      // what we paid the supplier
            $table->string('cost_currency', 8)->default('USD');
            $table->decimal('sale_total', 12, 2)->nullable(); // what the customer paid us
            $table->string('sale_currency', 8)->default('AOA');

            $table->json('raw')->nullable();                 // raw supplier payload for reference
            $table->text('notes')->nullable();
            $table->timestamp('placed_at')->nullable();
            $table->timestamp('last_synced_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('supplier_orders');
    }
};
