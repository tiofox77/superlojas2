<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pos_sales', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('sale_number')->unique(); // POS-SLUG-0001
            $table->json('items'); // [{product_id, name, price, qty, subtotal}]
            $table->decimal('subtotal', 12, 2)->default(0);
            $table->decimal('discount', 12, 2)->default(0);
            $table->decimal('tax', 12, 2)->default(0);
            $table->decimal('total', 12, 2)->default(0);
            $table->string('payment_method')->default('cash'); // cash, multicaixa, transferencia, etc
            $table->decimal('amount_received', 12, 2)->default(0);
            $table->decimal('change_amount', 12, 2)->default(0);
            $table->string('customer_name')->nullable();
            $table->string('customer_phone')->nullable();
            $table->text('notes')->nullable();
            $table->string('currency', 3)->default('AOA');
            $table->enum('status', ['completed', 'voided', 'pending'])->default('completed');
            $table->string('offline_id')->nullable()->index(); // for offline sync dedup
            $table->timestamps();

            $table->index(['store_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pos_sales');
    }
};
