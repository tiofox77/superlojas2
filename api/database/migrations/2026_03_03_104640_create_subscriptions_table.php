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
        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->foreignId('plan_id')->constrained('plans')->cascadeOnDelete();
            $table->enum('status', ['active', 'expired', 'cancelled', 'pending', 'trial'])->default('pending');
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->boolean('auto_renew')->default(true);
            // Payment tracking
            $table->string('payment_method')->nullable(); // transferencia, multicaixa, cash, etc
            $table->string('payment_reference')->nullable();
            $table->decimal('amount_paid', 10, 2)->default(0);
            $table->string('currency', 3)->default('AOA');
            $table->timestamp('paid_at')->nullable();
            $table->text('notes')->nullable(); // admin notes
            $table->timestamps();

            $table->index(['store_id', 'status']);
            $table->index('expires_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscriptions');
    }
};
